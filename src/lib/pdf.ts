import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { AbsenceReason, DailyReport, Employee, User } from '@/types'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const START_Y = 729
const MIN_Y = 118
const LEFT_X = 54
const TEXT_X = 68
const CONTENT_WIDTH = 470
const TABLE_WIDTHS = [42, 290, 160]

let backgroundBytesPromise: Promise<Uint8Array> | null = null

async function loadBackgroundBytes() {
  if (!backgroundBytesPromise) {
    backgroundBytesPromise = fetch('/assets/crfc_template_background.jpg')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer))
  }
  return backgroundBytesPromise
}

function normalizeGender(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function hasCivilitePrefix(value: string): boolean {
  const normalized = normalizeGender(value)
  return normalized.startsWith('m. ') || normalized.startsWith('mme. ')
}

function formatEmployeeNameForPdf(employee: Employee | undefined, fallback?: string): string {
  const baseName = (employee?.fullName ?? fallback ?? 'Inconnu').trim()
  if (!baseName || !employee || hasCivilitePrefix(baseName)) return baseName || 'Inconnu'
  const employeeWithGender = employee as Employee & { sex?: string }
  const gender = normalizeGender(employeeWithGender.sex)
  if (gender === 'masculin' || gender === 'homme' || gender === 'm') return `M. ${baseName}`
  if (gender === 'feminin' || gender === 'femme' || gender === 'f') return `Mme. ${baseName}`
  return baseName
}

function buildCityLine(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const obj = new Date(year, month - 1, day)
  const monthName = obj.toLocaleDateString('fr-FR', { month: 'long' })
  return `Yaounde, le ${day} ${monthName} ${year}`
}

function buildIntroParagraphs(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const fullDate = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return [
    'Dans le cadre des missions qui sont a ma charge, je viens par la presente vous faire le point sur les presences du jour.',
    `Vous trouverez ci-apres la liste des retards, des absences et des visiteurs de la journee du ${fullDate}.`,
  ]
}

function numberToFrench(n: number): string {
  const units = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
  if (n <= 16) return units[n]
  if (n < 20) return `dix-${units[n - 10]}`
  if (n < 70) {
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
    const ten = Math.floor(n / 10)
    const rest = n % 10
    if (rest === 0) return tens[ten]
    if (rest === 1) return `${tens[ten]} et un`
    return `${tens[ten]}-${numberToFrench(rest)}`
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${numberToFrench(n - 60)}`
  if (n < 100) return n === 80 ? 'quatre-vingts' : `quatre-vingt-${numberToFrench(n - 80)}`
  if (n < 1000) {
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    const prefix = hundred === 1 ? 'cent' : `${units[hundred]} cent`
    if (rest === 0) return hundred > 1 ? `${prefix}s` : prefix
    return `${prefix} ${numberToFrench(rest)}`
  }
  return String(n)
}

function buildVisitorsSentence(count: number) {
  return `Les visiteurs enregistres en ce jour sont au nombre de ${numberToFrench(Math.max(0, count))} (${count}) personnes.`
}

function formatArrival(time: string) {
  const [hours, minutes] = time.split(':')
  return `${hours}h${minutes}`
}

function fitCellText(font: any, text: string, fontSize: number, maxWidth: number) {
  const clean = text.trim()
  if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) return clean
  let value = clean
  while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, fontSize) > maxWidth) {
    value = value.slice(0, -1)
  }
  return `${value}...`
}

function addReportPage(pdfDoc: PDFDocument, background: any) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  page.drawImage(background, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT })
  return page
}

function drawWrappedText(page: any, text: string, x: number, y: number, maxWidth: number, font: any, fontSize: number, lineHeight: number) {
  const words = text.split(/\s+/)
  let line = ''
  let currentY = y
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      line = candidate
      continue
    }
    page.drawText(line, { x, y: currentY, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) })
    line = word
    currentY -= lineHeight
  }
  if (line) page.drawText(line, { x, y: currentY, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) })
  return currentY - lineHeight
}

function drawSectionTitle(page: any, title: string, y: number, boldFont: any) {
  const titleWidth = boldFont.widthOfTextAtSize(title, 11)
  page.drawText(title, { x: (PAGE_WIDTH - titleWidth) / 2, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
}

function drawTableRow(page: any, row: string[], y: number, font: any, boldFont: any, isHeader = false) {
  const rowHeight = 18
  let x = LEFT_X
  for (let index = 0; index < row.length; index += 1) {
    const width = TABLE_WIDTHS[index]
    const value = fitCellText(isHeader ? boldFont : font, row[index] ?? '', 9, width - 10)
    page.drawRectangle({
      x,
      y: y - rowHeight + 3,
      width,
      height: rowHeight,
      borderWidth: 1,
      borderColor: rgb(0.12, 0.12, 0.12),
      color: isHeader ? rgb(0.85, 0.85, 0.85) : undefined,
    })
    page.drawText(value, {
      x: x + 5,
      y: y - 11,
      size: 9,
      font: isHeader ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    })
    x += width
  }
  return y - rowHeight
}

export async function generatePdfBytes(params: {
  report: DailyReport
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  author: User
}) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const background = await pdfDoc.embedJpg(await loadBackgroundBytes())
  const { report, employees, absenceReasons, author } = params
  const getEmployeeName = (id: string, fallback?: string) => formatEmployeeNameForPdf(employees.find((employee) => employee.id === id), fallback)
  const getReasonLabel = (id: string) => absenceReasons.find((reason) => reason.id === id)?.label ?? 'Inconnu'

  let page = addReportPage(pdfDoc, background)
  let y = START_Y

  const ensureSpace = (needed: number) => {
    if (y - needed >= MIN_Y) return
    page = addReportPage(pdfDoc, background)
    y = START_Y
  }

  page.drawText(buildCityLine(report.date), { x: 360, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) })
  y -= 36
  page.drawText('A', { x: 430, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) })
  y -= 16
  page.drawText("L'attention de Monsieur le Coordonnateur National", { x: 315, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 16
  page.drawText('du Centre de Reseaux des Filieres de Croissance (CRFC) au Cameroun', { x: 250, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 28
  page.drawText('Objet : Compte rendu de la journee', { x: 54, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 28
  page.drawText('Monsieur le Coordonnateur National,', { x: 54, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 22

  for (const paragraph of buildIntroParagraphs(report.date)) {
    ensureSpace(44)
    y = drawWrappedText(page, paragraph, TEXT_X, y, CONTENT_WIDTH, font, 11, 15)
  }

  const lateRows = report.lateEntries.length > 0
    ? report.lateEntries.map((entry, index) => [
      String(index + 1),
      getEmployeeName(entry.employeeId, entry.employeeNameSnapshot),
      formatArrival(entry.arrivalTime),
    ])
    : [['', '', '']]

  const absenceRows = report.absenceEntries.length > 0
    ? report.absenceEntries.map((entry, index) => [
      String(index + 1),
      getEmployeeName(entry.employeeId, entry.employeeNameSnapshot),
      getReasonLabel(entry.reasonId),
    ])
    : [['', '', '']]

  const drawTableSection = (title: string, headers: string[], rows: string[][]) => {
    ensureSpace(58)
    y -= 8
    drawSectionTitle(page, title, y, boldFont)
    y -= 12
    y = drawTableRow(page, headers, y, font, boldFont, true)
    for (const row of rows) {
      ensureSpace(22)
      if (y === START_Y) {
        drawSectionTitle(page, `${title} (suite)`, y, boldFont)
        y -= 12
        y = drawTableRow(page, headers, y, font, boldFont, true)
      }
      y = drawTableRow(page, row, y, font, boldFont, false)
    }
  }

  drawTableSection('Retards', ['Ndeg', 'NOMS ET PRENOMS', "HEURE D'ARRIVEE"], lateRows)
  drawTableSection('Absents', ['Ndeg', 'NOMS ET PRENOMS', 'MOTIF'], absenceRows)

  ensureSpace(80)
  y -= 14
  page.drawText('Visiteurs enregistres', { x: 238, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 18
  y = drawWrappedText(page, buildVisitorsSentence(report.visitorCount), TEXT_X, y, CONTENT_WIDTH, font, 11, 15)
  y -= 8
  ensureSpace(60)
  y = drawWrappedText(page, "Dans l'attente de vos instructions, je vous prie d'agreer Monsieur le Coordonnateur National, l'expression de mon profond respect.", TEXT_X, y, CONTENT_WIDTH, font, 11, 15)
  y -= 12
  ensureSpace(40)
  page.drawText(`${author.firstName} ${author.lastName}`.trim(), { x: 392, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 14
  page.drawText(author.jobTitle || 'Agent', { x: 392, y, size: 10, font, color: rgb(0.25, 0.25, 0.25) })

  return pdfDoc.save()
}
