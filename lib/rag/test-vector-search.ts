// 测试向量搜索功能
import { VectorSearchService } from "@/lib/rag/vector-search-service"

async function testVectorSearch() {
  try {
    const query = "Button component with primary style"
    const embedding = await VectorSearchService.generateQueryEmbedding(query)
    console.log("Query embedding generated:", embedding.length, "dimensions")
    
    // 测试余弦相似度
    const similarity = VectorSearchService.cosineSimilarity(embedding, embedding)
    console.log("Self-similarity (should be 1.0):", similarity)
    
    console.log("Vector search service is working!")
  } catch (error) {
    console.error("Vector search test failed:", error)
  }
}

testVectorSearch()