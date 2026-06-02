import type { AbsenceReason } from '@/types'

export const EMPTY_ABSENCE_REASON_LABEL = '-vide-'
export const UNJUSTIFIED_ABSENCE_LABEL = 'Absence injustifiee'

export function getAbsenceReasonLabel(
  reasons: AbsenceReason[],
  reasonId: string,
  options?: {
    emptyLabel?: string
    unknownLabel?: string
  },
) {
  const emptyLabel = options?.emptyLabel ?? EMPTY_ABSENCE_REASON_LABEL
  const unknownLabel = options?.unknownLabel ?? 'Inconnu'

  if (!reasonId.trim()) return emptyLabel

  const label = reasons.find((reason) => reason.id === reasonId)?.label
  if (label === undefined) return unknownLabel
  return label.trim() || emptyLabel
}

export function isUnjustifiedAbsenceReason(reasons: AbsenceReason[], reasonId: string) {
  if (!reasonId.trim()) return true
  const label = reasons.find((reason) => reason.id === reasonId)?.label ?? ''
  return label.toLowerCase().includes('injust')
}

export function getAbsenceReasonStatsLabel(reasons: AbsenceReason[], reasonId: string) {
  return isUnjustifiedAbsenceReason(reasons, reasonId)
    ? UNJUSTIFIED_ABSENCE_LABEL
    : getAbsenceReasonLabel(reasons, reasonId)
}
