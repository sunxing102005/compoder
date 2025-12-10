import { streamText, CoreMessage } from "ai"
import { ComponentDSLWorkflowContext } from "../../type"
import { ComponentTreeDSL } from "../generate-component-dsl"


const IMPORTANT_NOTE = `Important: Write the code directly inside each ComponentFile tag. Do NOT use any code block markers (like \`\`\`tsx, \`\`\`ts, etc.) inside the XML tags.

`

/**
 * 简化的文件结构，只包含 App.tsx, [ComponentName].tsx, index.less
 */
const simplifiedFileStructure = `${IMPORTANT_NOTE}Output component code in XML format as follows:
<ComponentArtifact name="ComponentName">
  <ComponentFile fileName="App.tsx" isEntryFile="true">
    import { ComponentName } from './ComponentName';
    import './index.less';
    
    const mockProps = {
      // Define mock data here
    };
    
    export default function App() {
      return <ComponentName {...mockProps} />;
    }
  </ComponentFile>
  
  <ComponentFile fileName="[ComponentName].tsx">
    // Main component implementation
    export const ComponentName = () => {
      // Component implementation
    }
  </ComponentFile>

  <ComponentFile fileName="index.less">
    // Styles for the component
    // Use LESS syntax for styling
  </ComponentFile>
</ComponentArtifact>
`
const baseSystemPrompt = `
    ## 目标
        根据组件树 DSL 生成完整的组件代码，生成「React + TypeScript + Less」代码。
    ## 输入
        - 组件树 DSL（JSON 格式）
    ## 样式规范
        - 样式文件必须使用 LESS 语法（index.less）
        - 可以使用 LESS 的特性，如嵌套、变量、混合等
        - 使用 BEM 风格 className，例如：".order-submit-bar", ".order-submit-bar__price".
        - 使用 flexible 布局，适配移动端宽度（375 逻辑宽考虑）。
        - 不使用行内样式

    ## Props 设计
        - 根据 JSON 中的 props/文案/交互，设计合理的 Props interface。
        - 不要使用 any。
        - 对外 props 要尽量通用：如 title、desc、price、onSubmit 等。
        - 为组件属性设置默认值供开发调试样式使用,默认值与json数据中一致。
    ## 组件写法
        - 使用 React + TSX 函数组件，使用 FC<Props>。
        - 仅使用内部基础组件：Font, Button
        - 所有基础组件从 "@capp/immotors-ui" 导入。
        - 样式文件命名：index.less，并通过 "import './index.less';" 引入。
`
/**
 * 构建系统提示词
 * TODO: 后续补充特定的提示词内容
 */
const buildSystemPrompt = (
    context: ComponentDSLWorkflowContext,
): string => {
  const basePrompt = context.query.genComFromDslSysPrompt || baseSystemPrompt;
  const specificPrompt = `
    # 你是一个高级前端工程师，擅长根据组件树 DSL 生成高质量的组件代码
    # 基本要求
    ${basePrompt}
    # 输出要求
    ${simplifiedFileStructure}
  `

  return specificPrompt
}

/**
 * 构建用户消息
 */
const buildUserMessage = (
  prompt: ComponentDSLWorkflowContext["query"]["prompt"],
  componentTreeDSL: ComponentTreeDSL,
): Array<CoreMessage> => {

  // 格式化 DSL 数据
  const dslContent = JSON.stringify(componentTreeDSL, null, 2)
  const content = `
## 组件树 DSL
${dslContent}
请根据以上组件树 DSL 生成完整的组件代码。
  `.trim()

  return [
    {
      role: "user",
      content: content,
    },
  ]
}

/**
 * 从 DSL 生成组件代码
 */
export async function generateComponentFromDSL(
  context: ComponentDSLWorkflowContext,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context)
  const componentTreeDSL = context.state.componentTreeDSL

  const messages = buildUserMessage(context.query.prompt, componentTreeDSL)

//   console.log("generate-component-from-dsl systemPrompt:", systemPrompt)
//   console.log("generate-component-from-dsl messages:", messages)

  try {
    const stream = await streamText({
      system: systemPrompt,
      model: context.query.aiModel,
      messages,
    })

    let accumulatedCode = ""

    for await (const part of stream.textStream) {
      context.stream.write(part)
      accumulatedCode += part
    }

    if (!accumulatedCode) {
      throw new Error(
        "No response from the AI, please check the providers configuration and the apiKey balance",
      )
    }

    // console.log("generated component code from DSL:", accumulatedCode)
    
    return accumulatedCode
  } catch (err: unknown) {
    console.error("generate-component-from-dsl error:", err)
    if (err instanceof Error) {
      throw err
    }
    throw new Error(String(err))
  }
}
