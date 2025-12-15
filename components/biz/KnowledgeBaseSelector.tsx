"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

interface KnowledgeBase {
  _id: string
  name: string
  description: string
}

interface KnowledgeBaseSelectorProps {
  value?: string
  onChange: (knowledgeBaseId: string) => void
  onSelect?: (payload: { id: string; name: string }) => void
}

export function KnowledgeBaseSelector({
  value,
  onChange,
  onSelect,
}: KnowledgeBaseSelectorProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKnowledgeBases()
  }, [])

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/rag/knowledge-bases")
      const data = await response.json()
      
      if (data.success) {
        setKnowledgeBases(data.data)
      } else {
        toast({
          title: "错误",
          description: data.error || "获取知识库失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching knowledge bases:", error)
      toast({
        title: "错误",
        description: "获取知识库失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (val: string) => {
    onChange(val)
    const kb = knowledgeBases.find(k => k._id === val)
    if (kb && onSelect) {
      onSelect({ id: kb._id, name: kb.name })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">知识库：</span>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="选择知识库" />
        </SelectTrigger>
        <SelectContent>
          {/* <SelectItem value="">None</SelectItem> */}
          {knowledgeBases.map((kb) => (
            <SelectItem key={kb._id} value={kb._id}>
              {kb.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open("/main/knowledge-base", "_blank")}
      >
        管理知识库
      </Button>
    </div>
  )
}
