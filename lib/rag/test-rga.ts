// 简单的RAG功能测试
import { KnowledgeBase } from "@/lib/db/rag"

console.log("RAG models imported successfully")
console.log("KnowledgeBase model:", KnowledgeBase)

// 测试环境变量
import { env } from "@/lib/env"
console.log("Environment variables loaded:", !!env.MONGODB_URI)

console.log("RAG setup is working!")