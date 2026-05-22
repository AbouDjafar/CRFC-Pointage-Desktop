export function AppLoader({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="splash-screen">
      <div className="splash-circle c1" />
      <div className="splash-circle c2" />
      <div className="splash-circle c3" />
      <div className="splash-circle c4" />

      <div className="splash-content">
        <div className="splash-logo-wrapper">
          <div className="splash-ring" />
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" className="splash-svg">
            <defs>
              <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 0.15 }} />
                <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0.05 }} />
              </linearGradient>
              <linearGradient id="ogG" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#F97316' }} />
                <stop offset="100%" style={{ stopColor: '#EA580C' }} />
              </linearGradient>
              <filter id="sh">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0A1628" floodOpacity={0.3} />
              </filter>
            </defs>
            <rect
              x="40"
              y="40"
              width="320"
              height="320"
              rx="72"
              fill="url(#bgG)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
            />
            <g filter="url(#sh)" transform="translate(200,172)">
              <circle cx="0" cy="-54" r="26" fill="#ffffff" />
              <path d="M-42 10 Q-42 -22 0 -22 Q42 -22 42 10 L42 32 Q42 44 30 44 L-30 44 Q-42 44 -42 32 Z" fill="#ffffff" />
            </g>
            <circle cx="258" cy="230" r="28" fill="url(#ogG)" filter="url(#sh)" />
            <polyline
              points="246,230 254,240 272,218"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="200"
              y="305"
              fontFamily="Georgia, serif"
              fontSize="48"
              fontWeight="700"
              letterSpacing="8"
              textAnchor="middle"
              fill="#ffffff"
            >
              CRFC
            </text>
            <line
              x1="125"
              y1="318"
              x2="275"
              y2="318"
              stroke="#F97316"
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.9"
            />
            <text
              x="200"
              y="342"
              fontFamily="Georgia, serif"
              fontSize="15"
              fontWeight="400"
              letterSpacing="5"
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
            >
              POINTAGE
            </text>
          </svg>
        </div>

        <div className="splash-brand-name">CRFC</div>
        <div className="splash-separator" />
        <div className="splash-tagline">Pointage</div>
      </div>

      <div className="splash-loader-container">
        <div className="splash-track">
          <div className="splash-fill" />
        </div>
        <div className="splash-label">{message}</div>
      </div>
    </div>
  )
}
