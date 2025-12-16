import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { Document, DocumentChunk } from "@/lib/db/rag"
import { unlink } from "fs/promises"
import { PgVectorStore } from "@/lib/rag/pgvector-store"
import { env } from "@/lib/env"

// DELETE: 删除指定文档
export async function DELETE(
  request: NextRequest,
  { params }: { params: { knowledgeBaseId: string; documentId: string } }
) {
  try {
    const { knowledgeBaseId, documentId } = params
    
    await connectToDatabase()
    
    // 查找文档
    const document = await Document.findById(documentId)
    if (!document) {
      return Response.json({ success: false, error: "Document not found" }, { status: 404 })
    }

    // 验证文档属于指定的知识库
    if (document.knowledgeBaseId.toString() !== knowledgeBaseId) {
      return Response.json({ success: false, error: "Document does not belong to this knowledge base" }, { status: 403 })
    }

    // 删除物理文件
    try {
      await unlink(document.originalPath)
    } catch (error) {
      console.warn(`Failed to delete file ${document.originalPath}:`, error)
      // 继续删除数据库记录，即使文件删除失败
    }

    // 删除相关的chunks
    await DocumentChunk.deleteMany({ documentId })
    if (env.VECTOR_STORE_TYPE === "pgvector") {
      await PgVectorStore.deleteByDocument(documentId)
    }

    // 删除文档记录
    await Document.findByIdAndDelete(documentId)

    return Response.json({ success: true, message: "Document deleted successfully" })
  } catch (error) {
    console.error("Error deleting document:", error)
    return Response.json({ success: false, error: "Failed to delete document" }, { status: 500 })
  }
}
