/**
 * AbaPGDAS.jsx - e-FiscalTribe®
 * Segregacao no PGDAS-D — Motor do Simples Nacional
 * Versao 1.0 - 06/08/2026
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtData = v => v ? new Date(v).toLocaleString('pt-BR') : '-'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
}

const fmtMoeda = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Badge({ tipo }) {
  const map = {
    segregou:     { label: 'Segregou',       bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    nao_segregou: { label: 'Nao Segregou',   bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    oportunidade: { label: 'Oportunidade',   bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    ok:           { label: 'OK',             bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    concluido:    { label: 'Concluido',      bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
    erro:         { label: 'Erro',           bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  }
  const b = map[tipo] || map.ok
  return (
    <span style={{ background: b.bg, color: b.color, border: `1px solid ${b.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>
      {b.label}
    </span>
  )
}

const FORM_VAZIO = {
  competencia: '',
  receita_bruta_total: '',
  receita_monofasica: '',
  receita_st: '',
  receita_imune: '',
  das_recolhido: '',
  segregou: false,
}

export default function AbaPGDAS({ cliente, regime }) {
  const [aba, setAba] = useState('calcular')
  const [form, setForm] = useState(FORM_VAZIO)
  const [resultado, setResultado] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [diagAberto, setDiagAberto] = useState(null)

  useEffect(() => { if (cliente?.id) carregarHistorico() }, [cliente?.id])

  async function carregarHistorico() {
    setLoadingHistorico(true)
    const { data } = await supabase
      .from('diagnosticos_pgdas')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
    setHistorico(data || [])
    setLoadingHistorico(false)
  }

  function calcular() {
    const rb  = parseFloat(form.receita_bruta_total?.replace(/\D/g, '') || 0) / 100
    const rm  = parseFloat(form.receita_monofasica?.replace(/\D/g, '')  || 0) / 100
    const rst = parseFloat(form.receita_st?.replace(/\D/g, '')          || 0) / 100
    const rim = parseFloat(form.receita_imune?.replace(/\D/g, '')       || 0) / 100
    const das = parseFloat(form.das_recolhido?.replace(/\D/g, '')       || 0) / 100

    const baseCorreta   = rb - rm - rst - rim
    const dasCorreto    = baseCorreta * 0.06
    const diferenca     = Math.max(0, das - dasCorreto)
    const pctMono       = rb > 0 ? (rm / rb) * 100 : 0
    const segregouCorreto = form.segregou

    setResultado({
      rb, rm, rst, rim, das,
      baseCorreta, dasCorreto, diferenca,
      pctMono, segregouCorreto,
      competencia: form.competencia,
    })
  }

  function formatarMoeda(valor, campo) {
    const raw = valor.replace(/\D/g, '')
    const num = (parseInt(raw || '0') / 100).toFixed(2)
    setForm(prev => ({ ...prev, [campo]: num }))
  }

  function exibirMoeda(valor) {
    if (!valor) return ''
    return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  async function salvar() {
    if (!resultado || !cliente?.id) return
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('diagnosticos_pgdas').insert([{
        usuario_id: user.id,
        cliente_id: cliente.id,
        cliente_nome: cliente.razao_social || '',
        cliente_cnpj: cliente.cnpj || '',
        regime,
        competencia: resultado.competencia,
        receita_bruta_total: resultado.rb,
        receita_monofasica: resultado.rm,
        receita_st: resultado.rst,
        receita_imune: resultado.rim,
        das_recolhido: resultado.das,
        das_correto: resultado.dasCorreto,
        diferenca_recuperavel: resultado.diferenca,
        pct_monofasica: resultado.pctMono,
        segregou: resultado.segregouCorreto,
        credito_estimado: resultado.diferenca,
        status: 'concluido',
        created_at: new Date().toISOString(),
      }])
      if (error) throw error
      await carregarHistorico()
      alert('Diagnostico salvo com sucesso!')
    } catch (e) {
      alert('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este diagnostico?')) return
    await supabase.from('diagnosticos_pgdas').delete().eq('id', id)
    if (diagAberto?.id === id) setDiagAberto(null)
    await carregarHistorico()
  }

  function novaAnalise() {
    setForm(FORM_VAZIO)
    setResultado(null)
    setDiagAberto(null)
  }

  function abrirDiagnostico(diag) {
    setDiagAberto(diag)
    setResultado({
      rb: diag.receita_bruta_total,
      rm: diag.receita_monofasica,
      rst: diag.receita_st,
      rim: diag.receita_imune,
      das: diag.das_recolhido,
      baseCorreta: diag.receita_bruta_total - diag.receita_monofasica - diag.receita_st - diag.receita_imune,
      dasCorreto: diag.das_correto,
      diferenca: diag.diferenca_recuperavel,
      pctMono: diag.pct_monofasica,
      segregouCorreto: diag.segregou,
      competencia: diag.competencia,
    })
    setAba('calcular')
  }

  // KPIs sempre visíveis
  const kpis = resultado ? [
    { label: 'Receita Bruta Total',      valor: fmtR(resultado.rb),          cor: S.navy   },
    { label: 'Receita Monofasica',       valor: fmtR(resultado.rm),          cor: S.orange },
    { label: 'DAS Recolhido',            valor: fmtR(resultado.das),         cor: S.red    },
    { label: 'DAS Correto Estimado',     valor: fmtR(resultado.dasCorreto),  cor: S.blue   },
    { label: 'Diferenca Recuperavel',    valor: fmtR(resultado.diferenca),   cor: resultado.diferenca > 0 ? S.green : S.muted },
    { label: '% Receita Monofasica',     valor: resultado.pctMono.toFixed(2).replace('.', ',') + '%', cor: S.orange },
  ] : [
    { label: 'Receita Bruta Total',      valor: 'R$ 0,00', cor: '#CBD5E1' },
    { label: 'Receita Monofasica',       valor: 'R$ 0,00', cor: '#CBD5E1' },
    { label: 'DAS Recolhido',            valor: 'R$ 0,00', cor: '#CBD5E1' },
    { label: 'DAS Correto Estimado',     valor: 'R$ 0,00', cor: '#CBD5E1' },
    { label: 'Diferenca Recuperavel',    valor: 'R$ 0,00', cor: '#CBD5E1' },
    { label: '% Receita Monofasica',     valor: '0,00%',   cor: '#CBD5E1' },
  ]

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Motor do Simples / <strong style={{ color: S.text }}>PGDAS-D</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Segregacao no PGDAS-D</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Verifique se as receitas monofasicas foram corretamente segregadas no PGDAS-D e calcule o credito recuperavel.
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${S.border}`, marginBottom: 20 }}>
        {[
          { id: 'calcular',  label: 'Calcular' },
          { id: 'historico', label: `Historico (${historico.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba === a.id ? 700 : 400, color: aba === a.id ? S.navy : S.muted, background: 'none', border: 'none', borderBottom: `2px solid ${aba === a.id ? S.navy : 'transparent'}`, marginBottom: -2, cursor: 'pointer' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA CALCULAR */}
      {aba === 'calcular' && (
        <>
          {/* KPIs — sempre visíveis */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: S.white, borderRadius: 8, padding: '14px 16px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* FORMULÁRIO */}
          <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, background: '#fff7ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.orange }}>Calcular Credito de Segregacao</div>
                <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>Informe os dados do PGDAS-D para calcular o credito recuperavel.</div>
              </div>
              {diagAberto && (
                <button onClick={novaAnalise} style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: S.muted }}>
                  Novo Calculo
                </button>
              )}
            </div>
            <div style={{ padding: 16 }}>

              {diagAberto && (
                <div style={{ background: '#eff6ff', border: `1px solid #bfdbfe`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#2563eb' }}>
                  Visualizando diagnostico salvo em <strong>{fmtData(diagAberto.created_at)}</strong>
                </div>
              )}

              {/* Competência */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>Competencia (MM/AAAA) *</div>
                <input value={form.competencia} onChange={e => setForm(p => ({ ...p, competencia: e.target.value }))}
                  placeholder="07/2026" disabled={!!diagAberto}
                  style={{ width: 160, padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Campos monetários */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { label: '* Receita Bruta Total (R$)',          key: 'receita_bruta_total', placeholder: 'R$ 0,00' },
                  { label: '* Receita Monofasica (R$)',            key: 'receita_monofasica',  placeholder: 'R$ 0,00' },
                  { label: 'Receita c/ Subst. Tributaria (R$)',   key: 'receita_st',          placeholder: 'R$ 0,00' },
                  { label: 'Receita Imune/Isenta (R$)',            key: 'receita_imune',       placeholder: 'R$ 0,00' },
                  { label: '* DAS Recolhido (R$)',                 key: 'das_recolhido',       placeholder: 'R$ 0,00' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: S.muted, marginBottom: 4 }}>{label}</div>
                    <input
                      value={exibirMoeda(form[key])}
                      onChange={e => formatarMoeda(e.target.value, key)}
                      placeholder={placeholder}
                      disabled={!!diagAberto}
                      style={{ width: '100%', padding: '7px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>
                <input type="checkbox" checked={form.segregou} disabled={!!diagAberto}
                  onChange={e => setForm(p => ({ ...p, segregou: e.target.checked }))} />
                Segregou as receitas monofasicas corretamente no PGDAS-D
              </label>

              {!diagAberto && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={calcular}
                    style={{ padding: '8px 24px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Calcular Credito
                  </button>
                  <button onClick={novaAnalise}
                    style={{ padding: '8px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RESULTADO */}
          {resultado && (
            <div style={{ background: resultado.diferenca > 0 ? '#f0fdf4' : S.white, border: `1px solid ${resultado.diferenca > 0 ? '#86efac' : S.border}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${resultado.diferenca > 0 ? '#86efac' : S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: resultado.diferenca > 0 ? S.green : S.muted }}>
                  {resultado.diferenca > 0 ? '✅ Oportunidade Identificada!' : '✔ Nenhuma diferenca encontrada'}
                </div>
                <Badge tipo={resultado.segregouCorreto ? 'segregou' : 'nao_segregou'} />
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Base de Calculo Correta',  valor: fmtR(resultado.baseCorreta) },
                    { label: 'DAS Correto Estimado',     valor: fmtR(resultado.dasCorreto)  },
                    { label: 'DAS Recolhido',            valor: fmtR(resultado.das)         },
                    { label: 'Diferenca Recuperavel',    valor: fmtR(resultado.diferenca), destaque: true },
                    { label: '% Receita Monofasica',     valor: resultado.pctMono.toFixed(2).replace('.', ',') + '%' },
                    { label: 'Segregou Corretamente',    valor: resultado.segregouCorreto ? 'Sim' : 'Nao' },
                  ].map((k, i) => (
                    <div key={i} style={{ background: S.white, borderRadius: 6, padding: '10px 14px', border: `1px solid ${S.border}` }}>
                      <div style={{ fontSize: 10, color: S.muted, marginBottom: 4 }}>{k.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: k.destaque ? S.green : S.text }}>{k.valor}</div>
                    </div>
                  ))}
                </div>

                {resultado.diferenca > 0 && (
                  <div style={{ background: '#dcfce7', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 16 }}>
                    <strong>Como recuperar:</strong> Retifique o PGDAS-D segregando as receitas monofasicas e solicite restituicao via PER/DCOMP junto a Receita Federal. Prazo decadencial: 5 anos.
                  </div>
                )}

                {!diagAberto && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={salvar} disabled={salvando}
                      style={{ padding: '9px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
                      {salvando ? 'Salvando...' : 'Salvar Diagnostico'}
                    </button>
                    <button onClick={novaAnalise}
                      style={{ padding: '9px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>
                      Novo Calculo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA HISTORICO */}
      {aba === 'historico' && (
        <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Historico de Diagnosticos PGDAS-D</div>
            <button onClick={carregarHistorico} style={{ padding: '6px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>Atualizar</button>
          </div>

          {loadingHistorico ? (
            <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
          ) : historico.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhum diagnostico salvo</div>
              <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Calcule e salve um diagnostico para aparecer aqui</div>
              <button onClick={() => setAba('calcular')} style={{ padding: '8px 20px', background: S.navy, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Novo Calculo</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, padding: 16, borderBottom: `1px solid ${S.border}` }}>
                {[
                  { label: 'Diagnosticos salvos',    valor: historico.length, cor: S.navy },
                  { label: 'Total recuperavel',       valor: fmtR(historico.reduce((s,d) => s+(d.credito_estimado||0),0)), cor: S.green },
                  { label: 'Competencias analisadas', valor: historico.length, cor: S.orange },
                ].map((k, i) => (
                  <div key={i} style={{ background: S.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${S.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: i===1?14:20, fontWeight: 700, color: k.cor }}>{k.valor}</div>
                    <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: S.thBg }}>
                      {['Data', 'Competencia', 'Receita Bruta', 'Receita Mono', 'DAS Recolhido', 'DAS Correto', 'Diferenca', 'Segregou', 'Acoes'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((diag, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i%2===0?S.white:'#FAFAFA' }}>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{fmtData(diag.created_at)}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700 }}>{diag.competencia || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtR(diag.receita_bruta_total)}</td>
                        <td style={{ padding: '7px 10px', color: S.orange, fontWeight: 600 }}>{fmtR(diag.receita_monofasica)}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtR(diag.das_recolhido)}</td>
                        <td style={{ padding: '7px 10px' }}>{fmtR(diag.das_correto)}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 700, color: (diag.diferenca_recuperavel||0)>0?S.green:S.muted }}>{fmtR(diag.diferenca_recuperavel)}</td>
                        <td style={{ padding: '7px 10px' }}><Badge tipo={diag.segregou?'segregou':'nao_segregou'} /></td>
                        <td style={{ padding: '7px 10px' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => abrirDiagnostico(diag)} style={{ padding: '4px 10px', background: S.navy, color: S.white, border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Abrir</button>
                            <button onClick={() => excluir(diag.id)} style={{ padding: '4px 10px', background: '#fef2f2', color: S.red, border: `1px solid #fecaca`, borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}