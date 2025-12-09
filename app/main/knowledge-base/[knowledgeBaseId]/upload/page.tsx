"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
// import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { Upload, FileText, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react"

interface UploadedFile {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  progress: number
}

interface ChunkingConfig {
  type: 'paragraph' | 'length' | 'custom'
  // Paragraph settings
  maxHeadingDepth?: number
  maxChunkSize?: number
  indexSize?: number
  // Length settings
  chunkSize?: number
  // Custom settings
  customSeparator?: string
}

export default function KnowledgeBaseUploadPage() {
  const params = useParams()
  const router = useRouter()
  const { knowledgeBaseId } = params as { knowledgeBaseId: string }
  
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [chunkingConfig, setChunkingConfig] = useState<ChunkingConfig>({
    type: 'paragraph',
    maxHeadingDepth: 5,
    maxChunkSize: 1000,
    indexSize: 512,
    chunkSize: 1000,
    customSeparator: '\n\n',
  })
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({})
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({})

  // Step 1: Upload files
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      status: 'pending',
      progress: 0,
    }))

    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const uploadFile = async (fileId: string) => {
    const fileObj = uploadedFiles.find(f => f.id === fileId)
    if (!fileObj) return

    setUploadedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f)
    )

    try {
      const formData = new FormData()
      formData.append('file', fileObj.file)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/rag/knowledge-bases/${knowledgeBaseId}/documents`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { ...f, progress } : f)
          )
        }
      }

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            setUploadedFiles(prev => 
              prev.map(f => f.id === fileId ? { ...f, status: 'uploaded' } : f)
            )
            setUploadStatus(prev => ({ ...prev, [fileId]: 'success' }))
          } else {
            throw new Error(response.error || 'Upload failed')
          }
        } else {
          throw new Error('Upload failed')
        }
      }

      xhr.onerror = () => {
        throw new Error('Network error')
      }

      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? { ...f, status: 'failed' } : f)
      )
      setUploadStatus(prev => ({ ...prev, [fileId]: 'error' }))
      toast({
        title: "Error",
        description: `Failed to upload ${fileObj.file.name}`,
        variant: "destructive",
      })
    }
  }

  // Step 3: Preview files with proper encoding and chunking simulation
  const previewFile = async (fileId: string) => {
    const fileObj = uploadedFiles.find(f => f.id === fileId)
    if (!fileObj || filePreviews[fileId]) return

    const fileExtension = fileObj.file.name.split('.').pop()?.toLowerCase()
    
    if (fileExtension === 'xls' || fileExtension === 'xlsx') {
      // For Excel files, show a message instead of trying to parse binary data
      setFilePreviews(prev => ({ 
        ...prev, 
        [fileId]: '[Excel file - Binary format not displayable in preview]' 
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      let content = e.target?.result as string
      
      // Handle different encodings for text files
      if (typeof content === 'string') {
        // Simulate chunking based on current configuration for preview
        const chunks = simulateChunking(content, chunkingConfig)
        setFilePreviews(prev => ({ ...prev, [fileId]: chunks.join('\n--- CHUNK SEPARATOR ---\n') }))
      } else {
        setFilePreviews(prev => ({ ...prev, [fileId]: '[Binary file - Not displayable]' }))
      }
    }
    
    // Try UTF-8 first, then fallback
    try {
      reader.readAsText(fileObj.file, 'UTF-8')
    } catch (error) {
      reader.readAsText(fileObj.file)
    }
  }

  // Simulate chunking for preview purposes
  const simulateChunking = (content: string, config: ChunkingConfig): string[] => {
    if (config.type === 'paragraph') {
      // Split by paragraphs and headings (simplified)
      const paragraphs = content.split(/\n\s*\n/)
      return paragraphs.map((para, index) => {
        if (para.length > (config.maxChunkSize || 1000)) {
          // Further split long paragraphs
          const chunkSize = config.maxChunkSize || 1000
          const chunks = []
          for (let i = 0; i < para.length; i += chunkSize) {
            chunks.push(para.slice(i, i + chunkSize))
          }
          return chunks.join('\n[...continued...]\n')
        }
        return para
      })
    } else if (config.type === 'length') {
      // Split by fixed length
      const chunkSize = config.chunkSize || 1000
      const chunks = []
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize))
      }
      return chunks
    } else if (config.type === 'custom') {
      // Split by custom separator
      const separator = config.customSeparator || '\n\n'
      return content.split(separator).filter(chunk => chunk.trim().length > 0)
    }
    
    return [content]
  }

  // Step 4: Confirm and process
  const confirmUpload = async () => {
    try {
      // Update knowledge base with chunking configuration
      const response = await fetch(`/api/rag/knowledge-bases/${knowledgeBaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chunkingConfig: {
            type: chunkingConfig.type,
            ...(chunkingConfig.type === 'paragraph' && {
              maxHeadingDepth: chunkingConfig.maxHeadingDepth,
              maxChunkSize: chunkingConfig.maxChunkSize,
              indexSize: chunkingConfig.indexSize,
            }),
            ...(chunkingConfig.type === 'length' && {
              chunkSize: chunkingConfig.chunkSize,
              indexSize: chunkingConfig.indexSize,
            }),
            ...(chunkingConfig.type === 'custom' && {
              separator: chunkingConfig.customSeparator,
              indexSize: chunkingConfig.indexSize,
            }),
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update knowledge base configuration')
      }

      toast({
        title: "Success",
        description: "Documents uploaded and configured successfully",
      })
      
      // Wait a moment for backend processing to start, then redirect
      setTimeout(() => {
        router.push(`/main/knowledge-base/${knowledgeBaseId}`)
      }, 1000)
    } catch (error) {
      console.error('Confirm upload error:', error)
      toast({
        title: "Error",
        description: "Failed to confirm upload",
        variant: "destructive",
      })
    }
  }

  const nextStep = () => {
    if (currentStep === 1) {
      // Upload all pending files
      const pendingFiles = uploadedFiles.filter(f => f.status === 'pending')
      if (pendingFiles.length === 0 && uploadedFiles.length === 0) {
        toast({
          title: "Warning",
          description: "Please select at least one file to upload",
          variant: "destructive",
        })
        return
      }
      pendingFiles.forEach(f => uploadFile(f.id))
    }
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Upload Files</CardTitle>
          <CardDescription>Select files to upload to your knowledge base.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <Input
              type="file"
              multiple
              accept=".txt,.csv,.xls,.xlsx,.docx,.html,.md"
              onChange={handleFileSelect}
            //   className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button variant="outline">Choose Files</Button>
            </Label>
            <p className="text-sm text-muted-foreground mt-2">
              Supported formats: .txt, .csv, .xls, .xlsx, .docx, .html
            </p>
          </div>
          
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Selected Files:</h3>
              {uploadedFiles.map(file => (
                <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{file.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* {file.status === 'uploading' && (
                      <Progress value={file.progress} className="w-24" />
                    )} */}
                    {file.status === 'uploaded' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {file.status === 'failed' && (
                      <span className="text-red-500 text-sm">Failed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Chunking Configuration</CardTitle>
          <CardDescription>Configure how your documents will be split into chunks for processing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={chunkingConfig.type}
            onValueChange={(value: 'paragraph' | 'length' | 'custom') => 
              setChunkingConfig(prev => ({ ...prev, type: value }))
            }
            className="space-y-4"
          >
            {/* Paragraph-based chunking */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="paragraph" id="paragraph" />
              <div className="space-y-2">
                <Label htmlFor="paragraph" className="font-medium">Paragraph-based Chunking</Label>
                <p className="text-sm text-muted-foreground">
                  Split by markdown headings and paragraphs. Long paragraphs are further split by size.
                </p>
                {chunkingConfig.type === 'paragraph' && (
                  <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted rounded">
                    <div>
                      <Label htmlFor="maxHeadingDepth">Max Heading Depth</Label>
                      <Input
                        id="maxHeadingDepth"
                        type="number"
                        value={chunkingConfig.maxHeadingDepth}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          maxHeadingDepth: parseInt(e.target.value) || 5 
                        }))}
                        min="1"
                        max="6"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxChunkSize">Max Chunk Size</Label>
                      <Input
                        id="maxChunkSize"
                        type="number"
                        value={chunkingConfig.maxChunkSize}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          maxChunkSize: parseInt(e.target.value) || 1000 
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="indexSize">Index Size</Label>
                      <Input
                        id="indexSize"
                        type="number"
                        value={chunkingConfig.indexSize}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          indexSize: parseInt(e.target.value) || 512 
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Length-based chunking */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="length" id="length" />
              <div className="space-y-2">
                <Label htmlFor="length" className="font-medium">Length-based Chunking</Label>
                <p className="text-sm text-muted-foreground">
                  Split documents into fixed-size chunks.
                </p>
                {chunkingConfig.type === 'length' && (
                  <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted rounded">
                    <div>
                      <Label htmlFor="chunkSize">Chunk Size</Label>
                      <Input
                        id="chunkSize"
                        type="number"
                        value={chunkingConfig.chunkSize}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          chunkSize: parseInt(e.target.value) || 1000 
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="indexSizeLength">Index Size</Label>
                      <Input
                        id="indexSizeLength"
                        type="number"
                        value={chunkingConfig.indexSize}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          indexSize: parseInt(e.target.value) || 512 
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom separator chunking */}
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="custom" id="custom" />
              <div className="space-y-2">
                <Label htmlFor="custom" className="font-medium">Custom Separator Chunking</Label>
                <p className="text-sm text-muted-foreground">
                  Split documents using a custom separator.
                </p>
                {chunkingConfig.type === 'custom' && (
                  <div className="grid grid-cols-2 gap-4 mt-2 p-4 bg-muted rounded">
                    <div className="col-span-2">
                      <Label htmlFor="customSeparator">Custom Separator</Label>
                      <Input
                        id="customSeparator"
                        value={chunkingConfig.customSeparator}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          customSeparator: e.target.value 
                        }))}
                        placeholder="\n\n or --- or custom text"
                      />
                    </div>
                    <div>
                      <Label htmlFor="indexSizeCustom">Index Size</Label>
                      <Input
                        id="indexSizeCustom"
                        type="number"
                        value={chunkingConfig.indexSize}
                        onChange={(e) => setChunkingConfig(prev => ({ 
                          ...prev, 
                          indexSize: parseInt(e.target.value) || 512 
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Data Preview</CardTitle>
          <CardDescription>Preview your uploaded files and see how they will be chunked.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File list */}
            <div className="lg:col-span-1">
              <h3 className="font-medium mb-2">Uploaded Files</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadedFiles.filter(f => f.status === 'uploaded').map(file => (
                  <Button
                    key={file.id}
                    variant={selectedFileId === file.id ? "default" : "outline"}
                    className="w-full justify-start text-left"
                    onClick={() => {
                      setSelectedFileId(file.id)
                      previewFile(file.id)
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {file.file.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Preview area */}
            <div className="lg:col-span-2">
              {selectedFileId && filePreviews[selectedFileId] ? (
                <div className="border rounded p-4 h-96 overflow-y-auto">
                  <h4 className="font-medium mb-2">
                    {uploadedFiles.find(f => f.id === selectedFileId)?.file.name}
                  </h4>
                  <div className="whitespace-pre-wrap text-sm">
                    {filePreviews[selectedFileId].split('\n').map((line, index) => (
                      <div key={index} className="mb-2">
                        {line}
                        {index < filePreviews[selectedFileId].split('\n').length - 1 && (
                          <hr className="my-2 border-t border-dashed" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded p-8 text-center text-muted-foreground h-96 flex items-center justify-center">
                  Select a file to preview
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Step 4: Confirm Upload</CardTitle>
          <CardDescription>Review your files and confirm the upload to your knowledge base.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-medium">Files to Upload:</h3>
            {uploadedFiles.filter(f => f.status === 'uploaded').map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{file.file.name}</span>
                </div>
                <span className="text-sm text-green-600">Ready</span>
              </div>
            ))}
            
            <div className="p-4 bg-muted rounded">
              <h4 className="font-medium mb-2">Chunking Configuration:</h4>
              <div className="text-sm">
                {chunkingConfig.type === 'paragraph' && (
                  <>
                    <div>Type: Paragraph-based</div>
                    <div>Max Heading Depth: {chunkingConfig.maxHeadingDepth}</div>
                    <div>Max Chunk Size: {chunkingConfig.maxChunkSize}</div>
                    <div>Index Size: {chunkingConfig.indexSize}</div>
                  </>
                )}
                {chunkingConfig.type === 'length' && (
                  <>
                    <div>Type: Length-based</div>
                    <div>Chunk Size: {chunkingConfig.chunkSize}</div>
                    <div>Index Size: {chunkingConfig.indexSize}</div>
                  </>
                )}
                {chunkingConfig.type === 'custom' && (
                  <>
                    <div>Type: Custom Separator</div>
                    <div>Separator: "{chunkingConfig.customSeparator}"</div>
                    <div>Index Size: {chunkingConfig.indexSize}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Upload Documents</h1>
        <Button variant="ghost" onClick={() => router.back()}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3, 4].map(step => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {step}
            </div>
            {step < 4 && <div className={`w-8 h-0.5 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}

      {/* Navigation buttons */}
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={currentStep === 4 ? confirmUpload : nextStep}
          disabled={
            (currentStep === 1 && uploadedFiles.length === 0) ||
            (currentStep === 4 && uploadedFiles.filter(f => f.status === 'uploaded').length === 0)
          }
        >
          {currentStep === 4 ? 'Confirm Upload' : 'Next'}
          {currentStep !== 4 && <ChevronRight className="w-4 h-4 ml-2" />}
        </Button>
      </CardFooter>
    </div>
  )
}