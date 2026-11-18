// FiscalTrib TESTE2 — persistencia temporaria por aba do navegador.
// Somente para rascunhos NAO SALVOS; nao envia informacoes ao Supabase.
// sessionStorage recupera apos F5 na MESMA aba; nao e historico permanente.
const PREFIXO = 'fiscaltrib:rascunho-monofasicos:v1:'
const PRAZO_MS = 24 * 60 * 60 * 1000

function chave(clienteId) {
  return PREFIXO + String(clienteId)
}
function armazenar(clienteId, dados) {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  try {
    // Nunca guardar objetos File, bytes de XML ou senhas no sessionStorage.
    // A leitura dos XMLs ja gerou os itens e resumos necessarios para o rascunho.
    const payload = {
      versao: 1,
      atualizadoEm: Date.now(),
      itens: dados.itens || [],
      processados: dados.processados || [],
      documentosSemVinculo: dados.documentosSemVinculo || [],
    }
    window.sessionStorage.setItem(chave(clienteId), JSON.stringify(payload))
  } catch (error) {
    // Falha de cota ou restricao de armazenamento: continuar apenas em memoria.
    console.warn('[FiscalTrib] Rascunho mantido apenas em memoria:', error?.name || error)
  }
}
function carregar(clienteId) {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  try {
    const raw = window.sessionStorage.getItem(chave(clienteId))
    if (!raw) return null
    const dado = JSON.parse(raw)
    if (dado.versao !== 1 || !Number.isFinite(dado.atualizadoEm) ||
        Date.now() - dado.atualizadoEm > PRAZO_MS ||
        !Array.isArray(dado.itens) || !Array.isArray(dado.processados) ||
        !Array.isArray(dado.documentosSemVinculo)) {
      window.sessionStorage.removeItem(chave(clienteId))
      return null
    }
    return {
      itens: dado.itens,
      processados: dado.processados,
      documentosSemVinculo: dado.documentosSemVinculo,
      arquivos: [], // File nao pode ser restaurado com seguranca apos F5.
    }
  } catch {
    try { window.sessionStorage.removeItem(chave(clienteId)) } catch {}
    return null
  }
}

class RascunhosTemporarios extends Map {
  get(clienteId) {
    if (!clienteId) return undefined
    if (super.has(clienteId)) return super.get(clienteId)
    const recuperado = carregar(clienteId)
    if (recuperado) super.set(clienteId, recuperado)
    return recuperado || undefined
  }
  set(clienteId, dados) {
    if (!clienteId) return this
    super.set(clienteId, dados)
    armazenar(clienteId, dados)
    return this
  }
  delete(clienteId) {
    if (clienteId && typeof window !== 'undefined') {
      try { window.sessionStorage.removeItem(chave(clienteId)) } catch {}
    }
    return super.delete(clienteId)
  }
}
export const rascunhosImportacao = new RascunhosTemporarios()
export function obterRascunho(clienteId) {
  return clienteId ? rascunhosImportacao.get(clienteId) || null : null
}
export function atualizarRevisaoRascunho(clienteId, chaveItem, valor) {
  const atual = obterRascunho(clienteId)
  if (!atual) return false
  const itens = (atual.itens || []).map((item, indice) => {
    const chave = `${item.chaveNFe || item.nNF || ''}|${item.codigo || ''}|${indice}`
    return chave === chaveItem ? { ...item, revisaoRascunho: valor } : item
  })
  rascunhosImportacao.set(clienteId, { ...atual, itens })
  return true
}
