import type { AbsenceReason } from '@/types'

export const EMPTY_ABSENCE_REASON_LABEL = '-vide-'

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
