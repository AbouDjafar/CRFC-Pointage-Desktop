import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CenterModal } from '@/components/CenterModal'
import { useAuth } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { employeeMatchesQuery } from '@/lib/reporting'
import { askConfirmation } from '@/lib/runtime'
import type { Employee } from '@/types'

type ModalType = 'add' | 'edit' | 'recurring' | null

export function EmployeesPage() {
  const { user } = useAuth()
  const { employees, absenceReasons, addEmployee, updateEmployee, deleteEmployee, toggleEmployeeActive, setRecurringAbsence, removeRecurringAbsence, getRecurringAbsence } = useData()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [reasonId, setReasonId] = useState(absenceReasons[0]?.id ?? '')
  const [comment, setComment] = useState('')

  const filtered = useMemo(() => employees
    .filter((employee) => (showInactive ? true : employee.isActive))
    .filter((employee) => employeeMatchesQuery(employee, search))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr')), [employees, search, showInactive])

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
    setModalType(null)
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Employes</p>
          <h1>{employees.filter((employee) => employee.isActive).length} actifs</h1>
          <p>{employees.length} employe(s) au total.</p>
        </div>
        {user?.role === 'ADMIN' ? <button className="primary-button" onClick={openAdd}>Ajouter un employe</button> : null}
      </header>

      <div className="toolbar">
        <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un employe" />
        <button className={`chip${!showInactive ? ' active' : ''}`} onClick={() => setShowInactive(false)}>Actifs</button>
        <button className={`chip${showInactive ? ' active' : ''}`} onClick={() => setShowInactive(true)}>Tous</button>
      </div>

      <div className="card table-list">
        {filtered.length === 0 ? <div className="empty-inline">Aucun employe trouve.</div> : filtered.map((employee) => (
          <div key={employee.id} className="table-row">
            <div>
              <strong>{employee.fullName}</strong>
              <div className="muted">{employee.isActive ? 'Actif' : 'Inactif'}{getRecurringAbsence(employee.id) ? ' - Absence recurrente configuree' : ''}</div>
            </div>
            <div className="table-actions">
              <Link className="ghost-button link-button" to={`/employee/${employee.id}`}>Voir</Link>
              {user?.role === 'ADMIN' ? (
                <>
                  <button className="ghost-button" onClick={() => openEdit(employee)}>Modifier</button>
                  <button className="ghost-button" onClick={() => openRecurring(employee)}>Absence recurrente</button>
                  <button className="ghost-button" onClick={() => void toggleEmployeeActive(employee.id)}>{employee.isActive ? 'Desactiver' : 'Activer'}</button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <CenterModal open={modalType !== null} title={modalType === 'add' ? 'Ajouter un employe' : modalType === 'edit' ? 'Modifier un employe' : 'Absence recurrente'} onClose={() => setModalType(null)}>
        <div className="modal-form">
          {(modalType === 'add' || modalType === 'edit') ? (
            <>
              <label className="field"><span>Prenom</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
              <label className="field"><span>Nom</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
              <div className="modal-actions">
                {modalType === 'edit' && selectedEmployee ? <button className="danger-link" onClick={() => askConfirmation('Supprimer cet employe ?') && void deleteEmployee(selectedEmployee.id)}>Supprimer</button> : <span />}
                <button className="primary-button" onClick={() => void submitModal()}>Enregistrer</button>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                <span>Motif</span>
                <select value={reasonId} onChange={(event) => setReasonId(event.target.value)}>
                  {absenceReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}
                </select>
              </label>
              <label className="field"><span>Commentaire</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={4} /></label>
              <div className="modal-actions">
                {selectedEmployee && getRecurringAbsence(selectedEmployee.id) ? <button className="danger-link" onClick={() => void removeRecurringAbsence(selectedEmployee.id)}>Supprimer</button> : <span />}
                <button className="primary-button" onClick={() => void submitModal()}>Enregistrer</button>
              </div>
            </>
          )}
        </div>
      </CenterModal>
    </section>
  )
}
