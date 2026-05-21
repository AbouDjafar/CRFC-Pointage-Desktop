export function showError(message: string) {
  window.alert(message)
}

export function showSuccess(message: string) {
  window.alert(message)
}

export function askConfirmation(message: string) {
  return window.confirm(message)
}
