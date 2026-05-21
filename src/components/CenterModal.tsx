import { useEffect } from 'react'

export function CenterModal({
  open,
  title,
  onClose,
  children,
  width = '720px',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" style={{ width }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{title}</h3>
          </div>
          <button className="ghost-button" onClick={onClose}>Fermer</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
