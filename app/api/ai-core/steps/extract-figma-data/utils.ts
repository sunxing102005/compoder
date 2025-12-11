import { InitialWorkflowContext } from "../../type"

export interface FigmaSemanticNode {
  [key: string]: any
}

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
    return data
  } catch (error) {
    console.error("Failed to fetch Figma semantic nodes:", error)
    throw error
  }
}

/**
 * 从用户输入中提取 Figma 数据
 */
export async function extractFigmaDataFromPrompt(
  context: InitialWorkflowContext,
): Promise<FigmaSemanticNode | null> {
  // 1. 从 prompt 中提取 Figma 链接
  const figmaLink = extractFigmaLink(context.query.prompt)

  if (!figmaLink) {
    context.stream.write("No Figma link found in user input \n")
    return null
  }

  context.stream.write(`Found Figma link: ${figmaLink} \n`)

  // 2. 解析链接获取 fileKey 和 frameId
  const parsedLink = parseFigmaLink(figmaLink)
  if (!parsedLink) {
    context.stream.write("Failed to parse Figma link \n")
    return null
  }

  const { fileKey, frameId } = parsedLink
  context.stream.write(`Extracted fileKey: ${fileKey}, frameId: ${frameId} \n`)

  // 3. 调用接口获取数据
  try {
    const figmaData = await fetchFigmaSemanticNodes(
      fileKey,
      frameId,
      context.query.fetchFigmaNodesUrl,
    )
    // console.log("figmaData==>", figmaData)
    if (figmaData) {
      context.stream.write("Successfully fetched Figma data \n")
    }
    return figmaData
  } catch (error) {
    context.stream.write(`Failed to fetch Figma data: ${error} \n`)
    throw error
  }
}
