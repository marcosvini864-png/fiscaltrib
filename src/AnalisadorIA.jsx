/**
 * AnalisadorIA.jsx - e-FiscalTribe®
 * Componente reutilizavel de Inteligencia Tributaria
 * Versao 1.2 - 07/08/2026
 * Card branco, botao maior
 */

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  border: '#E2E8F0', white: '#FFFFFF', muted: '#334155',
  text: '#0F172A', bg: '#F8FAFC', ghostText: '#64748B',
}

function renderInlineMarkdown(texto) {
  const partes = String(texto || '').split(/(\*\*[^*]+\*\*)/g)

  return partes.map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**')) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>
    }

    return <span key={i}>{parte}</span>
  })
}

function renderMarkdown(texto) {
  if (!texto) return null

  const linhas = texto.split('\n')
  const elementos = []
  let i = 0

  const ehSeparadorTabela = linha => {
    const t = String(linha || '').trim()
    if (!t.includes('|')) return false

    const restante = t
      .replace(/\|/g, '')
      .replace(/:/g, '')
      .replace(/-/g, '')
      .replace(/\s/g, '')

    return restante === ''
  }

  const quebrarColunas = linha =>
    linha
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)

  while (i < linhas.length) {
    const linhaOriginal = linhas[i]
    const linha = linhaOriginal.trim()

    const linhaSemNegritoExterno = linha
      .replace(/^\*\*/, '')
      .replace(/\*\*$/, '')

    if (/^##\s+/.test(linhaSemNegritoExterno)) {
      const titulo = linhaSemNegritoExterno.replace(/^##\s+/, '')

      elementos.push(
        <div
          key={'titulo-' + i}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: S.navy,
            marginTop: elementos.length ? 18 : 2,
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: '1px solid ' + S.border,
          }}
        >
          {titulo}
        </div>
      )

      i++
      continue
    }

    if (
      linha.startsWith('|') &&
      i + 1 < linhas.length &&
      ehSeparadorTabela(linhas[i + 1])
    ) {
      const cabecalho = quebrarColunas(linha)
      const linhasTabela = []

      i += 2

      while (i < linhas.length && linhas[i].trim().startsWith('|')) {
        linhasTabela.push(quebrarColunas(linhas[i]))
        i++
      }

      elementos.push(
        <div
          key={'tabela-' + i}
          style={{
            overflowX: 'auto',
            margin: '10px 0 14px',
            border: '1px solid ' + S.border,
            borderRadius: 8,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: S.bg }}>
                {cabecalho.map((coluna, c) => (
                  <th
                    key={c}
                    style={{
                      textAlign: 'left',
                      padding: '9px 10px',
                      color: S.navy,
                      fontWeight: 700,
                      borderBottom: '1px solid ' + S.border,
                    }}
                  >
                    {renderInlineMarkdown(coluna)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {linhasTabela.map((cols, r) => (
                <tr key={r}>
                  {cabecalho.map((_, c) => (
                    <td
                      key={c}
                      style={{
                        padding: '9px 10px',
                        verticalAlign: 'top',
                        color: S.text,
                        lineHeight: 1.55,
                        borderBottom:
                          r === linhasTabela.length - 1
                            ? 'none'
                            : '1px solid ' + S.border,
                      }}
                    >
                      {renderInlineMarkdown(cols[c] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

      continue
    }

    if (/^[-•]\s+/.test(linha)) {
      elementos.push(
        <div
          key={'bullet-' + i}
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 13,
            color: S.text,
            lineHeight: 1.65,
            marginBottom: 5,
          }}
        >
          <span
            style={{
              color: S.navy,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            •
          </span>

          <span>
            {renderInlineMarkdown(linha.replace(/^[-•]\s+/, ''))}
          </span>
        </div>
      )

      i++
      continue
    }

    if (/^\d+\.\s+/.test(linha)) {
      const numero = linha.match(/^(\d+)\./)?.[1]
      const conteudo = linha.replace(/^\d+\.\s+/, '')

      elementos.push(
        <div
          key={'numero-' + i}
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 13,
            color: S.text,
            lineHeight: 1.65,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              color: S.navy,
              fontWeight: 700,
              minWidth: 18,
            }}
          >
            {numero}.
          </span>

          <span>{renderInlineMarkdown(conteudo)}</span>
        </div>
      )

      i++
      continue
    }

    if (linha === '') {
      elementos.push(
        <div key={'vazio-' + i} style={{ height: 6 }} />
      )

      i++
      continue
    }

    elementos.push(
      <div
        key={'texto-' + i}
        style={{
          fontSize: 13,
          color: S.text,
          lineHeight: 1.65,
          marginBottom: 5,
        }}
      >
        {renderInlineMarkdown(linha)}
      </div>
    )

    i++
  }

  return elementos
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

export default function AnalisadorIA({ contexto, dados, cliente, regime, modelo = 'gemini-3.5-flash', parecerInicial = '', onParecerChange, parecerId }) {
  // Texto curto usado somente na interface.
  // O contexto completo continua sendo enviado para a IA.
  const contextoExibicao = String(contexto || '')
    .split(/\r?\n/)[0]
    .trim()

  const [parecer, setParecer] = useState(parecerInicial || '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [aberto, setAberto]   = useState(true)

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = [
      '@keyframes iaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
      '@keyframes iaProgress { 0% { transform: translateX(-120%); } 100% { transform: translateX(320%); } }',
      '.ia-spinner { display: inline-block; animation: iaSpin 1s linear infinite; }',
      '.ia-progress-track { width: 75%; height: 4px; margin: 8px auto 0; background: #E2E8F0; border-radius: 999px; overflow: hidden; }',
      '.ia-progress-bar { width: 35%; height: 100%; background: #2563EB; border-radius: 999px; animation: iaProgress 1.2s ease-in-out infinite; }',
    ].join('\n')
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  async function analisar() {
    setLoading(true)
    setErro('')
    setParecer('')
    onParecerChange?.('', { origem: 'inicio' })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const prompt = montarPrompt(contexto, dados, cliente, regime)

      const resp = await fetch(
        'https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/consulta-ia',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'user', content: prompt }
            ],
          }),
        }
      )

      const textoResposta = await resp.text()

      if (!resp.ok) {
        throw new Error(
          'Erro HTTP ' + resp.status +
          (textoResposta ? ' - ' + textoResposta.slice(0, 300) : '')
        )
      }

      let result

      try {
        result = JSON.parse(textoResposta)
      } catch {
        throw new Error(
          'A IA respondeu, mas a resposta do servidor não veio em JSON válido.'
        )
      }

      const resposta =
        result?.resposta ??
        result?.resultado ??
        result?.content ??
        result?.message ??
        ''

      if (!resposta) {
        throw new Error('Resposta vazia da IA.')
      }

      const respostaTexto =
        typeof resposta === 'string'
          ? resposta
          : JSON.stringify(resposta, null, 2)

      setParecer(respostaTexto)
      onParecerChange?.(respostaTexto, { origem: 'analise' })
    } catch (e) {
      if (e?.name === 'AbortError') {
        setErro(
          'A análise excedeu 45 segundos e foi interrompida. O serviço de IA não concluiu a resposta.'
        )
      } else {
        setErro('Erro ao consultar IA: ' + e.message)
      }
    } finally {
      clearTimeout(timeoutId)
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
              {contextoExibicao}
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
            {loading ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                <span className="ia-spinner">⏳</span>
                Analisando...
              </span>
            ) : parecer ? (
              '🔄 Reanalisar'
            ) : (
              '🧠 Analisar com IA'
            )}
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{ padding: '12px 18px' }}>
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {['Lendo dados', 'Aplicando legislacao', 'Elaborando parecer'].map((t, i) => (
              <span key={i} style={{
                background: '#eff6ff',
                color: S.blue,
                padding: '4px 12px',
                borderRadius: 99,
                fontSize: 12,
              }}>
                {t}
              </span>
            ))}
          </div>

          <div
            className="ia-progress-track"
            aria-label="Analisando dados com inteligencia artificial"
          >
            <div className="ia-progress-bar" />
          </div>
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
        <div id={parecerId || undefined} style={{ padding: '18px 20px' }}>
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