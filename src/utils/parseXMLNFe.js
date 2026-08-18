// parseXMLNFe.js — Parser de XML de NF-e para o FiscalTribe
// Extrai dados completos da NF-e para auditoria, conciliação e Motor do Simples

export function parseXMLNFe(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parserError = doc.getElementsByTagName('parsererror')[0]
  if (parserError) {
    throw new Error('XML de NF-e inválido')
  }

  const get = (el, tag) =>
    el?.getElementsByTagNameNS('*', tag)?.[0]?.textContent?.trim() || ''

  const numero = (valor) => {
    const n = parseFloat(valor || '0')
    return Number.isFinite(n) ? n : 0
  }

  // ============================================================
  // BLOCOS PRINCIPAIS DA NF-e
  // ============================================================

  const ide = doc.getElementsByTagNameNS('*', 'ide')[0]
  const emit = doc.getElementsByTagNameNS('*', 'emit')[0]
  const dest = doc.getElementsByTagNameNS('*', 'dest')[0]
  const infNFe = doc.getElementsByTagNameNS('*', 'infNFe')[0]

  // ============================================================
  // IDENTIFICAÇÃO DA NOTA
  // ============================================================

  const dhEmi = get(ide, 'dhEmi') || get(ide, 'dEmi')

  let competencia = ''
  let dataEmissao = ''

  if (dhEmi) {
    const dataParte = dhEmi.substring(0, 10)

    if (/^\d{4}-\d{2}-\d{2}$/.test(dataParte)) {
      const [ano, mes] = dataParte.split('-')
      competencia = `${mes}/${ano}`
      dataEmissao = dataParte
    }
  }

  const tpNF = get(ide, 'tpNF')
  const tipo = tpNF === '0' ? 'entrada' : 'saida'

  const naturezaOperacao = get(ide, 'natOp')

  const nNF = get(ide, 'nNF')

  const chNFe =
    get(doc, 'chNFe') ||
    infNFe?.getAttribute('Id')?.replace(/^NFe/, '') ||
    ''

  // ============================================================
  // EMITENTE / DESTINATÁRIO
  // ============================================================

  const emitCNPJ = get(emit, 'CNPJ') || get(emit, 'CPF')
  const emitNome = get(emit, 'xNome')

  const destCNPJ = get(dest, 'CNPJ') || get(dest, 'CPF')
  const destNome = get(dest, 'xNome')

  // CRT: 1 = Simples Nacional / 3 = Regime Normal
  const crt = get(emit, 'CRT')

  // ============================================================
  // ITENS DA NF-e
  // ============================================================

  const dets = doc.getElementsByTagNameNS('*', 'det')
  const itens = []

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i]

    const prod = det.getElementsByTagNameNS('*', 'prod')[0]
    const imposto = det.getElementsByTagNameNS('*', 'imposto')[0]

    if (!prod) continue

    // ----------------------------------------------------------
    // PRODUTO
    // ----------------------------------------------------------

    const ncm = get(prod, 'NCM')
    const xProd = get(prod, 'xProd')
    const cfop = get(prod, 'CFOP')
    const cProd = get(prod, 'cProd')

    const cEAN = get(prod, 'cEAN') || get(prod, 'cEANTrib')
    const EXTIPI = get(prod, 'EXTIPI')
    const CEST = get(prod, 'CEST')

    const qCom = numero(get(prod, 'qCom'))
    const vProd = numero(get(prod, 'vProd'))
    const vDesc = numero(get(prod, 'vDesc'))
    const vFrete = numero(get(prod, 'vFrete'))

    // ----------------------------------------------------------
    // PIS
    // ----------------------------------------------------------

    const grupoPIS =
      imposto?.getElementsByTagNameNS('*', 'PIS')?.[0]

    const vPIS = numero(get(grupoPIS, 'vPIS'))
    const pPIS = numero(get(grupoPIS, 'pPIS'))
    const cstPIS = get(grupoPIS, 'CST')

    // ----------------------------------------------------------
    // COFINS
    // ----------------------------------------------------------

    const grupoCOFINS =
      imposto?.getElementsByTagNameNS('*', 'COFINS')?.[0]

    const vCOFINS = numero(get(grupoCOFINS, 'vCOFINS'))
    const pCOFINS = numero(get(grupoCOFINS, 'pCOFINS'))
    const cstCOFINS = get(grupoCOFINS, 'CST')

    // ----------------------------------------------------------
    // ICMS
    // ----------------------------------------------------------

    const grupoICMS =
      imposto?.getElementsByTagNameNS('*', 'ICMS')?.[0]

    const vICMS = numero(get(grupoICMS, 'vICMS'))

    const vICMSST = numero(
      get(grupoICMS, 'vICMSST') ||
      get(grupoICMS, 'vST')
    )

    const vBCST = numero(get(grupoICMS, 'vBCST'))

    const cstICMS = get(grupoICMS, 'CST')
    const csosn = get(grupoICMS, 'CSOSN')

    // ----------------------------------------------------------
    // IPI
    // ----------------------------------------------------------

    const grupoIPI =
      imposto?.getElementsByTagNameNS('*', 'IPI')?.[0]

    const vIPI = numero(get(grupoIPI, 'vIPI'))

    // ----------------------------------------------------------
    // ITEM ESTRUTURADO
    // ----------------------------------------------------------

    itens.push({
      numeroItem: i + 1,

      ncm,
      xProd,
      cfop,
      cProd,
      cEAN,
      EXTIPI,
      CEST,

      qCom,
      vProd,
      vDesc,
      vFrete,

      // Mantém compatibilidade com AbaMonofasicos.jsx
      vItemPIS: vPIS,
      vItemCOFINS: vCOFINS,

      // Também mantém nomes técnicos
      vPIS,
      pPIS,
      cstPIS,

      vCOFINS,
      pCOFINS,
      cstCOFINS,

      vICMS,
      vICMSST,
      vBCST,
      cstICMS,
      csosn,

      vIPI,
    })
  }

  // ============================================================
  // TOTAIS DA NF-e
  // ============================================================

  const tot = doc.getElementsByTagNameNS('*', 'ICMSTot')[0]

  const totalProd = numero(get(tot, 'vProd'))
  const totalNF = numero(get(tot, 'vNF'))

  const totalPIS = numero(get(tot, 'vPIS'))
  const totalCOFINS = numero(get(tot, 'vCOFINS'))

  const totalST = numero(
    get(tot, 'vST') ||
    get(tot, 'vICMSST')
  )

  const totalICMS = numero(get(tot, 'vICMS'))
  const totalIPI = numero(get(tot, 'vIPI'))
  const totalDesconto = numero(get(tot, 'vDesc'))
  const totalFrete = numero(get(tot, 'vFrete'))

  return {
    competencia,
    dataEmissao,

    tipo,
    tipoOperacao: tipo,
    naturezaOperacao,

    nNF,
    chNFe,

    emitCNPJ,
    emitNome,

    destCNPJ,
    destNome,

    crt,

    totalProd,
    totalNF,
    totalPIS,
    totalCOFINS,
    totalST,
    totalICMS,
    totalIPI,
    totalDesconto,
    totalFrete,

    itens,
  }
}

// Agrupa lista de notas por competência
export function agruparPorCompetencia(notas) {
  const mapa = {}

  for (const nota of notas) {
    const key = nota.competencia || 'desconhecido'
    if (!mapa[key]) {
      mapa[key] = {
        competencia: key,
        notas: [],
        totalProd: 0,
        totalPIS: 0,
        totalCOFINS: 0,
        totalST: 0,
        totalICMS: 0,
        itens: [],
      }
    }
    mapa[key].notas.push(nota)
    mapa[key].totalProd += nota.totalProd
    mapa[key].totalPIS += nota.totalPIS
    mapa[key].totalCOFINS += nota.totalCOFINS
    mapa[key].totalST += nota.totalST
    mapa[key].totalICMS += nota.totalICMS
    mapa[key].itens.push(...nota.itens)
  }

  return Object.values(mapa).sort((a, b) => a.competencia.localeCompare(b.competencia))
}