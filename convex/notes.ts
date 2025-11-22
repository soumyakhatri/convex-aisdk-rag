import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createNote = mutation({
    args: {
        title: v.string(),
        body: v.string(),
    },
    returns: v.id("notes"),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        if (!userId) throw new Error("Not authenticated");

        return await ctx.db.insert("notes", {
            body: args.body,
            title: args.title,
            userId
        })
    }
})

export const getNotes = query({
    args: {},
    handler: async (ctx) => {
        try {
            const userId = await getAuthUserId(ctx);

            if (!userId) {
                return []
            }

            return await ctx.db
                .query("notes")
                .withIndex("by_userId", q => q.eq("userId", userId))
                .order("desc")
                .collect()
        } catch (error) {
            console.log(error)
        }
    },
})

export const deleteNote = mutation({
    args: {
        noteId: v.id("notes")
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthenticated User")
        }
        const note = await ctx.db.get(args.noteId)

        if (!note) {
            throw new Error("Note does not exist.")
        }

        if (note.userId !== userId) {
            throw new Error("Unauthenticated user cannot delete this note.`")
        }
        await ctx.db.delete(args.noteId)
    },
})