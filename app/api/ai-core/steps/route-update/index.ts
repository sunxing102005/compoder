import { extractFigmaLink } from "../extract-figma-data/utils"
import {
  InitialWorkflowContext,
  FigmaDataWorkflowContext,
  UpdateRouteWorkflowContext,
} from "../../type"

/**
 * 路由步骤：检查用户输入是否包含 Figma 链接
 * 如果有，提取 Figma 数据并返回 FigmaDataWorkflowContext
 * 如果没有，返回带有标记的 context（后续步骤会跳过 Figma 相关步骤）
 */
export const routeUpdate = async (
  context: InitialWorkflowContext,
): Promise<FigmaDataWorkflowContext | UpdateRouteWorkflowContext> => {
  // 检查是否包含 Figma 链接
  const figmaLink = extractFigmaLink(context.query.prompt)

  if (figmaLink) {
    // 如果有 Figma 链接，提取 Figma 数据
    context.stream.write("Found Figma link, extracting Figma data \n")
    
    const { extractFigmaDataFromPrompt } = await import("../extract-figma-data/utils")
    const figmaData = await extractFigmaDataFromPrompt(context)

    return {
      ...context,
      state: {
        figmaData,
      },
    } as FigmaDataWorkflowContext
  } else {
    // 如果没有 Figma 链接，返回标记，让后续步骤跳过 Figma 相关步骤
    context.stream.write("No Figma link found, will update component based on user input \n")
    
    return {
      ...context,
      state: {
        hasFigmaLink: false,
      },
    } as InitialWorkflowContext & { state: { hasFigmaLink: false } }
  }
}

