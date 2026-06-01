import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, CheckCheck, Clock3, Download, FilePlus2, Minus, Plus, RotateCcw, UserMinus, UserPlus, Users } from 'lucide-react'
import { CenterModal } from '@/components/CenterModal'
import { FormSelect } from '@/components/FormSelect'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatLongDate, today } from '@/lib/date'
import { employeeMatchesQuery } from '@/lib/reporting'
import { showError, showSuccess } from '@/lib/runtime'

type ModalType = 'late' | 'absent' | null

export function ReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, getUserById } = useAuth()
  const {
    employees,
    absenceReasons,
    appSettings,
    getReportByDate,
    createOrUpdateReport,
    addLateEntry,
    removeLateEntry,
    addAbsenceEntry,
    removeAbsenceEntry,
    setVisitorCount,
    finalizeReport,
    reopenReport,
    openReportPdf,
  } = useData()
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [arrivalTime, setArrivalTime] = useState(appSettings.defaultLateTime)
  const [selectedReasonId, setSelectedReasonId] = useState(absenceReasons[0]?.id ?? '')
  const [absenceComment, setAbsenceComment] = useState('')
  const [search, setSearch] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today())

  const todayDate = today()
  const activeDate = searchParams.get('date') ?? todayDate
  const isTodayReport = activeDate === todayDate
  const report = getReportByDate(activeDate)
  const isFinalized = report?.status === 'FINALIZED'

  useEffect(() => {
    setSelectedDate(activeDate)
  }, [activeDate])

  const availableEmployees = useMemo(() => {
    const lateIds = new Set(report?.lateEntries.map((entry) => entry.employeeId) ?? [])
    const absenceIds = new Set(report?.absenceEntries.map((entry) => entry.employeeId) ?? [])
    return employees
      .filter((employee) => employee.isActive)
      .filter((employee) => !lateIds.has(employee.id) && !absenceIds.has(employee.id))
      .filter((employee) => employeeMatchesQuery(employee, search))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))
  }, [employees, report, search])

  function resetModal() {
    setSelectedEmployeeId('')
    setArrivalTime(appSettings.defaultLateTime)
    setSelectedReasonId(absenceReasons[0]?.id ?? '')
    setAbsenceComment('')
    setSearch('')
  }

  function closeModal() {
    setModalType(null)
    resetModal()
  }

  function openModal(type: ModalType) {
    resetModal()
    setModalType(type)
  }

  async function handleCreateReport() {
    await createOrUpdateReport(activeDate)
  }

  function handleDateSelection(nextDate: string) {
    setSelectedDate(nextDate)
    if (!nextDate || nextDate === todayDate) {
      setSearchParams({})
      return
    }
    setSearchParams({ date: nextDate })
  }

  async function handleExportPdf() {
    if (!report || !user) return
    setPdfLoading(true)
    try {
      const pdfAuthor = getUserById(report.createdBy) ?? user
      const result = await openReportPdf(report.id, pdfAuthor)
      if (!result.success) {
        showError(result.error ?? 'Impossible d ouvrir le PDF.')
      } else {
        showSuccess(result.generated ? 'PDF genere et ouvert.' : 'PDF existant ouvert.')
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible d ouvrir le PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleReopen() {
    if (!report) return
    await reopenReport(report.id)
  }

  async function submitModal() {
    if (!report || !selectedEmployeeId) return
    if (modalType === 'late') {
      await addLateEntry(report.id, { employeeId: selectedEmployeeId, arrivalTime })
    } else if (modalType === 'absent' && selectedReasonId) {
      await addAbsenceEntry(report.id, { employeeId: selectedEmployeeId, reasonId: selectedReasonId, comment: absenceComment || undefined })
    }
    closeModal()
  }

  const employeeOptions = availableEmployees.map((employee) => ({
    value: employee.id,
    label: employee.fullName,
  }))
  const reasonOptions = absenceReasons.map((reason) => ({ value: reason.id, label: reason.label }))

  if (!report) {
    return (
      <section className="page">
        <header className="page-header hero-header">
          <div>
            <p className="eyebrow">{isTodayReport ? 'Rapport du jour' : 'Rapport editable'}</p>
            <h1>{formatLongDate(activeDate)}</h1>
            <p>{isTodayReport ? "Aucun rapport n'existe encore pour aujourd'hui." : 'Aucun rapport n existe encore pour cette date.'}</p>
          </div>
          <div className="header-actions">
            <label className="field report-date-picker">
              <span>Date du rapport</span>
              <div className="date-input-shell">
                <CalendarDays size={16} />
                <input type="date" value={selectedDate} onChange={(event) => handleDateSelection(event.target.value)} />
              </div>
            </label>
            {!isTodayReport ? (
              <Link className="ghost-button link-button" to="/historique">
                Retour a l historique
              </Link>
            ) : null}
            <button className="primary-button button-leading-icon" onClick={handleCreateReport}>
              <FilePlus2 size={16} />
              Creer le rapport
            </button>
          </div>
        </header>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">{isTodayReport ? 'Rapport du jour' : 'Rapport editable'}</p>
          <h1>{formatLongDate(activeDate)}</h1>
          <p>{isFinalized ? 'Rapport finalise' : 'Rapport en brouillon'}{isTodayReport ? '' : ' - modification historique autorisee'}</p>
        </div>
        <div className="header-actions">
          <label className="field report-date-picker">
            <span>Date du rapport</span>
            <div className="date-input-shell">
              <CalendarDays size={16} />
              <input type="date" value={selectedDate} onChange={(event) => handleDateSelection(event.target.value)} />
            </div>
          </label>
          {!isTodayReport ? (
            <Link className="ghost-button link-button" to="/historique">
              Retour a l historique
            </Link>
          ) : null}
          <button className="secondary-button button-leading-icon" onClick={handleExportPdf} disabled={pdfLoading}>
            <Download size={16} />
            {pdfLoading ? 'Generation...' : 'Exporter PDF'}
          </button>
          {!isFinalized ? (
            <button className="primary-button button-leading-icon" onClick={async () => {
              if (!user) return
              const result = await finalizeReport(report.id, user)
              if (!result.success) {
                showError(result.error ?? 'Impossible de finaliser le rapport.')
              } else if (!result.pdfGenerated && result.error) {
                showSuccess(`Rapport finalise. ${result.error}`)
              } else {
                showSuccess('Rapport finalise et PDF genere.')
              }
            }}>
              <CheckCheck size={16} />
              Finaliser
            </button>
          ) : null}
          {isFinalized && user?.role === 'ADMIN' ? (
            <button className="warning-button button-leading-icon" onClick={() => void handleReopen()}>
              <RotateCcw size={16} />
              Reouvrir
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid-layout">
        <div className="card">
          <div className="card-header">
            <h2>Retardataires</h2>
            {!isFinalized ? (
              <button className="success-button button-leading-icon" onClick={() => openModal('late')}>
                <UserPlus size={16} />
                Ajouter
              </button>
            ) : null}
          </div>
          <div className="list">
            {report.lateEntries.length === 0 ? (
              <div className="empty-inline">Aucun retardataire enregistre.</div>
            ) : report.lateEntries.map((entry) => (
              <div key={entry.id} className="list-row">
                <div>
                  <strong>{employees.find((employee) => employee.id === entry.employeeId)?.fullName ?? entry.employeeNameSnapshot ?? 'Inconnu'}</strong>
                  <div className="muted">Arrivee: {entry.arrivalTime} - {entry.minutesLate} min de retard</div>
                </div>
                {!isFinalized ? (
                  <button className="danger-link button-leading-icon" onClick={() => void removeLateEntry(report.id, entry.id)}>
                    <UserMinus size={14} />
                    Retirer
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Absents</h2>
            {!isFinalized ? (
              <button className="success-button button-leading-icon" onClick={() => openModal('absent')}>
                <UserPlus size={16} />
                Ajouter
              </button>
            ) : null}
          </div>
          <div className="list">
            {report.absenceEntries.length === 0 ? (
              <div className="empty-inline">Aucun absent enregistre.</div>
            ) : report.absenceEntries.map((entry) => (
              <div key={entry.id} className="list-row">
                <div>
                  <strong>{employees.find((employee) => employee.id === entry.employeeId)?.fullName ?? entry.employeeNameSnapshot ?? 'Inconnu'}</strong>
                  <div className="muted">{absenceReasons.find((reason) => reason.id === entry.reasonId)?.label ?? 'Inconnu'}</div>
                  {entry.comment ? <div className="muted italic">{entry.comment}</div> : null}
                </div>
                {!isFinalized ? (
                  <button className="danger-link button-leading-icon" onClick={() => void removeAbsenceEntry(report.id, entry.id)}>
                    <UserMinus size={14} />
                    Retirer
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="card wide-card">
          <div className="card-header">
            <h2>Visiteurs</h2>
            <span className="status-badge draft">
              <Users size={13} />
              Comptage en direct
            </span>
          </div>
          <div className="visitor-counter">
            <button className="circle-button circle-button-visitor" onClick={() => void setVisitorCount(report.id, report.visitorCount - 1)} disabled={isFinalized}>
              <Minus size={20} />
            </button>
            <span>{report.visitorCount}</span>
            <button className="circle-button circle-button-visitor" onClick={() => void setVisitorCount(report.id, report.visitorCount + 1)} disabled={isFinalized}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      <CenterModal
        open={modalType !== null}
        title={modalType === 'late' ? 'Ajouter un retardataire' : 'Ajouter un absent'}
        subtitle={modalType === 'late' ? `Heure de reference actuelle: ${appSettings.defaultLateTime}` : "Selectionnez l'employe et le motif d'absence."}
        onClose={closeModal}
        width="620px"
      >
        <div className="modal-form modal-form-elevated">
          <label className="field">
            <span>Rechercher un employe</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou prenom" />
          </label>
          <label className="field">
            <span>Employe</span>
            <FormSelect value={selectedEmployeeId} options={employeeOptions} onChange={setSelectedEmployeeId} placeholder="Selectionner un employe" />
          </label>
          {modalType === 'late' ? (
            <label className="field">
              <span>Heure d&apos;arrivee</span>
              <div className="time-input-shell">
                <Clock3 size={16} />
                <input type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} step={60} />
              </div>
            </label>
          ) : (
            <>
              <label className="field">
                <span>Motif d&apos;absence</span>
                <FormSelect value={selectedReasonId} options={reasonOptions} onChange={setSelectedReasonId} placeholder="Selectionner un motif" />
              </label>
              <label className="field">
                <span>Commentaire</span>
                <textarea value={absenceComment} onChange={(event) => setAbsenceComment(event.target.value)} rows={4} placeholder="Ajouter un commentaire utile" />
              </label>
            </>
          )}
          <div className="modal-actions">
            <button className="secondary-button button-leading-icon" onClick={closeModal}>
              Annuler
            </button>
            <button className="success-button button-leading-icon" onClick={() => void submitModal()} disabled={!selectedEmployeeId}>
              {modalType === 'late' ? <Clock3 size={16} /> : <UserPlus size={16} />}
              Enregistrer
            </button>
          </div>
        </div>
      </CenterModal>
    </section>
  )
}
