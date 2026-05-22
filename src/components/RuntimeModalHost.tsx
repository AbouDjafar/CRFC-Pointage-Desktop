import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { CenterModal } from '@/components/CenterModal'
import { bindRuntimeController } from '@/lib/runtime'

type ModalState =
  | { kind: 'error' | 'success'; message: string }
  | { kind: 'confirm'; message: string; resolve: (value: boolean) => void }
  | null

export function RuntimeModalHost() {
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => {
    bindRuntimeController({
      showMessage(request) {
        setModal({ kind: request.kind, message: request.message })
      },
      confirm(message) {
        return new Promise<boolean>((resolve) => {
          setModal({ kind: 'confirm', message, resolve })
        })
      },
    })

    return () => bindRuntimeController(null)
  }, [])

  const modalCopy = useMemo(() => {
    if (!modal) return null
    if (modal.kind === 'success') {
      return {
        title: 'Operation reussie',
        subtitle: 'Le traitement a ete effectue avec succes.',
        icon: <CheckCircle2 size={22} />,
        iconClassName: 'runtime-modal-icon success',
      }
    }
    if (modal.kind === 'error') {
      return {
        title: 'Une erreur est survenue',
        subtitle: 'Verifiez le message ci-dessous avant de continuer.',
        icon: <AlertTriangle size={22} />,
        iconClassName: 'runtime-modal-icon error',
      }
    }
    return {
      title: 'Confirmation requise',
      subtitle: 'Merci de confirmer cette action avant de poursuivre.',
      icon: <HelpCircle size={22} />,
      iconClassName: 'runtime-modal-icon confirm',
    }
  }, [modal])

  function closeInfoModal() {
    setModal(null)
  }

  function resolveConfirmation(value: boolean) {
    if (modal?.kind === 'confirm') modal.resolve(value)
    setModal(null)
  }

  return (
    <CenterModal
      open={modal !== null}
      title={modalCopy?.title ?? ''}
      subtitle={modalCopy?.subtitle}
      onClose={() => modal?.kind === 'confirm' ? resolveConfirmation(false) : closeInfoModal()}
      width="560px"
    >
      {modal ? (
        <div className="runtime-modal-copy">
          <div className={modalCopy?.iconClassName}>
            {modalCopy?.icon}
          </div>
          <p>{modal.message}</p>
          {modal.kind === 'confirm' ? (
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => resolveConfirmation(false)}>Annuler</button>
              <button className="primary-button" onClick={() => resolveConfirmation(true)}>Confirmer</button>
            </div>
          ) : (
            <div className="modal-actions">
              <button className={modal.kind === 'success' ? 'success-button' : 'primary-button'} onClick={closeInfoModal}>Compris</button>
            </div>
          )}
        </div>
      ) : null}
    </CenterModal>
  )
}
