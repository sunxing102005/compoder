import { NextRequest } from "next/server"
import { connectToDatabase } from "@/lib/db/mongo"
import { KnowledgeBase, Document } from "@/lib/db/rag"
import { join } from "path"
import { writeFile, mkdir } from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import { DocumentProcessingService } from "@/lib/rag/document-processing-service"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "rag")
await mkdir(UPLOAD_DIR, { recursive: true })

// GET: 获取指定知识库的文档列表
export async function GET(
  request: NextRequest,
  { params }: { params: { knowledgeBaseId: string } }
) {
  try {
    const { knowledgeBaseId } = params
    
    await connectToDatabase()
    const documents = await Document.find({ knowledgeBaseId }).sort({ createdAt: -1 })
    return Response.json({ success: true, data: documents })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return Response.json({ success: false, error: "Failed to fetch documents" }, { status: 500 })
  }
}

// POST: 上传文档到知识库
export async function POST(
  request: NextRequest,
  { params }: { params: { knowledgeBaseId: string } }
) {
  try {
    const { knowledgeBaseId } = params
    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return Response.json({ success: false, error: "File is required" }, { status: 400 })
    }

    // 验证知识库存在
    await connectToDatabase()
    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId)
    if (!knowledgeBase) {
      return Response.json({ success: false, error: "Knowledge base not found" }, { status: 404 })
    }

    // 保存文件
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || ""
    const allowedExtensions = ["txt", "csv", "xls", "xlsx", "docx", "html", "md"]
    
    if (!allowedExtensions.includes(fileExtension)) {
      return Response.json({ 
        success: false, 
        error: `Unsupported file type. Allowed: ${allowedExtensions.join(", ")}` 
      }, { status: 400 })
    }

    const fileId = uuidv4()
    const fileName = `${fileId}.${fileExtension}`
    const filePath = join(UPLOAD_DIR, fileName)
    
    const arrayBuffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(arrayBuffer))

    // 创建文档记录
    const document = new Document({
      knowledgeBaseId,
      fileName: file.name,
      fileType: fileExtension,
      fileSize: file.size,
      originalPath: filePath,
      status: "pending",
    })

    await document.save()

    // 异步处理文档（解析、分割、向量化）
    // 在生产环境中，这应该通过消息队列或后台任务系统处理
    // 这里使用简单的setTimeout来模拟异步处理
    setTimeout(async () => {
      try {
        await DocumentProcessingService.processDocument(document._id.toString())
      } catch (error) {
        console.error("Background processing failed:", error)
      }
    }, 100)

    return Response.json({ success: true, data: document })
  } catch (error) {
    console.error("Error uploading document:", error)
    return Response.json({ success: false, error: "Failed to upload document" }, { status: 500 })
  }
}