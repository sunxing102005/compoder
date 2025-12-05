import { generateComponentDSL } from "../generate-component-dsl"
import {
  FigmaDataWorkflowContext,
  ComponentDSLWorkflowContext,
  GenerateProcessingWorkflowContext,
  UpdateRouteWorkflowContext,
} from "../../type"

/**
 * 条件步骤：如果有 Figma 数据，生成 DSL；否则跳过
 */
export const conditionalGenerateDSL = async (
  context: FigmaDataWorkflowContext | UpdateRouteWorkflowContext,
): Promise<ComponentDSLWorkflowContext | GenerateProcessingWorkflowContext> => {
  // 检查是否是 FigmaDataWorkflowContext
  if ("figmaData" in context.state && context.state.figmaData !== undefined) {
    // 有 Figma 数据，生成 DSL
    return generateComponentDSL(context as FigmaDataWorkflowContext)
  } else {
    // 没有 Figma 数据，跳过此步骤，返回带有空状态的 GenerateProcessingWorkflowContext
    context.stream.write("Skipping DSL generation (no Figma data) \n")
    return {
      ...context,
      state: {
        generatedCode: "",
      },
    } as GenerateProcessingWorkflowContext
  }
}

