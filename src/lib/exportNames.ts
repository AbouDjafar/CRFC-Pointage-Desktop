export function buildPdfFileName(date: string) {
  return `rapport_pointage_${date.replace(/-/g, '_')}.pdf`
}

export function buildExcelFileName(periodStart: string, periodEnd: string) {
  return `synthese-rapports-${periodStart}_${periodEnd}.xlsx`
}
