import { DEFAULT_APP_SETTINGS } from '@/constants/appSettings'
import type { DesktopBridge } from '@/bridge/types'
import type { AbsenceReason, AppSettings, DailyReport, Employee, PickedImportFile, RecurringAbsence, User } from '@/types'

const storageKeys = {
  users: 'CRFC_USERS_V2',
  session: 'CRFC_SESSION_V2',
  employees: 'CRFC_EMPLOYEES_V2',
  reasons: 'CRFC_REASONS_V1',
  reports: 'CRFC_REPORTS_V2',
  recurring: 'CRFC_RECURRING_V2',
  appSettings: 'CRFC_APP_SETTINGS_V1',
}

function loadJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function downloadBytes(fileName: string, bytes: Uint8Array, mimeType: string) {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  const blob = new Blob([copy], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
  return { path: `download://${fileName}` }
}

async function pickImportFile(extensions: string[]): Promise<PickedImportFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = extensions.join(',')
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resolve({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })
    }
    input.click()
  })
}

export const browserBridge: DesktopBridge = {
  async loadSession() { return localStorage.getItem(storageKeys.session) },
  async saveSession(userId: string) { localStorage.setItem(storageKeys.session, userId) },
  async clearSession() { localStorage.removeItem(storageKeys.session) },
  async getUsers() { return loadJson<User[]>(storageKeys.users, []) },
  async saveUsers(users: User[]) { saveJson(storageKeys.users, users) },
  async getEmployees() { return loadJson<Employee[]>(storageKeys.employees, []) },
  async saveEmployees(employees: Employee[]) { saveJson(storageKeys.employees, employees) },
  async getAbsenceReasons() { return loadJson<AbsenceReason[]>(storageKeys.reasons, []) },
  async saveAbsenceReasons(reasons: AbsenceReason[]) { saveJson(storageKeys.reasons, reasons) },
  async getReports() { return loadJson<DailyReport[]>(storageKeys.reports, []) },
  async saveReports(reports: DailyReport[]) { saveJson(storageKeys.reports, reports) },
  async getRecurringAbsences() { return loadJson<RecurringAbsence[]>(storageKeys.recurring, []) },
  async saveRecurringAbsences(absences: RecurringAbsence[]) { saveJson(storageKeys.recurring, absences) },
  async getAppSettings() { return loadJson<AppSettings>(storageKeys.appSettings, DEFAULT_APP_SETTINGS) },
  async saveAppSettings(settings: AppSettings) { saveJson(storageKeys.appSettings, settings) },
  pickImportFile,
  async savePdfAndReveal(fileName, bytes) { return downloadBytes(fileName, bytes, 'application/pdf') },
  async saveExcelAndReveal(fileName, bytes) { return downloadBytes(fileName, bytes, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') },
}
