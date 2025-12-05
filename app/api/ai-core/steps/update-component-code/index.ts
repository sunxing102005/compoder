import { updateComponentCodeFromInput } from "./utils"
import {
  InitialWorkflowContext,
  GenerateProcessingWorkflowContext,
} from "../../type"

export const updateComponentCode = async (
  context: InitialWorkflowContext,
): Promise<GenerateProcessingWorkflowContext> => {
  context.stream.write("start update component code based on user input \n")

  const generatedCode = await updateComponentCodeFromInput(context)

  context.stream.write("update component code end \n\n")

  return {
    ...context,
    state: {
      generatedCode,
    },
  }
}

