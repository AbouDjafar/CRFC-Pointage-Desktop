import type { AbsenceEntry, AbsenceReason, DailyReport, Employee, LateEntry, RecurringAbsence } from '@/types'
import { buildEmployeeKey, buildFullName, normalizeForLookup, type ImportedEmployeeRow, type ImportedReportRow } from '@/lib/importData'
import { genId } from '@/lib/id'
import { calcMinutesLate } from '@/lib/reporting'

export function generateIntroText(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const full = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return `Monsieur le Coordonnateur National,\n\nJ'ai l'honneur de vous rendre compte de la situation journaliere du personnel ce ${full}.\n\nEn effet, le pointage du personnel a permis de relever les faits ci-apres.`
}

export function applyImportedEmployees(current: Employee[], parsedRows: ImportedEmployeeRow[], skipped: number) {
  const now = new Date().toISOString()
  const importedAt = now.split('T')[0]
  const nextEmployees = [...current]
  const existingIndexByKey = new Map<string, number>()
  nextEmployees.forEach((employee, index) => existingIndexByKey.set(buildEmployeeKey(employee.firstName, employee.lastName), index))

  let created = 0
  let updated = 0
  for (const row of parsedRows) {
    const key = buildEmployeeKey(row.firstName, row.lastName)
    const existingIndex = existingIndexByKey.get(key)
    if (existingIndex !== undefined) {
      nextEmployees[existingIndex] = { ...nextEmployees[existingIndex], firstName: row.firstName, lastName: row.lastName, fullName: row.fullName, isActive: true, importSource: 'IMPORT', importedAt }
      updated += 1
    } else {
      nextEmployees.push({ id: genId(), firstName: row.firstName, lastName: row.lastName, fullName: buildFullName(row.firstName, row.lastName), isActive: true, needsReview: false, importSource: 'IMPORT', importedAt, createdAt: now })
      existingIndexByKey.set(key, nextEmployees.length - 1)
      created += 1
    }
  }

  return { employees: nextEmployees, created, updated, skipped }
}

export function applyImportedReports(args: { currentReports: DailyReport[]; parsedReports: ImportedReportRow[]; employees: Employee[]; absenceReasons: AbsenceReason[]; userId: string }) {
  const { currentReports, parsedReports, employees, absenceReasons, userId } = args
  const now = new Date().toISOString()
  const employeeIdByName = new Map(employees.map((employee) => [normalizeForLookup(employee.fullName), employee.id]))
  const reasonIdByLabel = new Map(absenceReasons.map((reason) => [normalizeForLookup(reason.label), reason.id]))
  const importedDates = new Set(parsedReports.map((report) => report.date))
  const existingByDate = new Map<string, DailyReport>()
  currentReports.forEach((report) => {
    if (importedDates.has(report.date) && !existingByDate.has(report.date)) existingByDate.set(report.date, report)
  })

  let lateEntriesCount = 0
  let absenceEntriesCount = 0
  const rebuiltReports: DailyReport[] = parsedReports.map((report) => {
    const existing = existingByDate.get(report.date)
    const lateEntries: LateEntry[] = report.lateEntries.map((entry) => {
      lateEntriesCount += 1
      const employeeNameSnapshot = entry.employeeName.trim()
      const employeeId = employeeIdByName.get(normalizeForLookup(employeeNameSnapshot)) ?? `imported:${normalizeForLookup(employeeNameSnapshot)}`
      return { id: genId(), employeeId, employeeNameSnapshot, arrivalTime: entry.arrivalTime, minutesLate: entry.minutesLate }
    })
    const absenceEntries: AbsenceEntry[] = report.absenceEntries.map((entry) => {
      absenceEntriesCount += 1
      const employeeNameSnapshot = entry.employeeName.trim()
      const employeeId = employeeIdByName.get(normalizeForLookup(employeeNameSnapshot)) ?? `imported:${normalizeForLookup(employeeNameSnapshot)}`
      const reasonId = reasonIdByLabel.get(normalizeForLookup(entry.reasonLabel))
      if (!reasonId) throw new Error(`Motif d'absence inconnu: ${entry.reasonLabel}`)
      return { id: genId(), employeeId, employeeNameSnapshot, reasonId, comment: entry.comment }
    })
    return { id: existing?.id ?? genId(), date: report.date, status: report.status, lateEntries, absenceEntries, visitorCount: report.visitorCount, introText: generateIntroText(report.date), createdBy: userId, createdAt: existing?.createdAt ?? now, updatedAt: now }
  })

  return {
    reports: [...currentReports.filter((report) => !importedDates.has(report.date)), ...rebuiltReports].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
    importedDates: rebuiltReports.length,
    replacedDates: existingByDate.size,
    lateEntries: lateEntriesCount,
    absenceEntries: absenceEntriesCount,
  }
}

export function createReportDraft(date: string, userId: string, recurringAbsences: RecurringAbsence[], employees: Employee[]) {
  const findEmployeeName = (employeeId: string) => employees.find((employee) => employee.id === employeeId)?.fullName
  const defaultAbsences: AbsenceEntry[] = recurringAbsences.map((recurringAbsence) => ({ id: genId(), employeeId: recurringAbsence.employeeId, employeeNameSnapshot: findEmployeeName(recurringAbsence.employeeId), reasonId: recurringAbsence.reasonId, comment: recurringAbsence.comment }))
  const now = new Date().toISOString()
  return { id: genId(), date, status: 'DRAFT' as const, lateEntries: [], absenceEntries: defaultAbsences, visitorCount: 0, introText: generateIntroText(date), createdBy: userId, createdAt: now, updatedAt: now }
}

export function addLateEntryToReport(report: DailyReport, employeeId: string, arrivalTime: string, employeeNameSnapshot?: string, note?: string) {
  return { ...report, lateEntries: [...report.lateEntries, { id: genId(), employeeId, employeeNameSnapshot, arrivalTime, minutesLate: calcMinutesLate(arrivalTime), note }], updatedAt: new Date().toISOString() }
}
