import { generateComponentTreeDSL, ComponentTreeDSL } from "./utils"
import {
  FigmaDataWorkflowContext,
  ComponentDSLWorkflowContext,
} from "../../type"

export const generateComponentDSL = async (
  context: FigmaDataWorkflowContext,
): Promise<ComponentDSLWorkflowContext> => {
  context.stream.write("start generate component tree DSL \n")

  const componentTreeDSL = await generateComponentTreeDSL(context)

  context.stream.write("generate component tree DSL end \n\n")

  return {
    ...context,
    state: {
      figmaData: context.state.figmaData,
      componentTreeDSL,
    },
  }
}

export type { ComponentTreeDSL }

