import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { KnowledgeBase } from "@/lib/db/rag"
import { join } from "path"
import { mkdir } from "fs/promises"

// 确保上传目录存在
const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "rag")
await mkdir(UPLOAD_DIR, { recursive: true })

// GET: 获取所有知识库
export async function GET() {
  try {
    await connectToDatabase()
    const knowledgeBases = await KnowledgeBase.find().sort({ createdAt: -1 })
    return Response.json({ success: true, data: knowledgeBases })
  } catch (error) {
    console.error("Error fetching knowledge bases:", error)
    return Response.json({ success: false, error: "Failed to fetch knowledge bases" }, { status: 500 })
  }
}

// POST: 创建新知识库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, chunkingConfig } = body

    if (!name) {
      return Response.json({ success: false, error: "Name is required" }, { status: 400 })
    }

    await connectToDatabase()
    const knowledgeBase = new KnowledgeBase({
      name,
      description: description || "",
      chunkingConfig: chunkingConfig || {
        chunkSize: 1000,
        chunkOverlap: 200,
        separator: "\n\n",
      },
    })

    // 设置默认的chunking配置
    knowledgeBase.chunkingConfig = {
      chunkSize: 1000,
      chunkOverlap: 200,
      separator: "\n\n",
    }

    await knowledgeBase.save()
    return Response.json({ success: true, data: knowledgeBase })
  } catch (error) {
    console.error("Error creating knowledge base:", error)
    return Response.json({ success: false, error: "Failed to create knowledge base" }, { status: 500 })
  }
}