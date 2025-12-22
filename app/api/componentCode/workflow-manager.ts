type WorkflowType = "init" | "update"

type WorkflowTask = {
  componentId: string
  codegenId?: string
  controller: AbortController
  type: WorkflowType
  versionCountBefore?: number
}

const globalWorkflowStore =
  (globalThis as unknown as { __workflowTasks?: Map<string, WorkflowTask> })

if (!globalWorkflowStore.__workflowTasks) {
  globalWorkflowStore.__workflowTasks = new Map<string, WorkflowTask>()
}

const workflowTasks = globalWorkflowStore.__workflowTasks

export function registerWorkflowTask(
  componentId: string,
  task: Omit<WorkflowTask, "controller" | "componentId">,
) {
  const existing = workflowTasks.get(componentId)
  if (existing) {
    existing.controller.abort()
  }

  const controller = new AbortController()
  const workflowTask: WorkflowTask = {
    ...task,
    componentId,
    controller,
  }

  workflowTasks.set(componentId, workflowTask)
  return workflowTask
}

export function getWorkflowTask(componentId: string) {
  return workflowTasks.get(componentId)
}

export function cancelWorkflowTask(componentId: string) {
  const task = workflowTasks.get(componentId)
  if (task && !task.controller.signal.aborted) {
    task.controller.abort()
  }
  return task
}

export function clearWorkflowTask(componentId: string) {
  workflowTasks.delete(componentId)
}
