import { describe, expect, it } from 'vitest'
import { sliceRecentReports } from '@/lib/reportFilters'
import type { DailyReport } from '@/types'

function makeReport(day: number): DailyReport {
  const date = `2026-05-${String(day).padStart(2, '0')}`
  return {
    id: `report-${day}`,
    date,
    status: 'FINALIZED',
    lateEntries: [],
    absenceEntries: [],
    visitorCount: 0,
    introText: '',
    createdBy: 'user-1',
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T09:00:00.000Z`,
  }
}

describe('sliceRecentReports', () => {
  it('keeps the last 7 reports and returns them in chronological order', () => {
    const reports = Array.from({ length: 10 }, (_, index) => makeReport(index + 1))
    const result = sliceRecentReports(reports, '7d')
    expect(result).toHaveLength(7)
    expect(result[0]?.date).toBe('2026-05-04')
    expect(result.at(-1)?.date).toBe('2026-05-10')
  })

  it('returns every report when mode is all', () => {
    const reports = [makeReport(3), makeReport(1), makeReport(2)]
    const result = sliceRecentReports(reports, 'all')
    expect(result.map((report) => report.date)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03'])
  })
})
