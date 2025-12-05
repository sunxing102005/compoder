import { generateComponentFromDSL } from "./utils"
import {
  ComponentDSLWorkflowContext,
  GenerateProcessingWorkflowContext,
} from "../../type"

export const generateComponentFromDSLStep = async (
  context: ComponentDSLWorkflowContext,
): Promise<GenerateProcessingWorkflowContext> => {
  context.stream.write("start generate component code from DSL \n")

  const generatedCode = await generateComponentFromDSL(context)

  context.stream.write("generate component code from DSL end \n\n")

  return {
    ...context,
    state: {
      figmaData: context.state.figmaData,
      componentTreeDSL: context.state.componentTreeDSL,
      generatedCode,
    },
  }
}

