// ─── normalizarNFe.js ─────────────────────────────────────────────────────────
// Garante que qualquer objeto NF-e (vindo de XML ou CSV) tenha
// exatamente a mesma estrutura antes de entrar no Motor.
// ─────────────────────────────────────────────────────────────────────────────

function toFloat(v) {
  if (v === null || v === undefined || v === '') return 0
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0
}

function normalizarItem(item) {
  return {
    // Identificação
    ncm:    String(item.ncm   || '').trim(),
    cfop:   String(item.cfop  || '').trim(),
    cst:    String(item.cst   || '').trim(),
    cest:   String(item.cest  || '').trim(),
    cProd:  String(item.cProd || '').trim(),
    xProd:  String(item.xProd || '').trim(),
    orig:   String(item.orig  || '').trim(),

    // Quantidades e valores
    qCom:   toFloat(item.qCom),
    vUnCom: toFloat(item.vUnCom),
    vProd:  toFloat(item.vProd),
    vDesc:  toFloat(item.vDesc),

    // ICMS
    vBC:       toFloat(item.vBC),
    pICMS:     toFloat(item.pICMS),
    vItemICMS: toFloat(item.vItemICMS),

    // ICMS-ST
    vBCST:    toFloat(item.vBCST),
    pICMSST:  toFloat(item.pICMSST),
    vItemST:  toFloat(item.vItemST),

    // IPI
    vItemIPI: toFloat(item.vItemIPI),

    // PIS
    vBCPIS:   toFloat(item.vBCPIS),
    pPIS:     toFloat(item.pPIS),
    vItemPIS: toFloat(item.vItemPIS),

    // COFINS
    vBCCOFINS:   toFloat(item.vBCCOFINS),
    pCOFINS:     toFloat(item.pCOFINS),
    vItemCOFINS: toFloat(item.vItemCOFINS),

    // Rastreabilidade (presentes apenas quando vier de CSV — ignorados pelo Motor)
    _chaveItem:  item._chaveItem  || null,
    _linhaCSV:   item._linhaCSV   || null,
    _origemDado: item._origemDado || 'XML',
  }
}

/**
 * normalizarNFe(nfe)
 * Recebe um objeto NF-e de qualquer origem (XML ou CSV)
 * e retorna um objeto com estrutura garantida e tipos corretos.
 */
export function normalizarNFe(nfe) {
  return {
    // Identificação
    chNFe:    String(nfe.chNFe   || '').trim(),
    nNF:      String(nfe.nNF     || '').trim(),
    serie:    String(nfe.serie   || '').trim(),
    tpNF:     String(nfe.tpNF   || '').trim(),
    natOp:    String(nfe.natOp   || '').trim(),
    cnpjEmi:  String(nfe.cnpjEmi || '').trim(),
    cnpjDest: String(nfe.cnpjDest|| '').trim(),

    // Competência
    competencia: String(nfe.competencia || '').trim().slice(0, 7),

    // Totais da nota
    vNF:     toFloat(nfe.vNF),
    vICMS:   toFloat(nfe.vICMS),
    vPIS:    toFloat(nfe.vPIS),
    vCOFINS: toFloat(nfe.vCOFINS),
    vISS:    toFloat(nfe.vISS),
    vST:     toFloat(nfe.vST),
    vFrete:  toFloat(nfe.vFrete),
    vDesc:   toFloat(nfe.vDesc),
    vIPI:    toFloat(nfe.vIPI),

    // Itens normalizados
    itens: Array.isArray(nfe.itens) ? nfe.itens.map(normalizarItem) : [],

    // Rastreabilidade
    _origem:  nfe._origem  || 'XML',
    _arquivo: nfe._arquivo || '',

    // Validade
    valido: !!nfe.competencia && toFloat(nfe.vNF) > 0,
  }
}