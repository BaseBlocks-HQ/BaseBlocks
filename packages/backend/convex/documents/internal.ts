/**
 * Internal document mutations and queries
 *
 * These are used by actions and schedulers, not directly by clients.
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Get document for extraction (internal use only)
 */
export const getForExtraction = internalQuery({
	args: {
		documentId: v.id("documents"),
	},
	handler: async (ctx, { documentId }) => {
		return await ctx.db.get(documentId);
	},
});

/**
 * Update document extraction status and data
 */
export const updateExtraction = internalMutation({
	args: {
		documentId: v.id("documents"),
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed"),
			v.literal("unsupported")
		),
		extractedText: v.optional(v.string()),
		pageCount: v.optional(v.number()),
		wordCount: v.optional(v.number()),
		error: v.optional(v.string()),
	},
	handler: async (ctx, { documentId, status, extractedText, pageCount, wordCount, error }) => {
		const updates: Record<string, unknown> = {
			extractionStatus: status,
		};

		if (extractedText !== undefined) {
			updates.extractedText = extractedText;
		}

		if (pageCount !== undefined) {
			updates.pageCount = pageCount;
		}

		if (wordCount !== undefined) {
			updates.wordCount = wordCount;
		}

		if (error !== undefined) {
			updates.extractionError = error;
		}

		await ctx.db.patch(documentId, updates);
	},
});

/**
 * Get documents pending extraction for a site
 */
export const getPendingExtraction = internalQuery({
	args: {
		siteId: v.id("sites"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { siteId, limit = 10 }) => {
		return await ctx.db
			.query("documents")
			.withIndex("by_extraction_status", (q) =>
				q.eq("siteId", siteId).eq("extractionStatus", "pending")
			)
			.take(limit);
	},
});

/**
 * Get documents with failed extraction for a site
 */
export const getFailedExtraction = internalQuery({
	args: {
		siteId: v.id("sites"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, { siteId, limit = 10 }) => {
		return await ctx.db
			.query("documents")
			.withIndex("by_extraction_status", (q) =>
				q.eq("siteId", siteId).eq("extractionStatus", "failed")
			)
			.take(limit);
	},
});

/**
 * Reset document extraction status to pending for retry
 */
export const resetForRetry = internalMutation({
	args: {
		documentId: v.id("documents"),
	},
	handler: async (ctx, { documentId }) => {
		await ctx.db.patch(documentId, {
			extractionStatus: "pending",
			extractionError: undefined,
		});
	},
});
