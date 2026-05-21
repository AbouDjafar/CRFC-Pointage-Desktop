import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!loginId.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }
    setLoading(true)
    const success = await login(loginId.trim(), password.trim())
    setLoading(false)
    if (success) navigate('/rapport', { replace: true })
    else setError('Identifiant ou mot de passe incorrect, ou compte desactive.')
  }

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <img src="/assets/bg_pattern.png" alt="" className="auth-hero-bg" />
        <div className="auth-hero-overlay" />
        <div className="auth-hero-content">
          <div className="auth-logo-circle"><img src="/assets/crfc_logo.svg" alt="CRFC" /></div>
          <h1>CRFC Pointage</h1>
          <p>Systeme de pointage quotidien</p>
        </div>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        <label className="field">
          <span>Identifiant</span>
          <input value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="email ou login" />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" />
        </label>
        {error ? <div className="alert error">{error}</div> : null}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
        <Link className="secondary-link" to="/register">Creer un compte</Link>
      </form>
    </div>
  )
}
