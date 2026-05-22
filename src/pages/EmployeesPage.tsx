import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Power, ShieldAlert, Trash2, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CenterModal } from '@/components/CenterModal'
import { FormSelect } from '@/components/FormSelect'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { employeeMatchesQuery } from '@/lib/reporting'
import { askConfirmation } from '@/lib/runtime'
import type { Employee } from '@/types'

type ModalType = 'add' | 'edit' | 'recurring' | null

export function EmployeesPage() {
  const { user } = useAuth()
  const {
    employees,
    absenceReasons,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeActive,
    setRecurringAbsence,
    removeRecurringAbsence,
    getRecurringAbsence,
  } = useData()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [reasonId, setReasonId] = useState(absenceReasons[0]?.id ?? '')
  const [comment, setComment] = useState('')

  const filtered = useMemo(
    () => employees
      .filter((employee) => (showInactive ? true : employee.isActive))
      .filter((employee) => employeeMatchesQuery(employee, search))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr')),
    [employees, search, showInactive],
  )

  function openAdd() {
    setSelectedEmployee(null)
    setFirstName('')
    setLastName('')
    setModalType('add')
  }

  function openEdit(employee: Employee) {
    setSelectedEmployee(employee)
    setFirstName(employee.firstName)
    setLastName(employee.lastName)
    setModalType('edit')
  }

  function openRecurring(employee: Employee) {
    setSelectedEmployee(employee)
    const existing = getRecurringAbsence(employee.id)
    setReasonId(existing?.reasonId ?? absenceReasons[0]?.id ?? '')
    setComment(existing?.comment ?? '')
    setModalType('recurring')
  }

  function closeModal() {
    setModalType(null)
  }

  async function submitModal() {
    if (modalType === 'add') {
      await addEmployee(`${lastName} ${firstName}`.trim(), firstName, lastName)
    }
    if (modalType === 'edit' && selectedEmployee) {
      await updateEmployee(selectedEmployee.id, { firstName, lastName, fullName: `${lastName} ${firstName}`.trim() })
    }
    if (modalType === 'recurring' && selectedEmployee) {
      await setRecurringAbsence(selectedEmployee.id, reasonId, comment || undefined)
    }
    closeModal()
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Employes</p>
          <h1>{employees.filter((employee) => employee.isActive).length} actifs</h1>
          <p>{employees.length} employe(s) au total.</p>
        </div>
        {user?.role === 'ADMIN' ? (
          <button className="success-button button-leading-icon" onClick={openAdd}>
            <UserPlus size={16} />
            Ajouter un employe
          </button>
        ) : null}
      </header>

      <div className="toolbar">
        <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un employe" />
        <button className={`chip${!showInactive ? ' active' : ''}`} onClick={() => setShowInactive(false)}>Actifs</button>
        <button className={`chip${showInactive ? ' active' : ''}`} onClick={() => setShowInactive(true)}>Tous</button>
      </div>

      <div className="card table-list">
        {filtered.length === 0 ? (
          <div className="empty-inline">Aucun employe trouve.</div>
        ) : filtered.map((employee) => {
          const hasRecurringAbsence = Boolean(getRecurringAbsence(employee.id))
          return (
            <div key={employee.id} className={`table-row${employee.isActive ? '' : ' is-inactive'}`}>
              <div>
                <strong>{employee.fullName}</strong>
                <div className="muted">
                  {employee.isActive ? 'Actif' : 'Inactif'}
                  {hasRecurringAbsence ? ' - Absence recurrente configuree' : ''}
                </div>
              </div>
              <div className="table-actions">
                {!employee.isActive ? <span className="status-badge inactive"><Power size={13} />Desactive</span> : null}
                <Link className="ghost-button link-button button-leading-icon" to={`/employee/${employee.id}`}>
                  <Eye size={15} />
                  Voir
                </Link>
                {user?.role === 'ADMIN' ? (
                  <>
                    <button className="ghost-button button-leading-icon" onClick={() => openEdit(employee)}>
                      <Pencil size={15} />
                      Modifier
                    </button>
                    <button className="secondary-button button-leading-icon" onClick={() => openRecurring(employee)}>
                      <ShieldAlert size={15} />
                      Absence recurrente
                    </button>
                    <button className={employee.isActive ? 'warning-button button-leading-icon' : 'success-button button-leading-icon'} onClick={() => void toggleEmployeeActive(employee.id)}>
                      <Power size={15} />
                      {employee.isActive ? 'Desactiver' : 'Activer'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <CenterModal
        open={modalType !== null}
        title={modalType === 'add' ? 'Ajouter un employe' : modalType === 'edit' ? 'Modifier un employe' : 'Absence recurrente'}
        subtitle={modalType === 'recurring' ? 'Definissez un motif applique automatiquement a cet employe.' : "Renseignez les informations de base de l'employe."}
        onClose={closeModal}
        width="620px"
      >
        <div className="modal-form modal-form-elevated">
          {modalType === 'add' || modalType === 'edit' ? (
            <>
              <div className="form-grid-two">
                <label className="field">
                  <span>Prenom</span>
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Prenom" />
                </label>
                <label className="field">
                  <span>Nom</span>
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Nom" />
                </label>
              </div>
              <div className="modal-actions">
                {modalType === 'edit' && selectedEmployee ? (
                  <button className="danger-link button-leading-icon" onClick={async () => {
                    if (await askConfirmation('Supprimer cet employe ?')) await deleteEmployee(selectedEmployee.id)
                  }}>
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                ) : <span />}
                <button className="success-button button-leading-icon" onClick={() => void submitModal()} disabled={!firstName.trim() || !lastName.trim()}>
                  <Plus size={16} />
                  Enregistrer
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                <span>Motif</span>
                <FormSelect value={reasonId} options={absenceReasons.map((reason) => ({ value: reason.id, label: reason.label }))} onChange={setReasonId} placeholder="Choisir un motif" />
              </label>
              <label className="field">
                <span>Commentaire</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} placeholder="Ajouter une precision utile" />
              </label>
              <div className="modal-actions">
                {selectedEmployee && getRecurringAbsence(selectedEmployee.id) ? (
                  <button className="danger-link button-leading-icon" onClick={() => void removeRecurringAbsence(selectedEmployee.id)}>
                    <Trash2 size={14} />
                    Supprimer
                  </button>
                ) : <span />}
                <button className="success-button button-leading-icon" onClick={() => void submitModal()}>
                  <Users size={16} />
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </div>
      </CenterModal>
    </section>
  )
}
