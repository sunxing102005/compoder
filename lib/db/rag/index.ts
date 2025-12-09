import { Schema, model, models } from "mongoose"

// 知识库模型
const KnowledgeBaseSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // 向量数据库配置
  vectorStoreConfig: {
    type: Object,
    default: null,
  },
  // 文本分割配置
  chunkingConfig: {
    type: Object,
    default: {
      type: "paragraph",
      maxHeadingDepth: 5,
      maxChunkSize: 1000,
      indexSize: 512,
      chunkSize: 1000,
      customSeparator: "\n\n",
    },
  }
})

// 文档模型（存储上传的文件信息）
const DocumentSchema = new Schema({
  knowledgeBaseId: {
    type: Schema.Types.ObjectId,
    ref: "KnowledgeBase",
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  originalPath: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
  error: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// 文档块模型（存储向量化后的文本块）
const DocumentChunkSchema = new Schema({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: "Document",
    required: true,
  },
  knowledgeBaseId: {
    type: Schema.Types.ObjectId,
    ref: "KnowledgeBase",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  metadata: {
    type: Object,
    default: {},
  },
  embedding: {
    type: [Number], // 向量数组
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export const KnowledgeBase = models.KnowledgeBase || model("KnowledgeBase", KnowledgeBaseSchema)
export const Document = models.Document || model("Document", DocumentSchema)
export const DocumentChunk = models.DocumentChunk || model("DocumentChunk", DocumentChunkSchema)