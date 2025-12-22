import { pipe } from "./utils/pipe"
import { withErrorHandling } from "./utils/errorHandling"
import {
  routeUpdate,
  extractFigmaData,
  generateComponentDSL,
  generateComponentFromDSLStep,
  conditionalGenerateDSL,
  conditionalGenerateFromDSL,
  conditionalDesignGenerateUpdate,
  designComponent,
  generateComponent,
  updateComponent,
  initComponent,
} from "./steps"
import { InitialWorkflowContext, WorkflowContext } from "./type"

type Workflow = (context: InitialWorkflowContext) => Promise<WorkflowContext>
type WorkflowName =
  | "updateComponentWorkflow"
  | "initComponentWorkflow"
  | "designGenerateInitWorkflow"
  | "designGenerateUpdateWorkflow"

export const updateComponentWorkflow = pipe<
  InitialWorkflowContext,
  WorkflowContext
>(
  withErrorHandling(routeUpdate),
  withErrorHandling(conditionalGenerateDSL),
  withErrorHandling(conditionalGenerateFromDSL),
  withErrorHandling(updateComponent),
)

export const initComponentWorkflow = pipe<
  InitialWorkflowContext,
  WorkflowContext
>(
  withErrorHandling(extractFigmaData),
  withErrorHandling(generateComponentDSL),
  withErrorHandling(generateComponentFromDSLStep),
  withErrorHandling(initComponent),
)

// 新建组件：支持文字或 Figma 链接，直接经过设计 -> 生成 -> 保存
export const designGenerateInitWorkflow = pipe<
  InitialWorkflowContext,
  WorkflowContext
>(
  withErrorHandling(extractFigmaData),
  withErrorHandling(generateComponent),
  withErrorHandling(initComponent),
)

// 更新组件：支持文字或 Figma 链接，直接经过设计 -> 生成 -> 更新
export const designGenerateUpdateWorkflow = pipe<
  InitialWorkflowContext,
  WorkflowContext
>(
  withErrorHandling(routeUpdate),
  withErrorHandling(conditionalDesignGenerateUpdate),
)

export async function run(workflow: Workflow, context: InitialWorkflowContext) {
  const { signal } = context

  if (signal?.aborted) {
    context.stream.close()
    return {
      success: false,
      aborted: true,
    }
  }

  const abortPromise =
    signal &&
    new Promise((_, reject) =>
      signal.addEventListener(
        "abort",
        () => {
          const abortError = new Error("Workflow aborted")
          abortError.name = "AbortError"
          reject(abortError)
        },
        { once: true },
      ),
    )

  try {
    const execution = workflow(context)
    const result = abortPromise
      ? await Promise.race([execution, abortPromise])
      : await execution
    return {
      success: true,
      data: result.state,
    }
  } catch (error: any) {
    if (error?.name === "AbortError" || signal?.aborted) {
      context.stream.close()
      return {
        success: false,
        aborted: true,
      }
    }
    console.error("Workflow failed:", error?.toString())
    context.stream.write(error.toString())
    context.stream.close()
  }
}
