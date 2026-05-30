import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/styles.css'

const runtimeWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }

async function writeDesktopLog(level: string, message: string, details?: string) {
  if (!runtimeWindow.__TAURI__ && !runtimeWindow.__TAURI_INTERNALS__) {
    return
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('write_frontend_log', {
      level,
      message,
      details: details ?? null,
    })
  } catch (error) {
    console.error('Unable to write desktop log', error)
  }
}

window.addEventListener('error', (event) => {
  const details =
    event.error instanceof Error
      ? event.error.stack ?? event.error.message
      : `${event.filename}:${event.lineno}:${event.colno}`
  void writeDesktopLog('error', event.message || 'Unhandled window error', details)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason =
    event.reason instanceof Error
      ? event.reason.stack ?? event.reason.message
      : typeof event.reason === 'string'
        ? event.reason
        : JSON.stringify(event.reason)

  void writeDesktopLog('error', 'Unhandled promise rejection', reason)
})

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  const details = error instanceof Error ? error.stack ?? error.message : String(error)
  void writeDesktopLog('fatal', 'React bootstrap failed', details)
  throw error
}

void writeDesktopLog('info', 'Frontend bootstrap started')
