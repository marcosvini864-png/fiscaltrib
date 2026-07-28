import { useState } from 'react'
import { supabase } from './supabase'

const PIX_CHAVE = 'd268e002-3ac0-4055-836c-616fb624141b'

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
      const referencia = `FISCALTRIBE-${user.id.slice(0, 8).toUpperCase()}-${Date.now()}`
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
            <div style={{ background:'#16a34a', padding:'10px 20px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#fff', fontWeight:700, letterSpacing:1, marginBottom:2 }}>PASSO 1 DE 2</div>
              <div style={{ fontSize:18, color:'#fff', fontWeight:800 }}>Taxa de Adesão via PIX</div>
              <div style={{ fontSize:28, color:'#fff', fontWeight:900, lineHeight:1.1 }}>R$ 300,00</div>
              <div style={{ fontSize:11, color:'#dcfce7' }}>Pagamento único — não recorrente</div>
            </div>
            <div style={{ padding:'14px 20px' }}>
              <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#166534', lineHeight:1.7 }}>
                <strong>Como pagar:</strong><br />
                1. Abra o aplicativo do seu banco.<br />
                2. Escolha a opção <strong>PIX</strong>.<br />
                3. Copie a chave PIX abaixo.<br />
                4. Efetue o pagamento de <strong>R$ 300,00</strong>.<br />
                5. Clique em <strong>"Já paguei o PIX"</strong> para prosseguir.
              </div>
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
              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#64748b', lineHeight:1.6 }}>
                <strong style={{ color:'#374151' }}>Beneficiário:</strong> Marcos Vinicius Alexandre de Souza<br />
                <strong style={{ color:'#374151' }}>Valor:</strong> R$ 300,00 &nbsp;|&nbsp;
                <strong style={{ color:'#374151' }}>Plano:</strong> {planoSelecionado.nome}
              </div>
              <div style={{ background:'#fefce8', border:'1px solid #fde047', borderRadius:7, padding:'8px 12px', marginBottom:14, fontSize:11, color:'#854d0e', textAlign:'center', lineHeight:1.5 }}>
                Seu acesso será liberado automaticamente após a confirmação do pagamento da taxa de adesão. Em seguida, você será direcionado para o cadastro da mensalidade.
              </div>
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
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '10px 16px 36px',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: 1080 }}>

        {/* Marca */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h1 style={{
            fontSize: 27,
            fontWeight: 900,
            color: '#1e3a5f',
            margin: '0 0 2px 0',
            lineHeight: 1,
          }}>
            FiscalTribe
          </h1>

          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#475569',
            marginBottom: 3,
            lineHeight: 1.05,
          }}>
            Plataforma de Inteligência Tributária
          </div>

          <p style={{
            fontSize: 9.5,
            color: '#64748b',
            margin: 0,
            lineHeight: 1.05,
          }}>
            Escolha o plano ideal para começar.
          </p>
        </div>

        {/* Informações */}
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 3,
          flexWrap: 'wrap',
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '3px 10px',
            fontSize: 9.5,
            color: '#1e3a5f',
            fontWeight: 700,
          }}>
            💰 Taxa de adesão: R$ 300,00 via PIX
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '3px 10px',
            fontSize: 9.5,
            color: '#64748b',
          }}>
            💳 1ª mensalidade em 30 dias no cartão
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '3px 10px',
            fontSize: 9.5,
            color: '#64748b',
          }}>
            ✓ Sem fidelidade
          </div>
        </div>

        {/* Aviso */}
        <div style={{
          textAlign: 'center',
          marginBottom: 5,
          fontSize: 9.5,
          color: '#166534',
          fontWeight: 700,
          lineHeight: 1.05,
        }}>
          ● Seu acesso será liberado após a confirmação da taxa de adesão.
        </div>

        {/* Tabela comparativa */}
        <div style={{
          background: '#fff',
          border: '1px solid #dbe4ee',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 18px rgba(0,0,0,0.07)',
        }}>

          {/* Cabeçalho das colunas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr repeat(3, 1fr)',
            borderBottom: '1px solid #e2e8f0',
          }}>

            {/* Coluna de comparação */}
            <div style={{
              background: '#f8fafc',
              borderRight: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                height: 30,
                background: '#f2b705',
                color: '#1e3a5f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: 10,
                fontWeight: 800,
                padding: '0 6px',
                letterSpacing: 0.7,
              }}>
                ⚖️ COMPARE OS PLANOS
              </div>

              <div style={{
                height: 94,
                padding: '8px 10px 9px',
                display: 'grid',
                gridTemplateRows: '1fr auto',
                textAlign: 'center',
              }}>
                <strong style={{
                  alignSelf: 'center',
                  display: 'block',
                  color: '#1e3a5f',
                  fontSize: 15,
                  lineHeight: 1.1,
                }}>
                  3 Opções para você
                </strong>

                <div style={{
                  width: '100%',
                  padding: '6px 6px',
                  background: '#f2b705',
                  color: '#1e3a5f',
                  borderRadius: 7,
                  fontSize: 10.5,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}>
                  Veja as diferenças de cada opção
                </div>
              </div>
            </div>

            {/* Planos */}
            {PLANOS.map(plano => (
              <div key={plano.id} style={{
                borderRight: plano.id !== 'premium' ? '1px solid #e2e8f0' : 'none',
                background: plano.id === 'avancado' ? '#fffbeb' : '#fff',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{
                  height: 30,
                  background: plano.corTopo,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '0 6px',
                  letterSpacing: 0.7,
                }}>
                  {plano.labelTopo}
                </div>

                <div style={{
                  height: 94,
                  padding: '6px 10px 9px',
                  textAlign: 'center',
                  display: 'grid',
                  gridTemplateRows: 'auto auto 1fr auto',
                }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: plano.corTopo,
                    lineHeight: 1,
                  }}>
                    {plano.nome}
                  </div>

                  <div style={{
                    fontSize: 23,
                    fontWeight: 900,
                    color: '#1e3a5f',
                    lineHeight: 1,
                    marginTop: 3,
                  }}>
                    {fmtR(plano.valor)}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 400,
                      color: '#64748b',
                    }}>
                      /mês
                    </span>
                  </div>

                  <div style={{
                    fontSize: 9,
                    color: '#64748b',
                    lineHeight: 1.05,
                    padding: '3px 0 4px',
                    alignSelf: 'center',
                  }}>
                    {plano.descricao}
                  </div>

                  <button
                    onClick={() => selecionarPlano(plano)}
                    disabled={loading === plano.id}
                    style={{
                      width: '100%',
                      padding: '6px 0',
                      background: plano.corTopo,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 800,
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

          {/* Linhas comparativas */}
          {[
            ['CRM Tributário Inteligente', 'Incluído', 'Incluído', 'Incluído'],
            ['FiscalRecovery', 'Incluído', 'Incluído', 'Incluído'],
            ['FiscalDebt', 'Básica', 'Completa', 'Completa + estratégias'],
            ['FiscalAI', 'IA Básica', 'IA Avançada', 'IA Premium'],
            ['FiscalScan', 'XML e CSV', 'XML, CSV e PDF', 'Todos os formatos + IA'],
            ['Simuladores', 'Básicos', 'Todos', 'Exclusivos'],
            ['Relatórios', 'Básicos', 'Avançados', 'Personalizados'],
            ['Diagnóstico tributário', 'Básico', 'Completo', 'Completo + IA Especialista'],
            ['Suporte', 'E-mail', 'WhatsApp', 'Prioritário'],
            ['Conteúdo', 'Vídeos', 'Vídeos + Lives', 'Vídeos + Lives + Consultorias'],
            ['Teses tributárias', 'Essenciais', 'Completas', 'Com atualizações prioritárias'],
            ['Novidades', 'Atualizações automáticas', 'Prioridade', 'Prioridade máxima'],
          ].map((linha, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr repeat(3, 1fr)',
              background: i % 2 === 0 ? '#f8fafc' : '#fff',
              borderBottom: '1px solid #edf2f7',
              minHeight: 20,
            }}>
              <div style={{
                padding: '2px 9px',
                fontSize: 10.5,
                color: '#334155',
                fontWeight: 700,
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
              }}>
                {linha[0]}
              </div>

              {linha.slice(1).map((texto, idx) => (
                <div key={idx} style={{
                  padding: '2px 7px',
                  fontSize: 10.5,
                  color: '#475569',
                  textAlign: 'center',
                  borderRight: idx < 2 ? '1px solid #e2e8f0' : 'none',
                  background: idx === 1 ? '#fffbeb' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  lineHeight: 1,
                }}>
                  <span style={{
                    color: texto === 'Incluído' ? '#16a34a' : '#0f766e',
                    fontWeight: 900,
                  }}>
                    {texto === 'Incluído' ? '✓' : '•'}
                  </span>
                  <span>{texto}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {erro && (
          <div style={{
            marginTop: 6,
            padding: 7,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 6,
            color: '#dc2626',
            fontSize: 9.5,
            textAlign: 'center',
          }}>
            {erro}
          </div>
        )}

        {/* Rodapé */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginTop: 9,
          marginBottom: 0,
        }}>
          <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 600 }}>
            🔒 Ambiente seguro
          </span>

          <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 600 }}>
            💳 Pagamento protegido
          </span>

          <a
            href="https://wa.me/5511999579822"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11,
              color: '#16a34a',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            📞 (11) 99957-9822
          </a>

          {onVoltar && (
            <button
              onClick={onVoltar}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              ← Voltar
            </button>
          )}

          {onSair && (
            <button
              onClick={onSair}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: 11,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sair da conta
            </button>
          )}
        </div>

      </div>
    </div>
  )
}