import { useEffect, useRef, useState } from 'react'
import ManualOperacao from './ManualOperacao'

const C = {
  navy: '#0F172A',
  navy2: '#1E293B',
  white: '#FFFFFF',
  bg: '#F8FAFC',
  border: '#CBD5E1',
  borderSoft: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  blue: '#2563EB',
}

const LARGURA_PAINEL = 438
const ALTURA_MINIMA = 420
const MARGEM_TELA = 12

function normalizarTexto(valor = '') {
  return valor
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function limitar(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo)
}

export default function ManualFlutuante({
  modo = 'recolhido',
  onModoChange = () => {},
  onAbrirPaginaCompleta = null,
}) {
  const [layout, setLayout] = useState('lateral')
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [resultadoAtual, setResultadoAtual] = useState(-1)

  const [posicao, setPosicao] = useState(() => ({
    x:
      typeof window !== 'undefined'
        ? Math.max(MARGEM_TELA, window.innerWidth - LARGURA_PAINEL - 36)
        : 700,
    y: 70,
  }))

  const [tamanho, setTamanho] = useState(() => ({
    width: LARGURA_PAINEL,
    height:
      typeof window !== 'undefined'
        ? Math.max(ALTURA_MINIMA, Math.min(720, window.innerHeight - 100))
        : 650,
  }))

  const conteudoRef = useRef(null)
  const dragRef = useRef(null)

  const recolhido = modo === 'recolhido'
  const maximizado = layout === 'maximizado'
  const flutuante = layout === 'flutuante'
  const lateral = layout === 'lateral'

  useEffect(() => {
    if (modo === 'maximizado') {
      setLayout('maximizado')
    } else if (modo === 'lateral' && layout === 'maximizado') {
      setLayout('lateral')
    }
  }, [modo])

  useEffect(() => {
    function ajustarAoRedimensionar() {
      if (typeof window === 'undefined') return

      setTamanho((atual) => {
        const width = Math.min(
          Math.max(360, atual.width),
          Math.max(360, window.innerWidth - MARGEM_TELA * 2)
        )

        const height = Math.min(
          Math.max(ALTURA_MINIMA, atual.height),
          Math.max(ALTURA_MINIMA, window.innerHeight - MARGEM_TELA * 2)
        )

        return { width, height }
      })

      setPosicao((atual) => {
        const maxX = Math.max(
          MARGEM_TELA,
          window.innerWidth - tamanho.width - MARGEM_TELA
        )

        const maxY = Math.max(
          MARGEM_TELA,
          window.innerHeight - 80 - MARGEM_TELA
        )

        return {
          x: limitar(atual.x, MARGEM_TELA, maxX),
          y: limitar(atual.y, MARGEM_TELA, maxY),
        }
      })
    }

    window.addEventListener('resize', ajustarAoRedimensionar)
    return () => window.removeEventListener('resize', ajustarAoRedimensionar)
  }, [tamanho.width])

  useEffect(() => {
    const termo = normalizarTexto(busca)

    if (!termo || termo.length < 2 || !conteudoRef.current) {
      setResultados([])
      setResultadoAtual(-1)
      return
    }

    const walker = document.createTreeWalker(
      conteudoRef.current,
      NodeFilter.SHOW_TEXT
    )

    const encontrados = []
    const elementosVistos = new Set()
    let node = walker.nextNode()

    while (node) {
      const texto = normalizarTexto(node.textContent || '')

      if (texto.includes(termo)) {
        const elemento = node.parentElement

        if (
          elemento &&
          conteudoRef.current.contains(elemento) &&
          !elementosVistos.has(elemento)
        ) {
          elementosVistos.add(elemento)
          encontrados.push(elemento)
        }
      }

      node = walker.nextNode()
    }

    setResultados(encontrados)

    if (encontrados.length > 0) {
      setResultadoAtual(0)
      requestAnimationFrame(() => destacarEIrPara(encontrados[0]))
    } else {
      setResultadoAtual(-1)
    }
  }, [busca])

  function destacarEIrPara(elemento) {
    if (!elemento) return

    elemento.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })

    try {
      elemento.animate(
        [
          {
            outline: '3px solid rgba(37,99,235,0)',
            outlineOffset: '3px',
            backgroundColor: 'transparent',
          },
          {
            outline: '3px solid rgba(37,99,235,.85)',
            outlineOffset: '3px',
            backgroundColor: 'rgba(219,234,254,.75)',
          },
          {
            outline: '3px solid rgba(37,99,235,0)',
            outlineOffset: '3px',
            backgroundColor: 'transparent',
          },
        ],
        { duration: 1500, easing: 'ease-out' }
      )
    } catch {
      // A pesquisa continua funcionando mesmo sem animação.
    }
  }

  function navegarResultado(direcao) {
    if (resultados.length === 0) return

    let proximo = resultadoAtual + direcao

    if (proximo >= resultados.length) proximo = 0
    if (proximo < 0) proximo = resultados.length - 1

    setResultadoAtual(proximo)
    destacarEIrPara(resultados[proximo])
  }

  function aoPressionarBusca(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      navegarResultado(1)
    }

    if (e.key === 'Escape') {
      setBusca('')
    }
  }

  function tornarFlutuante() {
    if (typeof window !== 'undefined') {
      const width = Math.min(LARGURA_PAINEL, window.innerWidth - 24)
      const height = Math.max(
        ALTURA_MINIMA,
        Math.min(720, window.innerHeight - 100)
      )

      setTamanho({ width, height })
      setPosicao({
        x: Math.max(MARGEM_TELA, window.innerWidth - width - 36),
        y: Math.max(MARGEM_TELA, 70),
      })
    }

    setLayout('flutuante')
  }

  function fixarDireita() {
    setLayout('lateral')
  }

  function alternarMaximizado() {
    setLayout((atual) => (atual === 'maximizado' ? 'lateral' : 'maximizado'))
  }

  function recolherManual() {
    setLayout('lateral')
    onModoChange('recolhido')
  }

  function abrirPaginaCompleta() {
    recolherManual()
    if (typeof onAbrirPaginaCompleta === 'function') {
      onAbrirPaginaCompleta()
    }
  }

  function iniciarArraste(e) {
    if (!flutuante) return
    if (e.button !== undefined && e.button !== 0) return

    const origemX = e.clientX
    const origemY = e.clientY
    const inicioX = posicao.x
    const inicioY = posicao.y

    dragRef.current = {
      pointerId: e.pointerId,
      origemX,
      origemY,
      inicioX,
      inicioY,
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Continua funcionando mesmo sem pointer capture.
    }

    e.preventDefault()
  }

  function moverArraste(e) {
    if (!flutuante || !dragRef.current) return

    const dx = e.clientX - dragRef.current.origemX
    const dy = e.clientY - dragRef.current.origemY

    const maxX = Math.max(
      MARGEM_TELA,
      window.innerWidth - tamanho.width - MARGEM_TELA
    )

    const maxY = Math.max(
      MARGEM_TELA,
      window.innerHeight - tamanho.height - MARGEM_TELA
    )

    setPosicao({
      x: limitar(dragRef.current.inicioX + dx, MARGEM_TELA, maxX),
      y: limitar(dragRef.current.inicioY + dy, MARGEM_TELA, maxY),
    })
  }

  function finalizarArraste(e) {
    if (!dragRef.current) return

    try {
      e.currentTarget.releasePointerCapture(dragRef.current.pointerId)
    } catch {
      // Sem problema se o navegador já tiver liberado.
    }

    dragRef.current = null
  }

  if (recolhido) {
    return (
      <button
        type="button"
        onClick={() => {
          setLayout('lateral')
          onModoChange('lateral')
        }}
        title="Abrir Manual de Operação"
        aria-label="Abrir Manual de Operação"
        style={{
          position: 'fixed',
          right: 0,
          top: '42%',
          zIndex: 3000,
          width: 42,
          minHeight: 106,
          border: `1px solid ${C.border}`,
          borderRight: 'none',
          background: C.white,
          color: C.blue,
          borderRadius: '10px 0 0 10px',
          boxShadow: '0 10px 28px rgba(15,23,42,.16)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          padding: '9px 5px',
        }}
      >
        <span style={{ fontSize: 19, lineHeight: 1 }}>📖</span>

        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: 0.7,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            whiteSpace: 'nowrap',
          }}
        >
          MANUAL
        </span>
      </button>
    )
  }

  const painelStyle = maximizado
    ? {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
      }
    : flutuante
      ? {
          position: 'fixed',
          left: posicao.x,
          top: posicao.y,
          width: tamanho.width,
          height: tamanho.height,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          boxShadow: '0 18px 48px rgba(15,23,42,.24)',
          overflow: 'hidden',
        }
      : {
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(438px, 100vw)',
          height: '100vh',
          borderRadius: 0,
          borderLeft: `1px solid ${C.border}`,
          boxShadow: '-12px 0 36px rgba(15,23,42,.18)',
        }

  return (
    <aside
      style={{
        ...painelStyle,
        background: C.bg,
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100vw',
        maxHeight: '100vh',
      }}
    >
      <div
        onPointerDown={iniciarArraste}
        onPointerMove={moverArraste}
        onPointerUp={finalizarArraste}
        onPointerCancel={finalizarArraste}
        style={{
          minHeight: 50,
          background: C.navy,
          color: C.white,
          padding: '7px 9px 7px 11px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          cursor: flutuante ? 'grab' : 'default',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: C.navy2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          📖
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Manual de Operação
          </div>

          <div
            style={{
              fontSize: 9,
              color: '#94A3B8',
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {flutuante ? 'Arraste esta barra para mover' : 'Consulte enquanto trabalha'}
          </div>
        </div>

        {typeof onAbrirPaginaCompleta === 'function' && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={abrirPaginaCompleta}
            title="Abrir página completa"
            aria-label="Abrir página completa"
            style={{
              ...btnCabecalho,
              width: 60,
              padding: '0 7px',
              gap: 4,
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 12 }}>↗</span>
            <span>Página</span>
          </button>
        )}

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={flutuante ? fixarDireita : tornarFlutuante}
          title={flutuante ? 'Fixar à direita' : 'Tornar janela flutuante'}
          aria-label={flutuante ? 'Fixar à direita' : 'Tornar janela flutuante'}
          style={btnCabecalho}
        >
          {flutuante ? '📌' : '↔'}
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={recolherManual}
          title="Recolher manual"
          aria-label="Recolher manual"
          style={btnCabecalho}
        >
          ⌃
        </button>

        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={alternarMaximizado}
          title={maximizado ? 'Restaurar painel lateral' : 'Maximizar manual'}
          aria-label={maximizado ? 'Restaurar painel lateral' : 'Maximizar manual'}
          style={btnCabecalho}
        >
          {maximizado ? '↙' : '⛶'}
        </button>
      </div>

      <div
        style={{
          background: C.white,
          borderBottom: `1px solid ${C.borderSoft}`,
          padding: '8px 10px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <span
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 13,
                pointerEvents: 'none',
              }}
            >
              🔎
            </span>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={aoPressionarBusca}
              placeholder="Pesquisar no manual..."
              autoComplete="off"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                background: C.bg,
                color: C.text,
                padding: '8px 30px 8px 31px',
                fontSize: 11,
                outline: 'none',
              }}
            />

            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                title="Limpar pesquisa"
                aria-label="Limpar pesquisa"
                style={{
                  position: 'absolute',
                  right: 7,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 21,
                  height: 21,
                  border: 'none',
                  borderRadius: 6,
                  background: 'transparent',
                  color: C.muted,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            )}
          </div>

          {busca.trim().length >= 2 && (
            <>
              <div
                style={{
                  minWidth: 48,
                  textAlign: 'center',
                  fontSize: 9,
                  color: C.muted,
                  whiteSpace: 'nowrap',
                }}
              >
                {resultados.length > 0
                  ? `${resultadoAtual + 1} de ${resultados.length}`
                  : '0 de 0'}
              </div>

              <button
                type="button"
                onClick={() => navegarResultado(-1)}
                disabled={resultados.length === 0}
                title="Resultado anterior"
                style={btnPesquisa}
              >
                ↑
              </button>

              <button
                type="button"
                onClick={() => navegarResultado(1)}
                disabled={resultados.length === 0}
                title="Próximo resultado"
                style={btnPesquisa}
              >
                ↓
              </button>
            </>
          )}
        </div>

        {busca.trim().length === 1 && (
          <div style={{ fontSize: 9, color: C.muted, marginTop: 5 }}>
            Digite pelo menos 2 caracteres para pesquisar.
          </div>
        )}

        {busca.trim().length >= 2 && resultados.length === 0 && (
          <div style={{ fontSize: 9, color: '#B45309', marginTop: 5 }}>
            Nenhum trecho encontrado no manual.
          </div>
        )}
      </div>

      <div
        ref={conteudoRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: maximizado ? '18px 24px' : 10,
          scrollBehavior: 'smooth',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: maximizado ? 1500 : 'none',
            margin: maximizado ? '0 auto' : 0,
          }}
        >
          <ManualOperacao />
        </div>
      </div>

      {flutuante && (
        <div
          title="Janela flutuante"
          style={{
            position: 'absolute',
            right: 7,
            bottom: 6,
            fontSize: 9,
            color: '#94A3B8',
            pointerEvents: 'none',
          }}
        >
          janela flutuante
        </div>
      )}
    </aside>
  )
}

const btnCabecalho = {
  width: 30,
  height: 30,
  border: '1px solid #334155',
  borderRadius: 7,
  background: '#1E293B',
  color: '#FFFFFF',
  cursor: 'pointer',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const btnPesquisa = {
  width: 28,
  height: 32,
  border: '1px solid #CBD5E1',
  borderRadius: 7,
  background: '#FFFFFF',
  color: '#334155',
  cursor: 'pointer',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
