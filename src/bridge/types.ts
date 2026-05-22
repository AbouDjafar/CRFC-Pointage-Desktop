import type { AbsenceReason, AppSettings, DailyReport, Employee, PickedImportFile, RecurringAbsence, SaveRevealResult, User } from '@/types'

export interface DesktopBridge {
  loadSession(): Promise<string | null>
  saveSession(userId: string): Promise<void>
  clearSession(): Promise<void>
  getUsers(): Promise<User[]>
  saveUsers(users: User[]): Promise<void>
  getEmployees(): Promise<Employee[]>
  saveEmployees(employees: Employee[]): Promise<void>
  getAbsenceReasons(): Promise<AbsenceReason[]>
  saveAbsenceReasons(reasons: AbsenceReason[]): Promise<void>
  getReports(): Promise<DailyReport[]>
  saveReports(reports: DailyReport[]): Promise<void>
  getRecurringAbsences(): Promise<RecurringAbsence[]>
  saveRecurringAbsences(absences: RecurringAbsence[]): Promise<void>
  getAppSettings(): Promise<AppSettings>
  saveAppSettings(settings: AppSettings): Promise<void>
  pickImportFile(extensions: string[]): Promise<PickedImportFile | null>
  savePdfAndReveal(fileName: string, bytes: Uint8Array): Promise<SaveRevealResult>
  saveExcelAndReveal(fileName: string, bytes: Uint8Array): Promise<SaveRevealResult>
}
