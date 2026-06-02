import * as XLSX from 'xlsx'
import type { PickedImportFile } from '@/types'

export interface ImportedEmployeeRow {
  firstName: string
  lastName: string
  fullName: string
  sex?: string
}

export interface ImportedLateRow {
  employeeName: string
  arrivalTime: string
  minutesLate: number
}

export interface ImportedAbsenceRow {
  employeeName: string
  reasonLabel: string
  comment?: string
}

export interface ImportedReportRow {
  date: string
  visitorCount: number
  status: 'DRAFT' | 'FINALIZED'
  lateEntries: ImportedLateRow[]
  absenceEntries: ImportedAbsenceRow[]
}

function normalizeCell(value: unknown): string {
  return String(value ?? '').trim()
}

export function normalizeForLookup(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function buildEmployeeKey(firstName: string, lastName: string): string {
  return normalizeForLookup(`${lastName} ${firstName}`)
}

export function buildFullName(firstName: string, lastName: string): string {
  const normalizedFirst = firstName.trim()
  const normalizedLast = lastName.trim()
  return normalizedFirst ? `${normalizedLast} ${normalizedFirst}`.trim() : normalizedLast
}

function inferExtension(fileName: string) {
  const cleanName = fileName.toLowerCase()
  const index = cleanName.lastIndexOf('.')
  return index >= 0 ? cleanName.slice(index + 1) : ''
}

function readWorkbook(file: PickedImportFile) {
  const extension = inferExtension(file.name)
  if (extension === 'csv') {
    return XLSX.read(new TextDecoder().decode(file.bytes), { type: 'string', raw: false })
  }
  if (extension === 'xlsx' || extension === 'xls') {
    return XLSX.read(file.bytes, { type: 'array', raw: false })
  }
  throw new Error('Format de fichier non supporte.')
}

function normalizeHeader(value: unknown): string {
  return normalizeForLookup(normalizeCell(value)).replace(/[^a-z0-9]/g, '')
}

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  return XLSX.utils
    .sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' })
    .map((row) => row.map((cell) => normalizeCell(cell)))
}

function findSheetName(sheetNames: string[], keyword: string) {
  return sheetNames.find((name) => normalizeForLookup(name).includes(keyword))
}

function findHeaderRow(matrix: string[][], requiredHeaders: string[][]) {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const normalizedRow = matrix[rowIndex].map((cell) => normalizeHeader(cell))
    const indexMap = requiredHeaders.map((aliases) => normalizedRow.findIndex((cell) => aliases.includes(cell)))
    if (indexMap.every((index) => index >= 0)) {
      return { headerIndex: rowIndex, indexMap }
    }
  }
  throw new Error('Colonnes requises introuvables dans le fichier.')
}

function findEmployeeHeaderRow(matrix: string[][]) {
  const lastNameAliases = ['nom', 'noms']
  const firstNameAliases = ['prenom', 'prenoms']
  const combinedNameAliases = ['nometprenom', 'nomsetprenom', 'nomsetprenoms', 'nomsprenoms', 'nomcomplet', 'fullname']
  const sexAliases = ['sexe', 'genre']
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const normalizedRow = matrix[rowIndex].map((cell) => normalizeHeader(cell))
    const lastNameIndex = normalizedRow.findIndex((cell) => lastNameAliases.includes(cell))
    const firstNameIndex = normalizedRow.findIndex((cell) => firstNameAliases.includes(cell))
    const combinedNameIndex = normalizedRow.findIndex((cell) => combinedNameAliases.includes(cell))
    const sexIndex = normalizedRow.findIndex((cell) => sexAliases.includes(cell))
    if (lastNameIndex >= 0 || combinedNameIndex >= 0) {
      return { headerIndex: rowIndex, lastNameIndex, firstNameIndex, combinedNameIndex, sexIndex }
    }
  }
  throw new Error('Colonnes introuvables pour les employes.')
}

function parseFrDate(value: unknown): string {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
    }
  }
  const text = normalizeCell(value)
  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  const dashMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dashMatch) return text
  throw new Error(`Date invalide: ${text || '[vide]'}`)
}

function parseCount(value: unknown) {
  const text = normalizeCell(value).replace(',', '.')
  if (!text) return 0
  const parsed = Number(text)
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0
}

function parseArrivalTime(value: unknown) {
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60) % 24
    const minutes = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  const text = normalizeCell(value)
  const match = text.match(/^(\d{1,2})[:hH](\d{2})$/)
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`
  throw new Error(`Heure d'arrivee invalide: ${text || '[vide]'}`)
}

function parseMinutesLate(value: unknown, arrivalTime: string) {
  const text = normalizeCell(value).replace(',', '.')
  const parsed = Number(text)
  if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed))
  const [hours, minutes] = arrivalTime.split(':').map(Number)
  return Math.max(0, hours * 60 + minutes - (8 * 60 + 15))
}

function normalizeSex(value: string) {
  const normalized = normalizeForLookup(value)
  if (!normalized) return undefined
  if (normalized.startsWith('m')) return 'Masculin'
  if (normalized.startsWith('f')) return 'Feminin'
  return value.trim() || undefined
}

export async function parseEmployeesSpreadsheet(file: PickedImportFile) {
  const workbook = readWorkbook(file)
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('Le fichier employe est vide.')
  const matrix = sheetToMatrix(workbook.Sheets[firstSheetName])
  const { headerIndex, lastNameIndex, firstNameIndex, combinedNameIndex, sexIndex } = findEmployeeHeaderRow(matrix)
  const seen = new Set<string>()
  const rows: ImportedEmployeeRow[] = []
  let skipped = 0

  for (const row of matrix.slice(headerIndex + 1)) {
    const combinedName = combinedNameIndex >= 0 ? normalizeCell(row[combinedNameIndex]) : ''
    const rawLastName = lastNameIndex >= 0 ? normalizeCell(row[lastNameIndex]) : ''
    const rawFirstName = firstNameIndex >= 0 ? normalizeCell(row[firstNameIndex]) : ''
    const useCombinedName = !rawFirstName && !!combinedName
    const lastName = useCombinedName ? combinedName : rawLastName
    const firstName = useCombinedName ? '' : rawFirstName
    const sex = sexIndex >= 0 ? normalizeSex(normalizeCell(row[sexIndex])) : undefined
    if (!lastName && !firstName) continue
    if (!lastName) {
      skipped += 1
      continue
    }
    const key = buildEmployeeKey(firstName, lastName)
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    rows.push({ firstName, lastName, fullName: buildFullName(firstName, lastName), sex })
  }

  if (rows.length === 0) throw new Error('Aucune ligne employe exploitable trouvee.')
  return { rows, skipped }
}

export async function parseReportsWorkbook(file: PickedImportFile): Promise<ImportedReportRow[]> {
  const workbook = readWorkbook(file)
  const synthSheetName = findSheetName(workbook.SheetNames, 'synth')
  const lateSheetName = findSheetName(workbook.SheetNames, 'retard')
  const absenceSheetName = findSheetName(workbook.SheetNames, 'absence')
  if (!synthSheetName || !lateSheetName || !absenceSheetName) {
    throw new Error('Le classeur doit contenir les feuilles Synthese, Retards et Absences.')
  }

  const synthMatrix = sheetToMatrix(workbook.Sheets[synthSheetName])
  const lateMatrix = sheetToMatrix(workbook.Sheets[lateSheetName])
  const absenceMatrix = sheetToMatrix(workbook.Sheets[absenceSheetName])
  const synthHeader = findHeaderRow(synthMatrix, [['date'], ['visiteurs', 'visiteur'], ['statut']])
  const lateHeader = findHeaderRow(lateMatrix, [['date'], ['nomsetprenoms', 'nometprenoms', 'nomsetprenom'], ['heuredarrivee'], ['minutesderetard', 'minuteretard']])
  const absenceHeader = findHeaderRow(absenceMatrix, [['date'], ['nomsetprenoms', 'nometprenoms', 'nomsetprenom'], ['motif'], ['observations', 'observation']])

  const reportsByDate = new Map<string, ImportedReportRow>()
  for (const row of synthMatrix.slice(synthHeader.headerIndex + 1)) {
    const dateValue = row[synthHeader.indexMap[0]]
    if (!normalizeCell(dateValue)) continue
    if (normalizeHeader(dateValue) === 'total') break
    const date = parseFrDate(dateValue)
    const statusText = normalizeForLookup(normalizeCell(row[synthHeader.indexMap[2]]))
    reportsByDate.set(date, {
      date,
      visitorCount: parseCount(row[synthHeader.indexMap[1]]),
      status: statusText.includes('final') ? 'FINALIZED' : 'DRAFT',
      lateEntries: [],
      absenceEntries: [],
    })
  }
  if (reportsByDate.size === 0) throw new Error('Aucune date exploitable trouvee dans la feuille de synthese.')

  for (const row of lateMatrix.slice(lateHeader.headerIndex + 1)) {
    const dateValue = row[lateHeader.indexMap[0]]
    if (!normalizeCell(dateValue)) continue
    const date = parseFrDate(dateValue)
    const report = reportsByDate.get(date)
    if (!report) throw new Error(`La date ${date} est presente dans Retards mais absente de Synthese.`)
    const employeeName = normalizeCell(row[lateHeader.indexMap[1]])
    if (!employeeName) continue
    const arrivalTime = parseArrivalTime(row[lateHeader.indexMap[2]])
    report.lateEntries.push({ employeeName, arrivalTime, minutesLate: parseMinutesLate(row[lateHeader.indexMap[3]], arrivalTime) })
  }

  for (const row of absenceMatrix.slice(absenceHeader.headerIndex + 1)) {
    const dateValue = row[absenceHeader.indexMap[0]]
    if (!normalizeCell(dateValue)) continue
    const date = parseFrDate(dateValue)
    const report = reportsByDate.get(date)
    if (!report) throw new Error(`La date ${date} est presente dans Absences mais absente de Synthese.`)
    const employeeName = normalizeCell(row[absenceHeader.indexMap[1]])
    const reasonLabel = normalizeCell(row[absenceHeader.indexMap[2]])
    const comment = normalizeCell(row[absenceHeader.indexMap[3]])
    if (!employeeName || !reasonLabel) continue
    report.absenceEntries.push({ employeeName, reasonLabel, comment: comment || undefined })
  }

  return [...reportsByDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
