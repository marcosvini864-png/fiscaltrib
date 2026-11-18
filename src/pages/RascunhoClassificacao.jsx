import { useMemo, useState } from 'react'
import { obterRascunho, atualizarRevisaoRascunho } from '../utils/rascunhosImportacao'

const OPCOES = [
  ['pendente', 'Pendente de conferencia'],
  ['revisar', 'Exige revisao fiscal'],
  ['monofasico_preliminar', 'Possivel monofasico (preliminar)'],
  ['nao_monofasico_preliminar', 'Possivel nao monofasico (preliminar)'],
]

export default function RascunhoClassificacao({ clienteId }) {
  const [versao, setVersao] = useState(0)
  const [busca, setBusca] = useState('')
  // O componente monta novamente ao retornar do importador, lendo a mesma memoria.
  const rascunho = obterRascunho(clienteId)
  const itens = rascunho?.itens || []
  const selecionados = useMemo(() => itens.map((item, indice) => ({
    item,
    chave: `${item.chaveNFe || item.nNF || ''}|${item.codigo || ''}|${indice}`,
  })).filter(({ item }) => `${item.descricao || ''} ${item.codigo || ''} ${item.ncm || ''}`.toLowerCase().includes(busca.toLowerCase())), [itens, busca, versao])
  const distintos = new Set(itens.map(x => `${x.codigo || ''}|${x.ncm || ''}`)).size

  return (
    <section style={{ border:'1px solid #bfdbfe', borderRadius:12, background:'#eff6ff', padding:16, marginBottom:22 }}>
      <div style={{ fontWeight:800, color:'#0b1f4d', fontSize:17 }}>Itens da importacao atual — RASCUNHO NAO SALVO</div>
      <p style={{ margin:'8px 0', fontSize:13, color:'#334155' }}>
        Esta area apresenta os itens temporarios do importador, separados do cadastro definitivo.
        As marcacoes abaixo sao anotacoes provisórias: nao alteram calculos, recuperacoes ou dados do Supabase.
      </p>
      <div style={{ marginBottom:10, fontSize:13, fontWeight:600 }}>
        {itens.length} ocorrencia(s) de item em {rascunho?.processados?.length || 0} arquivo(s) processado(s); {distintos} combinacao(oes) codigo/NCM.
      </div>
      {itens.length ? <>
        <input aria-label="Buscar no rascunho" placeholder="Buscar produto, codigo ou NCM" value={busca} onChange={e=>setBusca(e.target.value)} style={{padding:9, border:'1px solid #cbd5e1', borderRadius:6, width:'min(100%,400px)', marginBottom:12}} />
        <div style={{ overflowX:'auto', maxHeight:380, overflowY:'auto', background:'#fff', borderRadius:8 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead><tr style={{ background:'#0b1f4d', color:'#fff' }}>
              {['NF','Codigo','Produto','NCM','CFOP','Indicio no XML','Revisao provisoria'].map(t=><th key={t} style={{textAlign:'left',padding:10}}>{t}</th>)}
            </tr></thead>
            <tbody>{selecionados.map(({item,chave})=><tr key={chave} style={{borderBottom:'1px solid #e2e8f0'}}>
              <td style={{padding:8}}>{item.nNF || '—'}</td><td style={{padding:8}}>{item.codigo || '—'}</td>
              <td style={{padding:8}}>{item.descricao || '—'}</td><td style={{padding:8}}>{item.ncm || '—'}</td>
              <td style={{padding:8}}>{item.cfop || '—'}</td><td style={{padding:8}}>{item.monofasico ? 'Possivel monofasico' : 'Nao indicado'}</td>
              <td style={{padding:8}}><select aria-label={`Revisao provisoria ${item.codigo || chave}`} value={item.revisaoRascunho || 'pendente'} onChange={e => { atualizarRevisaoRascunho(clienteId,chave,e.target.value); setVersao(n=>n+1) }} style={{padding:7,maxWidth:235}}>
                {OPCOES.map(([valor,texto])=><option key={valor} value={valor}>{texto}</option>)}
              </select></td>
            </tr>)}</tbody>
          </table>
        </div>
      </> : <p style={{fontSize:13, color:'#475569'}}>Nenhum item de rascunho ativo nesta empresa. Importe XMLs na aba Monofasicos.</p>}
      <p style={{fontSize:12, color:'#64748b', marginBottom:0}}>As anotacoes sobrevivem ao F5 nesta aba do navegador, enquanto o armazenamento temporario estiver disponivel (ate 24 horas). O cadastro permanente continua independente. Nao utilize as marcacoes para apuracao sem homologacao fiscal.</p>
    </section>
  )
}
