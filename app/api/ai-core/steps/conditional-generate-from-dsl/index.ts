import { generateComponentFromDSLStep } from "../generate-component-from-dsl"
import { updateComponentCode } from "../update-component-code"
import {
  ComponentDSLWorkflowContext,
  GenerateProcessingWorkflowContext,
  UpdateRouteWorkflowContext,
} from "../../type"

/**
 * 条件步骤：如果有 DSL，从 DSL 生成代码；否则根据用户输入更新代码
 */
export const conditionalGenerateFromDSL = async (
  context: ComponentDSLWorkflowContext | GenerateProcessingWorkflowContext | UpdateRouteWorkflowContext,
): Promise<GenerateProcessingWorkflowContext> => {
  // 检查是否有 componentTreeDSL
  if ("componentTreeDSL" in context.state && context.state.componentTreeDSL) {
    // 有 DSL，从 DSL 生成代码
    return generateComponentFromDSLStep(context as ComponentDSLWorkflowContext)
  } else {
    // 没有 DSL，根据用户输入更新代码
    const { stream, query } = context
    const baseContext = {
      stream,
      query,
    }
    
    return updateComponentCode(baseContext)
  }
}

