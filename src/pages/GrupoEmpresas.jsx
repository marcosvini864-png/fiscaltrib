/**
 * GrupoEmpresas.jsx - e-FiscalTribe(r)
 * Grupo de Empresas - padrao visual e-Auditoria
 * Versao 1.0 - 05/08/2026
 */

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const S = {
  navy: '#0B1F4D', blue: '#2563EB', green: '#16a34a',
  red: '#dc2626', muted: '#64748B',
  border: '#E2E8F0', bg: '#F8FAFC', white: '#FFFFFF',
  text: '#1E293B', thBg: '#4B5563', thText: '#FFFFFF',
}

function ModalGrupo({ onClose, onSalvar, grupoEdit }) {
  const [nome, setNome] = useState(grupoEdit?.nome || '')
  const [descricao, setDescricao] = useState(grupoEdit?.descricao || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    if (!nome) { setErro('Nome e obrigatorio.'); return }
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = { nome, descricao, usuario_id: user.id }
      let error
      if (grupoEdit?.id) {
        ;({ error } = await supabase.from('grupos_empresas').update(payload).eq('id', grupoEdit.id))
      } else {
        ;({ error } = await supabase.from('grupos_empresas').insert([payload]))
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
      <div style={{ background: S.white, borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: S.navy }}>{grupoEdit ? 'Editar Grupo' : 'Novo Grupo'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: S.muted }}>x</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontWeight: 600 }}>* Nome do Grupo</div>
          <input value={nome} onChange={e => setNome(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 4, fontWeight: 600 }}>Descricao</div>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
        {erro && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', color: S.red, fontSize: 12, marginBottom: 12 }}>{erro}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, cursor: 'pointer', color: S.muted }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            style={{ padding: '8px 20px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GrupoEmpresas() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [grupoEdit, setGrupoEdit] = useState(null)
  const [menuAberto, setMenuAberto] = useState(null)
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const POR_PAGINA = 10

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('grupos_empresas').select('*').order('nome')
    setGrupos(data || [])
    setLoading(false)
  }

  async function excluir(id) {
    if (!window.confirm('Excluir este grupo?')) return
    await supabase.from('grupos_empresas').delete().eq('id', id)
    carregar()
  }

  const filtrados = grupos.filter(g => !busca || g.nome?.toLowerCase().includes(busca.toLowerCase()))
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', color: S.text }} onClick={() => setMenuAberto(null)}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 2 }}>
          Empresas e Documentos / <strong style={{ color: S.text }}>Grupo de Empresas</strong>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: S.navy }}>Grupo de Empresas</div>
        <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>Organize suas empresas em grupos para facilitar a gestao e os relatorios.</div>
      </div>

      <div style={{ background: S.white, borderRadius: 10, border: `1px solid ${S.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={busca} onChange={e => { setBusca(e.target.value); setPagina(1) }}
              placeholder="Buscar grupo..."
              style={{ padding: '7px 12px', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 13, outline: 'none', width: 240 }} />
            <button style={{ padding: '7px 12px', background: 'none', border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', color: S.muted }}>Busca Avancada</button>
          </div>
          <button onClick={() => { setGrupoEdit(null); setModalAberto(true) }}
            style={{ padding: '7px 16px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Novo Grupo
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Nenhum grupo cadastrado</div>
            <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>Crie grupos para organizar suas empresas</div>
            <button onClick={() => { setGrupoEdit(null); setModalAberto(true) }}
              style={{ padding: '8px 20px', background: S.blue, color: S.white, border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Novo Grupo
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: S.thBg }}>
                    <th style={{ padding: '8px 10px', color: S.thText, width: 36 }}><input type="checkbox" /></th>
                    {['Nome do Grupo', 'Descricao', 'Empresas', 'Criado em', 'Acoes'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: S.thText, fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginados.map((grupo, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${S.border}`, background: i % 2 === 0 ? S.white : '#FAFAFA' }}>
                      <td style={{ padding: '10px 10px' }}><input type="checkbox" /></td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: S.navy }}>{grupo.nome}</td>
                      <td style={{ padding: '10px 10px', color: S.muted }}>{grupo.descricao || '-'}</td>
                      <td style={{ padding: '10px 10px', color: S.muted }}>0</td>
                      <td style={{ padding: '10px 10px', color: S.muted }}>{new Date(grupo.created_at).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '10px 10px', position: 'relative' }}>
                        <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === grupo.id ? null : grupo.id) }}
                          style={{ background: 'none', border: `1px solid ${S.border}`, borderRadius: 4, cursor: 'pointer', padding: '3px 10px', fontSize: 14, color: S.muted }}>
                          &#8801;
                        </button>
                        {menuAberto === grupo.id && (
                          <div style={{ position: 'absolute', right: 8, top: 36, background: S.white, border: `1px solid ${S.border}`, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 140 }}>
                            {[
                              { label: 'Editar', action: () => { setGrupoEdit(grupo); setModalAberto(true); setMenuAberto(null) } },
                              { label: 'Excluir', action: () => { excluir(grupo.id); setMenuAberto(null) }, cor: S.red },
                            ].map((item, j) => (
                              <button key={j} onClick={item.action}
                                style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12, cursor: 'pointer', color: item.cor || S.text, borderBottom: j < 1 ? `1px solid ${S.border}` : 'none' }}>
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
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: S.muted }}>
              <span>{filtrados.length} grupos - Pagina {pagina} de {totalPaginas}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                  style={{ padding: '4px 10px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === 1 ? 'not-allowed' : 'pointer', color: pagina === 1 ? '#CBD5E1' : S.text }}>{'<'}</button>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                  style={{ padding: '4px 10px', border: `1px solid ${S.border}`, borderRadius: 4, background: 'none', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', color: pagina === totalPaginas ? '#CBD5E1' : S.text }}>{'>'}</button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalAberto && <ModalGrupo onClose={() => setModalAberto(false)} onSalvar={carregar} grupoEdit={grupoEdit} />}
    </div>
  )
}