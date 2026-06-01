import type { DailyReport } from '@/types'

export type RecentReportMode = 'all' | '7d' | '30d' | '90d'

function reportLimit(mode: RecentReportMode) {
  if (mode === '7d') return 7
  if (mode === '30d') return 30
  if (mode === '90d') return 90
  return null
}

export function sliceRecentReports(reports: DailyReport[], mode: RecentReportMode) {
  const sortedDesc = [...reports].sort((a, b) => (
    b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  ))
  const limit = reportLimit(mode)
  const scoped = limit ? sortedDesc.slice(0, limit) : sortedDesc
  return scoped.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
}
