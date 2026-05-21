import { browserBridge } from '@/bridge/browser'
import { tauriBridge } from '@/bridge/tauri'

function isTauriRuntime() {
  if (typeof window === 'undefined') return false
  const runtimeWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  return Boolean(runtimeWindow.__TAURI__ || runtimeWindow.__TAURI_INTERNALS__)
}

export const desktopBridge = isTauriRuntime() ? tauriBridge : browserBridge
