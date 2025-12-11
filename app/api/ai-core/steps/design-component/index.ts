import { generateComponentDesign } from "@/app/api/ai-core/steps/design-component/utils"
import {
  DesignProcessingWorkflowContext,
  FigmaDataWorkflowContext,
} from "../../type"

export const designComponent = async (
  context: FigmaDataWorkflowContext,
): Promise<DesignProcessingWorkflowContext> => {
  context.stream.write("start design component \n")

  const componentDesign = await generateComponentDesign(context)
//   console.log("componentDesign", componentDesign);
  context.stream.write("design component end \n\n")

  return {
    ...context,
    state: {
      figmaData: context.state.figmaData,
      designTask: componentDesign,
    },
  }
}
