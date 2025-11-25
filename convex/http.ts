import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

import { convertToModelMessages, streamText, tool, UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { getAuthUserId } from "@convex-dev/auth/server";
import { findRelevantNotes } from "./notesAction";
import { z } from "zod";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
    path: "/api/chat",
    method: "POST",
    handler: httpAction(async (ctx, req) => {

        const userId = await getAuthUserId(ctx)

        if (!userId) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { messages }: { messages: UIMessage[] } = await req.json()

        const lastMessages = messages.slice(-10);


        const result = streamText({
            model: openai("gpt-4.1-mini"),
            messages: convertToModelMessages(lastMessages),
            system: `
      You are a helpful assistant that can search through the user's notes.
      Use the information from the notes to answer questions and provide insights.
      If the requested information is not available, respond with "Sorry, I can't find that information in your notes".
      You can use markdown formatting like links, bullet points, numbered lists, and bold text.
      Provide links to relevant notes using this relative URL structure (omit the base URL): '/notes?noteId=<note-id>'.
      Keep your responses concise and to the point.
      `,
            tools: {
                findRelevantNotes: tool({
                    description: "Retrieve relevant notes from the database based on the user's query",
                    parameters: z.object({
                        query: z.string().describe("The user's query")
                    }),
                    execute: async ({ query }) => {
                        console.log("findRelevantNotes query", query)
                        const relevantNotes = await ctx.runAction(internal.notesAction.findRelevantNotes, {
                            query,
                            userId
                        })
                        return relevantNotes.map(note => ({
                            id: note._id,
                            body: note.body,
                            title: note.body,
                            creationTime: note._creationTime
                        }))
                    }
                })
            },
            onError: (e) => {
                console.log("Error in streamText", e)
            }
        })

        return result.toUIMessageStreamResponse({
            headers: new Headers({
                // e.g. https://mywebsite.com, configured on your Convex dashboard
                "Access-Control-Allow-Origin": "*",
                Vary: "origin",
            }),
        })
    })
});

// Pre-flight request for /sendImage
http.route({
    path: "/api/chat",
    method: "OPTIONS",
    handler: httpAction(async (_, request) => {
        // Make sure the necessary headers are present
        // for this to be a valid pre-flight request
        const headers = request.headers;
        if (
            headers.get("Origin") !== null &&
            headers.get("Access-Control-Request-Method") !== null &&
            headers.get("Access-Control-Request-Headers") !== null
        ) {
            return new Response(null, {
                headers: new Headers({
                    // e.g. https://mywebsite.com, configured on your Convex dashboard
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST",
                    "Access-Control-Allow-Headers": "Content-Type, Digest, Authorization",
                    "Access-Control-Max-Age": "86400",
                }),
            });
        } else {
            return new Response();
        }
    }),
});

export default http;
