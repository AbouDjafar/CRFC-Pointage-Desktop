type RuntimeMessageKind = 'error' | 'success'

type RuntimeModalRequest = {
  kind: RuntimeMessageKind
  message: string
}

type RuntimeController = {
  showMessage: (request: RuntimeModalRequest) => void
  confirm: (message: string) => Promise<boolean>
}

let controller: RuntimeController | null = null

export function bindRuntimeController(nextController: RuntimeController | null) {
  controller = nextController
}

export function showError(message: string) {
  controller?.showMessage({ kind: 'error', message })
}

export function showSuccess(message: string) {
  controller?.showMessage({ kind: 'success', message })
}

export function askConfirmation(message: string) {
  if (!controller) return Promise.resolve(window.confirm(message))
  return controller.confirm(message)
}
