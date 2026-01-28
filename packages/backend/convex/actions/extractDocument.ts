"use node";

/**
 * Document text extraction action
 *
 * Calls Entity Storage extraction API to extract text from uploaded documents.
 * Updates the document record with extracted text and metadata.
 */
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Entity Storage configuration
const ENTITY_STORAGE_URL =
	process.env.ENTITY_STORAGE_URL || "https://gregarious-koala-319.convex.site";

// Content types that support extraction
const EXTRACTABLE_TYPES = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"application/vnd.oasis.opendocument.text",
	"application/vnd.oasis.opendocument.presentation",
	"application/vnd.oasis.opendocument.spreadsheet",
	"application/rtf",
	"text/plain",
	"text/markdown",
	"text/html",
]);

/**
 * Check if a content type supports text extraction
 */
export function isExtractable(contentType: string): boolean {
	const normalized = contentType.split(";")[0]?.trim().toLowerCase();
	return normalized ? EXTRACTABLE_TYPES.has(normalized) : false;
}

/**
 * Extract text from a document and update its record
 *
 * This is an internal action called after file upload or via scheduler.
 */
export const extractAndUpdate = internalAction({
	args: {
		documentId: v.id("documents"),
		blobId: v.string(),
		contentType: v.string(),
		filename: v.string(),
		authToken: v.string(),
	},
	handler: async (ctx, { documentId, blobId, contentType, filename, authToken }) => {
		// Check if content type is extractable
		if (!isExtractable(contentType)) {
			await ctx.runMutation(internal.documents.internal.updateExtraction, {
				documentId,
				status: "unsupported",
				error: `Content type ${contentType} does not support text extraction`,
			});
			return { success: false, reason: "unsupported" };
		}

		// Mark as processing
		await ctx.runMutation(internal.documents.internal.updateExtraction, {
			documentId,
			status: "processing",
		});

		try {
			// Call Entity Storage extraction endpoint
			const response = await fetch(`${ENTITY_STORAGE_URL}/fs/extract`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					blobId,
					contentType,
					filename,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Extraction API error: ${response.status} - ${errorText}`);
			}

			const result = await response.json();

			if (!result.success) {
				await ctx.runMutation(internal.documents.internal.updateExtraction, {
					documentId,
					status: "failed",
					error: result.error || "Extraction failed",
				});
				return { success: false, reason: result.error };
			}

			// Update document with extracted text
			await ctx.runMutation(internal.documents.internal.updateExtraction, {
				documentId,
				status: "completed",
				extractedText: result.text,
				pageCount: result.pageCount,
				wordCount: result.wordCount,
			});

			return {
				success: true,
				wordCount: result.wordCount,
				pageCount: result.pageCount,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";

			await ctx.runMutation(internal.documents.internal.updateExtraction, {
				documentId,
				status: "failed",
				error: errorMessage,
			});

			return { success: false, reason: errorMessage };
		}
	},
});

/**
 * Public action to trigger extraction for a document
 *
 * Used by the frontend after file upload.
 */
export const triggerExtraction = action({
	args: {
		documentId: v.id("documents"),
		authToken: v.string(),
	},
	handler: async (ctx, { documentId, authToken }) => {
		// Get document details
		const document = await ctx.runQuery(internal.documents.internal.getForExtraction, {
			documentId,
		});

		if (!document) {
			return { success: false, error: "Document not found" };
		}

		// Check if already extracted or processing
		if (document.extractionStatus === "completed") {
			return { success: true, alreadyExtracted: true };
		}

		if (document.extractionStatus === "processing") {
			return { success: false, error: "Extraction already in progress" };
		}

		// Schedule the extraction (runs immediately but doesn't block)
		await ctx.scheduler.runAfter(0, internal.actions.extractDocument.extractAndUpdate, {
			documentId,
			blobId: document.blobId,
			contentType: document.contentType,
			filename: document.filename,
			authToken,
		});

		return { success: true, scheduled: true };
	},
});
