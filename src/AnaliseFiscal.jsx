import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const PERGUNTAS_RAPIDAS = [
  'Quais oportunidades existem para esta empresa?',
  'Quais créditos estão em risco de prescrição?',
  'Qual é o potencial total de recuperação?',
  'Quais teses tributárias se aplicam a este cliente?',
  'Existe alguma divergência fiscal nos dados?',
  'Como está o score fiscal deste cliente?',
]

function montarContexto(cliente, entradas, recuperacoes) {
  if (!cliente) return ''

  const entsCredito = entradas.filter(e => e.credito > 0)
  const totalCredito = entradas.reduce((s, e) => s + (e.credito || 0), 0)
  const totalPotencial = recuperacoes.reduce((s, r) => s + (r.potencial_recuperavel || 0), 0)
  const hoje = new Date()

  // Prazos
  const prazos = entsCredito.map(e => {
    if (!e.competencia) return null
    const [a, m] = e.competencia.split('-')
    const lim  = new Date(parseInt(a) + 5, parseInt(m) - 1, 1)
    const dias = Math.round((lim - hoje) / (1000 * 60 * 60 * 24))
    return { ...e, dias, lim }
  }).filter(Boolean).sort((a, b) => a.dias - b.dias)

  const criticos = prazos.filter(p => p.dias <= 180 && p.dias > 0)
  const prescritos = prazos.filter(p => p.dias <= 0)

  // Tributos
  const tributos = [...new Set(entradas.map(e => e.tributo).filter(Boolean))]
  const competencias = [...new Set(entradas.map(e => e.competencia).filter(Boolean))].sort()

  return `
Você é a IA Tributária do FiscalTrib, especialista em recuperação tributária brasileira.
Responda SEMPRE usando os dados reais do cliente abaixo. Seja direto, profissional e use valores reais.
Nunca invente dados — use apenas o que está no contexto.

=== DADOS DO CLIENTE ===
Razão Social: ${cliente.razao_social}
CNPJ: ${cliente.cnpj}
Regime: ${cliente.regime}
Município: ${cliente.municipio || '—'} / ${cliente.uf || '—'}
CNAE Principal: ${cliente.cnae_principal || '—'}

=== DADOS FISCAIS ===
Total de entradas: ${entradas.length}
Período analisado: ${competencias[0] || '—'} a ${competencias[competencias.length-1] || '—'}
Competências com crédito: ${entsCredito.length}
Total de créditos identificados: ${fmtR(totalCredito)}
Tributos analisados: ${tributos.join(', ') || '—'}

=== CRÉDITOS POR COMPETÊNCIA ===
${entsCredito.slice(0, 20).map(e =>
  `- ${e.competencia}: ${e.tributo} | Pago: ${fmtR(e.tributo_pago)} | Devido: ${fmtR(e.tributo_devido)} | Crédito: ${fmtR(e.credito)} | Risco: ${e.risco} | Oportunidade: ${e.tipo_oportunidade || 'não especificada'}`
).join('\n')}

=== PRAZOS PRESCRICIONAIS ===
${criticos.length > 0
  ? criticos.map(p => `⚠️ ${p.competencia} — ${p.tributo}: ${p.dias} dias restantes (${p.lim.toLocaleDateString('pt-BR')}) — ${fmtR(p.credito)}`).join('\n')
  : 'Nenhum prazo crítico nos próximos 6 meses.'}
${prescritos.length > 0 ? `\nPrescritos: ${prescritos.map(p => `${p.competencia} (${fmtR(p.credito)})`).join(', ')}` : ''}

=== RECUPERAÇÕES EM ANDAMENTO ===
Total de processos: ${recuperacoes.length}
Potencial em recuperação: ${fmtR(totalPotencial)}
${recuperacoes.slice(0, 10).map(r =>
  `- ${r.tese_aplicada || 'Tese a definir'} | Status: ${r.status} | Potencial: ${fmtR(r.potencial_recuperavel)}`
).join('\n')}

=== REGRAS ===
- Responda em português brasileiro
- Use os valores reais acima
- Seja objetivo e profissional
- Se não houver dados suficientes, diga claramente
- Formate a resposta com seções quando necessário
- Nunca invente valores ou dados
`
}

export default function AnaliseFiscal() {
  const [clientes,      setClientes]      = useState([])
  const [clienteId,     setClienteId]     = useState('')
  const [entradas,      setEntradas]      = useState([])
  const [recuperacoes,  setRecuperacoes]  = useState([])
  const [loading,       setLoading]       = useState(false)
  const [loadingIA,     setLoadingIA]     = useState(false)
  const [mensagens,     setMensagens]     = useState([])
  const [pergunta,      setPergunta]      = useState('')
  const fimRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('clientes').select('*').eq('usuario_id', user.id).order('razao_social')
        .then(({ data }) => setClientes(data || []))
    })
  }, [])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const cliente = clientes.find(c => c.id === clienteId)

  async function carregarDados(id) {
    setLoading(true)
    const [{ data: ents }, { data: recs }] = await Promise.all([
      supabase.from('entradas').select('*').eq('cliente_id', id),
      supabase.from('recuperacoes').select('*').eq('cliente_id', id),
    ])
    setEntradas(ents || [])
    setRecuperacoes(recs || [])
    setMensagens([{
      role: 'assistant',
      content: `Olá! Carreguei os dados de **${clientes.find(c=>c.id===id)?.razao_social}**.\n\nEncontrei **${(ents||[]).length} entradas fiscais** e **${(recs||[]).length} processo(s)** de recuperação.\n\nO que você quer saber sobre este cliente?`,
    }])
    setLoading(false)
  }

  async function enviarPergunta(texto) {
    if (!texto.trim() || !clienteId || loadingIA) return
    setPergunta('')

    const novaMensagem = { role: 'user', content: texto }
    const novasMensagens = [...mensagens, novaMensagem]
    setMensagens(novasMensagens)
    setLoadingIA(true)

    try {
      const contexto = montarContexto(cliente, entradas, recuperacoes)

      // Monta histórico para a API
      const historico = novasMensagens.map(m => ({
        role: m.role,
        content: m.role === 'user' ? m.content : m.content,
      }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: contexto,
          messages: historico,
        }),
      })

      const data = await response.json()
      const resposta = data.content?.[0]?.text || 'Não foi possível processar a resposta.'

      setMensagens(prev => [...prev, { role: 'assistant', content: resposta }])
    } catch (e) {
      setMensagens(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erro ao consultar a IA. Verifique sua conexão e tente novamente.',
      }])
    } finally {
      setLoadingIA(false)
    }
  }

  function renderMensagem(texto) {
    // Formatação simples de markdown
    return texto
      .split('\n')
      .map((linha, i) => {
        if (linha.startsWith('**') && linha.endsWith('**')) {
          return <div key={i} style={{ fontWeight: 700, color: '#0B1F4D', marginBottom: 4 }}>{linha.replace(/\*\*/g, '')}</div>
        }
        if (linha.startsWith('- ') || linha.startsWith('• ')) {
          return <div key={i} style={{ paddingLeft: 16, marginBottom: 3, color: '#374151' }}>• {linha.slice(2)}</div>
        }
        if (linha.startsWith('⚠️') || linha.startsWith('✅') || linha.startsWith('🔴') || linha.startsWith('💰')) {
          return <div key={i} style={{ marginBottom: 4, fontWeight: 600, color: '#0B1F4D' }}>{linha}</div>
        }
        if (linha === '') return <div key={i} style={{ height: 8 }} />
        return (
          <div key={i} style={{ marginBottom: 3, color: '#374151', lineHeight: 1.6 }}>
            {linha.split(/\*\*(.*?)\*\*/g).map((part, j) =>
              j % 2 === 1 ? <strong key={j} style={{ color: '#0B1F4D' }}>{part}</strong> : part
            )}
          </div>
        )
      })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F4D 0%, #163B8C 100%)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — FASE 5</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, color: '#fff' }}>🤖 IA Tributária</h2>
        <p style={{ fontSize: 14, color: '#93c5fd', marginBottom: 0 }}>
          Converse com a IA usando os dados reais do seu cliente. Respostas com valores, teses e prazos específicos.
        </p>
      </div>

      {/* Seletor de cliente */}
      <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
        <label style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', display: 'block', marginBottom: 10 }}>
          👤 Selecione o cliente:
        </label>
        <select
          value={clienteId}
          onChange={e => { setClienteId(e.target.value); if (e.target.value) carregarDados(e.target.value) }}
          style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', background: '#f8fafc' }}
        >
          <option value="">— Escolha um cliente para ativar a IA —</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.regime})</option>)}
        </select>

        {/* KPIs do cliente selecionado */}
        {clienteId && !loading && entradas.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Entradas',    valor: entradas.length,                                              cor: '#2563eb' },
              { label: 'Créditos',    valor: fmtR(entradas.reduce((s,e)=>s+(e.credito||0),0)),            cor: '#16a34a' },
              { label: 'Processos',   valor: recuperacoes.length,                                          cor: '#7c3aed' },
              { label: 'Prescrição',  valor: entradas.filter(e=>{
                if(!e.credito||!e.competencia) return false
                const[a,m]=e.competencia.split('-')
                const dias=Math.round((new Date(parseInt(a)+5,parseInt(m)-1,1)-new Date())/(1000*60*60*24))
                return dias<=180&&dias>0
              }).length + ' crítico(s)', cor: '#dc2626' },
            ].map((k,i) => (
              <div key={i} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat */}
      {!clienteId ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Selecione um cliente para ativar a IA</div>
          <div style={{ fontSize: 14 }}>A IA responderá usando os dados fiscais reais do cliente selecionado</div>
        </div>
      ) : loading ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Carregando dados do cliente...</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '2px solid #e2e8f0', overflow: 'hidden' }}>

          {/* Perguntas rápidas */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 10 }}>PERGUNTAS RÁPIDAS</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PERGUNTAS_RAPIDAS.map((p, i) => (
                <button key={i} onClick={() => enviarPergunta(p)}
                  style={{ padding: '6px 12px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 20, fontSize: 12, color: '#374151', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#0B1F4D'; e.currentTarget.style.color = '#0B1F4D' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#374151' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ height: 420, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mensagens.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%',
                  background: msg.role === 'user' ? '#0B1F4D' : '#f8fafc',
                  color: msg.role === 'user' ? '#fff' : '#374151',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '12px 18px',
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  {msg.role === 'assistant' ? (
                    <div>
                      <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 18, height: 18, background: '#0B1F4D', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🤖</span>
                        IA Tributária FiscalTrib
                      </div>
                      {renderMensagem(msg.content)}
                    </div>
                  ) : (
                    <div>{msg.content}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading */}
            {loadingIA && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px 16px 16px 4px', padding: '14px 20px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#0B1F4D', animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                  <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 20px', borderTop: '2px solid #f1f5f9', display: 'flex', gap: 10 }}>
            <input
              value={pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarPergunta(pergunta)}
              placeholder="Pergunte sobre este cliente... (Ex: Quais créditos estão prestes a prescrever?)"
              style={{ flex: 1, padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none' }}
              disabled={loadingIA}
            />
            <button
              onClick={() => enviarPergunta(pergunta)}
              disabled={!pergunta.trim() || loadingIA}
              style={{ padding: '12px 20px', background: pergunta.trim() && !loadingIA ? '#0B1F4D' : '#e2e8f0', color: pergunta.trim() && !loadingIA ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: pergunta.trim() && !loadingIA ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
            >
              {loadingIA ? '⏳' : '➤ Enviar'}
            </button>
          </div>
        </div>
      )}

      {/* Aviso */}
      <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginTop: 16, fontSize: 12, color: '#92400e' }}>
        ⚠️ A IA responde com base nos dados importados. Resultados são estimativas e não substituem análise profissional habilitada.
      </div>
    </div>
  )
}