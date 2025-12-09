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
          title: "Success",
          description: "Knowledge base created successfully",
        })
        setIsCreateDialogOpen(false)
        setNewKB({
          name: "",
          description: "",
        })
        fetchKnowledgeBases()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create knowledge base",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating knowledge base:", error)
      toast({
        title: "Error",
        description: "Failed to create knowledge base",
        variant: "destructive",
      })
    }
  }

  const handleDeleteKnowledgeBase = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete knowledge base "${name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/rag/knowledge-bases/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Knowledge base deleted successfully",
        })
        fetchKnowledgeBases()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete knowledge base",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting knowledge base:", error)
      toast({
        title: "Error",
        description: "Failed to delete knowledge base",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Knowledge Base Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Knowledge Base
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Knowledge Base</DialogTitle>
              <DialogDescription>
                Create a new knowledge base for your RAG system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newKB.name}
                  onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
                  className="col-span-3"
                  placeholder="Enter knowledge base name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={newKB.description}
                  onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateKnowledgeBase}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : knowledgeBases.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No knowledge bases found. Create your first knowledge base to get started.
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
                <CardDescription>{kb.description || "No description"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Created: {new Date(kb.createdAt).toLocaleDateString()}</div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" asChild>
                  <a href={`/main/knowledge-base/${kb._id}`}>
                    <Upload className="w-4 h-4 mr-2" />
                    Manage Documents
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