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
      '✓ FiscalRecovery — Diagnóstico tributário',
      '✓ FiscalScan — Importação XML / PDF',
      '✓ FiscalDebt — Dívida Ativa básico',
      '✓ Relatórios PDF exportáveis',
      '✓ Suporte por e-mail',
      '✗ FiscalAI — IA Tributária',
      '✗ FiscalSim — Simuladores',
      '✗ CRM Tributário Inteligente',
    ],
    corTopo: '#1e3a5f',
    labelTopo: 'PLANO INICIAL',
    link: 'https://pag.ae/81U7vb14m',
  },
  {
    id: 'avancado',
    nome: 'Avançado',
    valor: 197.00,
    descricao: 'Para escritórios em crescimento com recursos de IA',
    recursos: [
      '✓ FiscalRecovery — Diagnóstico tributário',
      '✓ FiscalScan — Importação XML / PDF',
      '✓ FiscalDebt — Dívida Ativa completo',
      '✓ FiscalAI — IA Tributária',
      '✓ FiscalSim — Simuladores tributários',
      '✓ Relatórios PDF exportáveis',
      '✓ Suporte prioritário',
      '✗ CRM Tributário Inteligente',
    ],
    corTopo: '#b48c3c',
    labelTopo: 'MAIS POPULAR',
    link: 'https://pag.ae/81U7xKDCG',
  },
  {
    id: 'premium',
    nome: 'Premium',
    valor: 297.00,
    descricao: 'Para grandes escritórios com acesso total à plataforma',
    recursos: [
      '✓ FiscalRecovery — Diagnóstico tributário',
      '✓ FiscalScan — Importação XML / PDF',
      '✓ FiscalDebt — Dívida Ativa completo',
      '✓ FiscalAI — IA Tributária avançada',
      '✓ FiscalSim — Simuladores tributários',
      '✓ FiscalReports — Relatórios executivos',
      '✓ CRM Tributário Inteligente',
      '✓ Suporte VIP via WhatsApp',
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
      <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
        <div style={{ width:'100%', maxWidth:480 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #16a34a', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ background:'#16a34a', padding:'12px 20px', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#fff', fontWeight:700, letterSpacing:1, marginBottom:4 }}>PASSO 1 DE 2</div>
              <div style={{ fontSize:20, color:'#fff', fontWeight:800 }}>Taxa de Adesão via PIX</div>
              <div style={{ fontSize:32, color:'#fff', fontWeight:900, marginTop:2 }}>R$ 300,00</div>
              <div style={{ fontSize:12, color:'#dcfce7', marginTop:2 }}>Pagamento único — não recorrente</div>
            </div>
            <div style={{ padding:'16px 24px' }}>
              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#166534', lineHeight:1.8 }}>
                <strong>Como pagar:</strong><br />
                1. Abra o app do seu banco → <strong>PIX → Pagar</strong><br />
                2. Cole a chave abaixo e confirme <strong>R$ 300,00</strong><br />
                3. Clique em <strong>"Já paguei o PIX"</strong>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:6, fontWeight:700, letterSpacing:0.5 }}>CHAVE PIX:</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'10px 12px', fontSize:12, color:'#374151', fontFamily:'monospace', wordBreak:'break-all' }}>
                    {PIX_CHAVE}
                  </div>
                  <button onClick={copiarPix} style={{ padding:'10px 14px', background:copiado?'#16a34a':'#1e3a5f', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                    {copiado ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#64748b', lineHeight:1.8 }}>
                <strong style={{ color:'#374151' }}>Beneficiário:</strong> Marcos Vinicius Alexandre de Souza<br />
                <strong style={{ color:'#374151' }}>Valor:</strong> R$ 300,00<br />
                <strong style={{ color:'#374151' }}>Descrição:</strong> {ADESAO_LABEL} — Plano {planoSelecionado.nome}
              </div>
              <div style={{ background:'#fefce8', border:'1px solid #fde047', borderRadius:7, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#854d0e', textAlign:'center' }}>
                ⏱️ Após o pagamento, seu acesso será liberado em até <strong>2 horas</strong>
              </div>
              <button onClick={irParaCartao} style={{ width:'100%', padding:'12px 0', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
                ✅ Já paguei o PIX → Cadastrar mensalidade no cartão
              </button>
              <button onClick={() => setEtapa('planos')} style={{ width:'100%', padding:'8px 0', background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline', marginBottom:6 }}>
                ← Voltar e escolher outro plano
              </button>
              <button onClick={onSair} style={{ width:'100%', padding:'8px 0', background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ETAPA CARTÃO
  if (etapa === 'cartao') {
    return (
      <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
        <div style={{ width:'100%', maxWidth:480 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #1e3a5f', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ background:'#1e3a5f', padding:'12px 20px', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'#fff', fontWeight:700, letterSpacing:1, marginBottom:4 }}>PASSO 2 DE 2</div>
              <div style={{ fontSize:20, color:'#fff', fontWeight:800 }}>Cadastrar Cartão de Crédito</div>
              <div style={{ fontSize:13, color:'#bfdbfe', marginTop:4 }}>Mensalidade recorrente — {fmtR(planoSelecionado?.valor)}/mês</div>
            </div>
            <div style={{ padding:'16px 24px' }}>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#1e40af', lineHeight:1.8 }}>
                Uma nova aba foi aberta com o formulário do PagBank.<br />
                Cadastre seu cartão para as mensalidades de <strong>{fmtR(planoSelecionado?.valor)}/mês</strong>.
              </div>
              <div style={{ background:'#fefce8', border:'1px solid #fde047', borderRadius:7, padding:'10px 14px', marginBottom:20, fontSize:12, color:'#854d0e', textAlign:'center' }}>
                ✅ PIX pago + cartão cadastrado = acesso liberado em até 2 horas!
              </div>
              <button onClick={() => window.open(planoSelecionado?.link, '_blank')} style={{ width:'100%', padding:'12px 0', background:'#1e3a5f', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:10 }}>
                Abrir formulário do cartão novamente
              </button>
              <button onClick={() => setEtapa('pix')} style={{ width:'100%', padding:'8px 0', background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline', marginBottom:6 }}>
                ← Voltar para o PIX
              </button>
              <button onClick={onSair} style={{ width:'100%', padding:'8px 0', background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // TELA DE PLANOS
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 16px' }}>
      <div style={{ width:'100%', maxWidth:900 }}>

        <div style={{ textAlign:'center', marginBottom:8 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e3a5f', marginBottom:4 }}>Escolha seu Plano</h1>
          <p style={{ fontSize:13, color:'#64748b', marginBottom:6 }}>
            Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
          </p>
        </div>

        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:10, flexWrap:'wrap' }}>
          <div style={{ border:'1px solid #cbd5e1', borderRadius:6, padding:'6px 14px', fontSize:12, color:'#1e3a5f', fontWeight:600 }}>
            💰 Ativação: R$ 300,00 à vista via PIX
          </div>
          <div style={{ border:'1px solid #cbd5e1', borderRadius:6, padding:'6px 14px', fontSize:12, color:'#64748b' }}>
            📅 1ª mensalidade em 30 dias — cobrança automática no cartão
          </div>
        </div>

        <div style={{ textAlign:'center', marginBottom:14 }}>
          <span style={{ fontSize:12, color:'#dc2626', fontWeight:700 }}>
            ⚠️ LIBERAÇÃO DO SISTEMA APÓS CONFIRMAÇÃO DO PAGAMENTO DA IMPLANTAÇÃO
          </span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, marginBottom:14 }}>
          {PLANOS.map(plano => (
            <div key={plano.id} style={{ background:'#fff', border:`2px solid ${plano.corTopo}`, borderRadius:10, overflow:'hidden', boxShadow:`0 2px 14px ${plano.corTopo}22`, display:'flex', flexDirection:'column' }}>
              <div style={{ background:plano.corTopo, color:'#fff', textAlign:'center', fontSize:10, fontWeight:700, padding:'4px 0', letterSpacing:1.2 }}>
                {plano.labelTopo}
              </div>
              <div style={{ padding:'8px 12px', flex:1, display:'flex', flexDirection:'column' }}>
                <div style={{ fontSize:15, fontWeight:700, color:plano.corTopo, marginBottom:2 }}>{plano.nome}</div>
                <div style={{ fontSize:22, fontWeight:800, color:'#1e3a5f', marginBottom:2 }}>
                  {fmtR(plano.valor)}<span style={{ fontSize:11, fontWeight:400, color:'#64748b' }}>/mês</span>
                </div>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:8, lineHeight:1.4 }}>{plano.descricao}</div>
                <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:6, marginBottom:10, flex:1 }}>
                  {plano.recursos.map((r, i) => {
                    const incluso = r.startsWith('✓')
                    return (
                      <div key={i} style={{ fontSize:10, color: incluso ? '#374151' : '#94a3b8', marginBottom:3, display:'flex', gap:6, alignItems:'flex-start' }}>
                        <span style={{ color: incluso ? '#16a34a' : '#cbd5e1', fontWeight:700, flexShrink:0 }}>{incluso ? '✓' : '✗'}</span>
                        <span>{r.replace(/^[✓✗]\s/, '')}</span>
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => selecionarPlano(plano)} disabled={loading === plano.id}
                  style={{ width:'100%', padding:'8px 0', background:plano.corTopo, color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:700, cursor:loading===plano.id?'wait':'pointer', opacity:loading===plano.id?0.7:1 }}>
                  {loading === plano.id ? 'Aguarde...' : `Assinar ${plano.nome}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {erro && (
          <div style={{ marginBottom:10, padding:10, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#dc2626', fontSize:13, textAlign:'center' }}>
            {erro}
          </div>
        )}

        <div style={{ textAlign:'center', marginBottom:6 }}>
          <p style={{ fontSize:13, color:'#1e3a5f', fontWeight:600 }}>
            📞 Departamento comercial: (11) 99957-9822
          </p>
        </div>

        <div style={{ textAlign:'center', marginBottom:8 }}>
          <a href="https://wa.me/5511999579822" target="_blank" rel="noreferrer"
            style={{ fontSize:12, color:'#16a34a', textDecoration:'underline' }}>
            Cancele quando quiser com 30 dias de antecedência — Sem multas ou taxas adicionais
          </a>
        </div>

        <div style={{ textAlign:'center' }}>
          {onSair && (
            <button onClick={onSair} style={{ background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
              Sair da conta
            </button>
          )}
        </div>

      </div>
    </div>
  )
}