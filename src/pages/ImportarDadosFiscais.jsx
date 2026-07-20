import { useState, useRef } from 'react'
import { supabase } from '../supabase'
import { parseXMLNFe, agruparPorCompetencia } from '../utils/parseXMLNFe'

// Tabela NCM Monofásicos (principais)
const NCM_MONOFASICOS = {
  // Combustíveis
  '27101259': { descricao: 'Gasolina', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '27101921': { descricao: 'Óleo Diesel', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '27111290': { descricao: 'GLP', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  // Medicamentos
  '30039099': { descricao: 'Medicamento', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '30049099': { descricao: 'Medicamento', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  // Perfumes e cosméticos
  '33030010': { descricao: 'Perfume', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '33042090': { descricao: 'Cosmético', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  // Autopeças
  '87089990': { descricao: 'Autopeça', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '87082990': { descricao: 'Autopeça', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  // Bebidas
  '22021000': { descricao: 'Bebida', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '22030000': { descricao: 'Cerveja', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  // Pneus
  '40111000': { descricao: 'Pneu', aliquotaPIS: 0, aliquotaCOFINS: 0 },
  '40112000': { descricao: 'Pneu', aliquotaPIS: 0, aliquotaCOFINS: 0 },
}

const C = {
  navy: '#0B1F4D',
  white: '#FFFFFF',
  bg: '#F4E7EC',
  border: '#C8D0DC',
  text: '#1E293B',
  muted: '#64748B',
  green: '#16a34a',
  red: '#dc2626',
  yellow: '#ca8a04',
}

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function verificarMonofasico(itens, regime) {
  const oportunidades = []
  for (const item of itens) {
    const ncm8 = item.ncm?.substring(0, 8)
    const mono = NCM_MONOFASICOS[ncm8]
    if (mono) {
      // Para LP/LR: se pagou PIS/COFINS sobre produto monofásico — crédito
      if (regime === 'lucro_presumido' || regime === 'lucro_real') {
        if (item.vPIS > 0 || item.vCOFINS > 0) {
          oportunidades.push({
            ncm: item.ncm,
            produto: item.xProd,
            vProd: item.vProd,
            vPIS: item.vPIS,
            vCOFINS: item.vCOFINS,
            credito: item.vPIS + item.vCOFINS,
            tipo: 'MONOFASICO',
            descricao: mono.descricao,
          })
        }
      }
      // Para Simples: segregação (não pagou separado, mas pode corrigir PGDAS)
      if (regime === 'simples_nacional') {
        oportunidades.push({
          ncm: item.ncm,
          produto: item.xProd,
          vProd: item.vProd,
          vPIS: 0,
          vCOFINS: 0,
          credito: 0,
          tipo: 'SEGREGACAO_MONOFASICO',
          descricao: mono.descricao,
        })
      }
    }
  }
  return oportunidades
}

function verificarICMSST(itens, regime) {
  const oportunidades = []
  for (const item of itens) {
    if (item.vST > 0) {
      // Para LP/LR: ICMS-ST pago nas entradas gera crédito PIS/COFINS
      if (regime === 'lucro_real') {
        const credito = item.vST * 0.0925 // PIS 1,65% + COFINS 7,6%
        oportunidades.push({
          ncm: item.ncm,
          produto: item.xProd,
          vST: item.vST,
          credito,
          tipo: 'ICMS_ST',
          descricao: 'Crédito PIS/COFINS sobre ICMS-ST',
        })
      }
    }
  }
  return oportunidades
}

function verificarExclusaoICMS(competencias, regime) {
  const oportunidades = []
  if (regime === 'lucro_presumido' || regime === 'lucro_real') {
    for (const comp of competencias) {
      if (comp.totalICMS > 0) {
        const aliquota = regime === 'lucro_real' ? 0.0925 : 0.0365
        const credito = comp.totalICMS * aliquota
        oportunidades.push({
          competencia: comp.competencia,
          vICMS: comp.totalICMS,
          credito,
          tipo: 'EXCLUSAO_ICMS_TEMA69',
          descricao: 'Exclusão ICMS base PIS/COFINS — STF Tema 69',
        })
      }
    }
  }
  return oportunidades
}

export default function ImportarDadosFiscais({ clienteId, clienteNome, regime, onConcluir, onFechar }) {
  const [etapa, setEtapa] = useState('upload') // upload | processando | resultado
  const [arquivos, setArquivos] = useState([])
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef(null)

  function onDrop(e) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    adicionarArquivos(files)
  }

  function adicionarArquivos(files) {
    const novos = files.map(f => ({
      file: f,
      nome: f.name,
      tipo: f.name.endsWith('.xml') ? 'xml'
          : f.name.endsWith('.csv') ? 'csv'
          : f.name.endsWith('.pdf') ? 'pdf'
          : 'desconhecido',
      status: 'aguardando',
    }))
    setArquivos(prev => [...prev, ...novos])
  }

  function removerArquivo(i) {
    setArquivos(prev => prev.filter((_, idx) => idx !== i))
  }

  async function processar() {
    if (arquivos.length === 0) return
    setEtapa('processando')
    setErro('')

    try {
      const notasXML = []

      for (const arq of arquivos) {
        if (arq.tipo === 'xml') {
          const texto = await arq.file.text()
          // Suporta arquivo com múltiplas NF-e ou único
          const xmls = texto.includes('<nfeProc')
            ? texto.split('</nfeProc>').filter(x => x.includes('<nfeProc')).map(x => x + '</nfeProc>')
            : [texto]

          for (const xml of xmls) {
            try {
              const nota = parseXMLNFe(xml)
              if (nota.competencia) notasXML.push(nota)
            } catch (e) {
              console.warn('Erro ao parsear XML:', e)
            }
          }
        }
        // CSV e PDF serão implementados nas próximas versões
      }

      if (notasXML.length === 0) {
        throw new Error('Nenhuma NF-e válida encontrada nos arquivos.')
      }

      // Agrupa por competência
      const competencias = agruparPorCompetencia(notasXML)

      // Separa entradas e saídas
      const entradas = notasXML.filter(n => n.tipo === 'entrada')
      const saidas = notasXML.filter(n => n.tipo === 'saida')

      // Todos os itens de entrada
      const itensEntrada = entradas.flatMap(n => n.itens)
      const itensSaida = saidas.flatMap(n => n.itens)
      const todosItens = notasXML.flatMap(n => n.itens)

      // Roda verificações
      const oportunidadesMonofasico = verificarMonofasico(itensEntrada, regime)
      const oportunidadesICMSST = verificarICMSST(itensEntrada, regime)
      const oportunidadesICMS = verificarExclusaoICMS(competencias, regime)

      // Calcula totais por competência
      const resumoCompetencias = competencias.map(comp => {
        const creditoMonofasico = oportunidadesMonofasico
          .filter(o => true) // por competência seria refinado
          .reduce((s, o) => s + (o.credito || 0), 0)

        return {
          competencia: comp.competencia,
          receita_bruta: comp.totalProd,
          receita_tributada: comp.totalProd,
          receita_monofasica: comp.itens
            .filter(i => NCM_MONOFASICOS[i.ncm?.substring(0, 8)])
            .reduce((s, i) => s + i.vProd, 0),
          tributo_pago: comp.totalPIS + comp.totalCOFINS,
          tributo_devido: 0,
          credito: creditoMonofasico,
          nfes_analisadas: comp.notas.length,
          periodo_inicio: comp.competencia + '-01',
          periodo_fim: comp.competencia + '-01',
        }
      })

      setResultado({
        notasXML,
        competencias,
        entradas: entradas.length,
        saidas: saidas.length,
        totalNotas: notasXML.length,
        oportunidadesMonofasico,
        oportunidadesICMSST,
        oportunidadesICMS,
        resumoCompetencias,
        totalCredito:
          oportunidadesMonofasico.reduce((s, o) => s + (o.credito || 0), 0) +
          oportunidadesICMSST.reduce((s, o) => s + (o.credito || 0), 0) +
          oportunidadesICMS.reduce((s, o) => s + (o.credito || 0), 0),
      })

      setEtapa('resultado')
    } catch (e) {
      setErro(e.message)
      setEtapa('upload')
    }
  }

  async function salvar() {
    if (!resultado || !clienteId) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Salva por competência na tabela entradas
      for (const comp of resultado.resumoCompetencias) {
        const creditoComp = resultado.oportunidadesICMS
          .filter(o => o.competencia === comp.competencia)
          .reduce((s, o) => s + o.credito, 0) + comp.credito

        await supabase.from('entradas').upsert({
          cliente_id: clienteId,
          usuario_id: user.id,
          competencia: comp.competencia,
          tributo: 'PIS/COFINS',
          receita_bruta: comp.receita_bruta,
          receita_tributada: comp.receita_tributada,
          receita_monofasica: comp.receita_monofasica,
          tributo_pago: comp.tributo_pago,
          tributo_devido: comp.tributo_devido,
          credito: creditoComp,
          nfes_analisadas: comp.nfes_analisadas,
          periodo_inicio: comp.periodo_inicio,
          periodo_fim: comp.periodo_fim,
          tipo_oportunidade: resultado.oportunidadesMonofasico.length > 0
            ? 'MONOFASICO'
            : resultado.oportunidadesICMS.length > 0
            ? 'EXCLUSAO_ICMS'
            : 'SEM_OPORTUNIDADE',
          risco: 'baixo',
          documentos: JSON.stringify({
            nfes: resultado.totalNotas,
            entradas: resultado.entradas,
            saidas: resultado.saidas,
          }),
        }, { onConflict: 'cliente_id,competencia,tributo' })
      }

      onConcluir && onConcluir()
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: C.white, borderRadius: 16, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>

        {/* Header */}
        <div style={{ background: C.navy, borderRadius: '16px 16px 0 0', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>FISCALTRIB — ANÁLISE FISCAL</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white }}>📂 Importar Dados Fiscais</div>
            <div style={{ fontSize: 13, color: '#93c5fd', marginTop: 2 }}>{clienteNome} · {regime?.replace('_', ' ').toUpperCase()}</div>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: 24 }}>

          {/* ETAPA UPLOAD */}
          {etapa === 'upload' && (
            <>
              {/* Zona de drop */}
              <div
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: '2px dashed ' + C.border, borderRadius: 12,
                  padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                  marginBottom: 16, background: '#f8fafc',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                  Arraste ou clique para selecionar
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  Suporta XML de NF-e · CSV · PDF
                </div>
                <input ref={inputRef} type="file" multiple accept=".xml,.csv,.pdf" onChange={onDrop} style={{ display: 'none' }} />
              </div>

              {/* Lista de arquivos */}
              {arquivos.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {arquivos.map((arq, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, marginBottom: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>
                          {arq.tipo === 'xml' ? '📄' : arq.tipo === 'csv' ? '📊' : '📑'}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{arq.nome}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{arq.tipo.toUpperCase()}</div>
                        </div>
                      </div>
                      <button onClick={() => removerArquivo(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>
                  ⚠️ {erro}
                </div>
              )}

              <button
                onClick={processar}
                disabled={arquivos.length === 0}
                style={{
                  width: '100%', padding: '14px', background: arquivos.length > 0 ? C.navy : C.border,
                  color: C.white, border: 'none', borderRadius: 10, fontSize: 15,
                  fontWeight: 700, cursor: arquivos.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                🔍 Analisar {arquivos.length > 0 ? `(${arquivos.length} arquivo${arquivos.length > 1 ? 's' : ''})` : ''}
              </button>
            </>
          )}

          {/* ETAPA PROCESSANDO */}
          {etapa === 'processando' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>Analisando documentos fiscais...</div>
              <div style={{ fontSize: 13, color: C.muted }}>Cruzando NCMs, competências e teses tributárias</div>
            </div>
          )}

          {/* ETAPA RESULTADO */}
          {etapa === 'resultado' && resultado && (
            <>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'NF-e analisadas', valor: resultado.totalNotas, cor: '#2563eb' },
                  { label: 'Entradas', valor: resultado.entradas, cor: '#16a34a' },
                  { label: 'Saídas', valor: resultado.saidas, cor: '#7c3aed' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Potencial total */}
              <div style={{
                background: resultado.totalCredito > 0 ? '#f0fdf4' : '#f8fafc',
                border: '1px solid ' + (resultado.totalCredito > 0 ? '#86efac' : C.border),
                borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>POTENCIAL DE RECUPERAÇÃO IDENTIFICADO</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: resultado.totalCredito > 0 ? C.green : C.muted }}>
                  {fmtR(resultado.totalCredito)}
                </div>
                {resultado.totalCredito === 0 && (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Nenhuma oportunidade identificada nos dados importados
                  </div>
                )}
              </div>

              {/* Oportunidades */}
              {[
                { lista: resultado.oportunidadesMonofasico, titulo: '💊 Monofásicos', cor: '#7c3aed' },
                { lista: resultado.oportunidadesICMSST, titulo: '🔄 ICMS-ST', cor: '#ea580c' },
                { lista: resultado.oportunidadesICMS, titulo: '⚖️ Exclusão ICMS Tema 69', cor: '#0891b2' },
              ].map((grupo, gi) => grupo.lista.length > 0 && (
                <div key={gi} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: grupo.cor, marginBottom: 8 }}>{grupo.titulo}</div>
                  {grupo.lista.slice(0, 5).map((o, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 4, fontSize: 13,
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{o.produto || o.descricao}</span>
                        {o.ncm && <span style={{ color: C.muted, marginLeft: 6 }}>NCM {o.ncm}</span>}
                        {o.competencia && <span style={{ color: C.muted, marginLeft: 6 }}>{o.competencia}</span>}
                      </div>
                      <span style={{ fontWeight: 700, color: C.green }}>{fmtR(o.credito)}</span>
                    </div>
                  ))}
                  {grupo.lista.length > 5 && (
                    <div style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
                      + {grupo.lista.length - 5} itens adicionais
                    </div>
                  )}
                </div>
              ))}

              {/* Competências */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 8 }}>📅 Por Competência</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Competência', 'NF-e', 'Receita', 'PIS/COFINS pago', 'Monofásico'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: C.muted, fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.resumoCompetencias.map((comp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>{comp.competencia}</td>
                          <td style={{ padding: '6px 10px' }}>{comp.nfes_analisadas}</td>
                          <td style={{ padding: '6px 10px' }}>{fmtR(comp.receita_bruta)}</td>
                          <td style={{ padding: '6px 10px' }}>{fmtR(comp.tributo_pago)}</td>
                          <td style={{ padding: '6px 10px', color: comp.receita_monofasica > 0 ? C.green : C.muted }}>
                            {fmtR(comp.receita_monofasica)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: C.red, fontSize: 13, marginBottom: 16 }}>
                  ⚠️ {erro}
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { setEtapa('upload'); setResultado(null) }}
                  style={{ flex: 1, padding: '12px', background: C.white, color: C.navy, border: '1.5px solid ' + C.navy, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Importar mais
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  style={{ flex: 2, padding: '12px', background: C.navy, color: C.white, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}
                >
                  {salvando ? 'Salvando...' : '✅ Salvar análise'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}