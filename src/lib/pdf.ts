import html2canvas from 'html2canvas'
import { PDFDocument } from 'pdf-lib'
import type { AbsenceReason, DailyReport, Employee, User } from '@/types'

const A4_WIDTH_PT = 595.28
const A4_HEIGHT_PT = 841.89
const MALE_VALUES = new Set(['masculin', 'homme', 'm'])
const FEMALE_VALUES = new Set(['feminin', 'féminin', 'femme', 'f'])

let backgroundAssetPromise: Promise<{ dataUrl: string; bytes: Uint8Array }> | null = null

function normalizeGender(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function hasPdfPrefix(value: string): boolean {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
  return normalized.startsWith('m. ') || normalized.startsWith('mme. ')
}

function formatEmployeeNameForPdf(employee: Employee | undefined, fallback?: string): string {
  const baseName = (employee?.fullName ?? fallback ?? 'Inconnu').trim()
  if (!baseName || !employee || hasPdfPrefix(baseName)) {
    return baseName || 'Inconnu'
  }

  const employeeWithGender = employee as Employee & { sex?: string }
  const gender = normalizeGender(employeeWithGender.sex)
  if (MALE_VALUES.has(gender)) return `M. ${baseName}`
  if (FEMALE_VALUES.has(gender)) return `Mme. ${baseName}`
  return baseName
}

function buildCityLine(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(year, month - 1, day)
  const monthName = value.toLocaleDateString('fr-FR', { month: 'long' })
  return `Yaoundé, le ${day} ${monthName} ${year}`
}

function numberToFrench(value: number): string {
  const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize']
  if (value <= 16) return units[value]
  if (value < 20) return `dix-${units[value - 10]}`
  if (value < 70) {
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
    const ten = Math.floor(value / 10)
    const rest = value % 10
    if (rest === 0) return tens[ten]
    if (rest === 1) return `${tens[ten]} et un`
    return `${tens[ten]}-${numberToFrench(rest)}`
  }
  if (value < 80) {
    if (value === 71) return 'soixante et onze'
    return `soixante-${numberToFrench(value - 60)}`
  }
  if (value < 100) {
    if (value === 80) return 'quatre-vingts'
    return `quatre-vingt-${numberToFrench(value - 80)}`
  }
  if (value < 1000) {
    const hundred = Math.floor(value / 100)
    const rest = value % 100
    const prefix = hundred === 1 ? 'cent' : `${units[hundred]} cent`
    if (rest === 0) return hundred > 1 ? `${prefix}s` : prefix
    return `${prefix} ${numberToFrench(rest)}`
  }
  const thousand = Math.floor(value / 1000)
  const rest = value % 1000
  const prefix = thousand === 1 ? 'mille' : `${numberToFrench(thousand)} mille`
  if (rest === 0) return prefix
  return `${prefix} ${numberToFrench(rest)}`
}

function buildVisitorsSentence(count: number): string {
  return `Les visiteurs enregistrés en ce jour sont au nombre de ${numberToFrench(Math.max(0, count))} (${String(count).padStart(2, '0')}) personnes.`
}

function formatArrival(time: string): string {
  const [hours, minutes] = time.split(':')
  return `${hours}h${minutes}`
}

function buildIntroParagraphs(date: string): string[] {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(year, month - 1, day)
  const weekday = value.toLocaleDateString('fr-FR', { weekday: 'long' })
  const fullDate = value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return [
    'Dans le cadre des missions qui sont à ma charge, je viens par la présente vous faire le point sur les présences du jour.',
    `Vous trouverez-ci après la liste des retards, des absences et des visiteurs de la journée du ${weekday} ${fullDate}.`,
  ]
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function loadBackgroundAsset(): Promise<{ dataUrl: string; bytes: Uint8Array }> {
  if (!backgroundAssetPromise) {
    backgroundAssetPromise = fetch('/assets/crfc_template_background.jpg')
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        const chunkSize = 0x8000
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
        }
        return {
          bytes,
          dataUrl: `data:image/jpeg;base64,${btoa(binary)}`,
        }
      })
  }
  return backgroundAssetPromise
}

function buildPdfMarkup(params: {
  report: DailyReport
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  author: User
  letterheadSrc: string
  includeLetterhead?: boolean
  transparentBackground?: boolean
}): string {
  const {
    report,
    employees,
    absenceReasons,
    author,
    letterheadSrc,
    includeLetterhead = true,
    transparentBackground = false,
  } = params
  const getEmployeeName = (id: string, fallback?: string) => {
    const employee = employees.find((item) => item.id === id)
    return formatEmployeeNameForPdf(employee, fallback)
  }
  const getReasonLabel = (id: string) => absenceReasons.find((reason) => reason.id === id)?.label ?? ''

  const lateRows = report.lateEntries.length > 0
    ? report.lateEntries.map((entry, index) => `
      <tr>
        <td class="ci">${index + 1}</td>
        <td class="cn">${escapeHtml(getEmployeeName(entry.employeeId, entry.employeeNameSnapshot))}</td>
        <td class="cv">${escapeHtml(formatArrival(entry.arrivalTime))}</td>
      </tr>`).join('')
    : '<tr><td class="ci"></td><td class="cn"></td><td class="cv"></td></tr>'

  const absenceRows = report.absenceEntries.length > 0
    ? report.absenceEntries.map((entry, index) => `
      <tr>
        <td class="ci">${index + 1}</td>
        <td class="cn">${escapeHtml(getEmployeeName(entry.employeeId, entry.employeeNameSnapshot))}</td>
        <td class="cv">${escapeHtml(getReasonLabel(entry.reasonId))}</td>
      </tr>`).join('')
    : '<tr><td class="ci"></td><td class="cn"></td><td class="cv"></td></tr>'

  const introParagraphs = buildIntroParagraphs(report.date)
    .map((paragraph) => `<p class="para">${escapeHtml(paragraph)}</p>`)
    .join('')

  const authorName = escapeHtml(`${author.firstName} ${author.lastName}`.trim())

  return `
    <style>
      .pdf-capture-root,
      .pdf-capture-root * {
        box-sizing: border-box;
      }

      .pdf-capture-root {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 0;
        background: ${transparentBackground ? 'transparent' : '#ffffff'};
        color: #101010;
        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
        -webkit-font-smoothing: antialiased;
        font-smooth: always;
        position: relative;
      }

      .pdf-capture-root::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: ${includeLetterhead ? `url("${letterheadSrc}")` : 'none'};
        background-repeat: no-repeat;
        background-position: center top;
        background-size: 100% 100%;
        z-index: 0;
      }

      .pdf-page-shell {
        position: relative;
        z-index: 1;
        width: 100%;
        height: 100%;
        padding: 41.5mm 25mm 29mm;
      }

      .date-line {
        text-align: right;
        font-size: 11.04pt;
        font-weight: 400;
        line-height: 1.115;
        margin: 0 0 19pt 0;
      }

      .addressee-row {
        display: flex;
        justify-content: flex-end;
        margin: 0 0 16pt 0;
      }

      .addressee-box {
        width: 78%;
        text-align: center;
      }

      .addressee-box p {
        margin: 0;
        font-size: 11.04pt;
        line-height: 1.1;
        font-weight: 700;
      }

      .addressee-box p:first-child {
        margin-bottom: 5pt;
      }

      .subject {
        margin: 0 0 10pt 0;
        font-size: 11.04pt;
        line-height: 1.12;
        font-weight: 400;
      }

      .subject span {
        font-weight: 700;
        text-decoration: underline;
      }

      .greeting {
        margin: 0 0 7pt 18pt;
        font-size: 11.04pt;
        line-height: 1.115;
        font-weight: 700;
      }

      .para,
      .closing {
        margin: 0 0 8.5pt 0;
        font-size: 11.04pt;
        line-height: 1.14;
        text-align: justify;
        text-indent: 18pt;
      }

      .section-title,
      .visitors-title {
        margin: 10pt 0 6pt 0;
        font-size: 11.04pt;
        line-height: 1.115;
        font-weight: 700;
        text-align: center;
      }

      .report-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0 0 10pt 0;
      }

      .report-table,
      .report-table th,
      .report-table td {
        border: 0.75pt solid #707070;
      }

      .report-table th {
        background: #d9d9d9;
        color: #111111;
        font-size: 9pt;
        line-height: 1;
        font-weight: 700;
        text-align: center;
        padding: 2pt 4pt;
      }

      .report-table td {
        color: #111111;
        font-size: 9pt;
        line-height: 1;
        font-weight: 400;
        padding: 1.8pt 4pt;
        vertical-align: middle;
      }

      .ci {
        width: 8%;
        text-align: center;
      }

      .cn {
        width: 67%;
      }

      .cv {
        width: 25%;
      }

      .report-table td.cv,
      .report-table th.cv {
        text-align: center;
      }

      .visitors-title {
        margin-top: 13pt;
        margin-bottom: 4pt;
      }

      .closing {
        margin-top: 8pt;
        margin-bottom: 0;
      }

      .signature {
        width: 47%;
        margin: 30pt 0 0 auto;
        font-size: 11.04pt;
        line-height: 1.16;
        font-weight: 700;
        text-align: center;
      }
    </style>
    <div class="pdf-capture-root">
      <div class="pdf-page-shell">
        <div class="date-line">${escapeHtml(buildCityLine(report.date))}</div>

        <div class="addressee-row">
          <div class="addressee-box">
            <p>A</p>
            <p>L’attention de Monsieur le Coordonnateur National</p>
            <p>du Centre de Réseaux des Filières de Croissance (CRFC)</p>
            <p>au Cameroun</p>
          </div>
        </div>

        <div class="subject"><span>Objet</span> : Compte rendu de la journée</div>
        <p class="greeting">Monsieur le Coordonnateur National,</p>
        ${introParagraphs}

        <div class="section-title">Retards</div>
        <table class="report-table">
          <thead>
            <tr>
              <th class="ci">N°</th>
              <th class="cn">NOMS ET PRÉNOMS</th>
              <th class="cv">HEURE D’ARRIVÉE</th>
            </tr>
          </thead>
          <tbody>${lateRows}</tbody>
        </table>

        <div class="section-title">Absents</div>
        <table class="report-table">
          <thead>
            <tr>
              <th class="ci">N°</th>
              <th class="cn">NOMS ET PRÉNOMS</th>
              <th class="cv">MOTIF</th>
            </tr>
          </thead>
          <tbody>${absenceRows}</tbody>
        </table>

        <div class="visitors-title">Visiteurs enregistrés</div>
        <p class="para">${escapeHtml(buildVisitorsSentence(report.visitorCount))}</p>

        <p class="closing">Dans l’attente de vos instructions, je vous prie d’agréer Monsieur le Coordonnateur National, l’expression de mon profond respect.</p>

        <div class="signature">${authorName}</div>
      </div>
    </div>
  `
}

async function renderMarkupToCanvas(markup: string): Promise<HTMLCanvasElement> {
  const mount = document.createElement('div')
  mount.setAttribute('aria-hidden', 'true')
  mount.style.position = 'fixed'
  mount.style.left = '-100000px'
  mount.style.top = '0'
  mount.style.width = '210mm'
  mount.style.height = '297mm'
  mount.style.background = '#ffffff'
  mount.style.zIndex = '-1'
  mount.innerHTML = markup
  document.body.appendChild(mount)

  try {
    const root = mount.querySelector('.pdf-capture-root') as HTMLElement | null
    if (!root) throw new Error('Template PDF introuvable.')

    await new Promise((resolve) => window.setTimeout(resolve, 120))

    return await html2canvas(root, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      width: root.scrollWidth,
      height: root.scrollHeight,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
    })
  } finally {
    mount.remove()
  }
}

export async function buildPdfPreviewMarkup(params: {
  report: DailyReport
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  author: User
}): Promise<string> {
  const { dataUrl } = await loadBackgroundAsset()
  return buildPdfMarkup({ ...params, letterheadSrc: dataUrl })
}

export async function generatePdfBytes(params: {
  report: DailyReport
  employees: Employee[]
  absenceReasons: AbsenceReason[]
  author: User
}): Promise<Uint8Array> {
  const backgroundAsset = await loadBackgroundAsset()
  const markup = buildPdfMarkup({
    ...params,
    letterheadSrc: backgroundAsset.dataUrl,
    includeLetterhead: false,
    transparentBackground: true,
  })
  const canvas = await renderMarkupToCanvas(markup)
  const imageBytes = await fetch(canvas.toDataURL('image/png')).then((response) => response.arrayBuffer())

  const pdfDoc = await PDFDocument.create()
  const background = await pdfDoc.embedJpg(backgroundAsset.bytes)
  const image = await pdfDoc.embedPng(imageBytes)
  const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT])
  page.drawImage(background, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  })
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
  })

  return pdfDoc.save()
}
