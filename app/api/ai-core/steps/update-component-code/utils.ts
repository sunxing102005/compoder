import { streamText, CoreMessage } from "ai"
import { InitialWorkflowContext, GenerateProcessingWorkflowContext } from "../../type"
import {
  getPublicComponentsRule,
  getFileStructureRule,
  getStylesRule,
  getSpecialAttentionRules,
} from "../../utils/codegenRules"
import basicComponentsDocs from "../../basic-components"
const IMPORTANT_NOTE = `Important: Write the code directly inside each ComponentFile tag. Do NOT use any code block markers (like \`\`\`tsx, \`\`\`ts, etc.) inside the XML tags.

When modifying existing component code, only return the <ComponentFile> nodes that need to be modified, without returning unchanged files. However, for each modified <ComponentFile> node, you must include the complete code content of that file, even if only a small portion was modified. This ensures the system correctly replaces the entire file content and maintains code integrity.

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

/**
 * 构建系统提示词
 */
const buildSystemPrompt = (
  rules?: InitialWorkflowContext["query"]["rules"],
): string => {
  const fileStructure =
    getFileStructureRule(rules || []) || simplifiedFileStructure



  return `
    # 你是一个资深前端工程师，擅长根据用户需求修改现有的组件代码
    ## 目标
    根据用户的需求修改现有的组件代码。只修改需要变更的部分，保持其他部分不变。
    
    ## 输出要求
    ${fileStructure}
    
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
    
    ## 基础组件文档
    ${basicComponentsDocs}
  `
}

/**
 * 构建用户消息
 */
const buildUserMessage = (
  context: InitialWorkflowContext,
): Array<CoreMessage> => {
  const messages: CoreMessage[] = []

  // 如果有现有组件，先展示现有代码
  if (context.query.component && context.query.component.code) {
    messages.push({
      role: "user",
      content: `现有组件代码：
${context.query.component.code}`,
    })

    messages.push({
      role: "assistant",
      content: `好的，我理解了现有组件的结构。`,
    })
  }

  // 添加用户的新需求
  const userText = context.query.prompt
    .map(p => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n")

  messages.push({
    role: "user",
    content: `请根据以下需求修改组件代码：
${userText || "无"}

请只返回修改后的文件内容，保持文件结构不变。`,
  })

  return messages
}

/**
 * 根据用户输入更新组件代码
 */
export async function updateComponentCodeFromInput(
  context: InitialWorkflowContext,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context.query.rules)
  const messages = buildUserMessage(context)

//   console.log("update-component-code systemPrompt:", systemPrompt)
//   console.log("update-component-code messages:", messages)

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

    // console.log("generated updated component code:", accumulatedCode + "...")
    
    return accumulatedCode
  } catch (err: unknown) {
    console.error("update-component-code error:", err)
    if (err instanceof Error) {
      throw err
    }
    throw new Error(String(err))
  }
}
