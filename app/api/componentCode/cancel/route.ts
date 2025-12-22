import { NextRequest, NextResponse } from "next/server"
import { validateSession, getUserId } from "@/lib/auth/middleware"
import { connectToDatabase } from "@/lib/db/mongo"
import { ComponentCodeApi } from "../type"
import {
  cancelWorkflowTask,
  clearWorkflowTask,
  getWorkflowTask,
} from "../workflow-manager"
import {
  deleteComponentCode,
  rollbackComponentCodeVersion,
} from "@/lib/db/componentCode/mutations"
import { getComponentCodeDetail } from "@/lib/db/componentCode/selectors"

export async function POST(request: NextRequest) {
  let componentId: string | undefined
  try {
    const authError = await validateSession()
    if (authError) {
      return authError
    }

    await connectToDatabase()
    await getUserId()

    const body = (await request.json()) as ComponentCodeApi.cancelRequest

    componentId = body.componentId

    if (!body.componentId) {
      return NextResponse.json(
        { error: "Missing componentId" },
        { status: 400 },
      )
    }

    const workflowTask = getWorkflowTask(body.componentId)

    const cancelType = workflowTask?.type || body.type

    if (!cancelType) {
      return NextResponse.json(
        { error: "No active workflow to cancel" },
        { status: 404 },
      )
    }

    cancelWorkflowTask(body.componentId)

    if (cancelType === "init") {
      await deleteComponentCode({ id: body.componentId })
    } else {
      const componentDetail = await getComponentCodeDetail(body.componentId)
      await rollbackComponentCodeVersion({
        id: body.componentId,
        targetVersionCount:
          workflowTask?.versionCountBefore ||
          componentDetail.versions.length - 1,
      })
    }

    return NextResponse.json({ success: true, type: cancelType })
  } catch (error) {
    console.error("Failed to cancel workflow:", error)
    return NextResponse.json(
      { error: "Failed to cancel workflow" },
      { status: 500 },
    )
  } finally {
    if (componentId) {
      clearWorkflowTask(componentId)
    }
  }
}
