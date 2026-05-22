import { subtractDays } from '@/lib/date'

export type PeriodMode = 'all' | '7d' | '30d' | '90d'

export const PERIOD_OPTIONS: Array<{ key: PeriodMode; label: string }> = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: 'all', label: 'Tout' },
]

export const PERIOD_LABELS: Record<PeriodMode, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
  all: 'Toute la periode',
}

export function getPeriodThreshold(period: PeriodMode): string | null {
  if (period === '7d') return subtractDays(7)
  if (period === '30d') return subtractDays(30)
  if (period === '90d') return subtractDays(90)
  return null
}
