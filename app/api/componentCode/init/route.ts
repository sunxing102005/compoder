import { NextRequest, NextResponse } from "next/server"
import {
  run,
  initComponentWorkflow,
  designGenerateInitWorkflow,
} from "@/app/api/ai-core/workflow"
import { ComponentCodeApi } from "../type"
import { findCodegenById } from "@/lib/db/codegen/selectors"
import { getAIClient } from "@/app/api/ai-core/utils/aiClient"
import { getUserId } from "@/lib/auth/middleware"
import { connectToDatabase } from "@/lib/db/mongo"
import { validateSession } from "@/lib/auth/middleware"
import { LanguageModel } from "ai"
import { AIProvider } from "@/lib/config/ai-providers"

export async function POST(request: NextRequest) {
  try {
    const authError = await validateSession()
    if (authError) {
      return authError
    }

    await connectToDatabase()

    const userId = await getUserId()

    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const body = (await request.json()) as ComponentCodeApi.initRequest
    const codegenDetail = await findCodegenById(body.codegenId)

    const aiModel = getAIClient(body.provider as AIProvider, body.model)

    const response = new Response(stream.readable)

    const kbId = body.knowledgeBaseId || codegenDetail.knowledgeBaseId

    const workflow =
      (codegenDetail as any).pipelineType === "figma-design"
        ? designGenerateInitWorkflow
        : initComponentWorkflow

    run(workflow, {
      stream: {
        write: (chunk: string) => writer.write(encoder.encode(chunk)),
        close: () => writer.close(),
      },
      query: {
        prompt: body.prompt,
        aiModel: aiModel as LanguageModel,
        rules: codegenDetail.rules,
        userId: userId!,
        codegenId: body.codegenId,
      knowledgeBaseId: kbId ? String(kbId) : undefined,
      knowledgeBaseName: codegenDetail.knowledgeBaseName,
      fetchFigmaNodesUrl: codegenDetail.fetchFigmaNodesUrl,
      dslConfigs: codegenDetail.dslConfigs,
      component: body.component,
    },
  })

    return response
  } catch (error) {
    console.error("Failed to get component code detail:", error)
    return NextResponse.json(
      { error: "Failed to get component code detail" },
      { status: 500 },
    )
  }
}
