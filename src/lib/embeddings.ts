import { openai } from "@ai-sdk/openai"
import { embed, embedMany } from "ai"

const generateChunks = (input: string) => {
    return input
        .split("\n\n")
        .map(chunk => chunk.trim())
        .filter(Boolean)
}

export const generateEmbeddings = async (input: string): Promise<Array<{ content: string, embeddings: number[] }>> => {
    const chunks = generateChunks(input)

    const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values: chunks,
    })

    return embeddings.map((embedding, i) => ({
        content: chunks[i],
        embeddings: embedding,
    }))
}

export const generateEmbedding = async (value: string): Promise<number[]> => {
    const { embedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value
    })
    return embedding
}
