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
  const [loading,          setLoading]          = useState(null)
  const [erro,             setErro]             = useState('')
  const [planoSelecionado, setPlanoSelecionado] = useState(null)
  const [etapa,            setEtapa]            = useState('planos')
  const [copiado,          setCopiado]          = useState(false)

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
          <div style={{ background: '#16a34a', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PASSO 1 DE 2</div>
            <div style={{ fontSize: 22, color: '#fff', fontWeight: 800 }}>Taxa de Adesão via PIX</div>
            <div style={{ fontSize: 36, color: '#fff', fontWeight: 900, marginTop: 4 }}>R$ 300,00</div>
            <div style={{ fontSize: 13, color: '#dcfce7', marginTop: 4 }}>Pagamento único — não recorrente</div>
          </div>
          <div style={{ padding: '24px 28px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#166534', lineHeight: 1.9 }}>
              <strong>Como pagar:</strong><br />
              1. Abra o app do seu banco<br />
              2. Acesse a opção <strong>PIX → Pagar</strong><br />
              3. Cole a chave abaixo ou escaneie o QR Code<br />
              4. Confirme o valor de <strong>R$ 300,00</strong><br />
              5. Após o pagamento, clique em <strong>"Já paguei o PIX"</strong>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>CHAVE PIX (chave aleatória):</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '12px 14px', fontSize: 13, color: '#374151', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {PIX_CHAVE}
                </div>
                <button onClick={copiarPix} style={{ padding: '12px 16px', background: copiado ? '#16a34a' : '#1e3a5f', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {copiado ? '✓ Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
              <strong style={{ color: '#374151' }}>Beneficiário:</strong> Marcos Vinicius Alexandre de Souza<br />
              <strong style={{ color: '#374151' }}>Valor:</strong> R$ 300,00<br />
              <strong style={{ color: '#374151' }}>Descrição:</strong> {ADESAO_LABEL} — Plano {planoSelecionado.nome}
            </div>
            <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 7, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#854d0e', textAlign: 'center', lineHeight: 1.6 }}>
              ⏱️ Após o pagamento, seu acesso será liberado em até <strong>2 horas</strong> pelo WhatsApp ou e-mail cadastrado.
            </div>
            <button onClick={irParaCartao} style={{ width: '100%', padding: '14px 0', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              ✅ Já paguei o PIX → Cadastrar mensalidade no cartão
            </button>
            <button onClick={() => setEtapa('planos')} style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
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
            <button onClick={() => window.open(planoSelecionado?.link, '_blank')} style={{ width: '100%', padding: '14px 0', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 12 }}>
              Abrir formulário do cartão novamente
            </button>
            <button onClick={() => setEtapa('pix')} style={{ width: '100%', padding: '10px 0', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
              ← Voltar para o PIX
            </button>
          </div>
        </div>
      </div>
    )
  }

  // TELA DE PLANOS
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 860 }}>

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e3a5f', marginBottom: 6 }}>
            Escolha seu Plano
          </h1>
          <p style={{ fontSize: 14, color: '#1e3a5f', marginBottom: 16 }}>
            Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
          </p>
        </div>

        {/* Avisos */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '10px 16px', textAlign: 'center', marginBottom: 6, fontSize: 14, color: '#1e3a5f', fontWeight: 600 }}>
          Ativação e implantação do sistema — R$ 300,00 à vista via PIX
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '10px 16px', textAlign: 'center', marginBottom: 8, fontSize: 14, color: '#1e3a5f' }}>
          Primeira mensalidade em 30 dias. Cobrança automática no cartão.
        </div>
        <div style={{ padding: '10px 16px', textAlign: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700, letterSpacing: 0.3 }}>
            LIBERAÇÃO DO SISTEMA APÓS A CONFIRMAÇÃO DO PAGAMENTO DA IMPLANTAÇÃO
          </span>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 28 }}>
          {PLANOS.map(plano => (
            <div key={plano.id} style={{
              background: '#fff',
              border: `2px solid ${plano.corTopo}`,
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: `0 2px 14px ${plano.corTopo}22`,
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ background: plano.corTopo, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '7px 0', letterSpacing: 1.2 }}>
                {plano.labelTopo}
              </div>
              <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: plano.corTopo, marginBottom: 4 }}>{plano.nome}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1e3a5f', marginBottom: 2 }}>
                  {fmtR(plano.valor)}<span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}>/mês</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14, lineHeight: 1.5 }}>{plano.descricao}</div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginBottom: 18, flex: 1 }}>
                  {plano.recursos.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#374151', marginBottom: 7, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
                      {r}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => selecionarPlano(plano)}
                  disabled={loading === plano.id}
                  style={{
                    width: '100%', padding: '11px 0', background: plano.corTopo, color: '#fff',
                    border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 700,
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
          <div style={{ marginBottom: 16, padding: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>
            {erro}
          </div>
        )}

        {/* Contato comercial */}
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 15, color: '#1e3a5f', fontWeight: 600 }}>
            Departamento comercial Telefone e WhatsApp: (11) 99957-9822
          </p>
        </div>

        {/* Cancelamento */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <a href="https://wa.me/5511999579822" target="_blank" rel="noreferrer"
            style={{ fontSize: 13, color: '#16a34a', textDecoration: 'underline' }}>
            Cancele quando quiser com 30 dias de antecedência — Sem multas ou taxas adicionais
          </a>
        </div>

        <div style={{ textAlign: 'center' }}>
          {onSair && (
            <button onClick={onSair} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              Sair da conta
            </button>
          )}
        </div>

      </div>
    </div>
  )
}