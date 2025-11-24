import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
    ...authTables,
    // Your other tables...
    notes: defineTable({
        title: v.string(),
        body: v.string(),
        userId: v.id("users")
    })
    .index("by_userId", ["userId"]),

    noteEmbeddings: defineTable({
        content: v.string(),
        embeddings: v.array(v.float64()),
        userId: v.id("users"),
        noteId: v.id("notes"),
    })
    .index("by_noteId", ["noteId"])
    .vectorIndex("by_embedding", {
        vectorField: "embeddings",
        dimensions: 1536,
        filterFields: ["userId"]
    })
});

export default schema;