"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction } from "../_generated/server";
import { getActionAuthContext } from "../auth";
import { isExtractable } from "../lib/extractable";

export { isExtractable };

interface ExtractionApiResponse {
  success: boolean;
  text?: string | null;
  pageCount?: number | null;
  wordCount?: number | null;
  error?: string;
}

function requireExtractionApiUrl(): string {
  const value = process.env.EXTRACTION_API_URL?.trim();
  if (!value) {
    throw new Error("Missing EXTRACTION_API_URL");
  }
  return value.replace(/\/$/, "");
}

function requireExtractionApiSecret(): string {
  const value = process.env.EXTRACTION_API_SECRET?.trim();
  if (!value) {
    throw new Error("Missing EXTRACTION_API_SECRET");
  }
  return value;
}

export const extractAndUpdate = internalAction({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, { documentId }) => {
    const document = await ctx.runQuery(
      internal.documents.internal.getForExtraction,
      {
        documentId,
      },
    );

    if (!document) {
      return { success: false, reason: "missing_document" };
    }

    if (!isExtractable(document.contentType)) {
      await ctx.runMutation(internal.documents.internal.updateExtraction, {
        documentId,
        status: "unsupported",
        error: `Content type ${document.contentType} does not support text extraction`,
      });
      return { success: false, reason: "unsupported" };
    }

    await ctx.runMutation(internal.documents.internal.updateExtraction, {
      documentId,
      status: "processing",
    });

    try {
      const response = await fetch(
        `${requireExtractionApiUrl()}/api/storage/extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Baseblocks-Extraction-Secret": requireExtractionApiSecret(),
          },
          body: JSON.stringify({
            objectKey: document.objectKey,
            contentType: document.contentType,
          }),
        },
      );

      const result = (await response.json()) as ExtractionApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `Extraction API failed: ${response.status}`,
        );
      }

      await ctx.runMutation(internal.documents.internal.updateExtraction, {
        documentId,
        status: "completed",
        extractedText: result.text ?? "",
        pageCount: result.pageCount ?? undefined,
        wordCount: result.wordCount ?? undefined,
      });

      return {
        success: true,
        pageCount: result.pageCount,
        wordCount: result.wordCount,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown extraction error";

      await ctx.runMutation(internal.documents.internal.updateExtraction, {
        documentId,
        status: "failed",
        error: errorMessage,
      });

      return { success: false, reason: errorMessage };
    }
  },
});

export const triggerExtraction = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, { documentId }) => {
    const auth = await getActionAuthContext(ctx);
    const document = await ctx.runQuery(
      internal.documents.internal.getForExtraction,
      {
        documentId,
      },
    );

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    const hasAccess = await ctx.runQuery(internal.auth.checkSiteMembership, {
      siteId: document.siteId,
      userId: auth.userId,
    });
    if (!hasAccess) {
      return { success: false, error: "Not authorized" };
    }

    if (document.extractionStatus === "completed") {
      return { success: true, alreadyExtracted: true };
    }

    if (document.extractionStatus === "processing") {
      return { success: false, error: "Extraction already in progress" };
    }

    await ctx.scheduler.runAfter(
      0,
      internal.actions.extractDocument.extractAndUpdate,
      {
        documentId,
      },
    );

    return { success: true, scheduled: true };
  },
});

export const retryExtraction = action({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, { documentId }) => {
    const auth = await getActionAuthContext(ctx);
    const document = await ctx.runQuery(
      internal.documents.internal.getForExtraction,
      {
        documentId,
      },
    );

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    const hasAccess = await ctx.runQuery(internal.auth.checkSiteMembership, {
      siteId: document.siteId,
      userId: auth.userId,
    });
    if (!hasAccess) {
      return { success: false, error: "Not authorized" };
    }

    if (document.extractionStatus === "completed") {
      return { success: true, alreadyExtracted: true };
    }

    if (document.extractionStatus === "processing") {
      return { success: false, error: "Extraction already in progress" };
    }

    await ctx.runMutation(internal.documents.internal.resetForRetry, {
      documentId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.extractDocument.extractAndUpdate,
      {
        documentId,
      },
    );

    return { success: true, scheduled: true };
  },
});

export const retryAllFailed = action({
  args: {
    siteId: v.id("sites"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { siteId, limit = 10 }) => {
    const auth = await getActionAuthContext(ctx);

    const hasAccess = await ctx.runQuery(internal.auth.checkSiteMembership, {
      siteId,
      userId: auth.userId,
    });
    if (!hasAccess) {
      return { success: false, retriedCount: 0, error: "Not authorized" };
    }

    const failedDocs = await ctx.runQuery(
      internal.documents.internal.getFailedExtraction,
      {
        siteId,
        limit,
      },
    );

    if (failedDocs.length === 0) {
      return { success: true, retriedCount: 0 };
    }

    let retriedCount = 0;
    for (const doc of failedDocs) {
      if (!doc.assetId) {
        continue;
      }

      await ctx.runMutation(internal.documents.internal.resetForRetry, {
        documentId: doc._id,
      });

      await ctx.scheduler.runAfter(
        retriedCount * 1000,
        internal.actions.extractDocument.extractAndUpdate,
        {
          documentId: doc._id,
        },
      );

      retriedCount++;
    }

    return { success: true, retriedCount };
  },
});
