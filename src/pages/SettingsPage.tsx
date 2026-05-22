import { useEffect, useState } from 'react'
import {
  Clock3,
  FileSpreadsheet,
  Import,
  KeyRound,
  LogOut,
  PencilLine,
  Power,
  Shield,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import { desktopBridge } from '@/bridge'
import { CenterModal } from '@/components/CenterModal'
import { FormSelect } from '@/components/FormSelect'
import { useAuth, userFullName } from '@/contexts/AuthContext'
import { useData } from '@/contexts/DataContext'
import { askConfirmation, showError, showSuccess } from '@/lib/runtime'
import type { UserRole } from '@/types'

type ModalType = 'profile' | 'password' | 'createUser' | null

export function SettingsPage() {
  const { user, allUsers, logout, updateProfile, createUser, deleteUser, toggleUserActive } = useAuth()
  const { appSettings, updateAppSettings, importEmployeesFromSpreadsheet, importReportsFromWorkbook } = useData()
  const [modalType, setModalType] = useState<ModalType>(null)
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newUser, setNewUser] = useState<{ firstName: string; lastName: string; email: string; jobTitle: string; password: string; role: UserRole }>({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    password: '',
    role: 'AGENT',
  })
  const [settingsTime, setSettingsTime] = useState(appSettings.defaultLateTime)
  const [modalError, setModalError] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => {
    setSettingsTime(appSettings.defaultLateTime)
  }, [appSettings.defaultLateTime])

  function closeModal() {
    setModalType(null)
    setModalError('')
  }

  function openModal(type: ModalType) {
    setModalError('')
    if (type === 'profile') {
      setFirstName(user?.firstName ?? '')
      setLastName(user?.lastName ?? '')
      setJobTitle(user?.jobTitle ?? '')
    }
    if (type === 'password') {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    if (type === 'createUser') {
      setNewUser({ firstName: '', lastName: '', email: '', jobTitle: '', password: '', role: 'AGENT' })
    }
    setModalType(type)
  }

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

  async function handleSaveProfile() {
    setModalLoading(true)
    const result = await updateProfile({ firstName, lastName, jobTitle })
    setModalLoading(false)
    if (!result.success) {
      setModalError(result.error ?? 'Erreur')
      return
    }
    closeModal()
  }

  async function handleSavePassword() {
    if (newPassword !== confirmPassword) {
      setModalError('Les mots de passe ne correspondent pas.')
      return
    }
    setModalLoading(true)
    const result = await updateProfile({ currentPassword, newPassword })
    setModalLoading(false)
    if (!result.success) {
      setModalError(result.error ?? 'Erreur')
      return
    }
    closeModal()
  }

  async function handleCreateUser() {
    setModalLoading(true)
    const result = await createUser(newUser)
    setModalLoading(false)
    if (!result.success) {
      setModalError(result.error ?? 'Erreur')
      return
    }
    closeModal()
  }

  async function handleSavePointageSettings() {
    setSavingSettings(true)
    try {
      await updateAppSettings({ defaultLateTime: settingsTime })
      showSuccess('Heure de reference mise a jour. Les retards existants ont ete recalcules.')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Impossible de mettre a jour le parametre.')
    } finally {
      setSavingSettings(false)
    }
  }

  const roleOptions = [
    { value: 'AGENT', label: 'Agent' },
    { value: 'ADMIN', label: 'Administrateur' },
  ]

  return (
    <section className="page">
      <header className="page-header hero-header settings-hero">
        <div>
          <p className="eyebrow">Reglages</p>
          <h1>{userFullName(user!)}</h1>
          <p>{user?.jobTitle} - {user?.role === 'ADMIN' ? 'Administrateur' : 'Agent'}</p>
        </div>
        <div className="header-actions">
          <button className="ghost-button button-leading-icon" onClick={() => void logout()}>
            <LogOut size={16} />
            Se deconnecter
          </button>
        </div>
      </header>

      <div className="grid-layout">
        <div className="card settings-card">
          <div className="card-header">
            <h2>Mon profil</h2>
          </div>
          <div className="settings-stack">
            <div className="settings-inline-row">
              <div className="settings-avatar">{userFullName(user!).charAt(0).toUpperCase()}</div>
              <div>
                <strong>{userFullName(user!)}</strong>
                <div className="muted">{user?.email}</div>
              </div>
            </div>
            <div className="settings-profile-actions">
              <button className="secondary-button button-leading-icon" onClick={() => openModal('profile')}>
                <PencilLine size={16} />
                Modifier le profil
              </button>
              <button className="secondary-button button-leading-icon" onClick={() => openModal('password')}>
                <KeyRound size={16} />
                Changer le mot de passe
              </button>
            </div>
          </div>
        </div>

        <div className="card settings-card">
          <div className="card-header">
            <h2>Parametres de pointage</h2>
          </div>
          <div className="settings-stack">
            <p className="muted">Cette heure sert de reference pour calculer les minutes de retard. Toute modification recalcule l&apos;historique existant.</p>
            <label className="field">
              <span>Heure de reference du retard</span>
              <div className="time-input-shell">
                <Clock3 size={16} />
                <input type="time" value={settingsTime} onChange={(event) => setSettingsTime(event.target.value)} step={60} />
              </div>
            </label>
            <button className="primary-button button-leading-icon" onClick={() => void handleSavePointageSettings()} disabled={savingSettings}>
              <Clock3 size={16} />
              {savingSettings ? 'Mise a jour...' : 'Enregistrer l heure'}
            </button>
          </div>
        </div>

        {user?.role === 'ADMIN' ? (
          <>
            <div className="card settings-card">
              <div className="card-header">
                <h2>Import des donnees</h2>
              </div>
              <div className="settings-stack">
                <button className="secondary-button button-leading-icon" onClick={() => void handleImportReports()}>
                  <FileSpreadsheet size={16} />
                  Importer les rapports
                </button>
                <button className="secondary-button button-leading-icon" onClick={() => void handleImportEmployees()}>
                  <Import size={16} />
                  Importer les employes
                </button>
              </div>
            </div>

            <div className="card settings-card wide-card">
              <div className="card-header">
                <h2>Utilisateurs</h2>
                <button className="success-button button-leading-icon" onClick={() => openModal('createUser')}>
                  <UserPlus size={16} />
                  Nouvel utilisateur
                </button>
              </div>
              <div className="table-list">
                {allUsers.filter((item) => item.id !== user.id).map((item) => (
                  <div key={item.id} className={`table-row${item.isActive ? '' : ' is-inactive'}`}>
                    <div>
                      <strong>{userFullName(item)}</strong>
                      <div className="muted">{item.email} - {item.role}</div>
                    </div>
                    <div className="table-actions">
                      {!item.isActive ? <span className="status-badge inactive"><Power size={13} />Inactif</span> : null}
                      <button className={item.isActive ? 'warning-button button-leading-icon' : 'success-button button-leading-icon'} onClick={() => void toggleUserActive(item.id)}>
                        <Power size={15} />
                        {item.isActive ? 'Desactiver' : 'Activer'}
                      </button>
                      <button className="danger-link button-leading-icon" onClick={async () => {
                        if (await askConfirmation('Supprimer cet utilisateur ?')) await deleteUser(item.id)
                      }}>
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card settings-card wide-card">
              <div className="card-header">
                <h2>Informations</h2>
              </div>
              <div className="dev-grid">
                <div><span className="muted">Developpeur</span><strong>A. A. Djafar</strong></div>
                <div><span className="muted">Role</span><strong>Cadre Informaticien au CRFC</strong></div>
                <div><span className="muted">Mail</span><strong>djafar@crfc.cm</strong></div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <CenterModal
        open={modalType !== null}
        title={modalType === 'profile' ? 'Modifier le profil' : modalType === 'password' ? 'Changer le mot de passe' : 'Nouvel utilisateur'}
        subtitle={modalType === 'createUser' ? 'Ajoutez un nouvel utilisateur en choisissant son role et ses informations de connexion.' : 'Mettez a jour les informations de ce compte.'}
        onClose={closeModal}
        width="680px"
      >
        <div className="modal-form modal-form-elevated">
          {modalType === 'profile' ? (
            <>
              <div className="form-grid-two">
                <label className="field">
                  <span>Prenom</span>
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                </label>
                <label className="field">
                  <span>Nom</span>
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                </label>
              </div>
              <label className="field">
                <span>Fonction</span>
                <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
              </label>
              {modalError ? <div className="alert error">{modalError}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal}>Annuler</button>
                <button className="primary-button button-leading-icon" onClick={() => void handleSaveProfile()} disabled={modalLoading}>
                  <PencilLine size={16} />
                  {modalLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </>
          ) : null}

          {modalType === 'password' ? (
            <>
              <label className="field">
                <span>Mot de passe actuel</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              </label>
              <label className="field">
                <span>Nouveau mot de passe</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </label>
              <label className="field">
                <span>Confirmation</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              {modalError ? <div className="alert error">{modalError}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal}>Annuler</button>
                <button className="primary-button button-leading-icon" onClick={() => void handleSavePassword()} disabled={modalLoading}>
                  <Shield size={16} />
                  {modalLoading ? 'Mise a jour...' : 'Mettre a jour'}
                </button>
              </div>
            </>
          ) : null}

          {modalType === 'createUser' ? (
            <>
              <div className="form-grid-two">
                <label className="field">
                  <span>Prenom</span>
                  <input value={newUser.firstName} onChange={(event) => setNewUser({ ...newUser, firstName: event.target.value })} />
                </label>
                <label className="field">
                  <span>Nom</span>
                  <input value={newUser.lastName} onChange={(event) => setNewUser({ ...newUser, lastName: event.target.value })} />
                </label>
              </div>
              <label className="field">
                <span>Email</span>
                <input value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} />
              </label>
              <label className="field">
                <span>Fonction</span>
                <input value={newUser.jobTitle} onChange={(event) => setNewUser({ ...newUser, jobTitle: event.target.value })} />
              </label>
              <label className="field">
                <span>Mot de passe</span>
                <input type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
              </label>
              <label className="field">
                <span>Role</span>
                <FormSelect value={newUser.role} options={roleOptions} onChange={(value) => setNewUser({ ...newUser, role: value as UserRole })} />
              </label>
              {modalError ? <div className="alert error">{modalError}</div> : null}
              <div className="modal-actions">
                <button className="secondary-button" onClick={closeModal}>Annuler</button>
                <button className="success-button button-leading-icon" onClick={() => void handleCreateUser()} disabled={modalLoading}>
                  <Upload size={16} />
                  {modalLoading ? 'Creation...' : 'Creer'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </CenterModal>
    </section>
  )
}
