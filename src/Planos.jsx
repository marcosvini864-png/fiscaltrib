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
    destaqueTopo: true,
    corTopo: '#1e3a5f',
    labelTopo: 'PLANO INICIAL',
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
    destaqueTopo: true,
    corTopo: '#b48c3c',
    labelTopo: 'MAIS POPULAR',
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
    cor: '#16a34a',
    destaque: false,
    destaqueTopo: true,
    corTopo: '#16a34a',
    labelTopo: 'PLANO COMPLETO',
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
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '16px 12px' }}>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>
          Escolha seu plano
        </h2>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
        </p>
      </div>

      {assinatura && (
        <div style={{ background: assinatura.ativo ? '#f0fdf4' : '#fef9c3', border: `1px solid ${assinatura.ativo ? '#86efac' : '#fde047'}`, borderRadius: 7, padding: '8px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{assinatura.ativo ? '✅' : '⚠️'}</span>
          <div>
            <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 12 }}>
              Plano atual: {assinatura.plano?.charAt(0).toUpperCase() + assinatura.plano?.slice(1)} — {fmtR(assinatura.valor)}/mês
            </div>
            <div style={{ fontSize: 10, color: '#64748b' }}>
              Status: {assinatura.ativo ? 'Ativo ✅' : 'Pagamento pendente ⚠️'}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {PLANOS.map(plano => (
          <div key={plano.id} style={{
            background: '#fff',
            border: `2px solid ${plano.corTopo}`,
            borderRadius: 9,
            overflow: 'hidden',
            boxShadow: `0 2px 12px ${plano.corTopo}22`,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Topo colorido */}
            <div style={{ background: plano.corTopo, color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '4px 0', letterSpacing: 1 }}>
              {plano.labelTopo}
            </div>

            {/* Conteúdo */}
            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: plano.corTopo, marginBottom: 2 }}>{plano.nome}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1e3a5f', marginBottom: 2 }}>
                {fmtR(plano.valor)}<span style={{ fontSize: 10, fontWeight: 400, color: '#64748b' }}>/mês</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>{plano.descricao}</div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginBottom: 14, flex: 1 }}>
                {plano.recursos.map((r, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#374151', marginBottom: 5, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                    <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    {r}
                  </div>
                ))}
              </div>

              {/* Botão sempre no rodapé */}
              <button
                onClick={() => assinar(plano)}
                disabled={loading === plano.id}
                style={{
                  width: '100%',
                  padding: '9px 0',
                  background: plano.corTopo,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: loading === plano.id ? 'wait' : 'pointer',
                  opacity: loading === plano.id ? 0.7 : 1,
                  marginTop: 'auto',
                }}
              >
                {loading === plano.id ? 'Aguarde...' : `Assinar ${plano.nome}`}
              </button>
            </div>

            {/* Rodapé colorido */}
            <div style={{ background: plano.corTopo, height: 4 }} />
          </div>
        ))}
      </div>

      {erro && (
        <div style={{ marginTop: 10, padding: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontSize: 11, textAlign: 'center' }}>
          {erro}
        </div>
      )}

      <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7 }}>
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.9, textAlign: 'center' }}>
          🔒 <strong>Pagamento seguro</strong> via PagBank &nbsp;•&nbsp;
          📅 Cobrança <strong>mensal automática</strong> no cartão de crédito &nbsp;•&nbsp;
          ❌ <strong>Cancelamento a qualquer momento</strong> com 30 dias de antecedência &nbsp;•&nbsp;
          ✅ Sem multas ou taxas adicionais
        </div>
      </div>

      <div style={{ marginTop: 10, textAlign: 'center' }}>
        {onSair && (
          <button onClick={onSair} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 10, cursor: 'pointer', textDecoration: 'underline', marginRight: 14 }}>
            Sair da conta
          </button>
        )}
        {onVoltar && (
          <button onClick={onVoltar} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}>
            ← Voltar ao sistema
          </button>
        )}
      </div>
    </div>
  )
}