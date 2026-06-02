import { DEFAULT_APP_SETTINGS } from '@/constants/appSettings'
import { getAbsenceReasonLabel } from '@/lib/absenceReasons'
import type { AbsenceReason, DailyReport, Employee, LateEntry } from '@/types'

function parseTimeMinutes(value: string) {
  const [hh, mm] = value.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
  return hh * 60 + mm
}

export function calcMinutesLate(value: string, defaultLateTime = DEFAULT_APP_SETTINGS.defaultLateTime) {
  return Math.max(0, parseTimeMinutes(value) - parseTimeMinutes(defaultLateTime))
}

export function recalculateLateEntry(entry: LateEntry, defaultLateTime: string): LateEntry {
  return {
    ...entry,
    minutesLate: calcMinutesLate(entry.arrivalTime, defaultLateTime),
  }
}

export function recalculateReportsLateMinutes(reports: DailyReport[], defaultLateTime: string): DailyReport[] {
  return reports.map((report) => ({
    ...report,
    lateEntries: report.lateEntries.map((entry) => recalculateLateEntry(entry, defaultLateTime)),
    updatedAt: new Date().toISOString(),
  }))
}

export function employeeMatchesQuery(employee: Employee, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [employee.fullName, employee.firstName, employee.lastName].some((value) =>
    value.toLowerCase().includes(q),
  )
}

export function computeGlobalStats(reports: DailyReport[], employees: Employee[], reasons: AbsenceReason[]) {
  const totalLate = reports.reduce((sum, report) => sum + report.lateEntries.length, 0)
  const totalAbsent = reports.reduce((sum, report) => sum + report.absenceEntries.length, 0)
  const totalVisitors = reports.reduce((sum, report) => sum + report.visitorCount, 0)
  const totalLateMin = reports.reduce(
    (sum, report) => sum + report.lateEntries.reduce((acc, entry) => acc + entry.minutesLate, 0),
    0,
  )
  const employeeNames = new Map(employees.map((employee) => [employee.id, employee.fullName]))
  const lateByEmployee = new Map<string, number>()
  const absentByEmployee = new Map<string, number>()
  const absentByReason = new Map<string, number>()

  for (const report of reports) {
    for (const entry of report.lateEntries) {
      lateByEmployee.set(entry.employeeId, (lateByEmployee.get(entry.employeeId) ?? 0) + 1)
    }
    for (const entry of report.absenceEntries) {
      absentByEmployee.set(entry.employeeId, (absentByEmployee.get(entry.employeeId) ?? 0) + 1)
      absentByReason.set(entry.reasonId, (absentByReason.get(entry.reasonId) ?? 0) + 1)
    }
  }

  const topLate = [...lateByEmployee.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: employeeNames.get(id) ?? id, count }))

  const topAbsent = [...absentByEmployee.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: employeeNames.get(id) ?? id, count }))

  const topReasons = [...absentByReason.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ id, name: getAbsenceReasonLabel(reasons, id), count }))

  return { totalLate, totalAbsent, totalVisitors, totalLateMin, topLate, topAbsent, topReasons }
}
