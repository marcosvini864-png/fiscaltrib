export default function Aprovado({ onContinuar }) {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icone}>⏳</div>
        <h2 style={styles.titulo}>Pagamento Enviado!</h2>
        <p style={styles.texto}>
          Recebemos sua solicitação de acesso ao FiscalTrib.
        </p>
        <div style={styles.aviso}>
          <p style={styles.avisoTexto}>
            🔒 Seu acesso será liberado em até <strong>2 horas</strong> após a confirmação do pagamento do PIX e do cadastro do cartão.
          </p>
          <p style={styles.avisoTexto}>
            📲 Você será notificado pelo <strong>WhatsApp (11) 99957-9822</strong> ou pelo e-mail cadastrado.
          </p>
        </div>
        <p style={styles.subtexto}>
          Enquanto isso, vamos configurar seu perfil para tudo estar pronto quando o acesso for liberado.
        </p>
        <button style={styles.btn} onClick={onContinuar}>
          Configurar meu perfil →
        </button>
      </div>
    </div>
  )
}

const styles = {
  container:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:       { background: '#1e293b', borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' },
  icone:      { fontSize: '64px', marginBottom: '16px' },
  titulo:     { color: '#f0b429', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' },
  texto:      { color: '#e2e8f0', fontSize: '16px', marginBottom: '16px', lineHeight: 1.6 },
  aviso:      { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '16px 20px', marginBottom: '20px', textAlign: 'left' },
  avisoTexto: { color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, marginBottom: '8px' },
  subtexto:   { color: '#64748b', fontSize: '13px', marginBottom: '28px', lineHeight: 1.6 },
  btn:        { padding: '14px 32px', background: '#f0b429', color: '#0f172a', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
}