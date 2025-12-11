type StackType = "React" | "Vue"

interface JobItem {
  id: string
  title: string
  description: string
  fullStack: StackType
  pipelineType?: string
  knowledgeBaseId?: string
  knowledgeBaseName?: string
}

export interface CodegenListProps {
  items: JobItem[]
  onItemClick?: (id: string) => void
  className?: string
}

export type { JobItem, StackType }
