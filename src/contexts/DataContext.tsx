import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { desktopBridge } from '@/bridge'
import { DEFAULT_APP_SETTINGS } from '@/constants/appSettings'
import { applyImportedEmployees, applyImportedReports, createReportDraft } from '@/domain/data'
import { SEED_EMPLOYEES, SEED_REASONS } from '@/data/seeds'
import { useAuth } from '@/contexts/AuthContext'
import { parseEmployeesSpreadsheet, parseReportsWorkbook } from '@/lib/importData'
import { genId } from '@/lib/id'
import { hydrateEmployeeSex } from '@/lib/employeeSex'
import { buildPdfFileName } from '@/lib/exportNames'
import { generatePdfBytes } from '@/lib/pdf'
import { calcMinutesLate, recalculateReportsLateMinutes } from '@/lib/reporting'
import type { AbsenceEntry, AbsenceReason, AppSettings, DailyReport, Employee, PickedImportFile, RecurringAbsence, User } from '@/types'

type PdfActionResult = {
  success: boolean
  generated?: boolean
  uri?: string
  error?: string
}

type FinalizeReportResult = {
  success: boolean
  pdfGenerated: boolean
  error?: string
}

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
  addEmployee(fullName: string, firstName: string, lastName: string, sex?: string): Promise<void>
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
  finalizeReport(reportId: string, author: User): Promise<FinalizeReportResult>
  reopenReport(reportId: string): Promise<void>
  deleteReport(reportId: string): Promise<void>
  openReportPdf(reportId: string, author: User): Promise<PdfActionResult>
  hasStoredReportPdf(reportId: string): Promise<boolean>
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
      const nextEmployees = (storedEmployees.length > 0 ? storedEmployees : SEED_EMPLOYEES).map(hydrateEmployeeSex)
      const nextReasons = storedReasons.length > 0 ? storedReasons : SEED_REASONS
      setEmployees(nextEmployees)
      setAbsenceReasons(nextReasons)
      setRawReports(storedReports)
      setRecurringAbsences(storedRecurring)
      setAppSettings(storedSettings)
      if (storedEmployees.length === 0 || storedEmployees.some((employee) => !employee.sex?.trim())) {
        await desktopBridge.saveEmployees(nextEmployees)
      }
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

  const stripPdfMetadata = useCallback((report: DailyReport): DailyReport => ({
    ...report,
    pdfUri: undefined,
    pdfFileName: undefined,
    pdfGeneratedAt: undefined,
  }), [])

  const deleteStoredPdf = useCallback(async (pdfUri?: string | null) => {
    await desktopBridge.deleteSavedFile(pdfUri)
  }, [])

  const hasStoredReportPdf = useCallback(async (reportId: string) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report?.pdfUri) return false
    return desktopBridge.savedFileExists(report.pdfUri)
  }, [rawReports])

  const importEmployeesFromSpreadsheet = useCallback(async (file: PickedImportFile) => {
    const parsed = await parseEmployeesSpreadsheet(file)
    const result = applyImportedEmployees(employees, parsed.rows, parsed.skipped)
    await saveEmployees(result.employees)
    return { created: result.created, updated: result.updated, skipped: result.skipped }
  }, [employees, saveEmployees])

  const importReportsFromWorkbook = useCallback(async (file: PickedImportFile) => {
    if (!user || user.role !== 'ADMIN') throw new Error('Acces refuse.')

    const existingByDate = new Map(rawReports.map((report) => [report.date, report]))
    const parsedReports = await parseReportsWorkbook(file)
    const result = applyImportedReports({ currentReports: rawReports, parsedReports, employees, absenceReasons, userId: user.id })

    await Promise.all(
      result.reports
        .map((report) => existingByDate.get(report.date)?.pdfUri)
        .filter(Boolean)
        .map((pdfUri) => deleteStoredPdf(pdfUri)),
    )

    await saveReports(result.reports.map((report) => stripPdfMetadata(report)))
    return { importedDates: result.importedDates, replacedDates: result.replacedDates, lateEntries: result.lateEntries, absenceEntries: result.absenceEntries }
  }, [absenceReasons, deleteStoredPdf, employees, rawReports, saveReports, stripPdfMetadata, user])

  const addEmployee = useCallback(async (fullName: string, firstName: string, lastName: string, sex?: string) => {
    await saveEmployees([...employees, { id: genId(), fullName: fullName.trim(), firstName: firstName.trim(), lastName: lastName.trim(), sex: sex?.trim() || undefined, isActive: true, needsReview: false, importSource: 'manual', importedAt: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() }])
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
      await deleteStoredPdf(existing.pdfUri)
      const updated = stripPdfMetadata({ ...existing, ...updates, updatedAt: new Date().toISOString() })
      await saveReports(rawReports.map((report) => (report.id === existing.id ? updated : report)))
      return updated
    }
    const report = stripPdfMetadata({ ...createReportDraft(date, user?.id ?? '', recurringAbsences, employees), ...updates })
    await saveReports([...rawReports, report])
    return report
  }, [deleteStoredPdf, employees, rawReports, recurringAbsences, saveReports, stripPdfMetadata, user])

  const addLateEntry = useCallback(async (reportId: string, entry: { employeeId: string; arrivalTime: string; note?: string }) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return
    await deleteStoredPdf(report.pdfUri)
    const updatedReport = stripPdfMetadata({
      ...report,
      lateEntries: [...report.lateEntries, { id: genId(), ...entry, employeeNameSnapshot: findEmployeeName(entry.employeeId), minutesLate: calcMinutesLate(entry.arrivalTime, appSettings.defaultLateTime) }],
      updatedAt: new Date().toISOString(),
    })
    await saveReports(rawReports.map((item) => item.id !== reportId ? item : updatedReport))
  }, [appSettings.defaultLateTime, deleteStoredPdf, findEmployeeName, rawReports, saveReports, stripPdfMetadata])

  const removeLateEntry = useCallback(async (reportId: string, entryId: string) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return
    await deleteStoredPdf(report.pdfUri)
    const updatedReport = stripPdfMetadata({
      ...report,
      lateEntries: report.lateEntries.filter((entry) => entry.id !== entryId),
      updatedAt: new Date().toISOString(),
    })
    await saveReports(rawReports.map((item) => item.id !== reportId ? item : updatedReport))
  }, [deleteStoredPdf, rawReports, saveReports, stripPdfMetadata])

  const addAbsenceEntry = useCallback(async (reportId: string, entry: Omit<AbsenceEntry, 'id'>) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return
    await deleteStoredPdf(report.pdfUri)
    const updatedReport = stripPdfMetadata({
      ...report,
      absenceEntries: [...report.absenceEntries, { id: genId(), ...entry, employeeNameSnapshot: entry.employeeNameSnapshot ?? findEmployeeName(entry.employeeId) }],
      updatedAt: new Date().toISOString(),
    })
    await saveReports(rawReports.map((item) => item.id !== reportId ? item : updatedReport))
  }, [deleteStoredPdf, findEmployeeName, rawReports, saveReports, stripPdfMetadata])

  const removeAbsenceEntry = useCallback(async (reportId: string, entryId: string) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return
    await deleteStoredPdf(report.pdfUri)
    const updatedReport = stripPdfMetadata({
      ...report,
      absenceEntries: report.absenceEntries.filter((entry) => entry.id !== entryId),
      updatedAt: new Date().toISOString(),
    })
    await saveReports(rawReports.map((item) => item.id !== reportId ? item : updatedReport))
  }, [deleteStoredPdf, rawReports, saveReports, stripPdfMetadata])

  const setVisitorCount = useCallback(async (reportId: string, count: number) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return
    await deleteStoredPdf(report.pdfUri)
    const updatedReport = stripPdfMetadata({
      ...report,
      visitorCount: Math.max(0, count),
      updatedAt: new Date().toISOString(),
    })
    await saveReports(rawReports.map((item) => item.id !== reportId ? item : updatedReport))
  }, [deleteStoredPdf, rawReports, saveReports, stripPdfMetadata])

  const generateReportPdf = useCallback(async (reportId: string, author: User): Promise<PdfActionResult> => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return { success: false, error: 'Rapport introuvable.' }

    const bytes = await generatePdfBytes({ report, employees, absenceReasons, author })
    const result = await desktopBridge.savePdfFile(buildPdfFileName(report.date), bytes)
    const updatedReport: DailyReport = {
      ...report,
      pdfUri: result.path,
      pdfFileName: buildPdfFileName(report.date),
      pdfGeneratedAt: new Date().toISOString(),
    }
    await saveReports(rawReports.map((item) => item.id === reportId ? updatedReport : item))
    return { success: true, generated: true, uri: result.path }
  }, [absenceReasons, employees, rawReports, saveReports])

  const openReportPdf = useCallback(async (reportId: string, author: User): Promise<PdfActionResult> => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return { success: false, error: 'Rapport introuvable.' }

    let pdfUri = report.pdfUri
    let generated = false
    const exists = await desktopBridge.savedFileExists(pdfUri)

    if (!exists) {
      const generatedResult = await generateReportPdf(reportId, author)
      if (!generatedResult.success || !generatedResult.uri) return generatedResult
      pdfUri = generatedResult.uri
      generated = true
    }

    if (!pdfUri) return { success: false, error: 'Aucun fichier PDF disponible.' }

    await desktopBridge.revealSavedFile(pdfUri)
    return { success: true, generated, uri: pdfUri }
  }, [generateReportPdf, rawReports])

  const finalizeReport = useCallback(async (reportId: string, author: User): Promise<FinalizeReportResult> => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return { success: false, pdfGenerated: false, error: 'Rapport introuvable.' }

    await deleteStoredPdf(report.pdfUri)
    const finalizedReport = stripPdfMetadata({
      ...report,
      status: 'FINALIZED',
      updatedAt: new Date().toISOString(),
    })
    const finalizedReports = rawReports.map((item) => item.id === reportId ? finalizedReport : item)
    await saveReports(finalizedReports)

    try {
      const bytes = await generatePdfBytes({ report: finalizedReport, employees, absenceReasons, author })
      const result = await desktopBridge.savePdfFile(buildPdfFileName(finalizedReport.date), bytes)
      const reportWithPdf: DailyReport = {
        ...finalizedReport,
        pdfUri: result.path,
        pdfFileName: buildPdfFileName(finalizedReport.date),
        pdfGeneratedAt: new Date().toISOString(),
      }
      await saveReports(finalizedReports.map((item) => item.id === reportId ? reportWithPdf : item))
      return { success: true, pdfGenerated: true }
    } catch (error) {
      return {
        success: true,
        pdfGenerated: false,
        error: error instanceof Error ? error.message : 'Le rapport a ete finalise, mais le PDF n a pas pu etre genere.',
      }
    }
  }, [absenceReasons, deleteStoredPdf, employees, rawReports, saveReports, stripPdfMetadata])

  const reopenReport = useCallback(async (reportId: string) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (!report) return
    await deleteStoredPdf(report.pdfUri)
    const reopenedReport = stripPdfMetadata({
      ...report,
      status: 'DRAFT',
      updatedAt: new Date().toISOString(),
    })
    await saveReports(rawReports.map((item) => item.id === reportId ? reopenedReport : item))
  }, [deleteStoredPdf, rawReports, saveReports, stripPdfMetadata])

  const deleteReport = useCallback(async (reportId: string) => {
    const report = rawReports.find((item) => item.id === reportId)
    if (report) await deleteStoredPdf(report.pdfUri)
    await saveReports(rawReports.filter((reportItem) => reportItem.id !== reportId))
  }, [deleteStoredPdf, rawReports, saveReports])

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
    await Promise.all(rawReports.map((report) => deleteStoredPdf(report.pdfUri)))
    const recalculatedReports = recalculateReportsLateMinutes(rawReports, merged.defaultLateTime).map((report) => stripPdfMetadata(report))
    setAppSettings(merged)
    setRawReports(recalculatedReports)
    await Promise.all([
      desktopBridge.saveAppSettings(merged),
      desktopBridge.saveReports(recalculatedReports),
    ])
  }, [appSettings, deleteStoredPdf, rawReports, stripPdfMetadata])

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
    openReportPdf,
    hasStoredReportPdf,
    setRecurringAbsence,
    removeRecurringAbsence,
    getRecurringAbsence,
    updateAppSettings,
  }), [absenceReasons, addAbsenceEntry, addEmployee, addLateEntry, appSettings, createOrUpdateReport, deleteEmployee, deleteReport, employees, finalizeReport, getRecurringAbsence, getReportByDate, hasStoredReportPdf, importEmployeesFromSpreadsheet, importReportsFromWorkbook, loading, openReportPdf, rawReports, recurringAbsences, removeAbsenceEntry, removeLateEntry, removeRecurringAbsence, reopenReport, reports, setRecurringAbsence, setVisitorCount, toggleEmployeeActive, updateAppSettings, updateEmployee])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within DataProvider')
  return context
}
