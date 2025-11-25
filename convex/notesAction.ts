"use node"

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { generateEmbedding, generateEmbeddings } from "../src/lib/embeddings"
import { action, internalAction } from "./_generated/server"


import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const createNote = action({
    args: {
        title: v.string(),
        body: v.string(),
    },
    returns: v.id("notes"),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) throw new Error("Not authenticated");

        const text = `${args.title}\n\n${args.body}`

        const embeddings = await generateEmbeddings(text)

        const noteId: Id<"notes"> = await ctx.runMutation(internal.notes.createNoteWithEmbeddings, {
            title: args.title,
            body: args.body,
            embeddings,
            userId,
        })

        return noteId
    }
})

export const findRelevantNotes = internalAction({
    args: {
        query: v.string(),
        userId: v.id("users")
    },
    handler: async (ctx, args): Promise<Array<Doc<"notes">>> => {
        const userId = await getAuthUserId(ctx)

        if (!userId) {
            throw new Error("Unauthenticated user")
        }
        const embedding = await generateEmbedding(args.query)
        const result = await ctx.vectorSearch("noteEmbeddings", "by_embedding", {
            limit: 16,
            vector: embedding,
            filter: (q) => q.eq("userId", userId)
        })
        const resultWithScoreMoreThanThreshold = result.filter(r => r._score > 0.3);

        const embeddingsIds = resultWithScoreMoreThanThreshold.map(r => r._id);
        const matchingNotes = await ctx.runQuery(internal.notes.findNotesByEmbeddingIds, {
            embeddingsIds
        })
        return matchingNotes
    },
})