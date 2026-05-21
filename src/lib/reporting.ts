import type { AbsenceReason, DailyReport, Employee } from '@/types'

export function calcMinutesLate(value: string) {
  const [hh, mm] = value.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0
  return Math.max(0, hh * 60 + mm - (8 * 60 + 15))
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
  const reasonNames = new Map(reasons.map((reason) => [reason.id, reason.label]))
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
    .map(([id, count]) => ({ id, name: reasonNames.get(id) ?? id, count }))

  return { totalLate, totalAbsent, totalVisitors, totalLateMin, topLate, topAbsent, topReasons }
}
