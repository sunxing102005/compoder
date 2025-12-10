"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Upload, FileText, Trash2, Plus } from "lucide-react"

interface Document {
  _id: string
  fileName: string
  fileType: string
  fileSize: number
  status: string
  createdAt: string
}

export default function KnowledgeBaseDocumentsPage() {
  const params = useParams()
  const router = useRouter()
  const { knowledgeBaseId } = params as { knowledgeBaseId: string }
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/rag/knowledge-bases/${knowledgeBaseId}/documents`)
      const data = await response.json()
      
      if (data.success) {
        setDocuments(data.data)
      } else {
        toast({
          title: "错误",
          description: data.error || "获取文档失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "错误",
        description: "获取文档失败",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchDocuments()
    
    // Set up auto-refresh using a ref to track document states
    const interval = setInterval(() => {
      fetchDocuments()
    }, 3000)
    
    autoRefreshIntervalRef.current = interval
    
    // Cleanup
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
        autoRefreshIntervalRef.current = null
      }
    }
  }, [knowledgeBaseId])

  // Effect to stop auto-refresh when all documents are completed
  useEffect(() => {
    const hasPendingOrProcessing = documents.some(
      doc => doc.status === 'pending' || doc.status === 'processing'
    )
    
    if (!hasPendingOrProcessing && autoRefreshIntervalRef.current) {
      // All documents are completed, stop the interval
      clearInterval(autoRefreshIntervalRef.current)
      autoRefreshIntervalRef.current = null
    }
  }, [documents])

  const handleDeleteDocument = async (documentId: string, fileName: string) => {
    if (!confirm(`确定删除文档「${fileName}」吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/rag/knowledge-bases/${knowledgeBaseId}/documents/${documentId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "成功",
          description: "文档删除成功",
        })
        fetchDocuments()
      } else {
        toast({
          title: "错误",
          description: data.error || "删除文档失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "错误",
        description: "删除文档失败",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed": return "text-green-600"
      case "processing": return "text-yellow-600"
      case "failed": return "text-red-600"
      default: return "text-gray-600"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">知识库文档</h1>
        <Button onClick={() => router.push(`/main/knowledge-base/${knowledgeBaseId}/upload`)}>
          <Plus className="w-4 h-4 mr-2" />
          上传文档
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">文档加载中...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          暂无文档，上传后开始使用。
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">已上传文档（{documents.length}）</h2>
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{doc.fileName}</div>
                      <div className="text-sm text-muted-foreground">
                        {doc.fileType.toUpperCase()} • {formatFileSize(doc.fileSize)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${getStatusColor(doc.status)}`}>
                      {getStatusText(doc.status)}
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc._id, doc.fileName)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
  const getStatusText = (status: string): string => {
    switch (status) {
      case "completed":
        return "已完成"
      case "processing":
        return "处理中"
      case "failed":
        return "失败"
      default:
        return "待处理"
    }
  }
