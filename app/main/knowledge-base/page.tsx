"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { BookOpen, Plus, Trash2, Upload } from "lucide-react"

interface KnowledgeBase {
  _id: string
  name: string
  description: string
  createdAt: string
}

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKB, setNewKB] = useState({
    name: "",
    description: "",
  })

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

  const handleCreateKnowledgeBase = async () => {
    try {
      const response = await fetch("/api/rag/knowledge-bases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKB.name,
          description: newKB.description,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "成功",
          description: "知识库创建成功",
        })
        setIsCreateDialogOpen(false)
        setNewKB({
          name: "",
          description: "",
        })
        fetchKnowledgeBases()
      } else {
        toast({
          title: "错误",
          description: data.error || "创建知识库失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating knowledge base:", error)
      toast({
        title: "错误",
        description: "创建知识库失败",
        variant: "destructive",
      })
    }
  }

  const handleDeleteKnowledgeBase = async (id: string, name: string) => {
    if (!confirm(`确定删除知识库「${name}」吗？此操作不可恢复。`)) {
      return
    }

    try {
      const response = await fetch(`/api/rag/knowledge-bases/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "成功",
          description: "知识库删除成功",
        })
        fetchKnowledgeBases()
      } else {
        toast({
          title: "错误",
          description: data.error || "删除知识库失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting knowledge base:", error)
      toast({
        title: "错误",
        description: "删除知识库失败",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">知识库管理</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建知识库
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>新建知识库</DialogTitle>
              <DialogDescription>创建一个新的 RAG 知识库。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  名称
                </Label>
                <Input
                  id="name"
                  value={newKB.name}
                  onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
                  className="col-span-3"
                  placeholder="请输入知识库名称"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  描述
                </Label>
                <Input
                  id="description"
                  value={newKB.description}
                  onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
                  className="col-span-3"
                  placeholder="可选描述"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateKnowledgeBase}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : knowledgeBases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          暂无知识库，创建一个开始使用吧。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <Card key={kb._id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {kb.name}
                </CardTitle>
                <CardDescription>{kb.description || "暂无描述"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>创建时间：{new Date(kb.createdAt).toLocaleDateString()}</div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/main/knowledge-base/${kb._id}`}>
                    <Upload className="w-4 h-4 mr-2" />
                    管理文档
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteKnowledgeBase(kb._id, kb.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
