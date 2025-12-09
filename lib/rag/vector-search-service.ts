import { connectToDatabase } from "@/lib/db/mongo"
import { DocumentChunk } from "@/lib/db/rag"
import { env } from "@/lib/env"
import { OpenAIEmbeddings } from "@langchain/openai"

// 向量相似度搜索服务
export class VectorSearchService {
  // 生成查询文本的embedding
  static async generateQueryEmbedding(query: string): Promise<number[]> {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is required for vector search")
    }

    const embeddings = new OpenAIEmbeddings({
      modelName: env.EMBEDDING_MODEL || "text-embedding-v4",
      apiKey: env.OPENAI_API_KEY,
      // Avoid hanging forever; fail fast so we can fallback
      timeout: Number(env.RAG_EMBED_TIMEOUT_MS || 8000),
      configuration: env.OPENAI_BASE_URL
        ? {
            baseURL: env.OPENAI_BASE_URL,
          }
        : undefined,
    })

    return await embeddings.embedQuery(query)
  }

  // 计算余弦相似度
  static cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same length")
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  // 从知识库中搜索最相关的chunks
  static async searchRelevantChunks(
    knowledgeBaseId: string,
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<Array<{ content: string; similarity: number }>> {
    await connectToDatabase()
    
    // 如果没有可用的embedding数据，直接降级为简单检索，避免无意义的 embedding 请求
    const embeddedCount = await DocumentChunk.countDocuments({
      knowledgeBaseId,
      embedding: { $exists: true, $ne: [] },
    })
    if (embeddedCount === 0) {
      const chunks = await DocumentChunk.find({ knowledgeBaseId })
        .sort({ createdAt: -1 })
        .limit(topK)
      return chunks.map(chunk => ({
        content: chunk.content,
        similarity: 0,
      }))
    }

    // 获取所有有embedding的chunks
    const chunks = await DocumentChunk.find({ 
      knowledgeBaseId,
      embedding: { $exists: true, $ne: [] }
    }).limit(topK * 3) // 获取更多候选，然后排序

    if (chunks.length === 0) {
      // 如果没有embedding，返回所有chunks（降级方案）
      const allChunks = await DocumentChunk.find({ knowledgeBaseId }).limit(topK)
      return allChunks.map(chunk => ({ 
        content: chunk.content, 
        similarity: 0 
      }))
    }

    // 计算相似度并排序
    const similarities = chunks.map(chunk => ({
      content: chunk.content,
      similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding),
      metadata: chunk.metadata
    }))

    // 按相似度降序排序，取topK
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(({ content, similarity }) => ({ content, similarity }))
  }
}
