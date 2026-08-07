/**
 * AnalisadorIA.jsx - e-FiscalTribe®
 * Componente reutilizavel de Inteligencia Tributaria
 * Versao 1.2 - 07/08/2026
 * Card branco, botao maior
 */

import { useState } from 'react'
import { supabase } from './supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  border: '#E2E8F0', white: '#FFFFFF', muted: '#334155',
  text: '#0F172A', bg: '#F8FAFC', ghostText: '#64748B',
}

function renderMarkdown(texto) {
  if (!texto) return null
  return texto.split('\n').map((linha, i) => {
    if (linha.startsWith('## '))
      return <div key={i} style={{ fontSize: 13, fontWeight: 800, color: S.navy, marginTop: 16, marginBottom: 6, paddingBottom: 4, borderBottom: `1px solid ${S.border}` }}>{linha.replace('## ', '')}</div>
    if (linha.startsWith('- ') || linha.startsWith('• '))
      return <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: S.text, lineHeight: 1.7, marginBottom: 4 }}>
        <span style={{ color: S.navy, fontWeight: 700, flexShrink: 0 }}>•</span>
        <span>{linha.replace(/^[-•]\s/, '')}</span>
      </div>
    if (linha.trim() === '') return <div key={i} style={{ height: 6 }} />
    return <div key={i} style={{ fontSize: 13, color: S.text, lineHeight: 1.7, marginBottom: 4 }}>{linha}</div>
  })
}

function montarPrompt(contexto, dados, cliente, regime) {
  const nomeCliente = cliente?.razao_social || 'Cliente'
  const cnpj = cliente?.cnpj || ''
  const resumoDados = dados
    ? typeof dados === 'string' ? dados : JSON.stringify(dados, null, 2).slice(0, 3000)
    : 'Sem dados disponíveis'

  return `Você é um especialista em direito tributário brasileiro com profundo conhecimento em recuperação de créditos, Simples Nacional, Lucro Presumido e Lucro Real.

CONTEXTO DA ANÁLISE:
- Módulo: ${contexto}
- Cliente: ${nomeCliente}
- CNPJ: ${cnpj}
- Regime: ${regime || 'Não informado'}

DADOS DO RESULTADO:
${resumoDados}

Com base nos dados acima, produza um parecer tributário objetivo e prático com EXATAMENTE estas 3 seções:

## DIAGNÓSTICO
Análise técnica dos dados identificados, com embasamento legal quando relevante.

## OPORTUNIDADES
Liste as principais oportunidades de recuperação ou otimização identificadas, com valores quando disponíveis.

## PRÓXIMOS PASSOS
3 a 5 ações concretas e imediatas que o profissional deve executar.

Seja direto, técnico e objetivo. Não repita os dados brutos — interprete-os.`
}

export default function AnalisadorIA({ contexto, dados, cliente, regime }) {
  const [parecer, setParecer] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [aberto, setAberto]   = useState(true)

  async function analisar() {
    setLoading(true); setErro(''); setParecer('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')
      const prompt = montarPrompt(contexto, dados, cliente, regime)
      const resp = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ model: 'gemini-3.5-flash', messages: [{ role: 'user', content: prompt }] }),
      })
      const result = await resp.json()
      if (!resp.ok) throw new Error(result?.error || `Erro HTTP ${resp.status}`)
      const resposta = result?.resposta ?? result?.resultado ?? result?.content ?? ''
      if (!resposta) throw new Error('Resposta vazia da IA.')
      setParecer(resposta)
    } catch (e) {
      setErro('Erro ao consultar IA: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: S.white,
      border: `1px solid ${S.border}`,
      borderRadius: 10,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      {/* HEADER */}
      <div style={{
        padding: '14px 18px',
        borderBottom: parecer && aberto ? `1px solid ${S.border}` : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        background: S.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>&#129504;</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.navy }}>
              Inteligencia Tributaria
            </div>
            <div style={{ fontSize: 12, color: S.ghostText, marginTop: 2 }}>
              {contexto}
              {cliente?.razao_social ? ` — ${cliente.razao_social}` : ''}
              {regime ? ` — ${regime}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {parecer && (
            <button
              onClick={() => setAberto(v => !v)}
              style={{
                padding: '10px 20px',
                background: 'none',
                color: S.muted,
                border: `1px solid ${S.border}`,
                borderRadius: 8,
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: 500,
              }}>
              {aberto ? 'Minimizar' : 'Ver parecer'}
            </button>
          )}
          <button
            onClick={analisar}
            disabled={loading}
            style={{
              padding: '12px 28px',
              background: loading ? '#CBD5E1' : S.blue,
              color: S.white,
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 0.3,
            }}>
            {loading ? '⏳ Analisando...' : parecer ? '🔄 Reanalisar' : '🧠 Analisar com IA'}
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{ padding: '12px 18px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Lendo dados', 'Aplicando legislacao', 'Elaborando parecer'].map((t, i) => (
            <span key={i} style={{
              background: '#eff6ff', color: S.blue,
              padding: '4px 12px', borderRadius: 99, fontSize: 12,
            }}>{t}</span>
          ))}
        </div>
      )}

      {/* ERRO */}
      {erro && (
        <div style={{
          margin: '12px 18px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#dc2626',
          fontSize: 13,
        }}>
          {erro}
        </div>
      )}

      {/* PARECER */}
      {parecer && aberto && (
        <div style={{ padding: '18px 20px' }}>
          {renderMarkdown(parecer)}
        </div>
      )}

      {/* ESTADO VAZIO */}
      {!parecer && !loading && !erro && (
        <div style={{ padding: '10px 18px', fontSize: 12, color: S.ghostText }}>
          Clique em "Analisar com IA" para obter um parecer tributario baseado nos dados desta tela.
        </div>
      )}
    </div>
  )
}