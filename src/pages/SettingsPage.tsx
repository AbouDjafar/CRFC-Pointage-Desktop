import { useState } from 'react'
import { desktopBridge } from '@/bridge'
import { CenterModal } from '@/components/CenterModal'
import { useAuth, userFullName } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { askConfirmation, showError, showSuccess } from '@/lib/runtime'
import type { UserRole } from '@/types'

type ModalType = 'profile' | 'password' | 'createUser' | null

export function SettingsPage() {
  const { user, allUsers, logout, updateProfile, createUser, deleteUser, toggleUserActive } = useAuth()
  const { importEmployeesFromSpreadsheet, importReportsFromWorkbook } = useData()
  const [modalType, setModalType] = useState<ModalType>(null)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newUser, setNewUser] = useState<{ firstName: string; lastName: string; email: string; jobTitle: string; password: string; role: UserRole }>({ firstName: '', lastName: '', email: '', jobTitle: '', password: '', role: 'AGENT' })

  async function handleImportReports() {
    try {
      const file = await desktopBridge.pickImportFile(['.xlsx', '.xls'])
      if (!file) return
      const summary = await importReportsFromWorkbook(file)
      showSuccess(`${summary.importedDates} date(s) importee(s), ${summary.replacedDates} remplacee(s).`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Import impossible.')
    }
  }

  async function handleImportEmployees() {
    try {
      const file = await desktopBridge.pickImportFile(['.csv', '.xlsx', '.xls'])
      if (!file) return
      const summary = await importEmployeesFromSpreadsheet(file)
      showSuccess(`${summary.created} cree(s), ${summary.updated} mis a jour, ${summary.skipped} ignore(s).`)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Import impossible.')
    }
  }

  return (
    <section className="page">
      <header className="page-header hero-header">
        <div>
          <p className="eyebrow">Reglages</p>
          <h1>{userFullName(user!)}</h1>
          <p>{user?.jobTitle} - {user?.role === 'ADMIN' ? 'Administrateur' : 'Agent'}</p>
        </div>
      </header>

      <div className="grid-layout">
        <div className="card">
          <div className="card-header"><h2>Mon profil</h2></div>
          <div className="stack-actions">
            <button className="ghost-button" onClick={() => setModalType('profile')}>Modifier le profil</button>
            <button className="ghost-button" onClick={() => setModalType('password')}>Changer le mot de passe</button>
            <button className="danger-link" onClick={() => void logout()}>Se deconnecter</button>
          </div>
        </div>

        {user?.role === 'ADMIN' ? (
          <>
            <div className="card">
              <div className="card-header"><h2>Import des donnees</h2></div>
              <div className="stack-actions">
                <button className="ghost-button" onClick={() => void handleImportReports()}>Importer les rapports</button>
                <button className="ghost-button" onClick={() => void handleImportEmployees()}>Importer les employes</button>
              </div>
            </div>

            <div className="card wide-card">
              <div className="card-header">
                <h2>Utilisateurs</h2>
                <button className="primary-button" onClick={() => setModalType('createUser')}>Nouvel utilisateur</button>
              </div>
              <div className="table-list">
                {allUsers.filter((item) => item.id !== user.id).map((item) => (
                  <div key={item.id} className="table-row">
                    <div>
                      <strong>{userFullName(item)}</strong>
                      <div className="muted">{item.email} - {item.role}</div>
                    </div>
                    <div className="table-actions">
                      <button className="ghost-button" onClick={() => void toggleUserActive(item.id)}>{item.isActive ? 'Desactiver' : 'Activer'}</button>
                      <button className="danger-link" onClick={() => askConfirmation('Supprimer cet utilisateur ?') && void deleteUser(item.id)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <CenterModal open={modalType !== null} title={modalType === 'profile' ? 'Modifier le profil' : modalType === 'password' ? 'Changer le mot de passe' : 'Nouvel utilisateur'} onClose={() => setModalType(null)}>
        <div className="modal-form">
          {modalType === 'profile' ? (
            <>
              <label className="field"><span>Prenom</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
              <label className="field"><span>Nom</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
              <label className="field"><span>Fonction</span><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} /></label>
              <button className="primary-button" onClick={() => void updateProfile({ firstName, lastName, jobTitle }).then((result) => { if (!result.success) showError(result.error ?? 'Erreur'); else setModalType(null) })}>Enregistrer</button>
            </>
          ) : null}
          {modalType === 'password' ? (
            <>
              <label className="field"><span>Mot de passe actuel</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
              <label className="field"><span>Nouveau mot de passe</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
              <label className="field"><span>Confirmation</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
              <button className="primary-button" onClick={() => {
                if (newPassword !== confirmPassword) return showError('Les mots de passe ne correspondent pas.')
                void updateProfile({ currentPassword, newPassword }).then((result) => { if (!result.success) showError(result.error ?? 'Erreur'); else setModalType(null) })
              }}>Mettre a jour</button>
            </>
          ) : null}
          {modalType === 'createUser' ? (
            <>
              <label className="field"><span>Prenom</span><input value={newUser.firstName} onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })} /></label>
              <label className="field"><span>Nom</span><input value={newUser.lastName} onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })} /></label>
              <label className="field"><span>Email</span><input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
              <label className="field"><span>Fonction</span><input value={newUser.jobTitle} onChange={(event) => setNewUser({ ...newUser, jobTitle: event.target.value })} /></label>
              <label className="field"><span>Mot de passe</span><input type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
              <label className="field"><span>Role</span><select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as 'AGENT' | 'ADMIN' })}><option value="AGENT">Agent</option><option value="ADMIN">Administrateur</option></select></label>
              <button className="primary-button" onClick={() => void createUser(newUser).then((result) => { if (!result.success) showError(result.error ?? 'Erreur'); else setModalType(null) })}>Creer</button>
            </>
          ) : null}
        </div>
      </CenterModal>
    </section>
  )
}
