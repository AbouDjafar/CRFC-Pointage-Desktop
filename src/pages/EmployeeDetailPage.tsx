import { Link, useParams } from 'react-router-dom'
import { Activity, ArrowLeft, CalendarClock, Clock3, UserCheck, UserX } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PERIOD_LABELS, PERIOD_OPTIONS, type PeriodMode, getPeriodThreshold } from '@/constants/periods'
import { useData } from '@/contexts/DataContext'
import { getAbsenceReasonStatsLabel, isUnjustifiedAbsenceReason } from '@/lib/absenceReasons'
import { enumerateDates, formatLongDate, formatShortDate, today } from '@/lib/date'

const REASON_PALETTE = ['#2563EB', '#F97316', '#22C55E', '#8B5CF6', '#E11D48', '#14B8A6', '#D97706', '#0F766E']
const EVALUATION_META: Record<string, { description: string; formula: string }> = {
  Ponctualite: {
    description: 'Mesure la capacite a etre considere comme ponctuel sur les jours suivis.',
    formula: 'Score = 100 x (jours sans retard ni absence injustifiee / jours avec rapport)',
  },
  Presence: {
    description: 'Mesure la presence reelle en penalisation uniquement des absences injustifiees.',
    formula: 'Score = 100 x (1 - jours avec absence injustifiee / jours avec rapport)',
  },
  Assiduite: {
    description: 'Mesure les jours ou l employe est present et a l heure, sans aucune absence.',
    formula: 'Score = 100 x (jours presents et a l heure / jours avec rapport)',
  },
  Rigueur: {
    description: 'Mesure la constance sur plusieurs jours consecutifs sans retard ni absence injustifiee.',
    formula: 'Score = 100 x (plus longue serie reguliere / min(10, jours avec rapport))',
  },
  Discipline: {
    description: 'Mesure le respect global des regles en tenant compte a la fois de la presence reelle et de la gravite des retards.',
    formula: 'Score = 100 x taux de presence x ((1 - jours en retard / jours presents) x 0,65 + (1 - moyenne des minutes / 60) x 0,35)',
  },
  Disponibilite: {
    description: 'Mesure la disponibilite globale en tenant compte de toutes les absences.',
    formula: 'Score = 100 x (1 - jours avec absence / jours avec rapport)',
  },
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      {label ? <p className="chart-tooltip-label">{label}</p> : null}
      {payload.map((entry: any) => (
        <p key={entry.dataKey ?? entry.name} style={{ color: entry.color ?? entry.payload?.fill }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

function normalizeReasonLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function buildReasonColorMap(labels: string[]) {
  const fixedColors: Record<string, string> = {
    'absence injustifiee': '#dc2626',
    maladie: '#f97316',
    conge: '#2563eb',
    mission: '#0f766e',
    permission: '#d97706',
    formation: '#7c3aed',
    deplacement: '#0891b2',
    autre: '#64748b',
    '-vide-': '#dc2626',
  }

  const dynamic = new Map<string, string>()
  let paletteIndex = 0

  for (const label of labels) {
    const normalized = normalizeReasonLabel(label)
    if (fixedColors[normalized]) {
      dynamic.set(label, fixedColors[normalized])
      continue
    }

    while (Object.values(fixedColors).includes(REASON_PALETTE[paletteIndex % REASON_PALETTE.length])) {
      paletteIndex += 1
    }

    dynamic.set(label, REASON_PALETTE[paletteIndex % REASON_PALETTE.length])
    paletteIndex += 1
  }

  return dynamic
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>
        Occurrences: <strong>{payload[0].value}</strong>
      </p>
    </div>
  )
}

export function EmployeeDetailPage() {
  const { id } = useParams()
  const { employees, allReports, absenceReasons } = useData()
  const [period, setPeriod] = useState<PeriodMode>('30d')

  const employee = employees.find((item) => item.id === id)
  const threshold = useMemo(() => getPeriodThreshold(period), [period])

  const reporting = useMemo(() => {
    if (!employee) return null

    const scopedReports = (threshold ? allReports.filter((report) => report.date >= threshold) : allReports)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))

    const incidentsByDate = new Map<string, { lateCount: number; absenceCount: number; unjustifiedAbsenceCount: number; lateMinutes: number }>()
    const reasonCounts: Record<string, number> = {}
    const incidents: Array<{
      key: string
      date: string
      type: 'late' | 'absence'
      title: string
      detail: string
      note?: string
      color: string
    }> = []

    let totalLate = 0
    let totalAbsent = 0
    let totalLateMin = 0

    for (const report of scopedReports) {
      const lateEntries = report.lateEntries.filter((entry) => entry.employeeId === employee.id)
      const absenceEntries = report.absenceEntries.filter((entry) => entry.employeeId === employee.id)
      if (!lateEntries.length && !absenceEntries.length) continue

      const current = incidentsByDate.get(report.date) ?? { lateCount: 0, absenceCount: 0, unjustifiedAbsenceCount: 0, lateMinutes: 0 }

      for (const entry of lateEntries) {
        totalLate += 1
        totalLateMin += entry.minutesLate
        current.lateCount += 1
        current.lateMinutes += entry.minutesLate
        incidents.push({
          key: entry.id,
          date: report.date,
          type: 'late',
          title: 'Retard',
          detail: `Arrivee ${entry.arrivalTime} - ${entry.minutesLate} min`,
          note: entry.note,
          color: '#f97316',
        })
      }

      for (const entry of absenceEntries) {
        totalAbsent += 1
        current.absenceCount += 1
        if (isUnjustifiedAbsenceReason(absenceReasons, entry.reasonId)) current.unjustifiedAbsenceCount += 1
        const statsLabel = getAbsenceReasonStatsLabel(absenceReasons, entry.reasonId)
        reasonCounts[statsLabel] = (reasonCounts[statsLabel] ?? 0) + 1
        incidents.push({
          key: entry.id,
          date: report.date,
          type: 'absence',
          title: 'Absence',
          detail: statsLabel,
          note: entry.comment,
          color: '#ef4444',
        })
      }

      incidentsByDate.set(report.date, current)
    }

    const todayStr = today()
    const firstReportDate = scopedReports[0]?.date ?? todayStr
    const lastReportDate = scopedReports[scopedReports.length - 1]?.date ?? todayStr
    const rangeStart = threshold ?? firstReportDate
    const rangeEnd = threshold ? todayStr : lastReportDate
    const calendarDates = enumerateDates(rangeStart, rangeEnd)

    const reportDayTrend = scopedReports.map((report) => {
      const values = incidentsByDate.get(report.date) ?? { lateCount: 0, absenceCount: 0, unjustifiedAbsenceCount: 0, lateMinutes: 0 }
      return {
        key: `${employee.id}-report-${report.date}`,
        label: formatShortDate(report.date),
        retards: values.lateCount,
        absences: values.absenceCount,
        unjustifiedAbsences: values.unjustifiedAbsenceCount,
        minutesRetard: values.lateMinutes,
        incidents: values.lateCount + values.absenceCount,
        clean: values.lateCount === 0 && values.absenceCount === 0,
      }
    })

    const dailyTrend = calendarDates.map((date) => {
      const values = incidentsByDate.get(date) ?? { lateCount: 0, absenceCount: 0, unjustifiedAbsenceCount: 0, lateMinutes: 0 }
      return {
        key: `${employee.id}-${date}`,
        label: formatShortDate(date),
        retards: values.lateCount,
        absences: values.absenceCount,
        minutesRetard: values.lateMinutes,
        incidents: values.lateCount + values.absenceCount,
      }
    })

    const activeDays = reportDayTrend.filter((item) => item.incidents > 0)

    const reasonColorMap = buildReasonColorMap(Object.keys(reasonCounts))

    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([reasonLabel, count]) => {
        return {
          id: reasonLabel,
          label: reasonLabel,
          value: count,
          fill: reasonColorMap.get(reasonLabel) ?? '#ef4444',
        }
      })

    const coloredIncidents = incidents.map((incident) => (
      incident.type === 'absence'
        ? { ...incident, color: reasonColorMap.get(incident.detail) ?? '#ef4444' }
        : incident
    ))

    incidents.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return a.type.localeCompare(b.type)
    })

    const hasNoIncidents = totalLate === 0 && totalAbsent === 0
    const reportDays = Math.max(reportDayTrend.length, 1)
    const lateDays = reportDayTrend.filter((item) => item.retards > 0).length
    const punctualDays = hasNoIncidents ? reportDays : reportDayTrend.filter((item) => item.retards === 0 && item.unjustifiedAbsences === 0).length
    const unjustifiedAbsenceDays = reportDayTrend.filter((item) => item.unjustifiedAbsences > 0).length
    const totalAbsenceDays = reportDayTrend.filter((item) => item.absences > 0).length
    const presenceDays = hasNoIncidents ? reportDays : Math.max(reportDays - totalAbsenceDays, 0)
    const cleanDays = hasNoIncidents ? reportDays : reportDayTrend.filter((item) => item.clean).length
    const averageLateMinutes = totalLate > 0 ? totalLateMin / totalLate : 0

    let longestCleanStreak = 0
    let currentCleanStreak = 0
    for (const day of reportDayTrend) {
      if (day.retards === 0 && day.unjustifiedAbsences === 0) {
        currentCleanStreak += 1
        longestCleanStreak = Math.max(longestCleanStreak, currentCleanStreak)
      } else {
        currentCleanStreak = 0
      }
    }

    if (hasNoIncidents) {
      longestCleanStreak = Math.max(reportDayTrend.length, 1)
    }

    const streakBase = Math.max(Math.min(reportDayTrend.length || 1, 10), 1)
    const punctualityScore = hasNoIncidents ? 100 : Math.round(100 * (punctualDays / reportDays))
    const presenceScore = hasNoIncidents ? 100 : Math.round(Math.max(0, 100 * (1 - unjustifiedAbsenceDays / reportDays)))
    const assiduityScore = hasNoIncidents ? 100 : Math.round(100 * (cleanDays / reportDays))
    const rigorScore = hasNoIncidents ? 100 : Math.round(Math.min(100, (longestCleanStreak / streakBase) * 100))
    const presenceRate = hasNoIncidents ? 1 : presenceDays / reportDays
    const lateRateWhenPresent = hasNoIncidents ? 0 : presenceDays > 0 ? lateDays / presenceDays : 1
    const minuteSeverityFactor = hasNoIncidents ? 1 : Math.max(0, 1 - Math.min(averageLateMinutes, 60) / 60)
    const disciplineScore = hasNoIncidents ? 100 : Math.round(Math.max(0, 100 * presenceRate * (((1 - lateRateWhenPresent) * 0.65) + (minuteSeverityFactor * 0.35))))
    const availabilityScore = hasNoIncidents ? 100 : Math.round(Math.max(0, 100 * (1 - totalAbsenceDays / reportDays)))

    const evaluationAxes = [
      { subject: 'Ponctualite', score: punctualityScore, fullMark: 100 },
      { subject: 'Presence', score: presenceScore, fullMark: 100 },
      { subject: 'Assiduite', score: assiduityScore, fullMark: 100 },
      { subject: 'Rigueur', score: rigorScore, fullMark: 100 },
      { subject: 'Discipline', score: disciplineScore, fullMark: 100 },
      { subject: 'Disponibilite', score: availabilityScore, fullMark: 100 },
    ]

    const overallScore = hasNoIncidents ? 100 : Math.round(evaluationAxes.reduce((sum, item) => sum + item.score, 0) / evaluationAxes.length)
    const strongestAxis = evaluationAxes.reduce((best, item) => (item.score > best.score ? item : best), evaluationAxes[0])
    const weakestAxis = evaluationAxes.reduce((worst, item) => (item.score < worst.score ? item : worst), evaluationAxes[0])

    return {
      totalLate,
      totalAbsent,
      totalLateMin,
      daysFlagged: activeDays.length,
      dailyTrend,
      topReasons,
      incidents: coloredIncidents,
      evaluationAxes,
      overallScore,
      strongestAxis,
      weakestAxis,
      unjustifiedAbsenceDays,
      cleanDays,
      longestCleanStreak,
      hasNoIncidents,
    }
  }, [absenceReasons, allReports, employee, threshold])

  if (!employee || !reporting) {
    return (
      <section className="page">
        <div className="card empty-state-card">
          <UserX size={46} />
          <h2>Employe introuvable</h2>
          <Link className="primary-button button-leading-icon" to="/employes">
            <ArrowLeft size={16} />
            Retour
          </Link>
        </div>
      </section>
    )
  }

  const chartSubtitle = `Periode: ${PERIOD_LABELS[period]} - ${reporting.daysFlagged} jour${reporting.daysFlagged > 1 ? 's' : ''} signale${reporting.daysFlagged > 1 ? 's' : ''}`
  const reasonsPieData = reporting.topReasons.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.fill,
  }))
  const evaluationLevel = reporting.overallScore >= 85
    ? 'Excellent'
    : reporting.overallScore >= 70
      ? 'Bon profil'
      : reporting.overallScore >= 50
        ? 'A surveiller'
        : 'Critique'

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Employe</p>
          <h1>{employee.fullName}</h1>
          <p>{employee.isActive ? 'Employe actif' : 'Employe inactif'}</p>
        </div>
        <div className="header-actions">
          <span className={`status-badge ${employee.isActive ? 'success' : 'inactive'}`}>
            {employee.isActive ? <UserCheck size={13} /> : <UserX size={13} />}
            {employee.isActive ? 'Actif' : 'Inactif'}
          </span>
          <Link className="ghost-button link-button button-leading-icon" to="/employes">
            <ArrowLeft size={16} />
            Retour
          </Link>
        </div>
      </header>

      <div className="toolbar">
        {PERIOD_OPTIONS.map((option) => (
          <button key={option.key} className={`chip${period === option.key ? ' active' : ''}`} onClick={() => setPeriod(option.key)}>
            {option.label}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="metric-card">
          <div className="metric-icon"><Clock3 size={18} /></div>
          <span>Retards</span>
          <strong>{reporting.totalLate}</strong>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><UserX size={18} /></div>
          <span>Absences</span>
          <strong>{reporting.totalAbsent}</strong>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><Activity size={18} /></div>
          <span>Minutes cumulees</span>
          <strong>{reporting.totalLateMin}</strong>
        </div>
        <div className="metric-card">
          <div className="metric-icon"><CalendarClock size={18} /></div>
          <span>Jours signales</span>
          <strong>{reporting.daysFlagged}</strong>
        </div>
      </div>

      {reporting.totalLate + reporting.totalAbsent > 0 ? (
        <>
          <div className="chart-card chart-card-wide">
            <p className="chart-title"><span className="chart-title-dot" />Tendance journaliere - retards &amp; absences</p>
            <p className="section-subcopy">{chartSubtitle}</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={reporting.dailyTrend} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="employeeRetardTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b3a6b" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1b3a6b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="employeeAbsenceTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Area type="monotone" dataKey="retards" name="Retards" stroke="#1b3a6b" strokeWidth={2} fill="url(#employeeRetardTrend)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="absences" name="Absences" stroke="#f97316" strokeWidth={2} fill="url(#employeeAbsenceTrend)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <p className="chart-title"><span className="chart-title-dot" style={{ background: '#8b5cf6' }} />Minutes de retard cumulees / jour</p>
              <p className="section-subcopy">Evolution journaliere des minutes de retard.</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={reporting.dailyTrend} margin={{ top: 5, right: 16, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="minutesRetard" name="Minutes retard" stroke="#8b5cf6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#8b5cf6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <p className="chart-title"><span className="chart-title-dot" style={{ background: '#22c55e' }} />Repartition des motifs</p>
              <p className="section-subcopy">Distribution des absences sur la periode selectionnee. La presence ne penalise que les absences injustifiees.</p>
              {reasonsPieData.length === 0 ? (
                <div className="empty-inline">Aucune absence enregistree.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={reasonsPieData} cx="50%" cy="45%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                      {reasonsPieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-card chart-card-wide">
              <p className="chart-title"><span className="chart-title-dot" style={{ background: '#0f766e' }} />Evaluation globale de l employe</p>
              <p className="section-subcopy">Radar de performance pour distinguer rapidement un bon profil d un profil a accompagner.</p>
              <div className="employee-evaluation-grid">
                <div className="employee-radar-shell">
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={reporting.evaluationAxes} outerRadius="72%">
                      <PolarGrid stroke="#dbeafe" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={6} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <Radar name="Score" dataKey="score" stroke="#0f766e" fill="#14b8a6" fillOpacity={0.32} strokeWidth={2.5} />
                      <Tooltip content={<ChartTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="employee-eval-panel">
                  <div className="employee-score-chip">
                    <span>Score global</span>
                    <strong>{reporting.overallScore}/100</strong>
                  </div>
                  <div className="employee-eval-summary">
                    <h3>{evaluationLevel}</h3>
                    <p>
                      Point fort: <strong>{reporting.strongestAxis.subject}</strong>. Axe a travailler: <strong>{reporting.weakestAxis.subject}</strong>.
                    </p>
                    <p>
                      {reporting.cleanDays} jour{reporting.cleanDays > 1 ? 's' : ''} sans incident, {reporting.unjustifiedAbsenceDays} absence{reporting.unjustifiedAbsenceDays > 1 ? 's' : ''} injustifiee{reporting.unjustifiedAbsenceDays > 1 ? 's' : ''}, serie max de {reporting.longestCleanStreak} jour{reporting.longestCleanStreak > 1 ? 's' : ''}.
                    </p>
                  </div>
                  <div className="employee-kpi-list">
                    {reporting.evaluationAxes.map((axis) => (
                      <div key={axis.subject} className="employee-kpi-row">
                        <div className="employee-kpi-label">
                          <span>{axis.subject}</span>
                          <div className="employee-kpi-tooltip">
                            <strong>{axis.subject}</strong>
                            <p>{EVALUATION_META[axis.subject]?.description}</p>
                            <p>{EVALUATION_META[axis.subject]?.formula}</p>
                          </div>
                        </div>
                        <strong>{axis.score}/100</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2>Incidents recents</h2>
            </div>
            <p className="section-subcopy">{reporting.incidents.length} incident{reporting.incidents.length > 1 ? 's' : ''} sur la periode</p>
            <div className="list">
              {reporting.incidents.map((incident) => (
                <div key={incident.key} className="list-row incident-row-desktop">
                  <div className="incident-row-marker" style={{ background: incident.color }} />
                  <div className="incident-row-copy">
                    <strong>{formatLongDate(incident.date)}</strong>
                    <div className="muted">{incident.title} - {incident.detail}</div>
                    {incident.note ? <div className="muted italic">{incident.note}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card empty-state-card">
          <UserCheck size={48} />
          <h2>Aucun incident</h2>
          <p>Aucun retard ni absence pour cet employe sur la periode selectionnee.</p>
          <div className="employee-score-chip">
            <span>Evaluation globale</span>
            <strong>{reporting.overallScore}/100</strong>
          </div>
        </div>
      )}
    </section>
  )
}
