import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { parseEmployeesSpreadsheet, parseReportsWorkbook } from '@/lib/importData'
import type { PickedImportFile } from '@/types'

function csvFile(name: string, content: string): PickedImportFile {
  return { name, bytes: new TextEncoder().encode(content) }
}

function workbookFile(name: string, sheets: Record<string, (string | number)[][]>): PickedImportFile {
  const workbook = XLSX.utils.book_new()
  for (const [sheetName, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName)
  }
  return { name, bytes: new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })) }
}

describe('import parsing', () => {
  it('parses employee csv rows', async () => {
    const parsed = await parseEmployeesSpreadsheet(csvFile('employes.csv', 'Nom,Prenom\nNGONO,Paul\nMEBE,Anne'))
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].fullName).toBe('NGONO Paul')
  })

  it('parses report workbook', async () => {
    const parsed = await parseReportsWorkbook(
      workbookFile('rapports.xlsx', {
        Synthese: [
          ['Date', 'Retards', 'Absences', 'Visiteurs', 'Minutes de retard', 'Statut'],
          ['21/05/2026', 1, 1, 3, 20, 'Finalise'],
        ],
        Retards: [
          ['Date', 'Noms et Prenoms', "Heure d'arrivee", 'Minutes de retard'],
          ['21/05/2026', 'NGONO Paul', '08:35', 20],
        ],
        Absences: [
          ['Date', 'Noms et Prenoms', 'Motif', 'Observations'],
          ['21/05/2026', 'MEBE Anne', 'Maladie', 'Certificat'],
        ],
      }),
    )
    expect(parsed).toHaveLength(1)
    expect(parsed[0].lateEntries[0].minutesLate).toBe(20)
    expect(parsed[0].absenceEntries[0].reasonLabel).toBe('Maladie')
  })
})
