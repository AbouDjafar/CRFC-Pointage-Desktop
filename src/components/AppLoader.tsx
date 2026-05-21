export function AppLoader({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="loader-screen">
      <div className="loader-orb loader-orb-a" />
      <div className="loader-orb loader-orb-b" />
      <div className="loader-orb loader-orb-c" />
      <div className="loader-center">
        <div className="loader-ring">
          <img src="/assets/crfc_logo.svg" alt="CRFC" className="loader-logo" />
        </div>
        <div className="loader-brand">CRFC</div>
        <div className="loader-separator" />
        <div className="loader-subtitle">POINTAGE</div>
      </div>
      <div className="loader-footer">
        <div className="loader-track"><span className="loader-fill" /></div>
        <div className="loader-message">{message}</div>
      </div>
    </div>
  )
}
