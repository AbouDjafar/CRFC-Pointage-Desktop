import { describe, expect, it } from 'vitest'
import { calcMinutesLate, recalculateReportsLateMinutes } from '@/lib/reporting'
import type { DailyReport } from '@/types'

describe('reporting helpers', () => {
  it('calculates late minutes from a configurable threshold', () => {
    expect(calcMinutesLate('08:20', '08:15')).toBe(5)
    expect(calcMinutesLate('08:20', '08:30')).toBe(0)
  })

  it('recalculates all report late entries when the threshold changes', () => {
    const reports: DailyReport[] = [
      {
        id: 'r1',
        date: '2026-05-22',
        status: 'DRAFT',
        lateEntries: [
          {
            id: 'l1',
            employeeId: 'e1',
            arrivalTime: '08:20',
            minutesLate: 5,
          },
        ],
        absenceEntries: [],
        visitorCount: 0,
        introText: '',
        createdBy: 'u1',
        createdAt: '2026-05-22T08:00:00.000Z',
        updatedAt: '2026-05-22T08:00:00.000Z',
      },
    ]

    const recalculated = recalculateReportsLateMinutes(reports, '08:10')
    expect(recalculated[0].lateEntries[0].minutesLate).toBe(10)
  })
})
