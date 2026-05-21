import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !jobTitle.trim() || !password || !confirmPassword) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    const result = await register({ firstName, lastName, email, jobTitle, password })
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Erreur lors de la creation du compte.')
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="auth-shell auth-shell-centered">
        <div className="success-card">
          <h2>Compte cree</h2>
          <p>Votre compte agent a ete cree avec succes. Vous pouvez maintenant vous connecter.</p>
          <button className="primary-button" onClick={() => navigate('/login', { replace: true })}>Se connecter</button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-shell">
      <div className="auth-hero small">
        <img src="/assets/bg_pattern.png" alt="" className="auth-hero-bg" />
        <div className="auth-hero-overlay" />
        <div className="auth-hero-content">
          <h1>Nouveau compte</h1>
          <p>Creer un compte Agent CRFC</p>
        </div>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="grid-two">
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
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="prenom.nom@crfc.cm" />
        </label>
        <label className="field">
          <span>Fonction</span>
          <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Votre fonction" />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label className="field">
          <span>Confirmation</span>
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
        {error ? <div className="alert error">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Creation...' : 'Creer le compte'}</button>
        <Link className="secondary-link" to="/login">Deja un compte ? Se connecter</Link>
      </form>
    </div>
  )
}
