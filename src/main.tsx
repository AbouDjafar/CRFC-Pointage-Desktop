import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

async function revealBootScreen() {
  const runtimeWindow = window as Window & { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown }
  if (runtimeWindow.__TAURI__ || runtimeWindow.__TAURI_INTERNALS__) {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    await getCurrentWebviewWindow().show()
  }

  window.requestAnimationFrame(() => {
    document.body.classList.add('boot-ready')
    window.setTimeout(() => {
      document.getElementById('boot-splash')?.remove()
    }, 420)
  })
}

void revealBootScreen()
