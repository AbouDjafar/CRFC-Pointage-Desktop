import type { Employee } from '@/types'

const EMPLOYEE_SEX_ENTRIES = [
  ['YONGA BAKALAG Simon François', 'Masculin'],
  ['AWOUMOU ETOGA Jean Marie', 'Masculin'],
  ['MANDIO BAMBOCK Martin Christian', 'Masculin'],
  ['BITJOKA Philippe Louis', 'Masculin'],
  ['NEKE MPONG Patrick Michel Ange', 'Masculin'],
  ['NGO TONYE Débora', 'Feminin'],
  ['NA’A MENFOUNG Olive', 'Feminin'],
  ['OMGBA AWA Joseph', 'Masculin'],
  ['MBES Suzanne Ida', 'Feminin'],
  ['MAGNITOUO Yvonne', 'Feminin'],
  ['DINGONG A BOULL Jacques Duclos', 'Masculin'],
  ['WOLIBWON A BETSEN Stéphanie épouse BITJOKA', 'Feminin'],
  ['YASSI André Cédric', 'Masculin'],
  ['NGUESSI DIFFO David Yvan', 'Masculin'],
  ['NGONDI Chantal', 'Feminin'],
  ['GWETH MBOCK Albert', 'Masculin'],
  ['NGUEFACK ATEUFACK Boris', 'Masculin'],
  ['KOBEWO Abel', 'Masculin'],
  ['ONONO Valery', 'Masculin'],
  ['TONYE MVOGO Yves Mathieu', 'Masculin'],
  ['BEKONO Michelle Laure', 'Feminin'],
  ['KAPSOU Majolie', 'Feminin'],
  ['DOKEM Leslie', 'Feminin'],
  ['NDJIDDA Ismael', 'Masculin'],
  ['Ismael NDJIDDA', 'Masculin'],
  ['MESSI AKINI Yves Bertrand', 'Masculin'],
  ['DILU SUMBU Véronique', 'Feminin'],
  ['PEHM MAMA Mireille', 'Feminin'],
  ['MBALLA ONGOLO Karl', 'Masculin'],
  ['NOUBISSIE Régine épouse EBODE', 'Feminin'],
  ['OLANG AMOUGUI Clarisse', 'Feminin'],
  ['BALLA NNANGA Régine', 'Feminin'],
  ['ABEGA Jean Charles', 'Masculin'],
  ['IKENG BINDO', 'Masculin'],
  ['BAMBOCK François', 'Masculin'],
  ['NKOK Simon', 'Masculin'],
  ['ANDEGUE NDJANA David Etienne', 'Masculin'],
  ['EZEMZE Florent', 'Masculin'],
  ['ESSIMI YANICK Durant', 'Masculin'],
  ['TCHOUFO TAKAM Karl', 'Masculin'],
  ['ABDOULRAMANE ABOU DJAFAR', 'Masculin'],
  ['FONKEU Hypolite Myriam', 'Masculin'],
  ['MBIAM MINKO', 'Masculin'],
] as const

export function normalizeEmployeeLookup(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const EMPLOYEE_SEX_BY_NAME = new Map(
  EMPLOYEE_SEX_ENTRIES.map(([fullName, sex]) => [normalizeEmployeeLookup(fullName), sex]),
)

export function getKnownEmployeeSex(input: { fullName?: string; firstName?: string; lastName?: string }) {
  const fullName = input.fullName?.trim()
  if (fullName) {
    const direct = EMPLOYEE_SEX_BY_NAME.get(normalizeEmployeeLookup(fullName))
    if (direct) return direct
  }

  const recomposed = `${input.lastName?.trim() ?? ''} ${input.firstName?.trim() ?? ''}`.trim()
  if (!recomposed) return undefined
  return EMPLOYEE_SEX_BY_NAME.get(normalizeEmployeeLookup(recomposed))
}

export function hydrateEmployeeSex(employee: Employee): Employee {
  if (employee.sex?.trim()) return employee
  const sex = getKnownEmployeeSex(employee)
  return sex ? { ...employee, sex } : employee
}
