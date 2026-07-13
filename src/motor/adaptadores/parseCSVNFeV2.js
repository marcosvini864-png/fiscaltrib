// ─── parseCSVNFeV2.js ─────────────────────────────────────────────────────────
// Adaptador: CSV v2 → objeto NF-e normalizado (idêntico ao parseXMLNFe)
// Reutilizável pelo sistema — o Motor não sabe se veio de XML ou CSV.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizarNFe } from '../normalizadores/normalizarNFe.js'

// Colunas obrigatórias no cabeçalho
const COLUNAS_OBRIGATORIAS = [
  'chave_nfe',
  'tp_nf',
  'competencia',
  'cnpj_emitente',
  'numero_nf',
  'data_emissao',
  'v_nf',
  'numero_item',
  'ncm',
  'cfop',
  'v_prod',
]

// ─── Parser CSV com separador ; ───────────────────────────────────────────────
function parseLinhas(texto) {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  if (linhas.length < 2) return { cabecalho: [], rows: [] }
  const cabecalho = linhas[0].split(';').map(c => c.trim().toLowerCase().replace(/"/g, ''))
  const rows = linhas.slice(1).map((linha, i) => {
    const valores = linha.split(';').map(v => v.trim().replace(/"/g, ''))
    const obj = {}
    cabecalho.forEach((col, j) => { obj[col] = valores[j] || '' })
    obj._linha = i + 2 // linha real no arquivo (1=cabeçalho, então dados começam em 2)
    return obj
  })
  return { cabecalho, rows }
}

// ─── Validação de colunas obrigatórias ───────────────────────────────────────
function validarCabecalho(cabecalho) {
  const faltando = COLUNAS_OBRIGATORIAS.filter(c => !cabecalho.includes(c))
  return faltando
}

// ─── Validação de campos obrigatórios por linha ───────────────────────────────
function validarLinha(row, nomeArquivo) {
  const erros = []
  const obrigatoriosPorLinha = ['chave_nfe', 'numero_item', 'ncm', 'cfop', 'v_prod']
  obrigatoriosPorLinha.forEach(col => {
    if (!row[col] || row[col].toString().trim() === '') {
      erros.push({
        arquivo: nomeArquivo,
        linha: row._linha,
        coluna: col,
        motivo: `Campo obrigatório vazio`,
      })
    }
  })
  if (row.competencia && !/^\d{4}-\d{2}$/.test(row.competencia)) {
    erros.push({ arquivo: nomeArquivo, linha: row._linha, coluna: 'competencia', motivo: `Formato inválido — use AAAA-MM` })
  }
  if (row.data_emissao && !/^\d{4}-\d{2}-\d{2}$/.test(row.data_emissao)) {
    erros.push({ arquivo: nomeArquivo, linha: row._linha, coluna: 'data_emissao', motivo: `Formato inválido — use AAAA-MM-DD` })
  }
  if (row.tp_nf && !['0', '1'].includes(row.tp_nf)) {
    erros.push({ arquivo: nomeArquivo, linha: row._linha, coluna: 'tp_nf', motivo: `Valor inválido — use 0 (entrada) ou 1 (saída)` })
  }
  return erros
}

// ─── Agrupamento de linhas por chave_nfe ──────────────────────────────────────
function agruparPorChave(rows) {
  const mapa = new Map()
  rows.forEach(row => {
    const chave = row.chave_nfe
    if (!mapa.has(chave)) {
      mapa.set(chave, { cabecalho: row, itens: [] })
    }
    mapa.get(chave).itens.push(row)
  })
  return mapa
}

// ─── Detecção de tipo: saída ou entrada ───────────────────────────────────────
function detectarTipoArquivo(nomeArquivo) {
  const nome = nomeArquivo.toLowerCase()
  if (nome.includes('saida') || nome.includes('saída')) return 'saida'
  if (nome.includes('entrada')) return 'entrada'
  return null // vai ler do campo tp_nf
}

// ─── Conversão de número BR para float ───────────────────────────────────────
function toFloat(v) {
  if (!v || v === '') return 0
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0
}

// ─── Montagem do objeto NF-e normalizado ──────────────────────────────────────
function montarNFe(chave, grupo, tipoArquivo, nomeArquivo) {
  const cab = grupo.cabecalho
  const linhasItens = grupo.itens

  // tp_nf: 0=entrada, 1=saída — pode vir do campo ou inferido do nome do arquivo
  let tpNF = cab.tp_nf || ''
  if (!tpNF) {
    if (tipoArquivo === 'saida')   tpNF = '1'
    if (tipoArquivo === 'entrada') tpNF = '0'
  }

  const competencia = cab.competencia || (cab.data_emissao ? cab.data_emissao.slice(0, 7) : '')

  // Totais da nota (campos de cabeçalho)
  const vNF     = toFloat(cab.v_nf)
  const vICMS   = toFloat(cab.v_icms)
  const vPIS    = toFloat(cab.v_pis)
  const vCOFINS = toFloat(cab.v_cofins)
  const vST     = toFloat(cab.v_st)
  const vIPI    = toFloat(cab.v_ipi)
  const vFrete  = toFloat(cab.v_frete)
  const vDesc   = toFloat(cab.v_desc)
  const vISS    = toFloat(cab.v_iss)

  // Verificar chave de item duplicada dentro da mesma nota
  const chavesItens = new Set()
  const itensDuplicados = []
  const itens = []

  linhasItens.forEach(row => {
    const chaveItem = `${row.chave_nfe}::${row.numero_item}`
    if (chavesItens.has(chaveItem)) {
      itensDuplicados.push({ arquivo: nomeArquivo, linha: row._linha, coluna: 'numero_item', motivo: `Item duplicado: chave_nfe + numero_item já existe (${chaveItem})` })
      return
    }
    chavesItens.add(chaveItem)

    itens.push({
      // Identificação do item
      _chaveItem:   chaveItem,      // chave única rastreável
      _linhaCSV:    row._linha,     // linha original no arquivo para evidências
      _origemDado:  'CSV_V2',       // rastreabilidade

      // Campos padrão NF-e (idênticos ao parseXMLNFe)
      ncm:    row.ncm    || '',
      cfop:   row.cfop   || '',
      cst:    row.cst    || row.csosn || '',
      cest:   row.cest   || '',
      cProd:  row.c_prod || '',
      xProd:  row.x_prod || row.descricao || '',
      orig:   row.orig   || '',

      qCom:   toFloat(row.q_com),
      vUnCom: toFloat(row.v_un_com),
      vProd:  toFloat(row.v_prod),
      vDesc:  toFloat(row.v_desc_item),

      vBC:        toFloat(row.v_bc),
      pICMS:      toFloat(row.p_icms),
      vItemICMS:  toFloat(row.v_icms_item),

      vBCST:      toFloat(row.v_bc_st),
      pICMSST:    toFloat(row.p_icms_st),
      vItemST:    toFloat(row.v_icms_st),

      vItemIPI:   toFloat(row.v_ipi_item),

      vBCPIS:     toFloat(row.v_bc_pis),
      pPIS:       toFloat(row.p_pis),
      vItemPIS:   toFloat(row.v_pis_item),

      vBCCOFINS:  toFloat(row.v_bc_cofins),
      pCOFINS:    toFloat(row.p_cofins),
      vItemCOFINS: toFloat(row.v_cofins_item),
    })
  })

  // Validação de totais: soma dos itens vs total da nota
  const avisosTotais = []
  const somaVProd = itens.reduce((s, i) => s + i.vProd, 0)
  if (vNF > 0 && Math.abs(somaVProd - vNF) > 0.10) {
    avisosTotais.push({
      arquivo: nomeArquivo,
      chave_nfe: chave,
      motivo: `Divergência nos totais: soma dos itens (${somaVProd.toFixed(2)}) ≠ v_nf (${vNF.toFixed(2)})`,
    })
  }

  const nfe = {
    // Identificação
    chNFe:      chave,
    nNF:        cab.numero_nf  || '',
    serie:      cab.serie      || '',
    tpNF,
    competencia,
    cnpjEmi:    cab.cnpj_emitente   || '',
    cnpjDest:   cab.cnpj_destinatario || '',
    natOp:      cab.nat_op     || '',

    // Totais
    vNF, vICMS, vPIS, vCOFINS, vISS, vST, vFrete, vDesc, vIPI,

    // Itens
    itens,

    // Metadados de rastreabilidade
    _origem:    'CSV_V2',
    _arquivo:   nomeArquivo,

    // Validade (mesma lógica do parseXMLNFe)
    valido: !!competencia && vNF > 0,
  }

  return { nfe, itensDuplicados, avisosTotais }
}

// ─── FUNÇÃO PRINCIPAL EXPORTADA ───────────────────────────────────────────────
/**
 * parseCSVNFeV2(texto, nomeArquivo)
 * 
 * Recebe o conteúdo texto de um notas_saida_v2.csv ou notas_entrada_v2.csv
 * e retorna objetos NF-e normalizados idênticos ao parseXMLNFe().
 * 
 * Retorna:
 * {
 *   nfes:    [],   // objetos NF-e prontos para o Motor
 *   erros:   [],   // { arquivo, linha, coluna, motivo }
 *   avisos:  [],   // divergências não fatais (totais, etc.)
 *   rejeitadas: [] // chaves_nfe inteiras rejeitadas por erro fatal
 * }
 */
export function parseCSVNFeV2(texto, nomeArquivo = 'notas_v2.csv') {
  const resultado = { nfes: [], erros: [], avisos: [], rejeitadas: [] }

  const { cabecalho, rows } = parseLinhas(texto)

  // 1. Validar cabeçalho
  const colsFaltando = validarCabecalho(cabecalho)
  if (colsFaltando.length > 0) {
    resultado.erros.push({
      arquivo: nomeArquivo,
      linha: 1,
      coluna: colsFaltando.join(', '),
      motivo: `Colunas obrigatórias ausentes no cabeçalho`,
    })
    return resultado // não há como continuar sem cabeçalho correto
  }

  const tipoArquivo = detectarTipoArquivo(nomeArquivo)

  // 2. Validar cada linha individualmente
  const rowsValidas = []
  rows.forEach(row => {
    const errosLinha = validarLinha(row, nomeArquivo)
    if (errosLinha.length > 0) {
      resultado.erros.push(...errosLinha)
      resultado.rejeitadas.push(row.chave_nfe || `linha_${row._linha}`)
    } else {
      rowsValidas.push(row)
    }
  })

  if (rowsValidas.length === 0) return resultado

  // 3. Agrupar por chave_nfe
  const grupos = agruparPorChave(rowsValidas)

  // 4. Montar objeto NF-e para cada chave
  grupos.forEach((grupo, chave) => {
    const { nfe, itensDuplicados, avisosTotais } = montarNFe(chave, grupo, tipoArquivo, nomeArquivo)

    if (itensDuplicados.length > 0) resultado.erros.push(...itensDuplicados)
    if (avisosTotais.length > 0)    resultado.avisos.push(...avisosTotais)

    // Normalizar para garantir formato idêntico ao parseXMLNFe
    const nfeNormalizada = normalizarNFe(nfe)

    if (nfeNormalizada.valido) {
      resultado.nfes.push(nfeNormalizada)
    } else {
      resultado.rejeitadas.push(chave)
      resultado.erros.push({
        arquivo: nomeArquivo,
        linha: grupo.cabecalho._linha,
        coluna: 'v_nf / competencia',
        motivo: `NF-e rejeitada: competencia ou v_nf ausente (chave: ${chave})`,
      })
    }
  })

  return resultado
}