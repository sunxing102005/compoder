import { detectDesignSource } from "../extract-figma-data/utils"
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
  const detection = detectDesignSource(context.query.prompt)

  // Figma 链接或上传图片时，走提取 -> DSL -> 代码生成
  if (detection.designSource === "figma" || detection.designSource === "image") {
    if (detection.designSource === "figma" && detection.figmaLink) {
      context.stream.write("Found Figma link, extracting Figma data \n")
    } else {
      context.stream.write("Image input detected, generating figmaData via model \n")
    }

    const { extractFigmaDataFromPrompt } = await import("../extract-figma-data/utils")
    const figmaData = await extractFigmaDataFromPrompt(context)
    console.log('figmaData===>', JSON.stringify(figmaData));
    if (figmaData) {
      return {
        ...context,
        state: {
          figmaData,
        },
      } as FigmaDataWorkflowContext
    }

    context.stream.write("No figmaData generated, fallback to direct code update \n")
  } else {
    // 纯文字，保持旧路径直接更新
    context.stream.write("Text-only update, skipping figmaData generation \n")
  }

  return {
    ...context,
    state: {
      hasFigmaLink: false,
    },
  } as InitialWorkflowContext & { state: { hasFigmaLink: false } }
}
