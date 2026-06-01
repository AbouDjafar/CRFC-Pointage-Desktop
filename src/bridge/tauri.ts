import { invoke } from '@tauri-apps/api/core'
import type { DesktopBridge } from '@/bridge/types'
import type { AbsenceReason, AppSettings, DailyReport, Employee, PickedImportFile, RecurringAbsence, SaveRevealResult, User } from '@/types'

type TauriPickedFile = { name: string; path?: string; bytes: number[] } | null

export const tauriBridge: DesktopBridge = {
  loadSession() { return invoke<string | null>('load_session') },
  saveSession(userId: string) { return invoke('save_session', { userId }) },
  clearSession() { return invoke('clear_session') },
  getUsers() { return invoke<User[]>('get_users') },
  saveUsers(users: User[]) { return invoke('save_users', { users }) },
  getEmployees() { return invoke<Employee[]>('get_employees') },
  saveEmployees(employees: Employee[]) { return invoke('save_employees', { employees }) },
  getAbsenceReasons() { return invoke<AbsenceReason[]>('get_absence_reasons') },
  saveAbsenceReasons(reasons: AbsenceReason[]) { return invoke('save_absence_reasons', { reasons }) },
  getReports() { return invoke<DailyReport[]>('get_reports') },
  saveReports(reports: DailyReport[]) { return invoke('save_reports', { reports }) },
  getRecurringAbsences() { return invoke<RecurringAbsence[]>('get_recurring_absences') },
  saveRecurringAbsences(absences: RecurringAbsence[]) { return invoke('save_recurring_absences', { absences }) },
  getAppSettings() { return invoke<AppSettings>('get_app_settings') },
  saveAppSettings(settings: AppSettings) { return invoke('save_app_settings', { settings }) },
  async pickImportFile(extensions: string[]) {
    const result = await invoke<TauriPickedFile>('pick_import_file', { extensions })
    if (!result) return null
    return { name: result.name, path: result.path, bytes: new Uint8Array(result.bytes) } satisfies PickedImportFile
  },
  savedFileExists(path?: string | null) { return invoke<boolean>('saved_file_exists', { path }) },
  revealSavedFile(path: string) { return invoke<SaveRevealResult>('reveal_saved_file', { path }) },
  deleteSavedFile(path?: string | null) { return invoke('delete_saved_file', { path }) },
  savePdfFile(fileName: string, bytes: Uint8Array) { return invoke<SaveRevealResult>('save_pdf_file', { fileName, bytes: Array.from(bytes) }) },
  savePdfAndReveal(fileName: string, bytes: Uint8Array) { return invoke<SaveRevealResult>('save_pdf_and_reveal', { fileName, bytes: Array.from(bytes) }) },
  saveExcelAndReveal(fileName: string, bytes: Uint8Array) { return invoke<SaveRevealResult>('save_excel_and_reveal', { fileName, bytes: Array.from(bytes) }) },
}
