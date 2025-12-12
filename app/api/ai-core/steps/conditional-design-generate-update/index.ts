import { generateComponent } from "../generate-component"
import { updateComponent } from "../store-component"
import { updateComponentCode } from "../update-component-code"
import {
  FigmaDataWorkflowContext,
  GenerateProcessingWorkflowContext,
  InitialWorkflowContext,
  UpdateRouteWorkflowContext,
} from "../../type"

type UpdatableContext =
  | FigmaDataWorkflowContext
  | (InitialWorkflowContext & UpdateRouteWorkflowContext)

/**
 * 根据是否存在 Figma 数据决定更新路径：
 * - 有 Figma 链接：走设计 -> 生成 -> 更新。
 * - 无 Figma 链接：将文字需求直接用于代码增量修改，再更新。
 */
export const conditionalDesignGenerateUpdate = async (
  context: UpdatableContext,
): Promise<GenerateProcessingWorkflowContext> => {
  // 有 figmaData 字段时走设计+生成路径
  if ("figmaData" in context.state) {
    const genCtx = await generateComponent(
      context as FigmaDataWorkflowContext as any,
    )
    const updated = await updateComponent(
      genCtx as GenerateProcessingWorkflowContext,
    )
    return updated
  }

  // 无 Figma 链接，直接根据文字需求修改现有代码
  const updatedFromInput = await updateComponentCode(
    context as InitialWorkflowContext,
  )
  const merged = await updateComponent(
    updatedFromInput as GenerateProcessingWorkflowContext,
  )
  return merged
}
