import { useMemo, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PERIOD_LABELS, PERIOD_OPTIONS, type PeriodMode, getPeriodThreshold } from '@/constants/periods'
import { useData } from '@/contexts/DataContext'
import { computeGlobalStats } from '@/lib/reporting'
import type { DailyReport } from '@/types'

const BLUE_PALETTE = ['#1b3a6b', '#2a5298', '#3b6fd4', '#5b8fe8', '#93c5fd']
const ORANGE_PALETTE = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5']
const PIE_PALETTE = ['#1b3a6b', '#f97316', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4']

function buildDailyTrend(reports: DailyReport[]) {
  return reports.map((report) => ({
    date: report.date.slice(5),
    retards: report.lateEntries.length,
    absences: report.absenceEntries.length,
    visiteurs: report.visitorCount,
    minutesRetard: report.lateEntries.reduce((sum, entry) => sum + entry.minutesLate, 0),
  }))
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        fontSize: 13,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name} : <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: '8px 13px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        fontSize: 13,
      }}
    >
      <strong style={{ color: '#374151' }}>{payload[0].name}</strong>
      <p style={{ color: payload[0].payload.fill, margin: '2px 0 0' }}>
        {payload[0].value} absence{payload[0].value > 1 ? 's' : ''}
      </p>
    </div>
  )
}

export function StatsPage() {
  const { reports, employees, absenceReasons } = useData()
  const [period, setPeriod] = useState<PeriodMode>('30d')

  const threshold = useMemo(() => getPeriodThreshold(period), [period])

  const filteredReports = useMemo(() => {
    const scoped = threshold ? reports.filter((report) => report.date >= threshold) : reports
    return [...scoped].sort((a, b) => a.date.localeCompare(b.date))
  }, [reports, threshold])

  const stats = useMemo(
    () => computeGlobalStats(filteredReports, employees, absenceReasons),
    [absenceReasons, employees, filteredReports],
  )

  const dailyTrend = useMemo(() => buildDailyTrend(filteredReports), [filteredReports])
  const topLateData = stats.topLate.map((item) => ({ name: item.name.split(' ')[0], count: item.count }))
  const topAbsentData = stats.topAbsent.map((item) => ({ name: item.name.split(' ')[0], count: item.count }))
  const reasonsPieData = stats.topReasons.map((item, index) => ({
    name: item.name,
    value: item.count,
    fill: PIE_PALETTE[index % PIE_PALETTE.length],
  }))

  const maxLate = Math.max(...stats.topLate.map((item) => item.count), 1)
  const maxAbsent = Math.max(...stats.topAbsent.map((item) => item.count), 1)

  return (
    <section className="page" style={{ animation: 'fadeIn 0.3s ease' }}>
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Statistiques</p>
          <h1>
            {filteredReports.length} rapport{filteredReports.length > 1 ? 's' : ''} analyse
            {filteredReports.length > 1 ? 's' : ''}
          </h1>
          <p>{PERIOD_LABELS[period]} - Vue d&apos;ensemble des retards, absences et visiteurs.</p>
        </div>
      </header>

      <div className="toolbar">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={`chip${period === option.key ? ' active' : ''}`}
            onClick={() => setPeriod(option.key)}
          >
            <CalendarRange size={14} />
            {option.label}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="metric-card">
          <div className="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span>Retards</span>
          <strong>{stats.totalLate}</strong>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <span>Absences</span>
          <strong>{stats.totalAbsent}</strong>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span>Visiteurs</span>
          <strong>{stats.totalVisitors}</strong>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <span>Min. retard total</span>
          <strong>{stats.totalLateMin}</strong>
        </div>
      </div>

      {dailyTrend.length > 0 ? (
        <div className="chart-card">
          <p className="chart-title">
            <span className="chart-title-dot" />
            Tendance journaliere - retards &amp; absences
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrend} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradRetard" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1b3a6b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1b3a6b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAbsence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Area
                type="monotone"
                dataKey="retards"
                name="Retards"
                stroke="#1b3a6b"
                strokeWidth={2}
                fill="url(#gradRetard)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="absences"
                name="Absences"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#gradAbsence)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      <div className="charts-grid">
        <div className="chart-card">
          <p className="chart-title">
            <span className="chart-title-dot" style={{ background: '#1b3a6b' }} />
            Top retardataires
          </p>
          {topLateData.length === 0 ? (
            <div className="empty-inline">Aucune donnee pour la periode.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topLateData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="count" name="Retards" radius={[0, 6, 6, 0]}>
                  {topLateData.map((_, index) => (
                    <Cell key={index} fill={BLUE_PALETTE[index % BLUE_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <p className="chart-title">
            <span className="chart-title-dot" style={{ background: '#f97316' }} />
            Top absents
          </p>
          {topAbsentData.length === 0 ? (
            <div className="empty-inline">Aucune donnee pour la periode.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topAbsentData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar dataKey="count" name="Absences" radius={[0, 6, 6, 0]}>
                  {topAbsentData.map((_, index) => (
                    <Cell key={index} fill={ORANGE_PALETTE[index % ORANGE_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <p className="chart-title">
            <span className="chart-title-dot" style={{ background: '#22c55e' }} />
            Repartition des motifs
          </p>
          {reasonsPieData.length === 0 ? (
            <div className="empty-inline">Aucune absence enregistree.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={reasonsPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {reasonsPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {dailyTrend.length > 0 ? (
          <div className="chart-card">
            <p className="chart-title">
              <span className="chart-title-dot" style={{ background: '#8b5cf6' }} />
              Minutes de retard cumulees / jour
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyTrend} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="minutesRetard"
                  name="Minutes retard"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {dailyTrend.length > 0 ? (
          <div className="chart-card chart-card-wide">
            <p className="chart-title">
              <span className="chart-title-dot" style={{ background: '#06b6d4' }} />
              Visiteurs par jour
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyTrend} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0f9ff' }} />
                <Bar dataKey="visiteurs" name="Visiteurs" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>

      <div className="grid-layout">
        <div className="card">
          <div className="card-header">
            <h2>Classement retardataires</h2>
          </div>
          {stats.topLate.length === 0 ? (
            <div className="empty-inline">Aucune donnee.</div>
          ) : (
            <div style={{ paddingTop: 4 }}>
              {stats.topLate.map((item) => (
                <div key={item.id} className="rank-item">
                  <span className="rank-name" title={item.name}>
                    {item.name}
                  </span>
                  <div className="rank-bar-track">
                    <div className="rank-bar-fill" style={{ width: `${(item.count / maxLate) * 100}%` }} />
                  </div>
                  <span className="rank-count">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Classement absences</h2>
          </div>
          {stats.topAbsent.length === 0 ? (
            <div className="empty-inline">Aucune donnee.</div>
          ) : (
            <div style={{ paddingTop: 4 }}>
              {stats.topAbsent.map((item) => (
                <div key={item.id} className="rank-item">
                  <span className="rank-name" title={item.name}>
                    {item.name}
                  </span>
                  <div className="rank-bar-track">
                    <div className="rank-bar-fill orange" style={{ width: `${(item.count / maxAbsent) * 100}%` }} />
                  </div>
                  <span className="rank-count">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card wide-card">
          <div className="card-header">
            <h2>Motifs les plus frequents</h2>
          </div>
          <div className="list">
            {stats.topReasons.length === 0 ? (
              <div className="empty-inline">Aucune absence enregistree.</div>
            ) : (
              stats.topReasons.map((item, index) => (
                <div key={item.id} className="list-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: PIE_PALETTE[index % PIE_PALETTE.length],
                        flexShrink: 0,
                      }}
                    />
                    <strong style={{ fontSize: '0.9rem' }}>{item.name}</strong>
                  </div>
                  <span style={{ fontWeight: 700, color: PIE_PALETTE[index % PIE_PALETTE.length] }}>
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
