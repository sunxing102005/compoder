import { WorkflowContext } from "../type"

export const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    const abortError = new Error("Workflow aborted")
    abortError.name = "AbortError"
    throw abortError
  }
}

export const withErrorHandling =
  <T extends WorkflowContext>(fn: (ctx: T) => Promise<WorkflowContext>) =>
  async (context: T): Promise<WorkflowContext> => {
    try {
      throwIfAborted(context.signal)
      const result = await fn(context)
      const mergedResult: WorkflowContext = {
        ...(result as WorkflowContext),
        signal: (result as WorkflowContext).signal || context.signal,
      }
      throwIfAborted(mergedResult.signal)
      return mergedResult
    } catch (error) {
      if (context.signal?.aborted) {
        const abortError = new Error("Workflow aborted")
        abortError.name = "AbortError"
        throw abortError
      }
      throw `<TryCatchError>${fn.name} failed: ${JSON.stringify(error)}</TryCatchError>\n`
    }
  }
