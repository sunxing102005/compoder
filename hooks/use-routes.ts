"use client"

import { Settings2, SquareTerminal, BookOpen } from "lucide-react"
import { usePathname } from "next/navigation"

export const routes = [
  {
    title: "组件生成",
    url: "/main/codegen",
    icon: SquareTerminal,
  },
  {
    title: "知识库",
    url: "/main/knowledge-base",
    icon: BookOpen,
  },
  {
    title: "设置",
    url: "/main/settings",
    icon: Settings2,
  },
]

export default function useRoutes() {
  const pathname = usePathname()
  return routes.map(route => ({
    ...route,
    isActive: pathname.startsWith(route.url),
  }))
}
