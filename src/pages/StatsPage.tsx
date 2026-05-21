import { useMemo, useState } from 'react'
import { useData } from '@/contexts/DataContext'
import { computeGlobalStats } from '@/lib/reporting'
import { subtractDays } from '@/lib/date'

type PeriodMode = 'all' | '7d' | '30d' | '90d'

export function StatsPage() {
  const { reports, employees, absenceReasons } = useData()
  const [period, setPeriod] = useState<PeriodMode>('30d')
  const threshold = useMemo(() => period === '7d' ? subtractDays(7) : period === '30d' ? subtractDays(30) : period === '90d' ? subtractDays(90) : null, [period])
  const filteredReports = useMemo(() => {
    const scoped = threshold ? reports.filter((report) => report.date >= threshold) : reports
    return [...scoped].sort((a, b) => a.date.localeCompare(b.date))
  }, [reports, threshold])
  const stats = useMemo(() => computeGlobalStats(filteredReports, employees, absenceReasons), [absenceReasons, employees, filteredReports])

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Statistiques</p>
          <h1>{filteredReports.length} rapport{filteredReports.length > 1 ? 's' : ''} analyses</h1>
          <p>Vue d'ensemble des retards, absences et visiteurs.</p>
        </div>
      </header>

      <div className="toolbar">
        {(['7d', '30d', '90d', 'all'] as PeriodMode[]).map((mode) => <button key={mode} className={`chip${period === mode ? ' active' : ''}`} onClick={() => setPeriod(mode)}>{mode === 'all' ? 'Tout' : mode}</button>)}
      </div>

      <div className="stats-grid">
        <div className="metric-card"><span>Retards</span><strong>{stats.totalLate}</strong></div>
        <div className="metric-card"><span>Absences</span><strong>{stats.totalAbsent}</strong></div>
        <div className="metric-card"><span>Visiteurs</span><strong>{stats.totalVisitors}</strong></div>
        <div className="metric-card"><span>Minutes retard</span><strong>{stats.totalLateMin}</strong></div>
      </div>

      <div className="grid-layout">
        <div className="card">
          <div className="card-header"><h2>Top retardataires</h2></div>
          <div className="list">
            {stats.topLate.length === 0 ? <div className="empty-inline">Aucune donnee.</div> : stats.topLate.map((item) => <div key={item.id} className="list-row"><strong>{item.name}</strong><span>{item.count}</span></div>)}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h2>Top absents</h2></div>
          <div className="list">
            {stats.topAbsent.length === 0 ? <div className="empty-inline">Aucune donnee.</div> : stats.topAbsent.map((item) => <div key={item.id} className="list-row"><strong>{item.name}</strong><span>{item.count}</span></div>)}
          </div>
        </div>
        <div className="card wide-card">
          <div className="card-header"><h2>Motifs les plus frequents</h2></div>
          <div className="list">
            {stats.topReasons.length === 0 ? <div className="empty-inline">Aucune absence enregistree.</div> : stats.topReasons.map((item) => <div key={item.id} className="list-row"><strong>{item.name}</strong><span>{item.count}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  )
}
