import { readFile } from "fs/promises"
import * as XLSX from "xlsx"
import * as csv from "csv-parser"
// import * as pdf from "pdf-parse" // Removed due to server-side compatibility issues
import * as mammoth from "mammoth"
import { load } from "cheerio"
import { Document as LangchainDocument } from "@langchain/core/documents"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { env } from "@/lib/env"
// 文件解析服务
export class FileParserService {
  // 解析不同类型的文件
  static async parseFile(filePath: string, fileType: string): Promise<string> {
    try {
      const buffer = await readFile(filePath)
      
      switch (fileType.toLowerCase()) {
        case "txt":
          return buffer.toString("utf-8")
        
        case "csv":
          return await this.parseCSV(buffer)
        
        case "xls":
        case "xlsx":
          return await this.parseExcel(buffer)
        
        case "pdf":
          return await this.parsePDF(buffer)
        
        case "docx":
          return await this.parseDOCX(buffer)
        
        case "html":
          return await this.parseHTML(buffer)
        
        case "md":
          return buffer.toString("utf-8")
        
        default:
          throw new Error(`Unsupported file type: ${fileType}`)
      }
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error)
      throw error
    }
  }

  private static async parseCSV(buffer: Buffer): Promise<string> {
    const results: string[] = []
    return new Promise((resolve, reject) => {
      const { Readable } = require("stream")
      const readable = new Readable()
      readable.push(buffer)
      readable.push(null)
      
      readable
        .pipe(csv())
        .on("data", (data: any) => {
          results.push(JSON.stringify(data))
        })
        .on("end", () => {
          resolve(results.join("\n"))
        })
        .on("error", reject)
    })
  }

  private static async parseExcel(buffer: Buffer): Promise<string> {
    const workbook = XLSX.read(buffer, { type: "buffer" })
    let content = ""
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      content += `Sheet: ${sheetName}\n`
      content += json.map(row => row.join(",")).join("\n") + "\n\n"
    })
    
    return content
  }

  // private static async parsePDF(buffer: Buffer): Promise<string> {
  //   const data = await pdf.default(buffer)
  //   return data.text
  // }

  private static async parseDOCX(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  private static async parseHTML(buffer: Buffer): Promise<string> {
    const html = buffer.toString("utf-8")
    const $ = load(html)
    return $("body").text()
  }
}

// 文本分割服务
export class TextChunkingService {
  static async splitText(
    text: string,
    chunkSize: number = 1000,
    chunkOverlap: number = 200,
    separator: string = "\n\n"
  ): Promise<LangchainDocument[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize,
      chunkOverlap,
      separators: [separator, "\n", " ", ""],
    })

    return await splitter.createDocuments([text])
  }
}

// 向量化服务（使用OpenAI embedding）
export class EmbeddingService {
  static async generateEmbedding(text: string): Promise<number[]> {
    // 这里需要配置OpenAI API key
    // 在实际项目中，应该从环境变量获取
    const { OpenAIEmbeddings } = await import("@langchain/openai")
    
    const embeddings = new OpenAIEmbeddings({
      modelName: env.EMBEDDING_MODEL || "text-embedding-v4",
      apiKey: process.env.OPENAI_API_KEY, // 从环境变量获取
    })
    
    const vector = await embeddings.embedQuery(text)
    return vector
  }
}