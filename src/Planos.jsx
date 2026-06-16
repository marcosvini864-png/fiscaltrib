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
    link: 'https://pag.ae/81U7vb14m',
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
    link: 'https://pag.ae/81U7xKDCG',
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
    link: 'https://pag.ae/81U7yz3Km',
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

      window.open(plano.link, '_blank')
      if (onPagamentoIniciado) onPagamentoIniciado()

    } catch (err) {
      setErro(err.message || 'Erro ao processar. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 16px' }}>

      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginBottom: 6 }}>
          Escolha seu plano
        </h2>
        <p style={{ fontSize: 13, color: '#64748b' }}>
          Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
        </p>
      </div>

      {/* Assinatura atual */}
      {assinatura && (
        <div style={{ background: assinatura.ativo ? '#f0fdf4' : '#fef9c3', border: `1px solid ${assinatura.ativo ? '#86efac' : '#fde047'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{assinatura.ativo ? '✅' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>
              Plano atual: {assinatura.plano?.charAt(0).toUpperCase() + assinatura.plano?.slice(1)} — {fmtR(assinatura.valor)}/mês
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Status: {assinatura.ativo ? 'Ativo ✅' : 'Pagamento pendente ⚠️'}
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {PLANOS.map(plano => (
          <div key={plano.id} style={{
            background: '#fff',
            border: plano.destaque ? `2px solid ${plano.cor}` : '1px solid #e2e8f0',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: plano.destaque ? '0 4px 16px rgba(180,140,60,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative',
          }}>
            {plano.destaque && (
              <div style={{ background: plano.cor, color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '3px 0', letterSpacing: 1 }}>
                MAIS POPULAR
              </div>
            )}
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: plano.cor, marginBottom: 3 }}>{plano.nome}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f', marginBottom: 3 }}>
                {fmtR(plano.valor)}<span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>/mês</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 1.5 }}>{plano.descricao}</div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginBottom: 16 }}>
                {plano.recursos.map((r, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#374151', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
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
                  padding: '10px 0',
                  background: plano.destaque ? plano.cor : '#1e3a5f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
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
        <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 7, color: '#dc2626', fontSize: 12, textAlign: 'center' }}>
          {erro}
        </div>
      )}

      {/* Rodapé informativo */}
      <div style={{ marginTop: 20, padding: '14px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8, textAlign: 'center' }}>
          🔒 <strong>Pagamento seguro</strong> processado pelo PagBank &nbsp;•&nbsp;
          📅 Cobrança <strong>mensal automática</strong> no cartão de crédito &nbsp;•&nbsp;
          ❌ <strong>Cancelamento a qualquer momento</strong> com 30 dias de antecedência &nbsp;•&nbsp;
          ✅ Sem multas ou taxas adicionais
        </div>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        {onSair && (
          <button onClick={onSair} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', marginRight: 16 }}>
            Sair da conta
          </button>
        )}
        {onVoltar && (
          <button onClick={onVoltar} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
            ← Voltar ao sistema
          </button>
        )}
      </div>

    </div>
  )
}