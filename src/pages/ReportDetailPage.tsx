import { Link, useNavigate, useParams } from 'react-router-dom'
import { desktopBridge } from '@/bridge'
import { useAuth, userFullName } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { buildPdfFileName } from '@/lib/exportNames'
import { generatePdfBytes } from '@/lib/pdf'
import { formatDateTime, formatLongDate } from '@/lib/date'
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
      <header className="page-header">
        <div>
          <p className="eyebrow">Detail du rapport</p>
          <h1>{formatLongDate(report.date)}</h1>
          <p>{report.status === 'FINALIZED' ? 'Finalise' : 'Brouillon'}</p>
        </div>
        <div className="header-actions">
          <Link className="ghost-button link-button" to="/historique">Retour</Link>
          <button className="secondary-button" onClick={() => void exportPdf()}>Exporter PDF</button>
          {report.status === 'DRAFT' ? <button className="primary-button" onClick={() => void finalizeReport(report.id)}>Finaliser</button> : null}
          {report.status === 'FINALIZED' && user?.role === 'ADMIN' ? <button className="warning-button" onClick={() => void reopenReport(report.id)}>Reouvrir</button> : null}
          {user?.role === 'ADMIN' ? <button className="danger-link" onClick={() => askConfirmation('Supprimer ce rapport ?') && void deleteReport(report.id).then(() => navigate('/historique'))}>Supprimer</button> : null}
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
