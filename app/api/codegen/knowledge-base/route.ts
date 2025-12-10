import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth/middleware"
import { connectToDatabase } from "@/lib/db/mongo"
import { CodegenModel } from "@/lib/db/codegen/schema"
import { KnowledgeBase } from "@/lib/db/rag"

export async function POST(request: NextRequest) {
  try {
    const authError = await validateSession()
    if (authError) return authError

    await connectToDatabase()

    const body = await request.json()
    const { codegenId, knowledgeBaseId } = body || {}

    if (!codegenId || !knowledgeBaseId) {
      return NextResponse.json(
        { error: "Missing codegenId or knowledgeBaseId" },
        { status: 400 },
      )
    }

    const knowledgeBase = await KnowledgeBase.findById(knowledgeBaseId).lean()
    if (!knowledgeBase) {
      return NextResponse.json(
        { error: "Knowledge base not found" },
        { status: 404 },
      )
    }

    await CodegenModel.findByIdAndUpdate(codegenId, {
      knowledgeBaseId,
      knowledgeBaseName: knowledgeBase.name,
    })

    return NextResponse.json({
      success: true,
      knowledgeBaseId,
      knowledgeBaseName: knowledgeBase.name,
    })
  } catch (error) {
    console.error("Failed to update codegen knowledge base:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    )
  }
}

export const dynamic = "force-dynamic"
