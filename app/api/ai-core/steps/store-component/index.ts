import {
  initComponentCode,
  updateComponentCodeVersion,
} from "@/lib/db/componentCode/mutations"
import { GenerateProcessingWorkflowContext } from "../../type"
import { transformComponentArtifactFromXml } from "@/lib/xml-message-parser/parser"

// Helper function to merge component files
function mergeComponentFiles(originalXml: string, newXml: string): string {
  // 解析原始XML和新的XML
  const originalComponent = transformComponentArtifactFromXml(originalXml)
  const newComponent = transformComponentArtifactFromXml(newXml)

  if (!originalComponent || !newComponent) {
    // 如果无法解析，直接返回原始的XML
    return originalXml
  }

  // 创建一个文件名到文件内容的映射
  const fileMap = new Map()

  // 先添加所有原始文件
  originalComponent.files.forEach(file => {
    fileMap.set(file.name, {
      content: file.content,
      isEntryFile: file.isEntryFile,
    })
  })

  // 然后用新文件覆盖或添加
  newComponent.files.forEach(file => {
    fileMap.set(file.name, {
      content: file.content,
      isEntryFile: file.isEntryFile,
    })
  })

  // 构建合并后的XML
  const mergedName =
    newComponent.componentName || originalComponent.componentName || ""
  const mergedDescription =
    newComponent.componentDescription || originalComponent.componentDescription

  let mergedXml = `<ComponentArtifact name="${mergedName}"${
    mergedDescription ? ` description="${mergedDescription}"` : ""
  }>`

  // 添加所有文件
  fileMap.forEach((file, fileName) => {
    mergedXml += `\n  <ComponentFile fileName="${fileName}" isEntryFile="${file.isEntryFile}">`
    mergedXml += file.content
    mergedXml += `</ComponentFile>`
  })

  mergedXml += "\n</ComponentArtifact>"

  return mergedXml
}

export const updateComponent = async (
  context: GenerateProcessingWorkflowContext,
): Promise<GenerateProcessingWorkflowContext> => {
  if (!context.query.component) {
    throw new Error("Component not found")
  }
  // 获取原始代码和新生成的代码
  const originalCode = context.query.component.code
  const newCode = context.state.generatedCode

  // 合并组件文件
  const mergedCode = mergeComponentFiles(originalCode, newCode)

  const newArtifact = transformComponentArtifactFromXml(newCode)
  const mergedArtifact = transformComponentArtifactFromXml(mergedCode)
  const nextName =
    newArtifact?.componentName ||
    mergedArtifact?.componentName ||
    context.query.component.name
  const nextDescription =
    newArtifact?.componentDescription || mergedArtifact?.componentDescription

  await updateComponentCodeVersion({
    id: context.query.component.id,
    prompt: context.query.prompt,
    code: mergedCode,
    name: nextName,
    description: nextDescription,
  })

  context.stream.close()

  return context
}

export const initComponent = async (
  context: GenerateProcessingWorkflowContext,
): Promise<GenerateProcessingWorkflowContext> => {
  if (!context.query.component) {
    throw new Error("Component not found")
  }
  const originalCode = context.query.component.code
  if (originalCode) {
    throw new Error("Component already initialized")
  }

  // 从组件树 DSL 或 designTask 中提取名称和描述
  let componentName: string | undefined
  let componentDescription: string | undefined

  if (context.state.componentTreeDSL) {
    // 从组件树 DSL 中提取信息
    // TODO: 根据实际的 DSL 结构提取组件名称和描述
    componentName = context.state.componentTreeDSL.name || context.state.componentTreeDSL.componentName
    componentDescription = context.state.componentTreeDSL.description || context.state.componentTreeDSL.componentDescription
  } else if (context.state.designTask) {
    // 向后兼容：从 designTask 中获取
    componentName = context.state.designTask.componentName
    componentDescription = context.state.designTask.componentDescription
  } else if (context.state.generatedCode) {
    // 兜底：从生成的 XML 代码中提取组件名
    const artifact = transformComponentArtifactFromXml(context.state.generatedCode)
    if (artifact?.componentName) {
      componentName = artifact.componentName
    }
    if (artifact?.componentDescription) {
      componentDescription = artifact.componentDescription
    }
  }

  // 进一步兜底：尽量避免直接复用用户输入的描述
  if (!componentDescription) {
    if ("figmaData" in context.state && context.state.figmaData) {
      componentDescription = "基于 Figma 设计生成的组件"
    } else {
      const userText = context.query.prompt
        .map(p => (p.type === "text" ? p.text : ""))
        .filter(Boolean)
        .join("\n")
      componentDescription = userText || "Generated component"
    }
  }

  await initComponentCode({
    id: context.query.component.id,
    code: context.state.generatedCode,
    name: componentName,
    description: componentDescription,
  })

  context.stream.close()

  return context
}
