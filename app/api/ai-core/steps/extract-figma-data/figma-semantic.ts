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

type FigmaNodeType =
  | "DOCUMENT"
  | "CANVAS"
  | "FRAME"
  | "GROUP"
  | "RECTANGLE"
  | "TEXT"
  | "ELLIPSE"
  | "POLYGON"
  | "VECTOR"
  | "LINE"
  | "COMPONENT"
  | "INSTANCE"
  | "COMPONENT_SET"
  | string

interface FigmaPaint {
  type: "SOLID" | string
  visible?: boolean
  opacity?: number
  color?: {
    r: number
    g: number
    b: number
  }
}

interface FigmaEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR" | string
  visible?: boolean
  radius?: number
}

interface FigmaTextStyle {
  fontSize?: number
  fontWeight?: number
  lineHeightPx?: number
  lineHeightPercent?: number
}

interface FigmaBBox {
  x: number
  y: number
  width: number
  height: number
}

interface FigmaNode {
  id: string
  name: string
  type: FigmaNodeType
  visible?: boolean
  opacity?: number
  children?: FigmaNode[]
  absoluteBoundingBox?: FigmaBBox
  fills?: FigmaPaint[]
  strokes?: FigmaPaint[]
  strokeWeight?: number
  cornerRadius?: number
  cornerRadii?: number[]
  effects?: FigmaEffect[]
  background?: FigmaPaint[]
  characters?: string
  style?: FigmaTextStyle
  componentId?: string
  parent?: FigmaNode
  rectangleCornerRadii?: number[]
}

interface FigmaNodesResponse {
  nodes: {
    [id: string]: {
      document: FigmaNode
      components?: any
    }
  }
}

interface FigmaDSLItem {
  frameId: string
  root: SemanticNode
}

const FIGMA_API_BASE = "https://api.figma.com/v1"

async function fetchFigmaNodes(fileKey: string, nodeIds: string[]): Promise<FigmaNodesResponse> {
  const token = process.env.FIGMA_API_TOKEN
  if (!token) {
    throw new Error("Missing FIGMA_API_TOKEN in environment variables.")
  }
  const idsParam = encodeURIComponent(nodeIds.join(","))
  const url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${idsParam}`
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": token,
    },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Figma API error ${response.status}: ${detail}`)
  }
  return (await response.json()) as FigmaNodesResponse
}

function getBBox(node: FigmaNode): FigmaBBox | undefined {
  return node.absoluteBoundingBox
}

function isInvisible(node: FigmaNode): boolean {
  if (node.visible === false) return true
  if (typeof node.opacity === "number" && node.opacity === 0) return true
  const box = getBBox(node)
  if (box && (box.width < 1 || box.height < 1)) return true
  return false
}

function getSolidFill(node: FigmaNode): FigmaPaint | undefined {
  return (node.fills || []).find(
    f => f.visible !== false && f.type === "SOLID" && (f.opacity ?? 1) > 0,
  )
}

function getSolidBg(node: FigmaNode): FigmaPaint | undefined {
  return (node.background || []).find(
    f => f.visible !== false && f.type === "SOLID" && (f.opacity ?? 1) > 0,
  )
}

function getSolidStroke(node: FigmaNode): FigmaPaint | undefined {
  return (node.strokes || []).find(
    f => f.visible !== false && f.type === "SOLID" && (f.opacity ?? 1) > 0,
  )
}

const to255 = (x: number) => Math.max(0, Math.min(255, Math.round(x * 255)))

function figmaColorToHex(paint?: FigmaPaint): string | undefined {
  if (!paint || paint.type !== "SOLID" || !paint.color) return

  const { r, g, b } = paint.color
  const opacity = typeof paint.opacity === "number" ? paint.opacity : 1
  const alpha = Math.max(0, Math.min(1, opacity))
  const r255 = to255(r)
  const g255 = to255(g)
  const b255 = to255(b)
  const hex = (v: number) => v.toString(16).padStart(2, "0")

  if (alpha >= 0.999) {
    return `#${hex(r255)}${hex(g255)}${hex(b255)}`
  }

  const a255 = to255(alpha)
  return `#${hex(r255)}${hex(g255)}${hex(b255)}${hex(a255)}`
}

function hasShadow(node: FigmaNode): boolean {
  return !!(node.effects || []).find(
    e => e.visible !== false && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW"),
  )
}

function normalizeText(text?: string): string | undefined {
  if (!text) return
  const t = text.replace(/\s+/g, " ").trim()
  return t || undefined
}

function lower(name?: string): string {
  return (name || "").toLowerCase()
}

function isTextNode(node: FigmaNode): boolean {
  return node.type === "TEXT"
}

function isButtonLike(node: FigmaNode): boolean {
  const name = lower(node.name)
  if (name === "\u5e38\u89c4\u6309\u94ae") return true
  return false
}

function isRawContainer(node: FigmaNode): boolean {
  return node.type === "FRAME" || node.type === "GROUP" || node.type === "COMPONENT" || node.type === "INSTANCE"
}

function detectListLike(
  children: SemanticNode[],
): { isList: boolean; asListItems: SemanticNode[] } {
  if (!children || children.length < 3) {
    return { isList: false, asListItems: children }
  }

  const boxes: LayoutInfo[] = children.map(c => c.layout || {})
  let similar = true

  for (let i = 1; i < boxes.length; i += 1) {
    const a = boxes[0]
    const b = boxes[i]
    if (!a.width || !a.height || !b.width || !b.height) {
      similar = false
      break
    }
    const widthDiff = Math.abs(a.width - b.width) / a.width
    const heightDiff = Math.abs(a.height - b.height) / a.height
    if (widthDiff > 0.1 || heightDiff > 0.3) {
      similar = false
      break
    }
  }

  if (!similar) {
    return { isList: false, asListItems: children }
  }

  const items = children.map(c => ({
    ...c,
    kind: "ListItem" as const,
  }))

  return { isList: true, asListItems: items }
}

function toStyleInfo(node: FigmaNode): StyleInfo | undefined {
  const style: StyleInfo = {}
  const fill = getSolidFill(node)
  const background = getSolidBg(node)
  const stroke = getSolidStroke(node)

  if (node.style?.fontSize) style.fontSize = node.style.fontSize
  if (node.style?.fontWeight) style.fontWeight = node.style.fontWeight

  if (fill) {
    const color = figmaColorToHex(fill)
    if (node.type === "TEXT") {
      if (color) style.textColor = color
    } else {
      if (color) style.bgColor = color
    }
  }

  if (background) {
    const bg = figmaColorToHex(background)
    if (bg) style.bgColor = bg
  }

  if (stroke && (node.strokeWeight || 0) > 0) {
    const color = figmaColorToHex(stroke)
    if (color) style.borderColor = color
    style.borderWidth = node.strokeWeight
  }

  if (typeof node.cornerRadius === "number") {
    style.radius = node.cornerRadius
  }

  if (node.rectangleCornerRadii?.length === 4) {
    const radiusArr = node.rectangleCornerRadii
    style.borderTopLeftRadius = radiusArr[0]
    style.borderTopRightRadius = radiusArr[1]
    style.borderBottomRightRadius = radiusArr[2]
    style.borderBottomLeftRadius = radiusArr[3]
  }

  if (hasShadow(node)) {
    style.hasShadow = true
  }

  if (Object.keys(style).length === 0) return undefined
  return style
}

function toLayoutInfo(node: FigmaNode): LayoutInfo | undefined {
  const box = getBBox(node)
  if (!box) return undefined
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
  }
}

function postProcessChildren(children: SemanticNode[]): SemanticNode[] {
  return children
}

function toSemanticNode(node: FigmaNode, depth = 0): SemanticNode | null {
  if (isInvisible(node)) return null

  const layout = toLayoutInfo(node)
  const style = toStyleInfo(node)
  const name = node.name

  if (isTextNode(node)) {
    const text = normalizeText(node.characters)
    if (!text) return null
    return {
      id: node.id,
      name,
      kind: "TextBlock",
      text,
      layout,
      style,
      meta: {
        sourceType: node.type,
      },
    }
  }

  if (isButtonLike(node)) {
    const textChild = (node.children || []).find(
      c => isTextNode(c) && normalizeText(c.characters),
    )
    const text = normalizeText(textChild?.characters) || normalizeText(node.name)

    return {
      id: node.id,
      name,
      kind: "ButtonLike",
      text: text || undefined,
      layout,
      style,
      meta: {
        sourceType: node.type,
      },
      children: [],
    }
  }

  if (isRawContainer(node)) {
    const children: SemanticNode[] = []
    for (const child of node.children || []) {
      const sn = toSemanticNode(child, depth + 1)
      if (sn) children.push(sn)
    }

    const processedChildren = postProcessChildren(children)
    const { isList, asListItems } = detectListLike(processedChildren)

    if (isList) {
      return {
        id: node.id,
        name,
        kind: "List",
        layout,
        style,
        meta: {
          sourceType: node.type,
        },
        children: asListItems,
      }
    }

    return {
      id: node.id,
      name,
      kind: depth === 0 ? "Frame" : "RawContainer",
      layout,
      style,
      meta: {
        sourceType: node.type,
      },
      children: processedChildren,
    }
  }

  return {
    id: node.id,
    name,
    kind: "Raw",
    layout,
    style,
    meta: {
      sourceType: node.type,
    },
  }
}

function buildDSLForFrame(frameId: string, frameNode: FigmaNode): FigmaDSLItem {
  const rootSemantic = toSemanticNode(frameNode, 0)
  const root: SemanticNode =
    rootSemantic ||
    ({
      id: frameNode.id,
      name: frameNode.name,
      kind: "Root",
      layout: toLayoutInfo(frameNode),
      style: toStyleInfo(frameNode),
      children: [],
      meta: {
        sourceType: frameNode.type,
      },
    } as SemanticNode)

  return {
    frameId,
    root,
  }
}

function attachParentRecursive(node: FigmaNode, parent: FigmaNode | null): FigmaNode {
  node.parent = parent || undefined
  if (node.children) {
    node.children = node.children.map(child => attachParentRecursive(child, node))
  }
  return node
}

export async function buildSemanticNodesFromFigma(
  fileKey: string,
  frameId: string,
): Promise<FigmaSemanticNode | null> {
  const ids = [frameId.replace("-", ":")]
  const data = await fetchFigmaNodes(fileKey, ids)
  const entry = data.nodes[ids[0]]
  if (!entry || !entry.document) {
    return null
  }
  const frameNode = attachParentRecursive(entry.document, null)
  const dsl = buildDSLForFrame(ids[0], frameNode)
  return { root: dsl.root }
}
