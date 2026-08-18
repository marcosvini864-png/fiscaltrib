// parseXMLNFe.js — Parser completo de XML de NF-e para o FiscalTribe
// Base para auditoria fiscal, Monofasicos, Classificacao de Itens,
// Apuracao do Simples, conciliacao PGDAS-D e futuros modulos SPED.

export function parseXMLNFe(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parserError = doc.getElementsByTagName('parsererror')[0]

  if (parserError) {
    throw new Error('XML de NF-e invalido')
  }

  // ============================================================
  // HELPERS
  // ============================================================

  const get = (el, tag) =>
    el?.getElementsByTagNameNS('*', tag)?.[0]?.textContent?.trim() || ''

  const numero = valor => {
    if (valor === null || valor === undefined || valor === '') return 0

    const n = parseFloat(String(valor).replace(',', '.'))

    return Number.isFinite(n) ? n : 0
  }

  // ============================================================
  // BLOCOS PRINCIPAIS DA NF-e
  // ============================================================

  const ide = doc.getElementsByTagNameNS('*', 'ide')[0]
  const emit = doc.getElementsByTagNameNS('*', 'emit')[0]
  const dest = doc.getElementsByTagNameNS('*', 'dest')[0]
  const infNFe = doc.getElementsByTagNameNS('*', 'infNFe')[0]

  const enderEmit = emit?.getElementsByTagNameNS('*', 'enderEmit')?.[0]
  const enderDest = dest?.getElementsByTagNameNS('*', 'enderDest')?.[0]

  // ============================================================
  // IDENTIFICACAO DA NF-e
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

  const tipo =
    tpNF === '0'
      ? 'entrada'
      : tpNF === '1'
        ? 'saida'
        : ''

  const naturezaOperacao = get(ide, 'natOp')

  const nNF = get(ide, 'nNF')
  const serie = get(ide, 'serie')
  const modelo = get(ide, 'mod')

  const finNFe = get(ide, 'finNFe')
  const idDest = get(ide, 'idDest')
  const indFinal = get(ide, 'indFinal')
  const indPres = get(ide, 'indPres')

  const chNFe =
    get(doc, 'chNFe') ||
    infNFe?.getAttribute('Id')?.replace(/^NFe/, '') ||
    ''

  // ============================================================
  // EMITENTE
  // ============================================================

  const emitCNPJ =
    get(emit, 'CNPJ') ||
    get(emit, 'CPF')

  const emitNome = get(emit, 'xNome')
  const emitFantasia = get(emit, 'xFant')

  const emitIE = get(emit, 'IE')

  // CRT:
  // 1 = Simples Nacional
  // 2 = Simples Nacional - excesso sublimite
  // 3 = Regime Normal
  const crt = get(emit, 'CRT')

  const emitUF = get(enderEmit, 'UF')

  // ============================================================
  // DESTINATARIO
  // ============================================================

  const destCNPJ =
    get(dest, 'CNPJ') ||
    get(dest, 'CPF')

  const destNome = get(dest, 'xNome')
  const destIE = get(dest, 'IE')

  const destUF = get(enderDest, 'UF')

  // ============================================================
  // ITENS DA NF-e
  // ============================================================

  const dets = doc.getElementsByTagNameNS('*', 'det')

  const itens = []

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i]

    const prod =
      det.getElementsByTagNameNS('*', 'prod')[0]

    const imposto =
      det.getElementsByTagNameNS('*', 'imposto')[0]

    if (!prod) continue

    // ==========================================================
    // PRODUTO
    // ==========================================================

    const cProd = get(prod, 'cProd')
    const xProd = get(prod, 'xProd')

    const ncm = get(prod, 'NCM')
    const cfop = get(prod, 'CFOP')

    const cEAN =
      get(prod, 'cEAN') ||
      get(prod, 'cEANTrib')

    const cEANTrib = get(prod, 'cEANTrib')

    const EXTIPI = get(prod, 'EXTIPI')
    const CEST = get(prod, 'CEST')
    const cBenef = get(prod, 'cBenef')

    const uCom = get(prod, 'uCom')
    const qCom = numero(get(prod, 'qCom'))
    const vUnCom = numero(get(prod, 'vUnCom'))

    const uTrib = get(prod, 'uTrib')
    const qTrib = numero(get(prod, 'qTrib'))
    const vUnTrib = numero(get(prod, 'vUnTrib'))

    const vProd = numero(get(prod, 'vProd'))

    const vFrete = numero(get(prod, 'vFrete'))
    const vSeg = numero(get(prod, 'vSeg'))
    const vDesc = numero(get(prod, 'vDesc'))
    const vOutro = numero(get(prod, 'vOutro'))

    const indTot = get(prod, 'indTot')

    const xPed = get(prod, 'xPed')
    const nItemPed = get(prod, 'nItemPed')

    const infAdProd = get(det, 'infAdProd')

    // ==========================================================
    // PIS
    // ==========================================================

    const grupoPIS =
      imposto?.getElementsByTagNameNS('*', 'PIS')?.[0]

    const cstPIS = get(grupoPIS, 'CST')

    const vBCPIS = numero(
      get(grupoPIS, 'vBC')
    )

    const pPIS = numero(
      get(grupoPIS, 'pPIS')
    )

    const qBCProdPIS = numero(
      get(grupoPIS, 'qBCProd')
    )

    const vAliqProdPIS = numero(
      get(grupoPIS, 'vAliqProd')
    )

    const vPIS = numero(
      get(grupoPIS, 'vPIS')
    )

    // ==========================================================
    // PIS-ST
    // ==========================================================

    const grupoPISST =
      imposto?.getElementsByTagNameNS('*', 'PISST')?.[0]

    const vBCPISST = numero(
      get(grupoPISST, 'vBC')
    )

    const pPISST = numero(
      get(grupoPISST, 'pPIS')
    )

    const qBCProdPISST = numero(
      get(grupoPISST, 'qBCProd')
    )

    const vAliqProdPISST = numero(
      get(grupoPISST, 'vAliqProd')
    )

    const vPISST = numero(
      get(grupoPISST, 'vPIS')
    )

    // ==========================================================
    // COFINS
    // ==========================================================

    const grupoCOFINS =
      imposto?.getElementsByTagNameNS('*', 'COFINS')?.[0]

    const cstCOFINS = get(grupoCOFINS, 'CST')

    const vBCCOFINS = numero(
      get(grupoCOFINS, 'vBC')
    )

    const pCOFINS = numero(
      get(grupoCOFINS, 'pCOFINS')
    )

    const qBCProdCOFINS = numero(
      get(grupoCOFINS, 'qBCProd')
    )

    const vAliqProdCOFINS = numero(
      get(grupoCOFINS, 'vAliqProd')
    )

    const vCOFINS = numero(
      get(grupoCOFINS, 'vCOFINS')
    )

    // ==========================================================
    // COFINS-ST
    // ==========================================================

    const grupoCOFINSST =
      imposto?.getElementsByTagNameNS('*', 'COFINSST')?.[0]

    const vBCCOFINSST = numero(
      get(grupoCOFINSST, 'vBC')
    )

    const pCOFINSST = numero(
      get(grupoCOFINSST, 'pCOFINS')
    )

    const qBCProdCOFINSST = numero(
      get(grupoCOFINSST, 'qBCProd')
    )

    const vAliqProdCOFINSST = numero(
      get(grupoCOFINSST, 'vAliqProd')
    )

    const vCOFINSST = numero(
      get(grupoCOFINSST, 'vCOFINS')
    )

    // ==========================================================
    // ICMS
    //
    // O parser trabalha sobre o bloco <ICMS>, sem depender do
    // nome especifico do subgrupo:
    //
    // ICMS00
    // ICMS10
    // ICMS20
    // ICMS30
    // ICMS40
    // ICMS51
    // ICMS60
    // ICMS70
    // ICMS90
    // ICMSSN101
    // ICMSSN102
    // ICMSSN201
    // ICMSSN202
    // ICMSSN500
    // ICMSSN900
    // etc.
    // ==========================================================

    const grupoICMS =
      imposto?.getElementsByTagNameNS('*', 'ICMS')?.[0]

    const origemICMS =
      get(grupoICMS, 'orig')

    const cstICMS =
      get(grupoICMS, 'CST')

    const csosn =
      get(grupoICMS, 'CSOSN')

    // Base normal
    const modBC =
      get(grupoICMS, 'modBC')

    const vBCICMS =
      numero(get(grupoICMS, 'vBC'))

    const pRedBC =
      numero(get(grupoICMS, 'pRedBC'))

    const pICMS =
      numero(get(grupoICMS, 'pICMS'))

    const vICMS =
      numero(get(grupoICMS, 'vICMS'))

    // Diferimento
    const pDif =
      numero(get(grupoICMS, 'pDif'))

    const vICMSOp =
      numero(get(grupoICMS, 'vICMSOp'))

    const vICMSDif =
      numero(get(grupoICMS, 'vICMSDif'))

    // Desoneracao
    const vICMSDeson =
      numero(get(grupoICMS, 'vICMSDeson'))

    const motDesICMS =
      get(grupoICMS, 'motDesICMS')

    // ==========================================================
    // ICMS-ST
    // ==========================================================

    const modBCST =
      get(grupoICMS, 'modBCST')

    const pMVAST =
      numero(get(grupoICMS, 'pMVAST'))

    const pRedBCST =
      numero(get(grupoICMS, 'pRedBCST'))

    const vBCST =
      numero(get(grupoICMS, 'vBCST'))

    const pICMSST =
      numero(get(grupoICMS, 'pICMSST'))

    const vICMSST =
      numero(
        get(grupoICMS, 'vICMSST') ||
        get(grupoICMS, 'vST')
      )

    // ==========================================================
    // ICMS-ST RETIDO ANTERIORMENTE
    // ==========================================================

    const vBCSTRet =
      numero(get(grupoICMS, 'vBCSTRet'))

    const pST =
      numero(get(grupoICMS, 'pST'))

    const vICMSSubstituto =
      numero(get(grupoICMS, 'vICMSSubstituto'))

    const vICMSSTRet =
      numero(get(grupoICMS, 'vICMSSTRet'))

    // ==========================================================
    // FCP
    // ==========================================================

    const vBCFCP =
      numero(get(grupoICMS, 'vBCFCP'))

    const pFCP =
      numero(get(grupoICMS, 'pFCP'))

    const vFCP =
      numero(get(grupoICMS, 'vFCP'))

    // ==========================================================
    // FCP-ST
    // ==========================================================

    const vBCFCPST =
      numero(get(grupoICMS, 'vBCFCPST'))

    const pFCPST =
      numero(get(grupoICMS, 'pFCPST'))

    const vFCPST =
      numero(get(grupoICMS, 'vFCPST'))

    // ==========================================================
    // FCP-ST RETIDO
    // ==========================================================

    const vBCFCPSTRet =
      numero(get(grupoICMS, 'vBCFCPSTRet'))

    const pFCPSTRet =
      numero(get(grupoICMS, 'pFCPSTRet'))

    const vFCPSTRet =
      numero(get(grupoICMS, 'vFCPSTRet'))

    // ==========================================================
    // CREDITO ICMS SIMPLES NACIONAL
    // ==========================================================

    const pCredSN =
      numero(get(grupoICMS, 'pCredSN'))

    const vCredICMSSN =
      numero(get(grupoICMS, 'vCredICMSSN'))

    // ==========================================================
    // IPI
    // ==========================================================

    const grupoIPI =
      imposto?.getElementsByTagNameNS('*', 'IPI')?.[0]

    const cEnqIPI =
      get(grupoIPI, 'cEnq')

    const cstIPI =
      get(grupoIPI, 'CST')

    const vBCIPI =
      numero(get(grupoIPI, 'vBC'))

    const pIPI =
      numero(get(grupoIPI, 'pIPI'))

    const qUnidIPI =
      numero(get(grupoIPI, 'qUnid'))

    const vUnidIPI =
      numero(get(grupoIPI, 'vUnid'))

    const vIPI =
      numero(get(grupoIPI, 'vIPI'))

    // ==========================================================
    // II — IMPOSTO DE IMPORTACAO
    // ==========================================================

    const grupoII =
      imposto?.getElementsByTagNameNS('*', 'II')?.[0]

    const vBCII =
      numero(get(grupoII, 'vBC'))

    const vDespAdu =
      numero(get(grupoII, 'vDespAdu'))

    const vII =
      numero(get(grupoII, 'vII'))

    const vIOF =
      numero(get(grupoII, 'vIOF'))

    // ==========================================================
    // ITEM ESTRUTURADO
    // ==========================================================

    itens.push({
      numeroItem: i + 1,

      // --------------------------------------------------------
      // Produto
      // --------------------------------------------------------

      cProd,
      xProd,
      ncm,
      cfop,

      cEAN,
      cEANTrib,

      EXTIPI,
      CEST,
      cBenef,

      uCom,
      qCom,
      vUnCom,

      uTrib,
      qTrib,
      vUnTrib,

      vProd,
      vFrete,
      vSeg,
      vDesc,
      vOutro,

      indTot,

      xPed,
      nItemPed,

      infAdProd,

      // --------------------------------------------------------
      // Compatibilidade com AbaMonofasicos.jsx atual
      // --------------------------------------------------------

      vItemPIS: vPIS,
      vItemCOFINS: vCOFINS,

      // --------------------------------------------------------
      // PIS
      // --------------------------------------------------------

      cstPIS,
      vBCPIS,
      pPIS,
      qBCProdPIS,
      vAliqProdPIS,
      vPIS,

      // --------------------------------------------------------
      // PIS-ST
      // --------------------------------------------------------

      vBCPISST,
      pPISST,
      qBCProdPISST,
      vAliqProdPISST,
      vPISST,

      // --------------------------------------------------------
      // COFINS
      // --------------------------------------------------------

      cstCOFINS,
      vBCCOFINS,
      pCOFINS,
      qBCProdCOFINS,
      vAliqProdCOFINS,
      vCOFINS,

      // --------------------------------------------------------
      // COFINS-ST
      // --------------------------------------------------------

      vBCCOFINSST,
      pCOFINSST,
      qBCProdCOFINSST,
      vAliqProdCOFINSST,
      vCOFINSST,

      // --------------------------------------------------------
      // ICMS
      // --------------------------------------------------------

      origemICMS,

      cstICMS,
      csosn,

      modBC,
      vBCICMS,
      pRedBC,
      pICMS,
      vICMS,

      pDif,
      vICMSOp,
      vICMSDif,

      vICMSDeson,
      motDesICMS,

      // --------------------------------------------------------
      // ICMS-ST
      // --------------------------------------------------------

      modBCST,
      pMVAST,
      pRedBCST,
      vBCST,
      pICMSST,
      vICMSST,

      // --------------------------------------------------------
      // ST retido
      // --------------------------------------------------------

      vBCSTRet,
      pST,
      vICMSSubstituto,
      vICMSSTRet,

      // --------------------------------------------------------
      // FCP
      // --------------------------------------------------------

      vBCFCP,
      pFCP,
      vFCP,

      // --------------------------------------------------------
      // FCP-ST
      // --------------------------------------------------------

      vBCFCPST,
      pFCPST,
      vFCPST,

      // --------------------------------------------------------
      // FCP-ST retido
      // --------------------------------------------------------

      vBCFCPSTRet,
      pFCPSTRet,
      vFCPSTRet,

      // --------------------------------------------------------
      // Credito Simples Nacional
      // --------------------------------------------------------

      pCredSN,
      vCredICMSSN,

      // --------------------------------------------------------
      // IPI
      // --------------------------------------------------------

      cstIPI,
      cEnqIPI,
      vBCIPI,
      pIPI,
      qUnidIPI,
      vUnidIPI,
      vIPI,

      // --------------------------------------------------------
      // Imposto de Importacao
      // --------------------------------------------------------

      vBCII,
      vDespAdu,
      vII,
      vIOF,
    })
  }

  // ============================================================
  // TOTAIS DA NF-e
  // ============================================================

  const tot =
    doc.getElementsByTagNameNS('*', 'ICMSTot')[0]

  // ICMS
  const totalBCICMS =
    numero(get(tot, 'vBC'))

  const totalICMS =
    numero(get(tot, 'vICMS'))

  const totalICMSDeson =
    numero(get(tot, 'vICMSDeson'))

  // FCP
  const totalFCP =
    numero(get(tot, 'vFCP'))

  // ICMS-ST
  const totalBCST =
    numero(get(tot, 'vBCST'))

  const totalST =
    numero(
      get(tot, 'vST') ||
      get(tot, 'vICMSST')
    )

  const totalFCPST =
    numero(get(tot, 'vFCPST'))

  const totalFCPSTRet =
    numero(get(tot, 'vFCPSTRet'))

  // Produtos
  const totalProd =
    numero(get(tot, 'vProd'))

  // Frete
  const totalFrete =
    numero(get(tot, 'vFrete'))

  // Seguro
  const totalSeguro =
    numero(get(tot, 'vSeg'))

  // Desconto
  const totalDesconto =
    numero(get(tot, 'vDesc'))

  // Imposto de Importacao
  const totalII =
    numero(get(tot, 'vII'))

  // IPI
  const totalIPI =
    numero(get(tot, 'vIPI'))

  const totalIPIDevol =
    numero(get(tot, 'vIPIDevol'))

  // PIS
  const totalPIS =
    numero(get(tot, 'vPIS'))

  // COFINS
  const totalCOFINS =
    numero(get(tot, 'vCOFINS'))

  // Outras despesas
  const totalOutro =
    numero(get(tot, 'vOutro'))

  // Valor total NF-e
  const totalNF =
    numero(get(tot, 'vNF'))

  // ============================================================
  // RETORNO COMPLETO DA NF-e
  // ============================================================

  return {
    // ----------------------------------------------------------
    // Identificacao
    // ----------------------------------------------------------

    competencia,
    dataEmissao,

    tipo,
    tipoOperacao: tipo,

    naturezaOperacao,

    nNF,
    serie,
    modelo,

    chNFe,

    finNFe,
    idDest,
    indFinal,
    indPres,

    // ----------------------------------------------------------
    // Emitente
    // ----------------------------------------------------------

    emitCNPJ,
    emitNome,
    emitFantasia,
    emitIE,
    emitUF,

    crt,

    // ----------------------------------------------------------
    // Destinatario
    // ----------------------------------------------------------

    destCNPJ,
    destNome,
    destIE,
    destUF,

    // ----------------------------------------------------------
    // Totais
    // ----------------------------------------------------------

    totalBCICMS,
    totalICMS,
    totalICMSDeson,

    totalFCP,

    totalBCST,
    totalST,
    totalFCPST,
    totalFCPSTRet,

    totalProd,
    totalFrete,
    totalSeguro,
    totalDesconto,

    totalII,

    totalIPI,
    totalIPIDevol,

    totalPIS,
    totalCOFINS,

    totalOutro,
    totalNF,

    // ----------------------------------------------------------
    // Itens
    // ----------------------------------------------------------

    itens,
  }
}


// =============================================================
// AGRUPAMENTO POR COMPETENCIA
// =============================================================

export function agruparPorCompetencia(notas) {
  const mapa = {}

  for (const nota of notas) {
    const key =
      nota.competencia ||
      'desconhecido'

    if (!mapa[key]) {
      mapa[key] = {
        competencia: key,

        notas: [],
        itens: [],

        totalProd: 0,
        totalNF: 0,

        totalBCICMS: 0,
        totalICMS: 0,

        totalBCST: 0,
        totalST: 0,

        totalFCP: 0,
        totalFCPST: 0,

        totalIPI: 0,

        totalPIS: 0,
        totalCOFINS: 0,

        totalFrete: 0,
        totalSeguro: 0,
        totalDesconto: 0,
        totalOutro: 0,
      }
    }

    const grupo = mapa[key]

    grupo.notas.push(nota)

    grupo.totalProd +=
      numeroSeguro(nota.totalProd)

    grupo.totalNF +=
      numeroSeguro(nota.totalNF)

    grupo.totalBCICMS +=
      numeroSeguro(nota.totalBCICMS)

    grupo.totalICMS +=
      numeroSeguro(nota.totalICMS)

    grupo.totalBCST +=
      numeroSeguro(nota.totalBCST)

    grupo.totalST +=
      numeroSeguro(nota.totalST)

    grupo.totalFCP +=
      numeroSeguro(nota.totalFCP)

    grupo.totalFCPST +=
      numeroSeguro(nota.totalFCPST)

    grupo.totalIPI +=
      numeroSeguro(nota.totalIPI)

    grupo.totalPIS +=
      numeroSeguro(nota.totalPIS)

    grupo.totalCOFINS +=
      numeroSeguro(nota.totalCOFINS)

    grupo.totalFrete +=
      numeroSeguro(nota.totalFrete)

    grupo.totalSeguro +=
      numeroSeguro(nota.totalSeguro)

    grupo.totalDesconto +=
      numeroSeguro(nota.totalDesconto)

    grupo.totalOutro +=
      numeroSeguro(nota.totalOutro)

    grupo.itens.push(
      ...(nota.itens || [])
    )
  }

  return Object
    .values(mapa)
    .sort((a, b) =>
      ordenarCompetencias(
        a.competencia,
        b.competencia
      )
    )
}


// =============================================================
// HELPERS DO AGRUPAMENTO
// =============================================================

function numeroSeguro(valor) {
  const n = Number(valor || 0)

  return Number.isFinite(n)
    ? n
    : 0
}


function ordenarCompetencias(a, b) {
  const regex = /^(\d{2})\/(\d{4})$/

  const ma = String(a).match(regex)
  const mb = String(b).match(regex)

  if (!ma || !mb) {
    return String(a).localeCompare(String(b))
  }

  const valorA =
    Number(ma[2]) * 100 +
    Number(ma[1])

  const valorB =
    Number(mb[2]) * 100 +
    Number(mb[1])

  return valorA - valorB
}