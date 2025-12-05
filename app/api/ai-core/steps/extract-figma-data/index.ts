import { extractFigmaDataFromPrompt, FigmaSemanticNode } from "./utils"
import {
  InitialWorkflowContext,
  FigmaDataWorkflowContext,
} from "../../type"

export type { FigmaSemanticNode }

export const extractFigmaData = async (
  context: InitialWorkflowContext,
): Promise<FigmaDataWorkflowContext> => {
  context.stream.write("start extract figma data \n")

  const figmaData = await extractFigmaDataFromPrompt(context)

  context.stream.write("extract figma data end \n\n")

  return {
    ...context,
    state: {
      figmaData,
    },
  }
}

