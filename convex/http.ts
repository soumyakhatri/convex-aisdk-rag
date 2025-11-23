import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

import { convertToModelMessages, streamText, UIMessage } from "ai"
import { openai } from "@ai-sdk/openai"
import { getAuthUserId } from "@convex-dev/auth/server";

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

        const result = streamText({
            model: openai("gpt-4.1-mini"),
            messages: convertToModelMessages(messages),
            onError: (e) => {
                console.log(e)
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
