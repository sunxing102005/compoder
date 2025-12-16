import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { KnowledgeBase, Document, DocumentChunk } from "@/lib/db/rag"
import { unlink } from "fs/promises"
import { PgVectorStore } from "@/lib/rag/pgvector-store"
import { env } from "@/lib/env"

// GET: 获取知识库详情
export async function GET(
  request: NextRequest,
  { params }: { params: { knowledgeBaseId: string } }
) {
  try {
    const { knowledgeBaseId } = params
    
    await connectToDatabase()
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId)
    if (!knowledgeBase) {
      return Response.json({ success: false, error: "Knowledge base not found" }, { status: 404 })
    }
    
    return Response.json({ success: true, data: knowledgeBase })
  } catch (error) {
    console.error("Error fetching knowledge base:", error)
    return Response.json({ success: false, error: "Failed to fetch knowledge base" }, { status: 500 })
  }
}

// PUT: 更新知识库
export async function PUT(
  request: NextRequest,
  { params }: { params: { knowledgeBaseId: string } }
) {
  try {
    const { knowledgeBaseId } = params
    const body = await request.json()
    const { name, description, chunkingConfig } = body

    await connectToDatabase()
    const knowledgeBase = await KnowledgeBase.findByIdAndUpdate(
      knowledgeBaseId,
      { name, description, chunkingConfig, updatedAt: new Date() },
      { new: true }
    )

    if (!knowledgeBase) {
      return Response.json({ success: false, error: "Knowledge base not found" }, { status: 404 })
    }

    return Response.json({ success: true, data: knowledgeBase })
  } catch (error) {
    console.error("Error updating knowledge base:", error)
    return Response.json({ success: false, error: "Failed to update knowledge base" }, { status: 500 })
  }
}

// DELETE: 删除知识库（级联删除文档和chunks）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { knowledgeBaseId: string } }
) {
  try {
    const { knowledgeBaseId } = params
    
    await connectToDatabase()
    
    // 先删除所有相关文档和chunks
    const documents = await Document.find({ knowledgeBaseId })
    for (const doc of documents) {
      // 删除文件
      try {
        await unlink(doc.originalPath)
      } catch (error) {
        console.warn(`Failed to delete file ${doc.originalPath}:`, error)
      }
    }
    
    await Document.deleteMany({ knowledgeBaseId })
    await DocumentChunk.deleteMany({ knowledgeBaseId })
    if (env.VECTOR_STORE_TYPE === "pgvector") {
      await PgVectorStore.deleteByKnowledgeBase(knowledgeBaseId)
    }
    
    // 删除知识库
    const result = await KnowledgeBase.findByIdAndDelete(knowledgeBaseId)
    if (!result) {
      return Response.json({ success: false, error: "Knowledge base not found" }, { status: 404 })
    }

    return Response.json({ success: true, message: "Knowledge base deleted successfully" })
  } catch (error) {
    console.error("Error deleting knowledge base:", error)
    return Response.json({ success: false, error: "Failed to delete knowledge base" }, { status: 500 })
  }
}
