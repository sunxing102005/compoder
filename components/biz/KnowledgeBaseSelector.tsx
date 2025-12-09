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
}

export function KnowledgeBaseSelector({ value, onChange }: KnowledgeBaseSelectorProps) {
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
          title: "Error",
          description: data.error || "Failed to fetch knowledge bases",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching knowledge bases:", error)
      toast({
        title: "Error",
        description: "Failed to fetch knowledge bases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Knowledge Base:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select knowledge base" />
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
        Manage KBs
      </Button>
    </div>
  )
}