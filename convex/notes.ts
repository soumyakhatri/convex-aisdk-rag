import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createNoteWithEmbeddings = internalMutation({
    args: {
        title: v.string(),
        body: v.string(),
        embeddings: v.array(v.object({
            content: v.string(),
            embeddings: v.array(v.float64())
        })),
        userId: v.id("users")
    },
    returns: v.id("notes"),
    handler: async (ctx, args) => {
        const noteId = await ctx.db.insert("notes", {
            body: args.body,
            title: args.title,
            userId: args.userId
        })

        for (const embeddingData of args.embeddings) {
            await ctx.db.insert("noteEmbeddings", {
                userId: args.userId,
                noteId,
                content: embeddingData.content,
                embeddings: embeddingData.embeddings
            })
        }

        return noteId

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

        const noteEmbeddings = await ctx.db
            .query("noteEmbeddings")
            .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
            .collect()

        for (const noteEmbedding of noteEmbeddings) {
            await ctx.db.delete(noteEmbedding._id)
        }
    },
})

// export const findNotesByEmbeddingIds = internalQuery({
//     args: {
//         embeddingsIds: v.array(v.id("noteEmbeddings"))
//     },
//     handler: async (ctx, args) => {
//         const embeddings = []
//         for (const id of args.embeddingsIds) {
//             const embeddingData = await ctx.db.get(id)
//             if (embeddingData !== null) {
//                 embeddings.push(embeddingData)
//             }
//         }
//         const uniqueNoteIds = [
//             ...new Set(embeddings.map(embedding => embedding.noteId))
//         ]

//         const notes = []
//         for (const noteId of uniqueNoteIds) {
//             const note = await ctx.db.get(noteId)
//             if (note !== null) {
//                 notes.push(note)
//             }
//         }
//         return notes
//     },
// })

// export const findNotesByEmbeddingIds = internalQuery({
//   args: {
//     embeddingsIds: v.array(v.id("noteEmbeddings")),
//   },
//   handler: async (ctx, args) => {

//     // Fetch all embeddings in one call
//     const embeddings = await ctx.db.getMany(args.embeddingsIds);

//     const uniqueNoteIds = [
//       ...new Set(
//         embeddings
//           .filter(e => e !== null)
//           .map(e => e.noteId)
//       )
//     ];

//     // Fetch notes in one call
//     const notes = await ctx.db.getMany(uniqueNoteIds);

//     return notes.filter(n => n !== null);
//   }
// });

export const findNotesByEmbeddingIds = internalQuery({
  args: {
    embeddingsIds: v.array(v.id("noteEmbeddings")),
  },
  handler: async (ctx, args) => {

    // Fetch all embeddings in parallel
    const embeddings = await Promise.all(
      args.embeddingsIds.map(id => ctx.db.get(id))
    );

    const uniqueNoteIds = [
      ...new Set(
        embeddings
          .filter(e => e !== null)
          .map(e => e.noteId)
      )
    ];

    // Fetch all notes in parallel
    const notes = await Promise.all(
      uniqueNoteIds.map(id => ctx.db.get(id))
    );

    return notes.filter(n => n !== null);
  }
});

