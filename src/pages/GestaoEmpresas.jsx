/**
 * GestaoEmpresas.jsx - e-FiscalTribe(r)
 * Gestao de Empresas - padrao visual e-Auditoria
 * Versao 1.0 - 05/08/2026
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const fmtCNPJ = v => v ? v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '-'
const fmtData = v => v ? new Date(v).toLocaleDateString('pt-BR') : '-'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', orange: '#ea580c', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
}

function StatusIcon({ status }) {
  const map = {
    ok:      { color: '#16a34a', symbol: '●' },
    alerta:  { color: '#ea580c', symbol: '▲' },
    erro:    { color: '#dc2626', symbol: '●' },
    neutro:  { color: '#94a3b8', symbol: '●' },
  }
  const s = map[status] || map.neutro
  return <span style={{ color: s.color, fontSize: 16 }}>{s.symbol}</span>
}

function ModalCadastro({ onClose, onSalvar, clienteEdit }) {
  const [form, setForm] = useState({
    razao_social: clienteEdit?.razao_social || '',
    cnpj: clienteEdit?.cnpj || '',
    regime: clienteEdit?.regime || 'Simples Nacional',
    municipio: clienteEdit?.municipio || '',
    uf: clienteEdit?.uf || '',
    email: clienteEdit?.email || '',
    telefone: clienteEdit?.telefone || '',
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    if (!form.razao_social || !form.cnpj) { setErro('Razao social e CNPJ sao obrigatorios.'); return }
    setSalvando(true)
    setErro('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = { ...form, usuario_id: user.id }
      let error
      if (clienteEdit?.id) {
        ;({ error } = await supabase.from('clientes').update(payload).eq('id', clienteEdit.id))
      } else {
        ;({ error } = await supabase.from('clientes').insert([payload]))
      }
      if (error) throw error
      onSalvar()
      onClose()
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: S.white, borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>{clienteEdit ? 'Editar Empresa' : 'Cadastrar Empresa'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: S.muted }}>x</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { label: '* Razao Social', key: 'razao_social', full: true },
            { label: '* CNPJ', key: 'cnpj' },
            { label: '* Regime Tributario', key: 'regime', tipo: 'select', opcoes: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real'] },
            { label: 'Municipio', key: 'municipio' },
            { label: 'UF', key: 'uf' },
            { label: 'E-mail', key: 'email' },
            { label: 'Telefone', key: 'telefone' },
          ].map(({ label, key, full, tipo, opcoes }) => (
            <div key={key} style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
              <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
              {tipo === 'select' ? (
                <select value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', background: S.white }}>
                  {opcoes.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              )}
            </div>
          ))}
        </div>

        {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', color: S.red, fontSize: 12, marginBottom: 12 }}>{erro}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            style={{ padding: '8px 20px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestaoEmpresas({ onSelecionarCliente }) {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [menuAberto, setMenuAberto] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEdit, setClienteEdit] = useState(null)
  const POR_PAGINA = 10

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('razao_social')
    setEmpresas(data || [])
    setLoading(false)
  }

  async function excluir(id) {
    if (!window.confirm('Excluir esta empresa?')) return
    await supabase.from('clientes').delete().eq('id', id)
    carregar()
  }

  const filtradas = empresas.filter(e => {
    if (!busca) return true
    const b = busca.toLowerCase()
    return e.razao_social?.toLowerCase().includes(b) || e.cnpj?.includes(b)
  })

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginadas = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>

      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Empresas e Documentos / <strong style={{ color: S.text }}>Gestao de Empresas</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Gestao de Empresas</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
          Visualize todas as empresas cadastradas. Acompanhe a situacao fiscal, oportunidades tributarias e gerencie os dados de cada empresa.
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
              placeholder="Buscar empresa ou CNPJ..."
              style={{ padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 260 }} />
            <button style={{ padding: '7px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>
              Busca Avancada
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ padding: '7px 16px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>
              Cadastro em lote
            </button>
            <button onClick={() => { setClienteEdit(null); setModalAberto(true) }}
              style={{ padding: '7px 16px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Cadastrar empresa
            </button>
          </div>
        </div>

        {/* TABELA */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhuma empresa cadastrada</div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Cadastre a primeira empresa para comecar</div>
            <button onClick={() => { setClienteEdit(null); setModalAberto(true) }}
              style={{ padding: '8px 20px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Cadastrar empresa
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.thBg }}>
                    <th style={{ padding: '8px 10px', color: S.thText, width: 36 }}>
                      <input type="checkbox" />
                    </th>
                    {[
                      'CNPJ',
                      { label: 'Riscos Fiscais', colspan: 3, center: true },
                      { label: 'Oportunidades', colspan: 1, center: true },
                      'Acoes'
                    ].map((h, i) => {
                      if (typeof h === 'object' && h.colspan) {
                        return (
                          <th key={i} colSpan={h.colspan}
                            style={{ padding: '8px 10px', textAlign: 'center', color: S.thText, fontWeight: 600, fontSize: 11, borderLeft: `1px solid rgba(255,255,255,0.1)` }}>
                            {h.label}
                          </th>
                        )
                      }
                      return (
                        <th key={i} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
                      )
                    })}
                  </tr>
                  <tr style={{ background: '#374151' }}>
                    <th style={{ padding: '6px 10px' }}></th>
                    <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600 }}>CNPJ</th>
                    <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>Situacao Fiscal RFB/PGFN</th>
                    <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>CND</th>
                    <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>Caixa Postal</th>
                    <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>Tributarias</th>
                    <th style={{ padding: '6px 10px', color: '#9CA3AF', fontSize: 10, fontWeight: 600 }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map((emp, i) => (
                    <tr key={i}
                      style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA', cursor: 'pointer' }}
                      onClick={() => onSelecionarCliente && onSelecionarCliente(emp)}>
                      <td style={{ padding: '10px 10px' }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox" />
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: S.navy }}>
                        <div style={{ fontSize: 12 }}>{fmtCNPJ(emp.cnpj)}</div>
                        <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{emp.razao_social}</div>
                        <div style={{ fontSize: 10, color: S.muted }}>{emp.regime} · {emp.municipio}/{emp.uf}</div>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <StatusIcon status="neutro" />
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <StatusIcon status="neutro" />
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <StatusIcon status="neutro" />
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                        <StatusIcon status="neutro" />
                      </td>
                      <td style={{ padding: '10px 10px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === emp.id ? null : emp.id) }}
                          style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '3px 10px', fontSize: 14, color: S.muted }}>
                          &#8801;
                        </button>
                        {menuAberto === emp.id && (
                          <div style={{ position: 'absolute', right: 8, top: 36, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 160 }}>
                            {[
                              { label: 'Selecionar', action: () => { onSelecionarCliente && onSelecionarCliente(emp); setMenuAberto(null) } },
                              { label: 'Editar', action: () => { setClienteEdit(emp); setModalAberto(true); setMenuAberto(null) } },
                              { label: 'Excluir', action: () => { excluir(emp.id); setMenuAberto(null) }, cor: S.red },
                            ].map((item, j) => (
                              <button key={j} onClick={item.action}
                                style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', color: item.cor || S.text, borderBottom: j < 2 ? `1px solid ${S.border}` : 'none' }}>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINACAO */}
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted }}>
              <span>{filtradas.length} empresas - Pagina {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[
                  { label: '<', onClick: () => setPagina(p => Math.max(1, p - 1)), disabled: pagina === 1 },
                  { label: '>', onClick: () => setPagina(p => Math.min(totalPaginas, p + 1)), disabled: pagina === totalPaginas },
                ].map((b, i) => (
                  <button key={i} onClick={b.onClick} disabled={b.disabled}
                    style={{ padding: '4px 10px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: b.disabled ? 'not-allowed' : 'pointer', color: b.disabled ? '#CBD5E1' : S.text }}>
                    {b.label}
                  </button>
                ))}
                <span style={{ marginLeft: 8 }}>10 por pagina</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {modalAberto && (
        <ModalCadastro
          onClose={() => setModalAberto(false)}
          onSalvar={carregar}
          clienteEdit={clienteEdit}
        />
      )}
    </div>
  )
}