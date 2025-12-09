import { connectToDatabase } from "@/lib/db/mongo"
import { Document, DocumentChunk, KnowledgeBase } from "@/lib/db/rag"
import { FileParserService, TextChunkingService, EmbeddingService } from "@/lib/rag/rag-service"
import { env } from "@/lib/env"
import { Document as LangchainDocument } from "@langchain/core/documents"

// 文档处理服务 - 异步处理上传的文档
export class DocumentProcessingService {
  static async processDocument(documentId: string) {
    try {
      await connectToDatabase()
      
      // 获取文档信息
      const document = await Document.findById(documentId)
      if (!document) {
        throw new Error(`Document ${documentId} not found`)
      }

      // 更新状态为 processing
      document.status = "processing"
      await document.save()

      // 获取知识库配置
      const knowledgeBase = await KnowledgeBase.findById(document.knowledgeBaseId)
      if (!knowledgeBase) {
        throw new Error(`Knowledge base not found for document ${documentId}`)
      }

      // 解析文件内容
      const content = await FileParserService.parseFile(
        document.originalPath,
        document.fileType
      )

      // 分割文本 - 根据配置类型选择分割策略
      let chunks: LangchainDocument[] = []
      
      if (knowledgeBase.chunkingConfig.type === 'paragraph') {
        // 按段落分块
        chunks = await TextChunkingService.splitText(
          content,
          knowledgeBase.chunkingConfig.maxChunkSize || 1000,
          200, // 默认overlap
          '\n\n'
        )
      } else if (knowledgeBase.chunkingConfig.type === 'length') {
        // 按长度分块
        chunks = await TextChunkingService.splitText(
          content,
          knowledgeBase.chunkingConfig.chunkSize || 1000,
          200, // 默认overlap
          '\n\n'
        )
      } else if (knowledgeBase.chunkingConfig.type === 'custom') {
        // 自定义分隔符分块
        chunks = await TextChunkingService.splitText(
          content,
          1000, // 使用默认chunk size
          200, // 默认overlap
          knowledgeBase.chunkingConfig.customSeparator || '\n\n'
        )
      } else {
        // 默认按长度分块
        chunks = await TextChunkingService.splitText(
          content,
          1000,
          200,
          '\n\n'
        )
      }

      // 生成向量并保存chunks
      const chunkPromises = chunks.map(async (chunk, index) => {
        try {
          // 生成embedding（如果配置了OpenAI API key）
          let embedding: number[] = []
          if (env.OPENAI_API_KEY) {
            embedding = await EmbeddingService.generateEmbedding(chunk.pageContent)
          }

          const documentChunk = new DocumentChunk({
            documentId: document._id,
            knowledgeBaseId: document.knowledgeBaseId,
            content: chunk.pageContent,
            metadata: {
              ...chunk.metadata,
              chunkIndex: index,
              fileName: document.fileName,
              fileType: document.fileType,
            },
            embedding,
          })

          return documentChunk.save()
        } catch (error) {
          console.error(`Error processing chunk ${index} for document ${documentId}:`, error)
          // 继续处理其他chunks，不中断整个过程
          return null
        }
      })

      // Wait for all chunks to be processed (with error tolerance)
      try {
        await Promise.all(chunkPromises)
      } catch (chunkError) {
        console.error(`Error in chunk processing for document ${documentId}:`, chunkError)
        // Continue anyway, as individual chunk errors are handled above
      }

      // 更新文档状态为 completed
      document.status = "completed"
      await document.save()

      console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`)
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error)
      
      // Ensure document status is updated to failed
      try {
        await connectToDatabase()
        const docToUpdate = await Document.findById(documentId)
        if (docToUpdate) {
          docToUpdate.status = "failed"
          docToUpdate.error = (error as Error).message
          await docToUpdate.save()
          console.log(`Document ${documentId} marked as failed`)
        }
      } catch (updateError) {
        console.error(`Failed to update document status to failed:`, updateError)
      }
    }
  }
}