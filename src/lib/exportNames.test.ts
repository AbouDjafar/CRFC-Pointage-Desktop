import { describe, expect, it } from 'vitest'
import { buildExcelFileName, buildPdfFileName } from '@/lib/exportNames'

describe('export naming', () => {
  it('builds the pdf file name', () => {
    expect(buildPdfFileName('2026-05-21')).toBe('rapport_pointage_2026_05_21.pdf')
  })

  it('builds the excel file name', () => {
    expect(buildExcelFileName('2026-05-01', '2026-05-21')).toBe('synthese-rapports-2026-05-01_2026-05-21.xlsx')
  })
})
