import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCheck, Download, RotateCcw, Trash2 } from 'lucide-react'
import { desktopBridge } from '@/bridge'
import { useAuth, userFullName } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatDateTime, formatLongDate } from '@/lib/date'
import { buildPdfFileName } from '@/lib/exportNames'
import { generatePdfBytes } from '@/lib/pdf'
import { askConfirmation, showError, showSuccess } from '@/lib/runtime'

export function ReportDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user, getUserById } = useAuth()
  const { reports, employees, absenceReasons, deleteReport, finalizeReport, reopenReport } = useData()
  const matchedReport = reports.find((item) => item.id === id)
  if (!matchedReport) return <section className="page"><div className="card">Rapport introuvable.</div></section>
  const report = matchedReport
  const author = getUserById(report.createdBy)

  async function exportPdf() {
    try {
      const bytes = await generatePdfBytes({ report, employees, absenceReasons, author: author ?? user! })
      const result = await desktopBridge.savePdfAndReveal(buildPdfFileName(report.date), bytes)
      showSuccess(`PDF genere: ${result.path}`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de generer le PDF.')
    }
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Detail du rapport</p>
          <h1>{formatLongDate(report.date)}</h1>
          <p>{report.status === 'FINALIZED' ? 'Finalise' : 'Brouillon'}</p>
        </div>
        <div className="header-actions">
          <Link className="ghost-button link-button button-leading-icon" to="/historique">
            <ArrowLeft size={16} />
            Retour
          </Link>
          <button className="secondary-button button-leading-icon" onClick={() => void exportPdf()}>
            <Download size={16} />
            Exporter PDF
          </button>
          {report.status === 'DRAFT' ? (
            <button className="primary-button button-leading-icon" onClick={() => void finalizeReport(report.id)}>
              <CheckCheck size={16} />
              Finaliser
            </button>
          ) : null}
          {report.status === 'FINALIZED' && user?.role === 'ADMIN' ? (
            <button className="warning-button button-leading-icon" onClick={() => void reopenReport(report.id)}>
              <RotateCcw size={16} />
              Reouvrir
            </button>
          ) : null}
          {user?.role === 'ADMIN' ? (
            <button className="danger-link button-leading-icon" onClick={async () => {
              if (await askConfirmation('Supprimer ce rapport ?')) {
                await deleteReport(report.id)
                navigate('/historique')
              }
            }}>
              <Trash2 size={14} />
              Supprimer
            </button>
          ) : null}
        </div>
      </header>
      <div className="grid-layout">
        <div className="card">
          <div className="card-header"><h2>Metadonnees</h2></div>
          <div className="stack-meta">
            <div>Redige par: <strong>{author ? userFullName(author) : 'Agent'}</strong></div>
            <div>Fonction: <strong>{author?.jobTitle ?? '-'}</strong></div>
            <div>Mis a jour: <strong>{formatDateTime(report.updatedAt)}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Retards</h2></div>
          <div className="list">{report.lateEntries.map((entry) => <div key={entry.id} className="list-row"><strong>{employees.find((employee) => employee.id === entry.employeeId)?.fullName ?? entry.employeeNameSnapshot ?? 'Inconnu'}</strong><span>{entry.arrivalTime} - {entry.minutesLate} min</span></div>)}</div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Absences</h2></div>
          <div className="list">{report.absenceEntries.map((entry) => <div key={entry.id} className="list-row"><strong>{employees.find((employee) => employee.id === entry.employeeId)?.fullName ?? entry.employeeNameSnapshot ?? 'Inconnu'}</strong><span>{absenceReasons.find((reason) => reason.id === entry.reasonId)?.label ?? 'Inconnu'}</span></div>)}</div>
        </div>
        <div className="card wide-card">
          <div className="card-header"><h2>Visiteurs</h2></div>
          <div className="big-number">{report.visitorCount}</div>
        </div>
      </div>
    </section>
  )
}
