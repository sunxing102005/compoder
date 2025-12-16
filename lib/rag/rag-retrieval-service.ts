import { connectToDatabase } from "@/lib/db/mongo"
import { DocumentChunk } from "@/lib/db/rag"
import { env } from "@/lib/env"
import { VectorSearchService } from "./vector-search-service"
import { PgVectorStore } from "./pgvector-store"

// RAG检索服务
export class RAGRetrievalService {
  // 从知识库中检索相关内容
  static async retrieveRelevantContent(
    knowledgeBaseId: string,
    query: string,
    topK: number = 5
  ): Promise<string> {
    try {
      const usePgVector = env.VECTOR_STORE_TYPE === "pgvector"

      // 如果没有配置OpenAI API key，使用降级方案
      if (!env.OPENAI_API_KEY) {
        if (usePgVector) {
          const chunks = await PgVectorStore.fetchRecentChunks(knowledgeBaseId, topK)
          return chunks.map(chunk => chunk.content).join("\n\n---\n\n")
        }

        await connectToDatabase()
        const chunks = await DocumentChunk.find({ knowledgeBaseId })
          .sort({ createdAt: -1 })
          .limit(topK)
        
        return chunks.map(chunk => chunk.content).join("\n\n---\n\n")
      }

      // 生成查询embedding
      const queryEmbedding = await VectorSearchService.generateQueryEmbedding(query)

      // 执行向量相似度搜索
      const relevantChunks = await VectorSearchService.searchRelevantChunks(
        knowledgeBaseId,
        queryEmbedding,
        topK
      )
      
      // 返回最相关的内容
      return relevantChunks
        .map(chunk => `${chunk.content} [Similarity: ${chunk.similarity.toFixed(4)}]`)
        .join("\n\n---\n\n")
    } catch (error) {
      console.error("Error retrieving relevant content:", error)
      // 降级到简单检索
      try {
        const usePgVector = env.VECTOR_STORE_TYPE === "pgvector"
        if (usePgVector) {
          const chunks = await PgVectorStore.fetchRecentChunks(knowledgeBaseId, topK)
          return chunks.map(chunk => chunk.content).join("\n\n---\n\n")
        }

        await connectToDatabase()
        const chunks = await DocumentChunk.find({ knowledgeBaseId })
          .sort({ createdAt: -1 })
          .limit(topK)
        return chunks.map(chunk => chunk.content).join("\n\n---\n\n")
      } catch (fallbackError) {
        console.error("Fallback retrieval also failed:", fallbackError)
        return ""
      }
    }
  }

  // 根据Figma数据中的suggestedComponent搜索相关文档
  static async retrieveComponentDocs(
    knowledgeBaseId: string,
    figmaData: any,
    topK: number = 3
  ): Promise<string> {
    try {
      if (!figmaData || !knowledgeBaseId) {
        return ""
      }

      // 提取suggestedComponent信息
      const suggestedComponents = this.extractSuggestedComponents(figmaData)
      if (suggestedComponents.length === 0) {
        return ""
      }

      // 为每个组件构建查询并搜索
      const componentQueries = suggestedComponents.map(component => 
        `ComponentName: ${component.name}`
      )

      let allResults: string[] = []
      
      for (const query of componentQueries) {
        const relevantContent = await this.retrieveRelevantContent(knowledgeBaseId, query, topK)
        if (relevantContent) {
        // console.log("relevantContent==>",relevantContent)
          allResults.push(`## Relevant documentation for component:\n${query}\n\n${relevantContent}`)
        }
      }

      return allResults.join("\n\n===\n\n")
    } catch (error) {
      console.error("Error retrieving component docs:", error)
      return ""
    }
  }

  // 从Figma数据中提取suggestedComponent信息
  private static extractSuggestedComponents(figmaData: any): Array<{ name: string; description?: string; props?: any }> {
    const components: Array<{ name: string; description?: string; props?: any }> = []
    
    const extractFromNode = (node: any) => {
      if (node && typeof node === 'object') {
        // 检查suggestedComponent字段
        if (node.suggestedComponent) {
          components.push({
            name: node.suggestedComponent.name || node.suggestedComponent,
            description: node.suggestedComponent.description,
            props: node.suggestedComponent.props
          })
        }
        
        // 递归检查子节点
        if (Array.isArray(node.children)) {
          node.children.forEach(extractFromNode)
        }
        
        // 检查其他可能的字段
        Object.values(node).forEach(value => {
          if (typeof value === 'object' && value !== null) {
            extractFromNode(value)
          }
        })
      }
    }

    extractFromNode(figmaData)
    return components
  }
}
