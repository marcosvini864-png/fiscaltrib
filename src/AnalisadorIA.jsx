/**
 * AnalisadorIA.jsx - e-FiscalTribe®
 * Componente reutilizavel de Inteligencia Tributaria
 * Aparece no topo de toda tela que produz resultado
 * Versao 1.0 - 07/08/2026
 */

import { useState } from 'react'
import { supabase } from './supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  border: '#E2E8F0', white: '#FFFFFF', muted: '#334155',
  text: '#0F172A', ghostText: '#64748B',
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
    ? typeof dados === 'string'
      ? dados
      : JSON.stringify(dados, null, 2).slice(0, 3000)
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
  const [parecer, setParecer]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const [aberto, setAberto]     = useState(true)

  async function analisar() {
    setLoading(true); setErro(''); setParecer('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const prompt = montarPrompt(contexto, dados, cliente, regime)

      const resp = await fetch('https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          messages: [{ role: 'user', content: prompt }],
        }),
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
      background: S.navy, borderRadius: 12,
      marginBottom: 20, overflow: 'hidden',
      border: `1px solid #1E3A6E`,
    }}>
      {/* HEADER */}
      <div style={{
        padding: '14px 20px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>&#129504;</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
              Inteligencia Tributaria
            </div>
            <div style={{ fontSize: 11, color: '#93c5fd', marginTop: 1 }}>
              {contexto} — {cliente?.razao_social || 'Cliente'} — {regime || ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {parecer && (
            <button
              onClick={() => setAberto(v => !v)}
              style={{
                padding: '6px 14px', background: 'rgba(255,255,255,0.1)',
                color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 6, fontSize: 12, cursor: 'pointer',
              }}>
              {aberto ? 'Minimizar' : 'Ver parecer'}
            </button>
          )}
          <button
            onClick={analisar}
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: loading ? 'rgba(255,255,255,0.15)' : '#FFFFFF',
              color: loading ? '#93c5fd' : S.navy,
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
              transition: 'all 0.15s',
            }}>
            {loading ? 'Analisando...' : parecer ? 'Reanalisar' : 'Analisar com IA'}
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Lendo dados', 'Aplicando legislacao', 'Elaborando parecer'].map((t, i) => (
              <span key={i} style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '3px 10px', borderRadius: 99,
                fontSize: 11, color: '#93c5fd',
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* ERRO */}
      {erro && (
        <div style={{
          margin: '0 20px 16px',
          background: 'rgba(220,38,38,0.2)',
          border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: 8, padding: '10px 14px',
          color: '#fca5a5', fontSize: 12,
        }}>
          {erro}
        </div>
      )}

      {/* PARECER */}
      {parecer && aberto && (
        <div style={{
          margin: '0 16px 16px',
          background: '#FFFFFF',
          borderRadius: 10, padding: '20px 24px',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          {renderMarkdown(parecer)}
        </div>
      )}

      {/* ESTADO VAZIO */}
      {!parecer && !loading && !erro && (
        <div style={{
          padding: '12px 20px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: 12, color: '#93c5fd',
        }}>
          Clique em "Analisar com IA" para obter um parecer tributario baseado nos dados desta tela.
        </div>
      )}
    </div>
  )
}