import { streamText, CoreMessage } from "ai"
import { FigmaDataWorkflowContext } from "../../type"
import { FigmaSemanticNode } from "../extract-figma-data/utils"
import basicComponentsDocs from "../../basic-components"
/**
 * 组件树 DSL 类型定义
 * 这里可以根据实际需求定义 DSL 结构
 */
export interface ComponentTreeDSL {
  [key: string]: any
}

/**
 * 构建系统提示词
 * TODO: 后续补充具体的提示词内容
 */
const buildSystemPrompt = (): string => {
  const systemPrompt = `
    # 你是前端组件生成助手，负责将 Figma 解析出的语义节点映射为公司内部的基础组件或原生结构。

    #【重要约束】
    1. 只能使用以下基础组件：
    - Font: 用于文本展示
    - Button: 用于交互按钮
    2. 必须严格遵守知识库中每个组件的使用规范和 props 定义。
    3. 当语义节点类型为 ButtonLike/Font 等时，优先映射为对应基础组件。
    4. 当没有合适的基础组件时，使用 "raw" 节点，交给后续生成自定义 HTML + Less。
    5. 不遗漏节点，当节点有背景色、背景图、可见时，可能作为背景使用，即使没内容也要保留它。
    6. 输出只允许为 JSON，结构如下：
        {
        "componentName": "XXX", // 业务组件名（如 OrderSubmitBar ）
        "props": {},
        "children": [
            {
            "type": "BaseComponent" | "Raw",
            "component": "Button" | "Font" |  null,
            "props": { },
            "rawHtml": "", // 当 type=Raw 时可选
            "styleHints": {}, // 从 DSL 提取的布局和样式提示
            "children": [ ... ]
            }
        ]
        }

  `
  
  return systemPrompt
}

/**
 * 获取业务组件文档
 * TODO: 后续从配置或数据库中获取业务组件文档
 * 可以是 JSON 或字符串格式
 */
const getBusinessComponentDocs = (): string | object => {
    return basicComponentsDocs;
}

/**
 * 构建用户消息
 */
const buildUserMessage = (
  prompt: FigmaDataWorkflowContext["query"]["prompt"],
  figmaData: FigmaSemanticNode | null,
  businessComponentDocs: string | object,
): Array<CoreMessage> => {
  // 格式化业务组件文档
  const docsContent =
    typeof businessComponentDocs === "string"
      ? businessComponentDocs
      : JSON.stringify(businessComponentDocs, null, 2)

  // 格式化 Figma 数据
  const figmaContent = figmaData
    ? JSON.stringify(figmaData, null, 2)
    : "未提供 Figma 数据"

  // 构建用户输入文本
  const userText = prompt
    .map(p => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n")

  const content = `
## Figma 设计数据
${figmaContent}

## 业务组件文档
${docsContent}

请根据以上信息生成组件树 DSL JSON。
  `.trim()

  return [
    {
      role: "user",
      content: content,
    },
  ]
}

/**
 * 解析 AI 响应为组件树 DSL
 */
const parseComponentTreeDSL = (response: string): ComponentTreeDSL => {
  try {
    // 尝试提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // 如果没有找到 JSON，返回原始响应作为字符串
    return { raw: response }
  } catch (error) {
    console.error("Failed to parse component tree DSL:", error)
    // 如果解析失败，返回原始响应
    return { raw: response, error: String(error) }
  }
}

/**
 * 生成组件树 DSL
 */
export async function generateComponentTreeDSL(
  context: FigmaDataWorkflowContext,
): Promise<ComponentTreeDSL> {
  const systemPrompt = buildSystemPrompt()
  const businessComponentDocs = getBusinessComponentDocs()
  const figmaData = context.state.figmaData

  const messages = buildUserMessage(
    context.query.prompt,
    figmaData,
    businessComponentDocs,
  )

//   console.log("generate-component-dsl systemPrompt:", systemPrompt)
//   console.log("generate-component-dsl messages:", messages)

  try {
    const stream = await streamText({
      system: systemPrompt,
      model: context.query.aiModel,
      messages,
    })

    let accumulatedResponse = ""

    for await (const part of stream.textStream) {
      context.stream.write(part)
      accumulatedResponse += part
    }

    if (!accumulatedResponse) {
      throw new Error(
        "No response from the AI, please check the providers configuration and the apiKey balance",
      )
    }

    const dsl = parseComponentTreeDSL(accumulatedResponse)
    // console.log("generated component tree DSL:", dsl)
    
    return dsl
  } catch (err: unknown) {
    console.error("generate-component-dsl error:", err)
    if (err instanceof Error) {
      throw err
    }
    throw new Error(String(err))
  }
}

