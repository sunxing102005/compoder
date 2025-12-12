import { CodegenRule } from "@/lib/db/codegen/types"
import { LanguageModel } from "ai"
import { Prompt } from "@/lib/db/componentCode/types"
import { FigmaSemanticNode } from "./steps/extract-figma-data/utils"
import { ComponentTreeDSL } from "./steps/generate-component-dsl"

// 基础的查询类型
type WorkflowQuery = {
  prompt: Prompt[]
  aiModel: LanguageModel
  rules?: CodegenRule[]
  userId: string
  codegenId?: string
  knowledgeBaseId?: string
  knowledgeBaseName?: string
  fetchFigmaNodesUrl?: string
  genComFromDslSysPrompt?: string
  component?: {
    id: string
    name: string
    code: string
    prompt: Prompt[]
    isInitialized?: boolean
  }
}

// 工作流状态类型
type WorkflowState = {
  designTask: {
    componentName: string
    componentDescription: string
    library: Array<{
      name: string
      components: string[]
      description: string
    }>
    retrievedAugmentationContent?: string
  }
  generatedCode: string
}

// 初始 Context
export type InitialWorkflowContext = {
  stream: {
    write: (chunk: string) => void
    close: () => void
  }
  query: WorkflowQuery
  state?: never
}

// Figma 数据提取后的 Context
export type FigmaDataWorkflowContext = {
  stream: {
    write: (chunk: string) => void
    close: () => void
  }
  query: WorkflowQuery
  state: {
    figmaData: FigmaSemanticNode | null
  }
}

// 组件树 DSL 处理中的 Context
export type ComponentDSLWorkflowContext = {
  stream: {
    write: (chunk: string) => void
    close: () => void
  }
  query: WorkflowQuery
  state: {
    figmaData: FigmaSemanticNode | null
    componentTreeDSL: ComponentTreeDSL
  }
}

// design 处理中的 Context
export type DesignProcessingWorkflowContext = {
  stream: {
    write: (chunk: string) => void
    close: () => void
  }
  query: WorkflowQuery
  state: {
    figmaData?: FigmaSemanticNode | null
    designTask?: {
      componentName: string
      componentDescription: string
      library: Array<{
        name: string
        components: string[]
        description: string
      }>
      retrievedAugmentationContent?: string
    }
  }
}

// generate 处理中的 Context
export type GenerateProcessingWorkflowContext = {
  stream: {
    write: (chunk: string) => void
    close: () => void
  }
  query: WorkflowQuery
  state: {
    figmaData?: FigmaSemanticNode | null
    componentTreeDSL?: ComponentTreeDSL
    designTask?: {
      componentName: string
      componentDescription: string
      library: Array<{
        name: string
        components: string[]
        description: string
      }>
      retrievedAugmentationContent?: string
    }
    generatedCode: string
  }
}

// 路由更新的 Context（无 Figma 链接时）
export type UpdateRouteWorkflowContext = InitialWorkflowContext & {
  state: { hasFigmaLink: false }
}

// 统一的 Context 类型
export type WorkflowContext =
  | InitialWorkflowContext
  | UpdateRouteWorkflowContext
  | FigmaDataWorkflowContext
  | ComponentDSLWorkflowContext
  | DesignProcessingWorkflowContext
  | GenerateProcessingWorkflowContext
