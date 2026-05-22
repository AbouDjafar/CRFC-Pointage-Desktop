import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { desktopBridge } from '@/bridge'
import { DEFAULT_APP_SETTINGS } from '@/constants/appSettings'
import { applyImportedEmployees, applyImportedReports, createReportDraft } from '@/domain/data'
import { SEED_EMPLOYEES, SEED_REASONS } from '@/data/seeds'
import { parseEmployeesSpreadsheet, parseReportsWorkbook } from '@/lib/importData'
import { genId } from '@/lib/id'
import { calcMinutesLate, recalculateReportsLateMinutes } from '@/lib/reporting'
import { useAuth } from '@/contexts/AuthContext'
import type { AbsenceEntry, AbsenceReason, AppSettings, DailyReport, Employee, PickedImportFile, RecurringAbsence } from '@/types'

interface DataContextValue {
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  reports: DailyReport[]
  allReports: DailyReport[]
  recurringAbsences: RecurringAbsence[]
  appSettings: AppSettings
  loading: boolean
  importReportsFromWorkbook(file: PickedImportFile): Promise<{ importedDates: number; replacedDates: number; lateEntries: number; absenceEntries: number }>
  importEmployeesFromSpreadsheet(file: PickedImportFile): Promise<{ created: number; updated: number; skipped: number }>
  addEmployee(fullName: string, firstName: string, lastName: string): Promise<void>
  updateEmployee(id: string, updates: Partial<Employee>): Promise<void>
  deleteEmployee(id: string): Promise<void>
  toggleEmployeeActive(id: string): Promise<void>
  getReportByDate(date: string): DailyReport | undefined
  createOrUpdateReport(date: string, updates?: Partial<DailyReport>): Promise<DailyReport>
  addLateEntry(reportId: string, entry: { employeeId: string; arrivalTime: string; note?: string }): Promise<void>
  removeLateEntry(reportId: string, entryId: string): Promise<void>
  addAbsenceEntry(reportId: string, entry: Omit<AbsenceEntry, 'id'>): Promise<void>
  removeAbsenceEntry(reportId: string, entryId: string): Promise<void>
  setVisitorCount(reportId: string, count: number): Promise<void>
  finalizeReport(reportId: string): Promise<void>
  reopenReport(reportId: string): Promise<void>
  deleteReport(reportId: string): Promise<void>
  setRecurringAbsence(employeeId: string, reasonId: string, comment?: string): Promise<void>
  removeRecurringAbsence(employeeId: string): Promise<void>
  getRecurringAbsence(employeeId: string): RecurringAbsence | undefined
  updateAppSettings(next: Partial<AppSettings>): Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [absenceReasons, setAbsenceReasons] = useState<AbsenceReason[]>([])
  const [rawReports, setRawReports] = useState<DailyReport[]>([])
  const [recurringAbsences, setRecurringAbsences] = useState<RecurringAbsence[]>([])
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const [storedEmployees, storedReasons, storedReports, storedRecurring, storedSettings] = await Promise.all([
        desktopBridge.getEmployees(),
        desktopBridge.getAbsenceReasons(),
        desktopBridge.getReports(),
        desktopBridge.getRecurringAbsences(),
        desktopBridge.getAppSettings(),
      ])
      const nextEmployees = storedEmployees.length > 0 ? storedEmployees : SEED_EMPLOYEES
      const nextReasons = storedReasons.length > 0 ? storedReasons : SEED_REASONS
      setEmployees(nextEmployees)
      setAbsenceReasons(nextReasons)
      setRawReports(storedReports)
      setRecurringAbsences(storedRecurring)
      setAppSettings(storedSettings)
      if (storedEmployees.length === 0) await desktopBridge.saveEmployees(nextEmployees)
      if (storedReasons.length === 0) await desktopBridge.saveAbsenceReasons(nextReasons)
      setLoading(false)
    }
    void init()
  }, [])

  const reports = useMemo(() => {
    if (!user) return []
    return user.role === 'ADMIN' ? rawReports : rawReports.filter((report) => report.createdBy === user.id)
  }, [rawReports, user])

  const saveEmployees = useCallback(async (value: Employee[]) => {
    setEmployees(value)
    await desktopBridge.saveEmployees(value)
  }, [])

  const saveReports = useCallback(async (value: DailyReport[]) => {
    setRawReports(value)
    await desktopBridge.saveReports(value)
  }, [])

  const saveRecurringAbsences = useCallback(async (value: RecurringAbsence[]) => {
    setRecurringAbsences(value)
    await desktopBridge.saveRecurringAbsences(value)
  }, [])

  const findEmployeeName = useCallback((employeeId: string) => employees.find((employee) => employee.id === employeeId)?.fullName, [employees])

  const importEmployeesFromSpreadsheet = useCallback(async (file: PickedImportFile) => {
    const parsed = await parseEmployeesSpreadsheet(file)
    const result = applyImportedEmployees(employees, parsed.rows, parsed.skipped)
    await saveEmployees(result.employees)
    return { created: result.created, updated: result.updated, skipped: result.skipped }
  }, [employees, saveEmployees])

  const importReportsFromWorkbook = useCallback(async (file: PickedImportFile) => {
    if (!user || user.role !== 'ADMIN') throw new Error('Acces refuse.')
    const parsedReports = await parseReportsWorkbook(file)
    const result = applyImportedReports({ currentReports: rawReports, parsedReports, employees, absenceReasons, userId: user.id })
    await saveReports(result.reports)
    return { importedDates: result.importedDates, replacedDates: result.replacedDates, lateEntries: result.lateEntries, absenceEntries: result.absenceEntries }
  }, [absenceReasons, employees, rawReports, saveReports, user])

  const addEmployee = useCallback(async (fullName: string, firstName: string, lastName: string) => {
    await saveEmployees([...employees, { id: genId(), fullName: fullName.trim(), firstName: firstName.trim(), lastName: lastName.trim(), isActive: true, needsReview: false, importSource: 'manual', importedAt: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() }])
  }, [employees, saveEmployees])

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    await saveEmployees(employees.map((employee) => (employee.id === id ? { ...employee, ...updates } : employee)))
  }, [employees, saveEmployees])

  const deleteEmployee = useCallback(async (id: string) => {
    const employeeName = findEmployeeName(id)
    const nextReports = rawReports.map((report) => {
      let changed = false
      const lateEntries = report.lateEntries.map((entry) => {
        if (entry.employeeId === id && !entry.employeeNameSnapshot && employeeName) {
          changed = true
          return { ...entry, employeeNameSnapshot: employeeName }
        }
        return entry
      })
      const absenceEntries = report.absenceEntries.map((entry) => {
        if (entry.employeeId === id && !entry.employeeNameSnapshot && employeeName) {
          changed = true
          return { ...entry, employeeNameSnapshot: employeeName }
        }
        return entry
      })
      return changed ? { ...report, lateEntries, absenceEntries, updatedAt: new Date().toISOString() } : report
    })
    setEmployees(employees.filter((employee) => employee.id !== id))
    setRecurringAbsences(recurringAbsences.filter((absence) => absence.employeeId !== id))
    setRawReports(nextReports)
    await Promise.all([
      desktopBridge.saveEmployees(employees.filter((employee) => employee.id !== id)),
      desktopBridge.saveRecurringAbsences(recurringAbsences.filter((absence) => absence.employeeId !== id)),
      desktopBridge.saveReports(nextReports),
    ])
  }, [employees, findEmployeeName, rawReports, recurringAbsences])

  const toggleEmployeeActive = useCallback(async (id: string) => {
    await saveEmployees(employees.map((employee) => (employee.id === id ? { ...employee, isActive: !employee.isActive } : employee)))
  }, [employees, saveEmployees])

  const getReportByDate = useCallback((date: string) => {
    if (!user) return undefined
    return rawReports.find((report) => report.date === date && (user.role === 'ADMIN' || report.createdBy === user.id))
  }, [rawReports, user])

  const createOrUpdateReport = useCallback(async (date: string, updates: Partial<DailyReport> = {}) => {
    const existing = rawReports.find((report) => report.date === date && (user?.role === 'ADMIN' || report.createdBy === user?.id))
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      await saveReports(rawReports.map((report) => (report.id === existing.id ? updated : report)))
      return updated
    }
    const report = { ...createReportDraft(date, user?.id ?? '', recurringAbsences, employees), ...updates }
    await saveReports([...rawReports, report])
    return report
  }, [employees, rawReports, recurringAbsences, saveReports, user])

  const addLateEntry = useCallback(async (reportId: string, entry: { employeeId: string; arrivalTime: string; note?: string }) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, lateEntries: [...report.lateEntries, { id: genId(), ...entry, employeeNameSnapshot: findEmployeeName(entry.employeeId), minutesLate: calcMinutesLate(entry.arrivalTime, appSettings.defaultLateTime) }], updatedAt: new Date().toISOString() }))
  }, [appSettings.defaultLateTime, findEmployeeName, rawReports, saveReports])

  const removeLateEntry = useCallback(async (reportId: string, entryId: string) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, lateEntries: report.lateEntries.filter((entry) => entry.id !== entryId), updatedAt: new Date().toISOString() }))
  }, [rawReports, saveReports])

  const addAbsenceEntry = useCallback(async (reportId: string, entry: Omit<AbsenceEntry, 'id'>) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, absenceEntries: [...report.absenceEntries, { id: genId(), ...entry, employeeNameSnapshot: entry.employeeNameSnapshot ?? findEmployeeName(entry.employeeId) }], updatedAt: new Date().toISOString() }))
  }, [findEmployeeName, rawReports, saveReports])

  const removeAbsenceEntry = useCallback(async (reportId: string, entryId: string) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, absenceEntries: report.absenceEntries.filter((entry) => entry.id !== entryId), updatedAt: new Date().toISOString() }))
  }, [rawReports, saveReports])

  const setVisitorCount = useCallback(async (reportId: string, count: number) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, visitorCount: Math.max(0, count), updatedAt: new Date().toISOString() }))
  }, [rawReports, saveReports])

  const finalizeReport = useCallback(async (reportId: string) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, status: 'FINALIZED', updatedAt: new Date().toISOString() }))
  }, [rawReports, saveReports])

  const reopenReport = useCallback(async (reportId: string) => {
    await saveReports(rawReports.map((report) => report.id !== reportId ? report : { ...report, status: 'DRAFT', updatedAt: new Date().toISOString() }))
  }, [rawReports, saveReports])

  const deleteReport = useCallback(async (reportId: string) => {
    await saveReports(rawReports.filter((report) => report.id !== reportId))
  }, [rawReports, saveReports])

  const setRecurringAbsence = useCallback(async (employeeId: string, reasonId: string, comment?: string) => {
    const existing = recurringAbsences.find((item) => item.employeeId === employeeId)
    const next = existing ? recurringAbsences.map((item) => item.employeeId === employeeId ? { ...item, reasonId, comment } : item) : [...recurringAbsences, { id: genId(), employeeId, reasonId, comment }]
    await saveRecurringAbsences(next)
  }, [recurringAbsences, saveRecurringAbsences])

  const removeRecurringAbsence = useCallback(async (employeeId: string) => {
    await saveRecurringAbsences(recurringAbsences.filter((item) => item.employeeId !== employeeId))
  }, [recurringAbsences, saveRecurringAbsences])

  const getRecurringAbsence = useCallback((employeeId: string) => recurringAbsences.find((item) => item.employeeId === employeeId), [recurringAbsences])

  const updateAppSettings = useCallback(async (next: Partial<AppSettings>) => {
    const merged = { ...appSettings, ...next }
    const recalculatedReports = recalculateReportsLateMinutes(rawReports, merged.defaultLateTime)
    setAppSettings(merged)
    setRawReports(recalculatedReports)
    await Promise.all([
      desktopBridge.saveAppSettings(merged),
      desktopBridge.saveReports(recalculatedReports),
    ])
  }, [appSettings, rawReports])

  const value = useMemo(() => ({
    employees,
    absenceReasons,
    reports,
    allReports: rawReports,
    recurringAbsences,
    appSettings,
    loading,
    importReportsFromWorkbook,
    importEmployeesFromSpreadsheet,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeActive,
    getReportByDate,
    createOrUpdateReport,
    addLateEntry,
    removeLateEntry,
    addAbsenceEntry,
    removeAbsenceEntry,
    setVisitorCount,
    finalizeReport,
    reopenReport,
    deleteReport,
    setRecurringAbsence,
    removeRecurringAbsence,
    getRecurringAbsence,
    updateAppSettings,
  }), [absenceReasons, addAbsenceEntry, addEmployee, addLateEntry, appSettings, createOrUpdateReport, deleteEmployee, deleteReport, employees, finalizeReport, getRecurringAbsence, getReportByDate, importEmployeesFromSpreadsheet, importReportsFromWorkbook, loading, rawReports, recurringAbsences, removeAbsenceEntry, removeLateEntry, removeRecurringAbsence, reopenReport, reports, setRecurringAbsence, setVisitorCount, toggleEmployeeActive, updateAppSettings, updateEmployee])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}
