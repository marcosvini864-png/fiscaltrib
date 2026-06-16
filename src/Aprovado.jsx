export default function Aprovado({ onContinuar }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icone}>✅</div>
        <h2 style={styles.titulo}>Pagamento Confirmado!</h2>
        <p style={styles.texto}>
          Bem-vindo ao FiscalTrib! Sua assinatura foi ativada com sucesso.
        </p>
        <p style={styles.subtexto}>
          Agora vamos configurar o seu perfil para personalizar sua experiência.
        </p>
        <button style={styles.btn} onClick={onContinuar}>
          Configurar meu perfil →
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:      { background: '#1e293b', borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' },
  icone:     { fontSize: '64px', marginBottom: '16px' },
  titulo:    { color: '#4ade80', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' },
  texto:     { color: '#e2e8f0', fontSize: '16px', marginBottom: '12px', lineHeight: 1.6 },
  subtexto:  { color: '#94a3b8', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 },
  btn:       { padding: '14px 32px', background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
}