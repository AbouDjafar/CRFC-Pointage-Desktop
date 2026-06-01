export type UserRole = 'ADMIN' | 'AGENT'
export type ReportStatus = 'DRAFT' | 'FINALIZED'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  jobTitle: string
  password: string
  role: UserRole
  isActive: boolean
  createdAt: string
  createdBy?: string
}

export interface Employee {
  id: string
  fullName: string
  firstName: string
  lastName: string
  isActive: boolean
  needsReview: boolean
  importSource: string
  importedAt: string
  createdAt: string
}

export interface AbsenceReason {
  id: string
  label: string
}

export interface RecurringAbsence {
  id: string
  employeeId: string
  reasonId: string
  comment?: string
}

export interface LateEntry {
  id: string
  employeeId: string
  employeeNameSnapshot?: string
  arrivalTime: string
  minutesLate: number
  note?: string
}

export interface AbsenceEntry {
  id: string
  employeeId: string
  employeeNameSnapshot?: string
  reasonId: string
  comment?: string
}

export interface DailyReport {
  id: string
  date: string
  status: ReportStatus
  lateEntries: LateEntry[]
  absenceEntries: AbsenceEntry[]
  visitorCount: number
  introText: string
  createdBy: string
  createdAt: string
  updatedAt: string
  pdfUri?: string
  pdfFileName?: string
  pdfGeneratedAt?: string
}

export interface PickedImportFile {
  name: string
  path?: string
  bytes: Uint8Array
}

export interface SaveRevealResult {
  path: string
}

export interface AppSettings {
  defaultLateTime: string
}
