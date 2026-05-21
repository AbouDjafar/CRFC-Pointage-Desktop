export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function subtractDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatLongDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('fr-FR')
}

export function enumerateDates(start: string, end: string) {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00`)
  const limit = new Date(`${end}T00:00:00`)
  while (cursor <= limit) {
    dates.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
    )
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function formatFrDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
