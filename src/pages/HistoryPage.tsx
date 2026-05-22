import { Link } from 'react-router-dom'
import { CalendarRange, Eye, FileSpreadsheet, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { desktopBridge } from '@/bridge'
import { PERIOD_OPTIONS, type PeriodMode, getPeriodThreshold } from '@/constants/periods'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { formatLongDate, today } from '@/lib/date'
import { generateExcelBytes } from '@/lib/excel'
import { buildExcelFileName } from '@/lib/exportNames'
import { askConfirmation, showError, showSuccess } from '@/lib/runtime'

export function HistoryPage() {
  const { user } = useAuth()
  const { reports, employees, absenceReasons, deleteReport } = useData()
  const [filterMode, setFilterMode] = useState<PeriodMode>('all')
  const [status, setStatus] = useState<'all' | 'finalized' | 'draft'>('all')

  const dateThreshold = useMemo(() => getPeriodThreshold(filterMode), [filterMode])

  const filtered = useMemo(() => {
    let list = [...reports]
    if (dateThreshold) list = list.filter((report) => report.date >= dateThreshold)
    if (status === 'finalized') list = list.filter((report) => report.status === 'FINALIZED')
    if (status === 'draft') list = list.filter((report) => report.status === 'DRAFT')
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [dateThreshold, reports, status])

  const periodStart = dateThreshold ?? [...reports].sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? today()

  async function handleExport() {
    if (!user) return
    if (filtered.length === 0) {
      showError('Aucun rapport a exporter pour cette periode.')
      return
    }
    try {
      const bytes = generateExcelBytes({ reports: filtered, employees, absenceReasons, author: user, periodStart, periodEnd: today() })
      const result = await desktopBridge.saveExcelAndReveal(buildExcelFileName(periodStart, today()), bytes)
      showSuccess(`Fichier Excel genere: ${result.path}`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de generer le fichier Excel.')
    }
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Historique</p>
          <h1>{filtered.length} rapport{filtered.length > 1 ? 's' : ''}</h1>
          <p>Consultez, filtrez et exportez les rapports existants.</p>
        </div>
        <button className="secondary-button button-leading-icon" onClick={() => void handleExport()}>
          <FileSpreadsheet size={16} />
          Exporter Excel
        </button>
      </header>

      <div className="toolbar">
        {PERIOD_OPTIONS.map((option) => (
          <button key={option.key} className={`chip${filterMode === option.key ? ' active' : ''}`} onClick={() => setFilterMode(option.key)}>
            <CalendarRange size={14} />
            {option.label}
          </button>
        ))}
        {(['all', 'finalized', 'draft'] as const).map((mode) => (
          <button key={mode} className={`chip${status === mode ? ' active' : ''}`} onClick={() => setStatus(mode)}>
            {mode === 'all' ? 'Tous' : mode === 'finalized' ? 'Finalises' : 'Brouillons'}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-list">
          {filtered.length === 0 ? (
            <div className="empty-inline">Aucun rapport ne correspond aux filtres selectionnes.</div>
          ) : filtered.map((report) => (
            <div key={report.id} className="table-row">
              <div>
                <strong>{formatLongDate(report.date)}</strong>
                <div className="muted">{report.lateEntries.length} retard(s) - {report.absenceEntries.length} absence(s) - {report.visitorCount} visiteur(s)</div>
              </div>
              <div className="table-actions">
                <span className={`status-badge ${report.status === 'FINALIZED' ? 'success' : 'draft'}`}>{report.status === 'FINALIZED' ? 'Finalise' : 'Brouillon'}</span>
                <Link className="ghost-button link-button button-leading-icon" to={`/report/${report.id}`}>
                  <Eye size={15} />
                  Ouvrir
                </Link>
                {user?.role === 'ADMIN' ? (
                  <button className="danger-link button-leading-icon" onClick={async () => {
                    if (await askConfirmation('Supprimer ce rapport ?')) await deleteReport(report.id)
                  }}>
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
