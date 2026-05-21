import { useMemo, useState } from 'react'
import { CenterModal } from '@/components/CenterModal'
import { desktopBridge } from '@/bridge'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { buildPdfFileName } from '@/lib/exportNames'
import { generatePdfBytes } from '@/lib/pdf'
import { today, formatLongDate } from '@/lib/date'
import { employeeMatchesQuery } from '@/lib/reporting'
import { showError, showSuccess } from '@/lib/runtime'

type ModalType = 'late' | 'absent' | null

export function ReportPage() {
  const { user } = useAuth()
  const { employees, absenceReasons, getReportByDate, createOrUpdateReport, addLateEntry, removeLateEntry, addAbsenceEntry, removeAbsenceEntry, setVisitorCount, finalizeReport, reopenReport } = useData()
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [arrivalTime, setArrivalTime] = useState('08:30')
  const [selectedReasonId, setSelectedReasonId] = useState(absenceReasons[0]?.id ?? '')
  const [absenceComment, setAbsenceComment] = useState('')
  const [search, setSearch] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const activeDate = today()
  const report = getReportByDate(activeDate)
  const isFinalized = report?.status === 'FINALIZED'

  const availableEmployees = useMemo(() => {
    const lateIds = new Set(report?.lateEntries.map((entry) => entry.employeeId) ?? [])
    const absenceIds = new Set(report?.absenceEntries.map((entry) => entry.employeeId) ?? [])
    return employees
      .filter((employee) => employee.isActive)
      .filter((employee) => (modalType === 'late' ? !lateIds.has(employee.id) && !absenceIds.has(employee.id) : !lateIds.has(employee.id) && !absenceIds.has(employee.id)))
      .filter((employee) => employeeMatchesQuery(employee, search))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))
  }, [employees, modalType, report, search])

  function resetModal() {
    setSelectedEmployeeId('')
    setArrivalTime('08:30')
    setSelectedReasonId(absenceReasons[0]?.id ?? '')
    setAbsenceComment('')
    setSearch('')
  }

  function openModal(type: ModalType) {
    resetModal()
    setModalType(type)
  }

  async function handleCreateReport() {
    await createOrUpdateReport(activeDate)
  }

  async function handleExportPdf() {
    if (!report || !user) return
    setPdfLoading(true)
    try {
      const bytes = await generatePdfBytes({ report, employees, absenceReasons, author: user })
      const result = await desktopBridge.savePdfAndReveal(buildPdfFileName(report.date), bytes)
      showSuccess(`PDF genere: ${result.path}`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de generer le PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function submitModal() {
    if (!report || !selectedEmployeeId) return
    if (modalType === 'late') {
      await addLateEntry(report.id, { employeeId: selectedEmployeeId, arrivalTime })
    } else if (modalType === 'absent' && selectedReasonId) {
      await addAbsenceEntry(report.id, { employeeId: selectedEmployeeId, reasonId: selectedReasonId, comment: absenceComment || undefined })
    }
    setModalType(null)
    resetModal()
  }

  if (!report) {
    return (
      <section className="page">
        <header className="page-header hero-header">
          <div>
            <p className="eyebrow">Rapport du jour</p>
            <h1>{formatLongDate(activeDate)}</h1>
            <p>Aucun rapport n'existe encore pour aujourd'hui.</p>
          </div>
          <button className="primary-button" onClick={handleCreateReport}>Creer le rapport</button>
        </header>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Rapport du jour</p>
          <h1>{formatLongDate(activeDate)}</h1>
          <p>{isFinalized ? 'Rapport finalise' : 'Rapport en brouillon'}</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={handleExportPdf} disabled={pdfLoading}>{pdfLoading ? 'Generation...' : 'Exporter PDF'}</button>
          {!isFinalized ? <button className="primary-button" onClick={() => void finalizeReport(report.id)}>Finaliser</button> : null}
          {isFinalized && user?.role === 'ADMIN' ? <button className="warning-button" onClick={() => void reopenReport(report.id)}>Reouvrir</button> : null}
        </div>
      </header>

      <div className="grid-layout">
        <div className="card">
          <div className="card-header">
            <h2>Retardataires</h2>
            {!isFinalized ? <button className="ghost-button" onClick={() => openModal('late')}>Ajouter</button> : null}
          </div>
          <div className="list">
            {report.lateEntries.length === 0 ? <div className="empty-inline">Aucun retardataire enregistre.</div> : report.lateEntries.map((entry) => (
              <div key={entry.id} className="list-row">
                <div>
                  <strong>{employees.find((employee) => employee.id === entry.employeeId)?.fullName ?? entry.employeeNameSnapshot ?? 'Inconnu'}</strong>
                  <div className="muted">Arrivee: {entry.arrivalTime} - {entry.minutesLate} min de retard</div>
                </div>
                {!isFinalized ? <button className="danger-link" onClick={() => void removeLateEntry(report.id, entry.id)}>Retirer</button> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Absents</h2>
            {!isFinalized ? <button className="ghost-button" onClick={() => openModal('absent')}>Ajouter</button> : null}
          </div>
          <div className="list">
            {report.absenceEntries.length === 0 ? <div className="empty-inline">Aucun absent enregistre.</div> : report.absenceEntries.map((entry) => (
              <div key={entry.id} className="list-row">
                <div>
                  <strong>{employees.find((employee) => employee.id === entry.employeeId)?.fullName ?? entry.employeeNameSnapshot ?? 'Inconnu'}</strong>
                  <div className="muted">{absenceReasons.find((reason) => reason.id === entry.reasonId)?.label ?? 'Inconnu'}</div>
                  {entry.comment ? <div className="muted italic">{entry.comment}</div> : null}
                </div>
                {!isFinalized ? <button className="danger-link" onClick={() => void removeAbsenceEntry(report.id, entry.id)}>Retirer</button> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card wide-card">
          <div className="card-header">
            <h2>Visiteurs</h2>
          </div>
          <div className="visitor-counter">
            <button className="circle-button" onClick={() => void setVisitorCount(report.id, report.visitorCount - 1)} disabled={isFinalized}>-</button>
            <span>{report.visitorCount}</span>
            <button className="circle-button" onClick={() => void setVisitorCount(report.id, report.visitorCount + 1)} disabled={isFinalized}>+</button>
          </div>
        </div>
      </div>

      <CenterModal open={modalType !== null} title={modalType === 'late' ? 'Ajouter un retardataire' : 'Ajouter un absent'} onClose={() => setModalType(null)}>
        <div className="modal-form">
          <label className="field">
            <span>Rechercher un employe</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou prenom" />
          </label>
          <label className="field">
            <span>Employe</span>
            <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
              <option value="">Selectionner...</option>
              {availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </select>
          </label>
          {modalType === 'late' ? (
            <label className="field">
              <span>Heure d'arrivee</span>
              <input value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} placeholder="08:30" />
            </label>
          ) : (
            <>
              <label className="field">
                <span>Motif d'absence</span>
                <select value={selectedReasonId} onChange={(event) => setSelectedReasonId(event.target.value)}>
                  {absenceReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Commentaire</span>
                <textarea value={absenceComment} onChange={(event) => setAbsenceComment(event.target.value)} rows={4} />
              </label>
            </>
          )}
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setModalType(null)}>Annuler</button>
            <button className="primary-button" onClick={() => void submitModal()} disabled={!selectedEmployeeId}>Enregistrer</button>
          </div>
        </div>
      </CenterModal>
    </section>
  )
}
