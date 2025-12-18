import { streamText, type CoreMessage } from "ai"
import { InitialWorkflowContext } from "../../type"
import basicComponentsDocs from "../../basic-components"
import { RAGRetrievalService } from "@/lib/rag/rag-retrieval-service"

export type SemanticNodeKind =
  | "Root"
  | "Frame"
  | "Group"
  | "ButtonLike"
  | "TextBlock"
  | "CardLike"
  | "List"
  | "ListItem"
  | "IconText"
  | "Image"
  | "RawContainer"
  | "Raw"

export interface LayoutInfo {
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface StyleInfo {
  fontSize?: number
  fontWeight?: number
  textColor?: string
  bgColor?: string
  radius?: number
  hasShadow?: boolean
  borderColor?: string
  borderWidth?: number
  borderTopLeftRadius?: number
  borderTopRightRadius?: number
  borderBottomRightRadius?: number
  borderBottomLeftRadius?: number
}

export interface SemanticNode {
  id: string
  name?: string
  kind: SemanticNodeKind
  suggestedComponent?: string
  text?: string
  layout?: LayoutInfo
  style?: StyleInfo
  meta?: Record<string, any>
  children?: SemanticNode[]
}

export interface FigmaSemanticNode {
  root: SemanticNode
}

export type DesignSource = "figma" | "image" | "text"

const COMPONENT_HINT_FALLBACK =
  "常见组件: Button, Form"

/**
 * 从用户输入中提取 Figma 链接
 * 支持格式: https://www.figma.com/design/{fileKey}/abc?node-id={frameId}
 */
export function extractFigmaLink(prompt: InitialWorkflowContext["query"]["prompt"]): string | null {
  for (const item of prompt) {
    if (item.type === "text" && item.text) {
      // 匹配 Figma 链接，包括可能的 @ 前缀
      const figmaLinkMatch = item.text.match(/@?https?:\/\/[^\s]*figma\.com\/[^\s]*/i)
      if (figmaLinkMatch) {
        return figmaLinkMatch[0].replace(/^@/, "") // 移除可能的 @ 前缀
      }
    }
  }
  return null
}

/**
 * 收集文本和图片输入，决定设计来源
 */
export function detectDesignSource(prompt: InitialWorkflowContext["query"]["prompt"]): {
  designSource: DesignSource
  figmaLink: string | null
  textPrompt: string
  images: string[]
} {
  const figmaLink = extractFigmaLink(prompt)
  const textPrompt = prompt
    .map(p => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n")
  const images = prompt.filter(p => p.type === "image").map(p => (p as any).image as string)

  if (figmaLink) {
    return { designSource: "figma", figmaLink, textPrompt, images }
  }

  if (images.length > 0) {
    return { designSource: "image", figmaLink: null, textPrompt, images }
  }

  return { designSource: "text", figmaLink: null, textPrompt, images }
}

const RAG_HINT_TIMEOUT_MS = 5000
const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
  ])
}

/**
 * 构建组件提示，优先使用知识库 RAG，失败时使用内置的基础组件提示
 */
async function buildComponentHints(
  knowledgeBaseId: string | undefined,
  query: string,
  designSource: DesignSource
): Promise<string> {
  if (!knowledgeBaseId) {
    return COMPONENT_HINT_FALLBACK
  }

  try {
    const preferFullDoc = designSource === "image"
    const ragQuery = preferFullDoc ? "UI 组件全集": query && query.trim() !== ""
        ? query : "常见 UI 组件"

    const ragResult = await withTimeout(
      RAGRetrievalService.retrieveRelevantContent(
        knowledgeBaseId,
        ragQuery,
        preferFullDoc ? 30 : 6
      ),
      RAG_HINT_TIMEOUT_MS
    )

    if (ragResult) {
      return ragResult
    }
  } catch (error) {
    console.warn("Failed to build RAG component hints, fallback to defaults", error)
  }

  try {
    const baseDocs =
      typeof basicComponentsDocs === "string"
        ? basicComponentsDocs
        : JSON.stringify(basicComponentsDocs, null, 2)
    return `${COMPONENT_HINT_FALLBACK}\n\n基础组件文档摘录:\n${baseDocs.slice(0, 2000)}`
  } catch (error) {
    console.warn("Failed to stringify basic components docs", error)
    return COMPONENT_HINT_FALLBACK
  }
}

/**
 * 为 LLM 构建系统提示
 */
const buildSemanticNodeSystemPrompt = () => `
你是前端设计解析助手，负责将图片或文字描述转成语义节点树，并尝试映射到候选基础组件。

输出 JSON，结构：
{
  "root": {
    "id": "root",
    "name": "Screen",
    "kind": "Root",
    "children": [ ...SemanticNode... ]
  }
}

SemanticNode 字段：
- id: string
- name?: string
- kind: ${[
  "Root",
  "Frame",
  "Group",
  "Text",
].join(" | ")}...
- suggestedComponent?: string // 优先从提供的组件提示里选择，匹配不到则 null/缺省
- text?: string // 节点内文字
- layout?: { x?: number; y?: number; width?: number; height?: number }
- style?: { fontSize?: number; fontWeight?: number; textColor?: string; bgColor?: string; radius?: number; hasShadow?: boolean; borderColor?: string; borderWidth?: number; borderTopLeftRadius?: number; borderTopRightRadius?: number; borderBottomRightRadius?: number; borderBottomLeftRadius?: number }
- meta?: {sourceType: FigmaNodeType} // 例如角色、状态、可交互性
- children?: SemanticNode[]

要求：
1. 仅输出 JSON，无多余文本。
2. 保持层级关系清晰，必要时生成 Frame/Group 容器。
3. suggestedComponent 只能使用组件提示中出现的组件名；不确定时填 undefined
4. 数值可粗略估计，保持 width/height 近似；缺失时可省略字段。
5. 控制节点数量，聚焦主要可视/交互元素。`

/**
 * 将 LLM 输出解析为 FigmaSemanticNode
 */
function parseSemanticNodes(response: string): FigmaSemanticNode {
  const safeParse = (input: string) => {
    try {
      return JSON.parse(input)
    } catch {
      return null
    }
  }

  const direct = safeParse(response)
  if (direct?.root) {
    return direct as FigmaSemanticNode
  }

  const jsonMatch = response.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = safeParse(jsonMatch[0])
    if (parsed?.root) {
      return parsed as FigmaSemanticNode
    }
  }

  return {
    root: {
      id: "root",
      kind: "Root",
      children: [],
    },
  }
}

/**
 * 构建用户消息，支持图片/文字输入
 */
function buildSemanticNodeMessages(options: {
  designSource: DesignSource
  textPrompt: string
  images: string[]
  componentHints: string
  knowledgeBaseName?: string
}): CoreMessage[] {
  const parts: any[] = []
  const description = `
设计来源: ${options.designSource}
知识库: ${options.knowledgeBaseName || "未提供"}
文字提示: ${options.textPrompt || "无"}

组件提示（仅可从中选择 suggestedComponent，选不到则留空/null）:
${options.componentHints}
`.trim()

  parts.push({ type: "text", text: description })
  options.images.forEach(img => {
    parts.push({ type: "image", image: img })
  })

  return [
    {
      role: "user",
      content: parts,
    },
  ]
}

/**
 * 从 Figma 链接中提取 fileKey 和 frameId
 */
function parseFigmaLink(link: string): { fileKey: string; frameId: string } | null {
  try {
    // 匹配格式: https://www.figma.com/design/{fileKey}/abc?node-id={frameId}
    const designMatch = link.match(/figma\.com\/design\/([^\/]+)/i)
    if (!designMatch) {
      return null
    }
    const fileKey = designMatch[1]

    // 提取 node-id 参数
    const url = new URL(link)
    const nodeId = url.searchParams.get("node-id")
    if (!nodeId) {
      return null
    }

    return {
      fileKey,
      frameId: nodeId,
    }
  } catch (error) {
    console.error("Failed to parse Figma link:", error)
    return null
  }
}

/**
 * 调用 Figma semantic-nodes 接口获取数据
 */
async function fetchFigmaSemanticNodes(
  fileKey: string,
  frameId: string,
  fetchFigmaNodesUrl?: string,
): Promise<FigmaSemanticNode | null> {
  try {
    const baseUrl =
      fetchFigmaNodesUrl ||
      "http://localhost:3100/figma/semantic-nodes"
    //   console.log("baseUrl===>", baseUrl);
    const response = await fetch(
      `${baseUrl}?fileKey=${encodeURIComponent(fileKey)}&frameId=${encodeURIComponent(frameId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Figma data: ${response.status} ${response.statusText}`,
      )
    }

    const data = await response.json()
    console.log("data", data.toString().slice(0,300));
    // 兼容接口返回 root 或直接返回节点的情况
    if ((data as any)?.root) {
      return data as FigmaSemanticNode
    }
    return { root: data as SemanticNode }
  } catch (error) {
    console.error("Failed to fetch Figma semantic nodes:", error)
    throw error
  }
}

/**
 * 使用多模态/文本模型生成语义节点树（含 suggestedComponent）
 */
async function generateSemanticNodesFromInput(
  context: InitialWorkflowContext,
  detection: ReturnType<typeof detectDesignSource>
): Promise<FigmaSemanticNode> {
  const componentHints = await buildComponentHints(
    context.query.knowledgeBaseId,
    detection.textPrompt,
    detection.designSource
  )
  const messages = buildSemanticNodeMessages({
    designSource: detection.designSource,
    textPrompt: detection.textPrompt,
    images: detection.images,
    componentHints,
    knowledgeBaseName: context.query.knowledgeBaseName,
  })

  const systemPrompt = buildSemanticNodeSystemPrompt()

  const stream = await streamText({
    system: systemPrompt,
    model: context.query.aiModel,
    messages,
  })

  let response = ""
  for await (const part of stream.textStream) {
    context.stream.write(part)
    response += part
  }

  if (!response) {
    throw new Error("Failed to generate figmaData from model (empty response)")
  }

  return parseSemanticNodes(response)
}

/**
 * 从用户输入中提取 Figma 数据
 */
export async function extractFigmaDataFromPrompt(
  context: InitialWorkflowContext,
): Promise<FigmaSemanticNode | null> {
  const detection = detectDesignSource(context.query.prompt)
  context.stream.write(`Design source: ${detection.designSource} \n`)

  if (detection.designSource === "figma" && detection.figmaLink) {
    context.stream.write(`Found Figma link: ${detection.figmaLink} \n`)
    const parsedLink = parseFigmaLink(detection.figmaLink)
    if (!parsedLink) {
      context.stream.write("Failed to parse Figma link \n")
      return null
    }

    const { fileKey, frameId } = parsedLink
    context.stream.write(`Extracted fileKey: ${fileKey}, frameId: ${frameId} \n`)

    try {
      const figmaData = await fetchFigmaSemanticNodes(
        fileKey,
        frameId,
        context.query.fetchFigmaNodesUrl,
      )
      if (figmaData) {
        context.stream.write("Successfully fetched Figma data \n")
      }
      return figmaData
    } catch (error) {
      context.stream.write(`Failed to fetch Figma data: ${error} \n`)
      throw error
    }
  }

  // 非 Figma 链路：使用模型生成 figmaData
  try {
    const figmaData = await generateSemanticNodesFromInput(context, detection)
    context.stream.write("\nGenerated figmaData from model \n\n")
    return figmaData
  } catch (error) {
    context.stream.write(`Failed to generate figmaData from model: ${error} \n`)
    throw error
  }
}
