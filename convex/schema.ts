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
    }).index("by_userId", ["userId"])
});

export default schema;