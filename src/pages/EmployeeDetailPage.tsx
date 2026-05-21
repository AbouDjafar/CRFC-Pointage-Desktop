import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useData } from '@/contexts/DataContext'
import { formatLongDate, subtractDays } from '@/lib/date'

type PeriodMode = 'all' | '7d' | '30d' | '90d'

export function EmployeeDetailPage() {
  const { id } = useParams()
  const { employees, allReports, absenceReasons } = useData()
  const [period, setPeriod] = useState<PeriodMode>('30d')
  const employee = employees.find((item) => item.id === id)
  const threshold = useMemo(() => period === '7d' ? subtractDays(7) : period === '30d' ? subtractDays(30) : period === '90d' ? subtractDays(90) : null, [period])
  const incidents = useMemo(() => {
    if (!employee) return []
    return allReports
      .filter((report) => (threshold ? report.date >= threshold : true))
      .flatMap((report) => [
        ...report.lateEntries.filter((entry) => entry.employeeId === employee.id).map((entry) => ({ key: entry.id, date: report.date, type: 'Retard', detail: `${entry.arrivalTime} - ${entry.minutesLate} min` })),
        ...report.absenceEntries.filter((entry) => entry.employeeId === employee.id).map((entry) => ({ key: entry.id, date: report.date, type: 'Absence', detail: absenceReasons.find((reason) => reason.id === entry.reasonId)?.label ?? 'Inconnu' })),
      ])
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [absenceReasons, allReports, employee, threshold])

  if (!employee) return <section className="page"><div className="card">Employe introuvable.</div></section>

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employe</p>
          <h1>{employee.fullName}</h1>
          <p>{employee.isActive ? 'Actif' : 'Inactif'}</p>
        </div>
        <Link className="ghost-button link-button" to="/employes">Retour</Link>
      </header>

      <div className="toolbar">
        {(['7d', '30d', '90d', 'all'] as PeriodMode[]).map((mode) => <button key={mode} className={`chip${period === mode ? ' active' : ''}`} onClick={() => setPeriod(mode)}>{mode === 'all' ? 'Tout' : mode}</button>)}
      </div>

      <div className="card">
        <div className="card-header"><h2>Incidents recents</h2></div>
        <div className="list">
          {incidents.length === 0 ? <div className="empty-inline">Aucun incident sur cette periode.</div> : incidents.map((incident) => <div key={incident.key} className="list-row"><div><strong>{incident.type}</strong><div className="muted">{formatLongDate(incident.date)}</div></div><span>{incident.detail}</span></div>)}
        </div>
      </div>
    </section>
  )
}
