import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabase'

const CONTEXTO_PUBLICO = `Você é o Chat Assistente do e-FiscalTribe, uma plataforma de inteligência tributária brasileira.
Responda dúvidas sobre:
- Planos disponíveis: Essencial (R$197/mês), Avançado (R$347/mês) e Premium (R$597/mês)
- Taxa de adesão: R$300,00 via PIX, pagamento único
- Como funciona a contratação: PIX + cadastro de cartão de crédito
- Funcionalidades: diagnóstico tributário, recuperação de créditos, dívida ativa, importação de XML/CSV/PDF, relatórios
- Suporte: WhatsApp (11) 99957-9822, email contato@fiscaltrib.com.br
Seja objetivo, cordial e use linguagem profissional. Responda sempre em português brasileiro.`

const CONTEXTO_INTERNO = `Você é o Chat Assistente do e-FiscalTribe, uma plataforma de inteligência tributária brasileira.
Ajude o usuário a usar as funcionalidades da plataforma:
- Diagnóstico Tributário: importe XMLs de NF-e ou CSV para análise
- Módulos disponíveis: Monofásicos, Exclusão ICMS Tema 69, Dívida Ativa
- Importação CDA: envie PDFs da PGFN para extração automática via IA
- SISPAR: relatório executivo de dívida ativa
- Motor de Inteligência: analisa créditos tributários recuperáveis
- Como importar XML: vá em Central de Importações, selecione os arquivos NF-e
- Suporte técnico: WhatsApp (11) 99957-9822
Seja objetivo, cordial e use linguagem profissional. Responda sempre em português brasileiro.`

export default function ChatAssistente({ modo = 'publico' }) {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState([
    {
      role: 'assistant',
      content:
        modo === 'publico'
          ? 'Olá! Sou o Chat Assistente do e-FiscalTribe. Posso tirar suas dúvidas sobre planos e contratação. Como posso ajudar?'
          : 'Olá! Sou o Chat Assistente do e-FiscalTribe. Posso ajudar com dúvidas sobre como usar a plataforma. Como posso ajudar?',
    },
  ])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)

  const fimRef = useRef(null)

  useEffect(() => {
    const atualizarTela = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', atualizarTela)

    return () => {
      window.removeEventListener('resize', atualizarTela)
    }
  }, [])

  useEffect(() => {
    if (aberto && fimRef.current) {
      fimRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagens, aberto])

  async function enviar() {
    const texto = input.trim()

    if (!texto || loading) return

    const novasMensagens = [
      ...mensagens,
      {
        role: 'user',
        content: texto,
      },
    ]

    setMensagens(novasMensagens)
    setInput('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('consulta-ia', {
        body: {
          model: 'groq',
          messages: [
            {
              role: 'system',
              content:
                modo === 'publico'
                  ? CONTEXTO_PUBLICO
                  : CONTEXTO_INTERNO,
            },
            ...novasMensagens.map(m => ({
              role: m.role,
              content: m.content,
            })),
          ],
        },
      })

      if (error) throw error

      const resposta =
        data?.resposta ||
        data?.choices?.[0]?.message?.content ||
        'Desculpe, não consegui processar sua pergunta.'

      setMensagens(prev => [
        ...prev,
        {
          role: 'assistant',
          content: resposta,
        },
      ])
    } catch (e) {
      setMensagens(prev => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Erro ao conectar. Tente novamente ou entre em contato pelo WhatsApp (11) 99957-9822.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(v => !v)}
        style={{
          position: 'fixed',

          bottom: isMobile ? 12 : 24,
          right: isMobile ? 0 : 24,

          width: isMobile ? 42 : 56,
          height: isMobile ? 42 : 56,

          borderRadius: isMobile ? '12px 0 0 12px' : '50%',

          background: '#1e3a5f',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',

          fontSize: isMobile ? 18 : 24,

          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',

          zIndex: 9999,

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          transition: 'transform 0.2s',
        }}
        title="Chat Assistente"
        aria-label={aberto ? 'Fechar Chat Assistente' : 'Abrir Chat Assistente'}
      >
        {aberto ? (
          '✕'
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              lineHeight: 1,
            }}
          >
            <span
              style={{
                fontSize: isMobile ? 17 : 22,
                lineHeight: 1,
              }}
            >
              🎧
            </span>

            <span
              style={{
                fontSize: isMobile ? 7 : 9,
                fontWeight: 700,
                letterSpacing: 0.3,
                marginTop: 2,
              }}
            >
              Chat
            </span>
          </div>
        )}
      </button>

      {/* Janela do chat */}
      {aberto && (
        <div
          style={{
            position: 'fixed',

            bottom: isMobile ? 62 : 90,
            right: isMobile ? 8 : 24,

            width: isMobile ? 'calc(100vw - 16px)' : 340,
            height: isMobile
              ? 'min(560px, calc(100dvh - 82px))'
              : 460,

            maxWidth: isMobile ? 'calc(100vw - 16px)' : 340,

            background: '#fff',

            borderRadius: isMobile ? 12 : 16,

            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',

            zIndex: 9998,

            display: 'flex',
            flexDirection: 'column',

            overflow: 'hidden',

            fontFamily: "'Inter', sans-serif",

            boxSizing: 'border-box',
          }}
        >
          {/* Cabeçalho */}
          <div
            style={{
              background: '#1e3a5f',
              padding: isMobile ? '10px 12px' : '12px 16px',

              display: 'flex',
              alignItems: 'center',
              gap: 10,

              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: isMobile ? 32 : 36,
                height: isMobile ? 32 : 36,

                borderRadius: '50%',

                background: '#3b82f6',

                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',

                fontSize: isMobile ? 16 : 18,

                flexShrink: 0,
              }}
            >
              🎧
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                Chat Assistente
              </div>

              <div
                style={{
                  color: '#93c5fd',
                  fontSize: 11,
                }}
              >
                e-FiscalTribe • Online
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <div
            style={{
              flex: 1,

              overflowY: 'auto',
              overflowX: 'hidden',

              padding: isMobile ? '10px 10px' : '12px 14px',

              display: 'flex',
              flexDirection: 'column',
              gap: 10,

              background: '#f8fafc',

              minHeight: 0,
            }}
          >
            {mensagens.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',

                  justifyContent:
                    m.role === 'user'
                      ? 'flex-end'
                      : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: isMobile ? '86%' : '80%',

                    padding: '8px 12px',

                    borderRadius:
                      m.role === 'user'
                        ? '12px 12px 0 12px'
                        : '12px 12px 12px 0',

                    background:
                      m.role === 'user'
                        ? '#1e3a5f'
                        : '#fff',

                    color:
                      m.role === 'user'
                        ? '#fff'
                        : '#1e293b',

                    fontSize: 13,
                    lineHeight: 1.5,

                    boxShadow:
                      '0 1px 4px rgba(0,0,0,0.08)',

                    overflowWrap: 'anywhere',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <div
                  style={{
                    background: '#fff',

                    padding: '8px 14px',

                    borderRadius:
                      '12px 12px 12px 0',

                    fontSize: 13,

                    color: '#94a3b8',

                    boxShadow:
                      '0 1px 4px rgba(0,0,0,0.08)',
                  }}
                >
                  Digitando...
                </div>
              </div>
            )}

            <div ref={fimRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: isMobile
                ? '8px 8px'
                : '10px 12px',

              borderTop:
                '1px solid #e2e8f0',

              display: 'flex',
              gap: 8,

              background: '#fff',

              flexShrink: 0,

              boxSizing: 'border-box',
            }}
          >
            <input
              value={input}
              onChange={e =>
                setInput(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida..."
              style={{
                flex: 1,
                minWidth: 0,

                padding: isMobile
                  ? '10px 10px'
                  : '8px 12px',

                border:
                  '1px solid #e2e8f0',

                borderRadius: 8,

                fontSize: 13,

                outline: 'none',

                color: '#1e293b',

                boxSizing: 'border-box',
              }}
            />

            <button
              onClick={enviar}
              disabled={
                loading || !input.trim()
              }
              style={{
                padding: isMobile
                  ? '8px 13px'
                  : '8px 14px',

                background: '#1e3a5f',

                color: '#fff',

                border: 'none',

                borderRadius: 8,

                fontSize: 13,
                fontWeight: 700,

                cursor:
                  loading || !input.trim()
                    ? 'not-allowed'
                    : 'pointer',

                opacity:
                  loading || !input.trim()
                    ? 0.5
                    : 1,

                flexShrink: 0,
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}