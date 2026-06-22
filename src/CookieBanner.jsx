import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const aceito = localStorage.getItem('fiscaltrib_cookies')
    if (!aceito) setVisivel(true)
  }, [])

  function aceitar() {
    localStorage.setItem('fiscaltrib_cookies', 'aceito')
    setVisivel(false)
  }

  function recusar() {
    localStorage.setItem('fiscaltrib_cookies', 'recusado')
    setVisivel(false)
  }

  if (!visivel) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: '#0B1F4D',
      color: '#fff',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16,
      zIndex: 9999,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      borderTop: '3px solid #22C55E',
    }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          🍪 Utilizamos cookies
        </div>
        <div style={{ fontSize: 12, color: '#A0C4FF', lineHeight: 1.6 }}>
          O FiscalTrib utiliza cookies essenciais para autenticação e funcionamento do sistema,
          e cookies analíticos para melhorar sua experiência. Ao continuar navegando,
          você concorda com nossa{' '}
          <span style={{ color: '#22C55E', textDecoration: 'underline', cursor: 'pointer' }}>
            Política de Privacidade
          </span>
          {' '}em conformidade com a LGPD.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={recusar}
          style={{
            padding: '8px 20px',
            background: 'transparent',
            border: '1.5px solid rgba(255,255,255,0.3)',
            color: '#fff',
            borderRadius: 8,
            fontSize: 13,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#fff'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
        >
          Recusar
        </button>
        <button
          onClick={aceitar}
          style={{
            padding: '8px 24px',
            background: '#22C55E',
            border: 'none',
            color: '#fff',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#16A34A'}
          onMouseLeave={e => e.currentTarget.style.background = '#22C55E'}
        >
          ✓ Aceitar cookies
        </button>
      </div>
    </div>
  )
}