declare module "less" {
  interface LessRenderOutput {
    css: string
  }

  interface LessRenderOptions {
    filename?: string
    syncImport?: boolean
  }

  const less: {
    render: (input: string, options?: LessRenderOptions) => Promise<LessRenderOutput>
  }

  export default less
}

