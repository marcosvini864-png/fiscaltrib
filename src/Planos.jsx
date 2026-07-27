import { useState } from 'react'
import { supabase } from './supabase'

const PIX_CHAVE = 'd268e002-3ac0-4055-836c-616fb624141b'
const ADESAO_LABEL = 'Taxa de Adesão FiscalTrib'

const PLANOS = [
  {
    id: 'essencial',
    nome: 'Essencial',
    valor: 197.00,
    descricao: 'Ideal para pequenos escritórios e empresas',
    labelTopo: '🚀 IDEAL PARA COMEÇAR',
    corTopo: '#1e3a5f',
    link: 'https://pag.ae/81U7vb14m',
    recursos: [
      '✓ CRM Tributário Inteligente',
      '✓ FiscalRecovery',
      '✓ FiscalDebt — Dívida Ativa básica',
      '✓ FiscalAI — IA Básica',
      '✓ FiscalScan — XML e CSV',
      '✓ Simuladores básicos',
      '✓ Relatórios básicos',
      '✓ Diagnóstico tributário básico',
      '✓ Suporte por e-mail',
      '✗ PDF e todos os formatos',
      '✗ IA Avançada',
      '✗ Consultorias e lives',
    ],
  },
  {
    id: 'avancado',
    nome: 'Avançado',
    valor: 347.00,
    descricao: 'Maior custo-benefício — o mais contratado',
    labelTopo: '🏆 MAIS CONTRATADO',
    corTopo: '#b48c3c',
    link: 'https://pag.ae/81U7xKDCG',
    recursos: [
      '✓ CRM Tributário Inteligente',
      '✓ FiscalRecovery',
      '✓ FiscalDebt — Dívida Ativa completa',
      '✓ FiscalAI — IA Avançada',
      '✓ FiscalScan — XML, CSV e PDF',
      '✓ Todos os simuladores',
      '✓ Relatórios avançados',
      '✓ Diagnóstico tributário completo',
      '✓ Suporte via WhatsApp',
      '✓ Vídeos + Lives',
      '✓ Teses tributárias completas',
      '✗ IA Premium e consultorias',
    ],
  },
  {
    id: 'premium',
    nome: 'Premium',
    valor: 597.00,
    descricao: 'Para especialistas, advogados e consultorias tributárias',
    labelTopo: '👑 PARA ESPECIALISTAS',
    corTopo: '#16a34a',
    link: 'https://pag.ae/81U7yz3Km',
    recursos: [
      '✓ CRM Tributário Inteligente',
      '✓ FiscalRecovery',
      '✓ FiscalDebt — Completa + Estratégias',
      '✓ FiscalAI — IA Premium',
      '✓ FiscalScan — Todos os formatos + IA',
      '✓ Simuladores exclusivos',
      '✓ Relatórios personalizados',
      '✓ Diagnóstico completo + IA Especialista',
      '✓ Suporte prioritário',
      '✓ Vídeos + Lives + Consultorias',
      '✓ Teses + atualizações prioritárias',
      '✓ Prioridade máxima em novidades',
    ],
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

  // ── ETAPA PIX ────────────────────────────────────────────────────────────
  if (etapa === 'pix' && planoSelecionado) {
    return (
      <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
        <div style={{ width:'100%', maxWidth:460 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #16a34a', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>

            {/* Header */}
            <div style={{ background:'#16a34a', padding:'10px 20px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#fff', fontWeight:700, letterSpacing:1, marginBottom:2 }}>PASSO 1 DE 2</div>
              <div style={{ fontSize:18, color:'#fff', fontWeight:800 }}>Taxa de Adesão via PIX</div>
              <div style={{ fontSize:28, color:'#fff', fontWeight:900, lineHeight:1.1 }}>R$ 300,00</div>
              <div style={{ fontSize:11, color:'#dcfce7' }}>Pagamento único — não recorrente</div>
            </div>

            <div style={{ padding:'14px 20px' }}>

              {/* Instruções */}
              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#166534', lineHeight:1.7 }}>
                <strong>Como pagar:</strong><br />
                1. Abra o aplicativo do seu banco.<br />
                2. Escolha a opção <strong>PIX</strong>.<br />
                3. Copie a chave PIX abaixo.<br />
                4. Efetue o pagamento de <strong>R$ 300,00</strong>.<br />
                5. Clique em <strong>"Já paguei o PIX"</strong> para prosseguir.
              </div>

              {/* Chave PIX */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, color:'#64748b', marginBottom:4, fontWeight:700, letterSpacing:0.5 }}>CHAVE PIX:</div>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'8px 10px', fontSize:11, color:'#374151', fontFamily:'monospace', wordBreak:'break-all' }}>
                    {PIX_CHAVE}
                  </div>
                  <button onClick={copiarPix} style={{ padding:'8px 12px', background:copiado?'#16a34a':'#1e3a5f', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                    {copiado ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              {/* Beneficiário */}
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#64748b', lineHeight:1.7 }}>
                <strong style={{ color:'#374151' }}>Beneficiário:</strong> Marcos Vinicius Alexandre de Souza<br />
                <strong style={{ color:'#374151' }}>Valor:</strong> R$ 300,00 &nbsp;|&nbsp;
                <strong style={{ color:'#374151' }}>Plano:</strong> {planoSelecionado.nome}
              </div>

              {/* Aviso */}
              <div style={{ background:'#fefce8', border:'1px solid #fde047', borderRadius:7, padding:'8px 12px', marginBottom:14, fontSize:11, color:'#854d0e', textAlign:'center', lineHeight:1.5 }}>
                Seu acesso será liberado automaticamente após a confirmação do pagamento da taxa de adesão. Em seguida, você será direcionado para o cadastro da mensalidade.
              </div>

              {/* Botão principal — destaque */}
              <button onClick={irParaCartao} style={{ width:'100%', padding:'14px 0', background:'#16a34a', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer', marginBottom:8, boxShadow:'0 4px 12px rgba(22,163,74,0.4)' }}>
                ✅ Já paguei o PIX → Cadastrar mensalidade no cartão
              </button>

              <button onClick={() => setEtapa('planos')} style={{ width:'100%', padding:'7px 0', background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline', marginBottom:4 }}>
                ← Voltar e escolher outro plano
              </button>
              <button onClick={onSair} style={{ width:'100%', padding:'7px 0', background:'transparent', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── ETAPA CARTÃO ─────────────────────────────────────────────────────────
  if (etapa === 'cartao') {
    return (
      <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
        <div style={{ width:'100%', maxWidth:460 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #1e3a5f', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ background:'#1e3a5f', padding:'10px 20px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#fff', fontWeight:700, letterSpacing:1, marginBottom:2 }}>PASSO 2 DE 2</div>
              <div style={{ fontSize:18, color:'#fff', fontWeight:800 }}>Cadastrar Cartão de Crédito</div>
              <div style={{ fontSize:12, color:'#bfdbfe', marginTop:2 }}>Mensalidade recorrente — {fmtR(planoSelecionado?.valor)}/mês</div>
            </div>
            <div style={{ padding:'14px 20px' }}>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'12px 16px', marginBottom:12, fontSize:13, color:'#1e40af', lineHeight:1.8 }}>
                Uma nova aba foi aberta com o formulário do PagBank.<br />
                Cadastre seu cartão para as mensalidades de <strong>{fmtR(planoSelecionado?.valor)}/mês</strong>.
              </div>
              <div style={{ background:'#fefce8', border:'1px solid #fde047', borderRadius:7, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#854d0e', textAlign:'center' }}>
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

  // ── TELA DE PLANOS ───────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'8px 16px' }}>
      <div style={{ width:'100%', maxWidth:940 }}>

        {/* Título */}
        <div style={{ textAlign:'center', marginBottom:4 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#1e3a5f', marginBottom:3 }}>Escolha seu Plano</h1>
          <p style={{ fontSize:12, color:'#64748b', marginBottom:0 }}>
            Acesso completo ao FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária
          </p>
        </div>

        {/* Badges info */}
        <div style={{ display:'flex', gap:8, justifyContent:'center', marginBottom:4, flexWrap:'wrap' }}>
          <div style={{ border:'1px solid #cbd5e1', borderRadius:6, padding:'5px 12px', fontSize:12, color:'#1e3a5f', fontWeight:600 }}>
            💰 Ativação: R$ 300,00 à vista via PIX
          </div>
          <div style={{ border:'1px solid #cbd5e1', borderRadius:6, padding:'5px 12px', fontSize:12, color:'#64748b' }}>
            📅 1ª mensalidade em 30 dias — cobrança automática no cartão
          </div>
        </div>

        {/* Aviso */}
        <div style={{ textAlign:'center', marginBottom:6 }}>
          <span style={{ fontSize:11, color:'#dc2626', fontWeight:700 }}>
            ⚠️ LIBERAÇÃO DO SISTEMA APÓS CONFIRMAÇÃO DO PAGAMENTO DA IMPLANTAÇÃO
          </span>
        </div>

        {/* Cards dos planos */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:6 }}>
          {PLANOS.map(plano => (
            <div key={plano.id} style={{ background:'#fff', border:`2px solid ${plano.corTopo}`, borderRadius:10, overflow:'hidden', boxShadow:`0 2px 14px ${plano.corTopo}22`, display:'flex', flexDirection:'column' }}>
              <div style={{ background:plano.corTopo, color:'#fff', textAlign:'center', fontSize:10, fontWeight:700, padding:'4px 0', letterSpacing:1 }}>
                {plano.labelTopo}
              </div>
              <div style={{ padding:'5px 10px', flex:1, display:'flex', flexDirection:'column' }}>
                <div style={{ fontSize:14, fontWeight:700, color:plano.corTopo, marginBottom:1 }}>{plano.nome}</div>
                <div style={{ fontSize:20, fontWeight:800, color:'#1e3a5f', marginBottom:1 }}>
                  {fmtR(plano.valor)}<span style={{ fontSize:10, fontWeight:400, color:'#64748b' }}>/mês</span>
                </div>
                <div style={{ fontSize:10, color:'#64748b', marginBottom:6, lineHeight:1.3 }}>{plano.descricao}</div>
                <div style={{ borderTop:'1px solid #f1f5f9', paddingTop:3, marginBottom:5, flex:1 }}>
                  {plano.recursos.map((r, i) => {
                    const incluso = r.startsWith('✓')
                    return (
                      <div key={i} style={{ fontSize:10, color:incluso?'#374151':'#94a3b8', marginBottom:1, display:'flex', gap:5, alignItems:'flex-start' }}>
                        <span style={{ color:incluso?'#16a34a':'#cbd5e1', fontWeight:700, flexShrink:0 }}>{incluso?'✓':'✗'}</span>
                        <span>{r.replace(/^[✓✗]\s/, '')}</span>
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => selecionarPlano(plano)} disabled={loading === plano.id}
                  style={{ width:'100%', padding:'7px 0', background:plano.corTopo, color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:loading===plano.id?'wait':'pointer', opacity:loading===plano.id?0.7:1 }}>
                  {loading === plano.id ? 'Aguarde...' : `Assinar ${plano.nome}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Observação */}
        <div style={{ textAlign:'center', marginBottom:8, padding:'8px 16px', background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, fontSize:11, color:'#0369a1' }}>
          Todos os planos recebem atualizações automáticas do sistema. Os diferenciais estão na profundidade das análises, nos recursos disponíveis e no nível de inteligência tributária oferecido.
        </div>

        {erro && (
          <div style={{ marginBottom:8, padding:8, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:6, color:'#dc2626', fontSize:12, textAlign:'center' }}>
            {erro}
          </div>
        )}

        {/* Rodapé */}
        <div style={{ textAlign:'center', marginBottom:4 }}>
          <p style={{ fontSize:12, color:'#1e3a5f', fontWeight:600, margin:0 }}>
            📞 Departamento comercial: (11) 99957-9822
          </p>
        </div>
        <div style={{ textAlign:'center', marginBottom:6 }}>
          <a href="https://wa.me/5511999579822" target="_blank" rel="noreferrer"
            style={{ fontSize:11, color:'#16a34a', textDecoration:'underline' }}>
            Cancele quando quiser com 30 dias de antecedência — Sem multas ou taxas adicionais
          </a>
        </div>
        <div style={{ textAlign:'center' }}>
          {onSair && (
            <button onClick={onSair} style={{ background:'transparent', border:'none', color:'#94a3b8', fontSize:11, cursor:'pointer', textDecoration:'underline' }}>
              Sair da conta
            </button>
          )}
        </div>

      </div>
    </div>
  )
}