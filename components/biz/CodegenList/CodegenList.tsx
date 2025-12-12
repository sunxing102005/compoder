"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CodegenListProps } from "./interface"
import { StackBadge } from "./StackBadge"
import { KnowledgeBaseSelector } from "../KnowledgeBaseSelector"
import { useState } from "react"
import { useUpdateCodegenKnowledgeBase } from "@/app/main/codegen/server-store/mutations"
import { toast } from "@/hooks/use-toast"

export function CodegenList({
  items,
  onItemClick,
  className,
}: CodegenListProps) {
  return (
    <div
      className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
        className || ""
      }`}
    >
      {items.map(item => (
        <CodegenCard
          key={item.id}
          item={item}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
}

function CodegenCard({
  item,
  onItemClick,
}: {
  item: CodegenListProps["items"][number]
  onItemClick?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [kbId, setKbId] = useState(item.knowledgeBaseId || "")
  const [kbName, setKbName] = useState(item.knowledgeBaseName || "")
  const updateKb = useUpdateCodegenKnowledgeBase()
  const hideKnowledgeBase = item.pipelineType === "figma-design"

  const handleSave = async () => {
    if (!kbId) {
      toast({
        title: "请选择知识库",
        variant: "default",
      })
      return
    }
    try {
      const result = await updateKb.mutateAsync({
        codegenId: item.id,
        knowledgeBaseId: kbId,
      })
      setKbName(result.knowledgeBaseName)
      toast({ title: "知识库已更新" })
      setOpen(false)
    } catch {
      // handled by mutation onError
    }
  }

  return (
    <Card
      className="p-6 transition-all cursor-pointer
            shadow-[0_0_15px_-3px_rgba(167,139,250,0.1)]
            hover:shadow-[0_0_20px_-3px_rgba(167,139,250,0.3)]
            relative after:absolute after:w-[1px] after:h-full after:right-0 after:top-0 after:bg-gradient-to-b after:from-transparent dark:after:via-violet-500/40 after:via-violet-300/30 after:to-transparent
            before:absolute before:w-full before:h-[1px] before:left-0 before:bottom-0 before:bg-gradient-to-r before:from-transparent dark:before:via-violet-500/40 before:via-violet-300/30 before:to-transparent
            "
      onClick={() => onItemClick?.(item.id)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="text-xl font-semibold truncate">
                  {item.title}
                </h3>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{item.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <StackBadge stack={item.fullStack} />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{item.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!hideKnowledgeBase && (
          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-sm">
              <p className="font-medium">知识库</p>
              <p className="text-muted-foreground">
                {kbName || "未关联"}
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={e => e.stopPropagation()}
                >
                  {kbName ? "编辑" : "关联"}
                </Button>
              </DialogTrigger>
              <DialogContent
                onClick={e => e.stopPropagation()}
                className="sm:max-w-[480px]"
              >
                <DialogHeader>
                  <DialogTitle>选择知识库</DialogTitle>
                </DialogHeader>
                <div className="pt-2 space-y-4">
                  <KnowledgeBaseSelector
                    value={kbId}
                    onChange={setKbId}
                    onSelect={({ name }) => setKbName(name)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={updateKb.isPending}
                    >
                      取消
                    </Button>
                    <Button onClick={handleSave} disabled={updateKb.isPending}>
                      保存
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </Card>
  )
}
