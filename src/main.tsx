import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

function revealBootScreen() {
  window.requestAnimationFrame(() => {
    document.body.classList.add('boot-ready')
    window.setTimeout(() => {
      document.getElementById('boot-splash')?.remove()
    }, 420)
  })
}

void revealBootScreen()
