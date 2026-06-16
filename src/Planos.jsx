import { useState } from 'react'
import { supabase } from './supabase'

const PIX_CHAVE = 'd268e002-3ac0-4055-836c-616fb624141b'
const ADESAO_LABEL = 'Taxa de Adesão FiscalTrib'

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
    corTopo: '#16a34a',
    labelTopo: 'PLANO COMPLETO',
    link: 'https://pag.ae/81U7yz3Km',
  },
]

const fmtR = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

export default function Planos({ user, assinatura, onVoltar, onPagamentoIniciado, onSair }) {
  const [loading, setLoading] = useState(null)
  const [erro, setErro] = useState('')
  const [planoSelecionado, setPlanoSelecionado] = useState(null)
  const [etapa, setEtapa] = useState('planos')
  const [copiado, setCopiado] = useState(false)

  function copiarPix() {
    navigator.clipboard.writeText(PIX_CHAVE)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function selecionarPlano(plano) {
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
      setPlanoSelecionado(plano)
      setEtapa('pix')
    } catch (err) {
      setErro(err.message || 'Erro ao processar. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  function irParaCartao() {
    window.open(planoSelecionado.link, '_blank')
    setEtapa('cartao')
    if (onPagamentoIniciado) onPagamentoIniciado()
  }

  // ETAPA PIX
  if (etapa === 'pix' && planoSelecionado) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #16a34a', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

          {/* Topo */}
          <div style={{ background: '#16a34a', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PASSO 1 DE 2</div>
            <div style={{ fontSize: 22, color: '#fff', fontWeight: 800 }}>Taxa de Adesão via PIX</div>
            <div style={{ fontSize: 36, color: '#fff', fontWeight: 900, marginTop: 4 }}>R$ 300,00</div>
            <div style={{ fontSize: 13, color: '#dcfce7', marginTop: 4 }}>Pagamento único — não recorrente</div>
          </div>

          <div style={{ padding: '24px 28px' }}>

            {/* Instrução */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#166534', lineHeight: 1.9 }}>
              <strong>Como pagar:</strong><br />
              1. Abra o app do seu banco<br />
              2. Acesse a opção <strong>PIX → Pagar</strong><br />
              3. Cole a chave abaixo ou escaneie o QR Code<br />
              4. Confirme o valor de <strong>R$ 300,00</strong><br />
              5. Após o pagamento, clique em <strong>"Já paguei o PIX"</strong>
            </div>

            {/* Chave PIX */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>CHAVE PIX (chave aleatória):</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '12px 14px', fontSize: 13, color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {PIX_CHAVE}
                </div>
                <button
                  onClick={copiarPix}
                  style={{ padding: '12px 16px', background: copiado ? '#16a34a' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {copiado ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Beneficiário */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
              <strong style={{ color: '#374151' }}>Beneficiário:</strong> Marcos Vinicius Alexandre de Souza<br />
              <strong style={{ color: '#374151' }}>Valor:</strong> R$ 300,00<br />
              <strong style={{ color: '#374151' }}>Descrição:</strong> {ADESAO_LABEL} — Plano {planoSelecionado.nome}
            </div>

            {/* Aviso */}
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 7, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#854d0e', textAlign: 'center', lineHeight: 1.6 }}>
              ⏱️ Após o pagamento, seu acesso será liberado em até <strong>2 horas</strong> pelo WhatsApp ou e-mail cadastrado.
            </div>

            {/* Botão principal */}
            <button
              onClick={irParaCartao}
              style={{ width: '100%', padding: '14px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
            >
              ✅ Já paguei o PIX → Cadastrar mensalidade no cartão
            </button>

            <button
              onClick={() => setEtapa('planos')}
              style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Voltar e escolher outro plano
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ETAPA CARTÃO
  if (etapa === 'cartao') {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #1e3a5f', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ background: '#1e3a5f', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PASSO 2 DE 2</div>
            <div style={{ fontSize: 22, color: '#fff', fontWeight: 800 }}>Cadastrar Cartão de Crédito</div>
            <div style={{ fontSize: 14, color: '#bfdbfe', marginTop: 6 }}>Mensalidade recorrente — {fmtR(planoSelecionado?.valor)}/mês</div>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '14px 18px', marginBottom: 18, fontSize: 14, color: '#1e40af', lineHeight: 1.8 }}>
              Uma nova aba foi aberta com o formulário do PagBank.<br />
              Cadastre seu cartão de crédito para as mensalidades automáticas de <strong>{fmtR(planoSelecionado?.valor)}/mês</strong>.
            </div>
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 7, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#854d0e', textAlign: 'center' }}>
              ✅ PIX de adesão pago + cartão cadastrado = acesso liberado em até 2 horas!
            </div>
            <button
              onClick={() => window.open(planoSelecionado?.link, '_blank')}
              style={{ width: '100%', padding: '14px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}
            >
              Abrir formulário do cartão novamente
            </button>
            <button
              onClick={() => setEtapa('pix')}
              style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Voltar para o PIX
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA DE PLANOS
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '16px 12px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 }}>
          Escolha seu plano
        </h2>
        <p style={{ fontSize: 12, color: '#64748b' }}>
          Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
        </p>
        <div style={{ display: 'inline-block', background: '#fefce8', border: '1px solid #fde047', borderRadius: 6, padding: '6px 14px', marginTop: 8, fontSize: 11, color: '#854d0e' }}>
          💳 Taxa de adesão única: <strong>R$ 300,00 via PIX</strong> + mensalidade recorrente no cartão
        </div>
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
            <div style={{ background: plano.corTopo, color: '#fff', textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '4px 0', letterSpacing: 1 }}>
              {plano.labelTopo}
            </div>
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
              <button
                onClick={() => selecionarPlano(plano)}
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
                }}
              >
                {loading === plano.id ? 'Aguarde...' : `Assinar ${plano.nome}`}
              </button>
            </div>
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
          📅 Mensalidade <strong>automática</strong> no cartão &nbsp;•&nbsp;
          ❌ <strong>Cancele quando quiser</strong> com 30 dias de antecedência &nbsp;•&nbsp;
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