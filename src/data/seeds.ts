import type { AbsenceReason, Employee, User } from '@/types'
import { getKnownEmployeeSex } from '@/lib/employeeSex'

export const SEED_ADMIN: User = {
  id: 'crfc-admin-001',
  firstName: 'Administrateur',
  lastName: 'CRFC',
  email: 'admin@crfc.cm',
  jobTitle: 'Administrateur Systeme',
  password: 'shazam!2023',
  role: 'ADMIN',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
}

type EmployeeSeed = { fn: string; ln: string }

const seedDefinitions: [string, EmployeeSeed][] = [
  ['emp-001', { fn: 'Simon François', ln: 'YONGA BAKALAG' }],
  ['emp-002', { fn: 'Jean Marie', ln: 'AWOUMOU ETOGA' }],
  ['emp-003', { fn: 'Martin Christian', ln: 'MANDIO BAMBOCK' }],
  ['emp-004', { fn: 'Philippe Louis', ln: 'BITJOKA' }],
  ['emp-005', { fn: 'Patrick Michel Ange', ln: 'NEKE MPONG' }],
  ['emp-006', { fn: 'Débora', ln: 'NGO TONYE' }],
  ['emp-007', { fn: 'Olive', ln: 'NAA MENFOUNG' }],
  ['emp-008', { fn: 'Joseph', ln: 'OMGBA AWA' }],
  ['emp-009', { fn: 'Suzanne Ida', ln: 'MBES' }],
  ['emp-010', { fn: 'Yvonne', ln: 'MAGNITOUO' }],
  ['emp-011', { fn: 'Jacques Duclos', ln: 'DINGONG A BOULL' }],
  ['emp-012', { fn: 'Stéphanie épouse BITJOKA', ln: 'WOLIBWON A BETSEN' }],
  ['emp-013', { fn: 'André Cédric', ln: 'YASSI' }],
  ['emp-014', { fn: 'David Yvan', ln: 'NGUESSI DIFFO' }],
  ['emp-015', { fn: 'Chantal', ln: 'NGONDI' }],
  ['emp-016', { fn: 'Albert', ln: 'GWETH MBOCK' }],
  ['emp-017', { fn: 'Boris', ln: 'NGUEFACK ATEUFACK' }],
  ['emp-018', { fn: 'Abel', ln: 'KOBEWO' }],
  ['emp-019', { fn: 'Valery', ln: 'ONONO' }],
  ['emp-020', { fn: 'Yves Mathieu', ln: 'TONYE MVOGO' }],
  ['emp-021', { fn: 'Michelle Laure', ln: 'BEKONO' }],
  ['emp-022', { fn: 'Majolie', ln: 'KAPSOU' }],
  ['emp-023', { fn: 'Leslie', ln: 'DOKEM' }],
  ['emp-024', { fn: 'Ismael', ln: 'NDJIDDA' }],
  ['emp-025', { fn: 'Yves Bertrand', ln: 'MESSI AKINI' }],
  ['emp-026', { fn: 'Véronique', ln: 'DILU SUMBU' }],
  ['emp-027', { fn: 'Mireille', ln: 'PEHM MAMA' }],
  ['emp-028', { fn: 'Karl', ln: 'MBALLA ONGOLO' }],
  ['emp-029', { fn: 'Régine épouse EBODE', ln: 'NOUBISSIE' }],
  ['emp-030', { fn: 'Clarisse', ln: 'OLANG AMOUGUI' }],
  ['emp-031', { fn: 'Régine', ln: 'BALLA NNANGA' }],
  ['emp-032', { fn: 'Jean Charles', ln: 'ABEGA' }],
  ['emp-033', { fn: '', ln: 'IKENG BINDO' }],
  ['emp-034', { fn: 'François', ln: 'BAMBOCK' }],
  ['emp-035', { fn: 'Simon', ln: 'NKOK' }],
  ['emp-036', { fn: 'David', ln: 'ANDEGUE' }],
  ['emp-037', { fn: 'Florent', ln: 'EZEMZE' }],
  ['emp-038', { fn: 'Yanick Durant', ln: 'ESSIMI' }],
  ['emp-039', { fn: 'Karl', ln: 'TCHOUFO TAKAM' }],
  ['emp-040', { fn: '', ln: 'ABDOULRAMANE ABOU DJAFAR' }],
  ['emp-041', { fn: 'Hypolite Myriam', ln: 'FONKEU' }],
]

export const SEED_EMPLOYEES: Employee[] = seedDefinitions.map(([id, seed]) => ({
  id,
  fullName: seed.fn ? `${seed.ln} ${seed.fn}` : seed.ln,
  firstName: seed.fn,
  lastName: seed.ln,
  sex: getKnownEmployeeSex({ firstName: seed.fn, lastName: seed.ln }),
  isActive: true,
  needsReview: false,
  importSource: 'CSV',
  importedAt: '2024-01-01',
  createdAt: '2024-01-01T00:00:00.000Z',
}))

export const SEED_REASONS: AbsenceReason[] = [
  { id: 'r1', label: 'Absence injustifiee' },
  { id: 'r2', label: 'Maladie' },
  { id: 'r3', label: 'Conge' },
  { id: 'r4', label: 'Mission' },
  { id: 'r5', label: 'Permission' },
  { id: 'r6', label: 'Formation' },
  { id: 'r7', label: 'Deplacement' },
  { id: 'r8', label: 'Autre' },
]
