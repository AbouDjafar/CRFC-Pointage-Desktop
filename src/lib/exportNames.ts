export function buildPdfFileName(date: string) {
  return `rapport-pointage-${date}.pdf`
}

export function buildExcelFileName(periodStart: string, periodEnd: string) {
  return `synthese-rapports-${periodStart}_${periodEnd}.xlsx`
}
