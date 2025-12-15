export interface CodegenRule {
  type:
    | "public-components"
    | "styles"
    | "private-components"
    | "file-structure"
    | "attention-rules"
  description: string
  prompt?: string // only used when type is "styles" | "file-structure" | "special-attention"
  dataSet?: string[] // only used when type is "public-components"
  docs?: {
    // only used when type is "private-components"
    [libraryName: string]: {
      [componentName: string]: {
        description: string
        api: string
      }
    }
  }
}

export type CodegenDslConfigType =
  | "gen-com-from-dsl-sys-prompt"
  | "simplified-file-structure"

export interface CodegenDslConfig {
  type: CodegenDslConfigType
  description?: string
  prompt: string
}

export interface Codegen {
  title: string
  description: string
  fullStack: "React" | "Vue"
  guides: string[]
  model: string
  codeRendererUrl: string
  rules?: CodegenRule[]
  fetchFigmaNodesUrl?: string
  dslConfigs?: CodegenDslConfig[]
  pipelineType?: string
  knowledgeBaseId?: string
  knowledgeBaseName?: string
}
