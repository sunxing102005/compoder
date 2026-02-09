import { NextRequest, NextResponse } from "next/server"
import {
  run,
  updateComponentWorkflow,
  designGenerateUpdateWorkflow,
} from "@/app/api/ai-core/workflow"
import { ComponentCodeApi } from "../type"
import { findCodegenById } from "@/lib/db/codegen/selectors"
import { getAIClient } from "@/app/api/ai-core/utils/aiClient"
import { getUserId } from "@/lib/auth/middleware"
import { connectToDatabase } from "@/lib/db/mongo"
import { validateSession } from "@/lib/auth/middleware"
import { LanguageModel } from "ai"
import { AIProvider } from "@/lib/config/ai-providers"
import { getComponentCodeDetail } from "@/lib/db/componentCode/selectors"
import {
  clearWorkflowTask,
  registerWorkflowTask,
} from "../workflow-manager"

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

    const params: ComponentCodeApi.editRequest = await request.json()

    const aiModel = getAIClient(params.provider as AIProvider, params.model)

    // validate parameters
    if (!params.codegenId || !params.prompt || !params.component) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      )
    }

    const codegenDetail = await findCodegenById(params.codegenId)
    const componentDetail = await getComponentCodeDetail(
      params.component.id,
    )

    const kbId = params.knowledgeBaseId || codegenDetail.knowledgeBaseId

    const workflow =
      (codegenDetail as any).pipelineType === "public-component-based"
        ? designGenerateUpdateWorkflow
        : updateComponentWorkflow

    const workflowTask = registerWorkflowTask(params.component.id, {
      type: "update",
      codegenId: params.codegenId,
      versionCountBefore: componentDetail.versions?.length || 0,
    })

    request.signal.addEventListener(
      "abort",
      () => workflowTask.controller.abort(),
      { once: true },
    )
    workflowTask.controller.signal.addEventListener(
      "abort",
      () => {
        try {
          writer.close()
        } catch (err) {
          console.error("Failed to close stream on abort", err)
        }
      },
      { once: true },
    )

    const streamWriter = {
      write: (chunk: string) => {
        if (workflowTask.controller.signal.aborted) return
        try {
          writer.write(encoder.encode(chunk))
        } catch (err) {
          console.error("Failed to write stream chunk", err)
        }
      },
      close: () => {
        try {
          writer.close()
        } catch (err) {
          console.error("Failed to close stream", err)
        }
      },
    }

    run(workflow, {
      stream: streamWriter,
      signal: workflowTask.controller.signal,
      query: {
        prompt: params.prompt,
        aiModel: aiModel as LanguageModel,
        rules: codegenDetail.rules,
        userId: userId!,
        component: params.component,
        knowledgeBaseId: kbId ? String(kbId) : undefined,
        knowledgeBaseName: codegenDetail.knowledgeBaseName,
        fetchFigmaNodesUrl: codegenDetail.fetchFigmaNodesUrl,
        dslConfigs: codegenDetail.dslConfigs,
      },
    }).finally(() => clearWorkflowTask(params.component.id))

    return new Response(stream.readable)
  } catch (error) {
    console.error("Failed to get component code detail:", error)
    return NextResponse.json(
      { error: "Failed to get component code detail" },
      { status: 500 },
    )
  }
}
