import { useState } from 'react'
import { supabase } from './supabase'

const PLANOS = [
  {
    id: 'essencial',
    nome: 'Essencial',
    valor: 119.00,
    descricao: 'Ideal para contadores iniciando com recuperação tributária',
    recursos: [
      'Até 10 clientes ativos',
      'Diagnóstico tributário completo',
      'Relatórios PDF exportáveis',
      'Suporte por e-mail',
    ],
    cor: '#1e3a5f',
    destaque: false,
  },
  {
    id: 'avancado',
    nome: 'Avançado',
    valor: 197.00,
    descricao: 'Para escritórios em crescimento com maior volume de clientes',
    recursos: [
      'Até 50 clientes ativos',
      'Diagnóstico tributário completo',
      'Relatórios PDF exportáveis',
      'Calculadoras tributárias avançadas',
      'Suporte prioritário',
    ],
    cor: '#b48c3c',
    destaque: true,
  },
  {
    id: 'premium',
    nome: 'Premium',
    valor: 297.00,
    descricao: 'Para grandes escritórios com volume ilimitado de clientes',
    recursos: [
      'Clientes ilimitados',
      'Diagnóstico tributário completo',
      'Relatórios PDF exportáveis',
      'Calculadoras tributárias avançadas',
      'Painel de gestão avançado',
      'Suporte VIP via WhatsApp',
    ],
    cor: '#1e3a5f',
    destaque: false,
  },
]

const fmtR = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function Planos({ user, assinatura, onVoltar, onPagamentoIniciado, onSair }) {
  const [loading, setLoading] = useState(null)
  const [erro, setErro] = useState('')

  async function assinar(plano) {
    setLoading(plano.id)
    setErro('')

    try {
      const referencia = `FISCALTRIB-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`

      const { error } = await supabase.from('assinaturas').upsert({
        usuario_id: user.id,
        plano: plano.id,
        valor: plano.valor,
        status: 'pendente',
        ativo: false,
        referencia,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'usuario_id' })

      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/pagbank-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plano_id: plano.id,
          plano_nome: plano.nome,
          valor: plano.valor,
          referencia,
          email_comprador: user.email,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.link) throw new Error(data.error ?? 'Link não gerado')

      window.open(data.link, '_blank')
      if (onPagamentoIniciado) onPagamentoIniciado()

    } catch (err) {
      setErro(err.message || 'Erro ao processar. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 28 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>
          Escolha seu plano
        </h2>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
        </p>
      </div>

      {assinatura && (
        <div style={{ background: assinatura.ativo ? '#f0fdf4' : '#fef9c3', border: `1px solid ${assinatura.ativo ? '#86efac' : '#fde047'}`, borderRadius: 10, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>{assinatura.ativo ? '✅' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 14 }}>
              Plano atual: {assinatura.plano?.charAt(0).toUpperCase() + assinatura.plano?.slice(1)} — {fmtR(assinatura.valor)}/mês
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Status: {assinatura.ativo ? 'Ativo ✅' : 'Pagamento pendente ⚠️'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {PLANOS.map(plano => (
          <div key={plano.id} style={{
            background: '#fff',
            border: plano.destaque ? `2px solid ${plano.cor}` : '1px solid #e2e8f0',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: plano.destaque ? '0 4px 20px rgba(180,140,60,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
            position: 'relative',
          }}>
            {plano.destaque && (
              <div style={{ background: plano.cor, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0', letterSpacing: 1 }}>
                MAIS POPULAR
              </div>
            )}
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: plano.cor, marginBottom: 4 }}>{plano.nome}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
                {fmtR(plano.valor)}<span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>/mês</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>{plano.descricao}</div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginBottom: 20 }}>
                {plano.recursos.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {r}
                  </div>
                ))}
              </div>

              <button
                onClick={() => assinar(plano)}
                disabled={loading === plano.id}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  background: plano.destaque ? plano.cor : '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading === plano.id ? 'wait' : 'pointer',
                  opacity: loading === plano.id ? 0.7 : 1,
                }}
              >
                {loading === plano.id ? 'Aguarde...' : `Assinar ${plano.nome}`}
              </button>
            </div>
          </div>
        ))}
      </div>

      {erro && (
        <div style={{ marginTop: 16, padding: 12, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
          {erro}
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
        Pagamento processado com segurança pelo PagBank • Cancele quando quiser
      </div>

      {onSair && (
        <button onClick={onSair} style={{ marginTop: 12, display: 'block', margin: '12px auto 0', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
          Sair da conta
        </button>
      )}

      {onVoltar && (
        <button onClick={onVoltar} style={{ marginTop: 8, display: 'block', margin: '8px auto 0', background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          ← Voltar ao sistema
        </button>
      )}
    </div>
  )
}