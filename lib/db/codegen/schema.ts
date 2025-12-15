import mongoose from "mongoose"
import { Codegen } from "./types"

const CodegenRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "public-components",
      "styles",
      "private-components",
      "file-structure",
      "attention-rules",
    ],
    required: true,
  },
  description: {
    type: String,
    default: "",
    required: true,
  },
  dataSet: {
    type: [String],
    default: undefined,
  },
  prompt: {
    type: String,
    default: undefined,
  },
  docs: {
    // only used when type is "private-components"
    type: Object,
    of: {
      type: Object,
      of: {
        description: String,
        api: String,
      },
    },
    default: undefined,
  },
})

const CodegenSchema = new mongoose.Schema<Codegen>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    fullStack: {
      type: String,
      enum: ["React", "Vue"],
      required: true,
    },
    guides: {
      type: [String],
      default: [],
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    codeRendererUrl: {
      type: String,
      required: true,
    },
    rules: {
      type: [CodegenRuleSchema],
      default: [],
      required: false,
    },
    dslConfigs: {
      type: [
        {
          type: {
            type: String,
            enum: ["gen-com-from-dsl-sys-prompt", "simplified-file-structure"],
            required: true,
          },
          description: {
            type: String,
            default: "",
          },
          prompt: {
            type: String,
            required: true,
          },
        },
      ],
      default: undefined,
    },
    fetchFigmaNodesUrl: {
      type: String,
      default: undefined,
    },
    pipelineType: {
      type: String,
      default: "dsl",
    },
    knowledgeBaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KnowledgeBase",
      default: undefined,
    },
    knowledgeBaseName: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
)

export const CodegenModel =
  mongoose.models.Codegen || mongoose.model<Codegen>("Codegen", CodegenSchema)
