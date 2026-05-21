import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { AbsenceReason, DailyReport, Employee, User } from '@/types'

let backgroundBytesPromise: Promise<Uint8Array> | null = null

async function loadBackgroundBytes() {
  if (!backgroundBytesPromise) {
    backgroundBytesPromise = fetch('/assets/crfc_template_background.jpg')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer))
  }
  return backgroundBytesPromise
}

function buildCityLine(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const obj = new Date(y, m - 1, d)
  const monthName = obj.toLocaleDateString('fr-FR', { month: 'long' })
  return `Yaounde, le ${d} ${monthName} ${y}`
}

function buildIntroParagraphs(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
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
  return String(n)
}

function buildVisitorsSentence(count: number) {
  return `Les visiteurs enregistres en ce jour sont au nombre de ${numberToFrench(Math.max(0, count))} (${count}) personnes.`
}

function formatArrival(time: string) {
  const [hh, mm] = time.split(':')
  return `${hh}h${mm}`
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

function drawTable(page: any, rows: string[][], originX: number, originY: number, widths: number[], font: any, boldFont: any) {
  const rowHeight = 18
  let y = originY
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    let x = originX
    const isHeader = rowIndex === 0
    for (let colIndex = 0; colIndex < rows[rowIndex].length; colIndex += 1) {
      const width = widths[colIndex]
      page.drawRectangle({
        x,
        y: y - rowHeight + 3,
        width,
        height: rowHeight,
        borderWidth: 1,
        borderColor: rgb(0.12, 0.12, 0.12),
        color: isHeader ? rgb(0.85, 0.85, 0.85) : undefined,
      })
      page.drawText(rows[rowIndex][colIndex] ?? '', {
        x: x + 5,
        y: y - 11,
        size: 9,
        font: isHeader ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      })
      x += width
    }
    y -= rowHeight
  }
  return y
}

export async function generatePdfBytes(params: {
  report: DailyReport
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  author: User
}) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const background = await pdfDoc.embedJpg(await loadBackgroundBytes())
  page.drawImage(background, { x: 0, y: 0, width: 595.28, height: 841.89 })

  const { report, employees, absenceReasons, author } = params
  const getEmployeeName = (id: string, fallback?: string) => employees.find((employee) => employee.id === id)?.fullName ?? fallback ?? 'Inconnu'
  const getReasonLabel = (id: string) => absenceReasons.find((reason) => reason.id === id)?.label ?? 'Inconnu'

  let y = 729
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
    y = drawWrappedText(page, paragraph, 68, y, 470, font, 11, 15)
  }

  y -= 8
  page.drawText('Retards', { x: 270, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 12
  y = drawTable(
    page,
    [
      ['N°', 'NOMS ET PRENOMS', "HEURE D'ARRIVEE"],
      ...(report.lateEntries.length > 0
        ? report.lateEntries.map((entry, index) => [
            String(index + 1),
            getEmployeeName(entry.employeeId, entry.employeeNameSnapshot),
            formatArrival(entry.arrivalTime),
          ])
        : [['', '', '']]),
    ],
    54,
    y,
    [42, 290, 160],
    font,
    boldFont,
  )

  y -= 14
  page.drawText('Absents', { x: 270, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 12
  y = drawTable(
    page,
    [
      ['N°', 'NOMS ET PRENOMS', 'MOTIF'],
      ...(report.absenceEntries.length > 0
        ? report.absenceEntries.map((entry, index) => [
            String(index + 1),
            getEmployeeName(entry.employeeId, entry.employeeNameSnapshot),
            getReasonLabel(entry.reasonId),
          ])
        : [['', '', '']]),
    ],
    54,
    y,
    [42, 290, 160],
    font,
    boldFont,
  )

  y -= 16
  page.drawText('Visiteurs enregistres', { x: 238, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 18
  y = drawWrappedText(page, buildVisitorsSentence(report.visitorCount), 68, y, 470, font, 11, 15)
  y -= 8
  y = drawWrappedText(page, "Dans l'attente de vos instructions, je vous prie d'agreer Monsieur le Coordonnateur National, l'expression de mon profond respect.", 68, y, 470, font, 11, 15)
  y -= 12
  page.drawText(`${author.firstName} ${author.lastName}`.trim(), { x: 392, y, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) })
  y -= 14
  page.drawText(author.jobTitle || 'Agent', { x: 392, y, size: 10, font, color: rgb(0.25, 0.25, 0.25) })

  return pdfDoc.save()
}
