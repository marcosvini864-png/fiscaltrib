import { useState } from 'react'
import { supabase } from './supabase'

export default function TipoPerfil({ user, onEscolher }) {
  const [loading, setLoading] = useState(null)
  const [erro, setErro] = useState('')

  const perfis = [
    { id: 'contador',   icone: '📊', titulo: 'Contador',   descricao: 'Escritório de contabilidade ou contador autônomo' },
    { id: 'advogado',   icone: '⚖️', titulo: 'Advogado',   descricao: 'Advogado tributarista ou escritório jurídico' },
    { id: 'empresario', icone: '🏢', titulo: 'Empresário', descricao: 'Proprietário ou gestor de empresa' },
  ]

  async function escolherPerfil(id) {
    setLoading(id)
    setErro('')
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ tipo_perfil: id })
        .eq('id', user.id)
      if (error) throw error
      onEscolher(id)
    } catch (e) {
      setErro('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.titulo}>Qual é o seu perfil?</h2>
        <p style={styles.subtexto}>
          Isso nos ajuda a personalizar sua experiência no FiscalTrib.
        </p>
        <div style={styles.grid}>
          {perfis.map(p => (
            <div
              key={p.id}
              style={{
                ...styles.perfilCard,
                opacity: loading && loading !== p.id ? 0.5 : 1,
                borderColor: loading === p.id ? '#f0b429' : '#334155',
              }}
              onClick={() => !loading && escolherPerfil(p.id)}
            >
              <div style={styles.icone}>{loading === p.id ? '⏳' : p.icone}</div>
              <div style={styles.perfilTitulo}>{p.titulo}</div>
              <div style={styles.perfilDesc}>{p.descricao}</div>
            </div>
          ))}
        </div>
        {erro && <p style={styles.erro}>{erro}</p>}
      </div>
    </div>
  )
}

const styles = {
  container:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' },
  card:         { background: '#1e293b', borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '560px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' },
  titulo:       { color: '#f0b429', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' },
  subtexto:     { color: '#94a3b8', fontSize: '14px', marginBottom: '32px' },
  grid:         { display: 'flex', gap: '16px', justifyContent: 'center' },
  perfilCard:   { flex: 1, background: '#0f172a', border: '2px solid #334155', borderRadius: '12px', padding: '24px 16px', cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  icone:        { fontSize: '40px' },
  perfilTitulo: { color: '#e2e8f0', fontWeight: 'bold', fontSize: '16px' },
  perfilDesc:   { color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 },
  erro:         { color: '#f87171', fontSize: '13px', marginTop: '20px' },
}