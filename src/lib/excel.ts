import * as XLSX from 'xlsx'
import { getAbsenceReasonLabel } from '@/lib/absenceReasons'
import { formatFrDate } from '@/lib/date'
import type { AbsenceReason, DailyReport, Employee, User } from '@/types'

export function generateExcelBytes(params: {
  reports: DailyReport[]
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  author: User
  periodStart: string
  periodEnd: string
}) {
  const { reports, employees, absenceReasons, author, periodStart, periodEnd } = params
  const getEmployeeName = (id: string, fallback?: string) =>
    employees.find((employee) => employee.id === id)?.fullName ?? fallback ?? 'Inconnu'
  const getReasonLabel = (id: string) => getAbsenceReasonLabel(absenceReasons, id)
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date))
  const totalLate = sorted.reduce((sum, report) => sum + report.lateEntries.length, 0)
  const totalAbsent = sorted.reduce((sum, report) => sum + report.absenceEntries.length, 0)
  const totalVisitors = sorted.reduce((sum, report) => sum + report.visitorCount, 0)
  const totalLateMin = sorted.reduce((sum, report) => sum + report.lateEntries.reduce((acc, entry) => acc + entry.minutesLate, 0), 0)
  const avgLateMin = totalLate > 0 ? Math.round(totalLateMin / totalLate) : 0

  const synthData: (string | number)[][] = [
    ['CRFC - Synthese des Rapports de Pointage'],
    [`Periode : ${formatFrDate(periodStart)} - ${formatFrDate(periodEnd)}`],
    [`Genere par : ${author.firstName} ${author.lastName} (${author.jobTitle})`],
    [`Date d'export : ${new Date().toLocaleDateString('fr-FR')}`],
    [],
    ['Date', 'Retards', 'Absences', 'Visiteurs', 'Minutes de retard', 'Statut'],
    ...sorted.map((report) => [formatFrDate(report.date), report.lateEntries.length, report.absenceEntries.length, report.visitorCount, report.lateEntries.reduce((sum, entry) => sum + entry.minutesLate, 0), report.status === 'FINALIZED' ? 'Finalise' : 'Brouillon']),
    [],
    ['TOTAL', totalLate, totalAbsent, totalVisitors, totalLateMin, `${sorted.filter((report) => report.status === 'FINALIZED').length}/${sorted.length} finalises`],
  ]

  const totalsData: (string | number)[][] = [
    ['Indicateur', 'Valeur'],
    ['Nombre de rapports', sorted.length],
    ['Total retards', totalLate],
    ['Total absences', totalAbsent],
    ['Total incidents', totalLate + totalAbsent],
    ['Total visiteurs', totalVisitors],
    ['Total minutes de retard', totalLateMin],
    ['Retard moyen (min)', avgLateMin],
  ]

  const lateData: (string | number)[][] = [
    ['Date', 'Noms et Prenoms', "Heure d'arrivee", 'Minutes de retard'],
    ...sorted.flatMap((report) => report.lateEntries.map((entry) => [formatFrDate(report.date), getEmployeeName(entry.employeeId, entry.employeeNameSnapshot), entry.arrivalTime, entry.minutesLate])),
  ]

  const absenceData: (string | number)[][] = [
    ['Date', 'Noms et Prenoms', 'Motif', 'Observations'],
    ...sorted.flatMap((report) => report.absenceEntries.map((entry) => [formatFrDate(report.date), getEmployeeName(entry.employeeId, entry.employeeNameSnapshot), getReasonLabel(entry.reasonId), entry.comment ?? ''])),
  ]

  const workbook = XLSX.utils.book_new()
  const wsSynth = XLSX.utils.aoa_to_sheet(synthData)
  wsSynth['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(workbook, wsSynth, 'Synthese')
  const wsTotals = XLSX.utils.aoa_to_sheet(totalsData)
  wsTotals['!cols'] = [{ wch: 36 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(workbook, wsTotals, 'Totaux')
  const wsLate = XLSX.utils.aoa_to_sheet(lateData)
  wsLate['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 16 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(workbook, wsLate, 'Retards')
  const wsAbsence = XLSX.utils.aoa_to_sheet(absenceData)
  wsAbsence['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 24 }, { wch: 32 }]
  XLSX.utils.book_append_sheet(workbook, wsAbsence, 'Absences')
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}
