export function parseXMLCFe(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parserError = doc.getElementsByTagName('parsererror')[0]

  if (parserError) {
    throw new Error('XML CF-e inválido')
  }

  const getNode = (el, tag) =>
    el?.getElementsByTagNameNS('*', tag)?.[0] || null

  const get = (el, tag) =>
    getNode(el, tag)?.textContent?.trim() || ''

  const getAny = (el, tags) => {
    for (const tag of tags) {
      const valor = get(el, tag)
      if (valor !== '') return valor
    }

    return ''
  }

  const num = valor => {
    if (valor === null || valor === undefined || valor === '') {
      return 0
    }

    const n = Number(
      String(valor)
        .trim()
        .replace(',', '.')
    )

    return Number.isFinite(n) ? n : 0
  }

  const infCFe = getNode(doc, 'infCFe')

  if (!infCFe) {
    throw new Error('Estrutura infCFe não encontrada')
  }

  const ide = getNode(infCFe, 'ide')
  const emit = getNode(infCFe, 'emit')
  const dest = getNode(infCFe, 'dest')
  const total = getNode(infCFe, 'total')

  const versao =
    infCFe.getAttribute('versaoDadosEnt') ||
    infCFe.getAttribute('versao') ||
    ''

  if (versao && !['0.07', '0.08'].includes(versao)) {
    throw new Error(
      `Layout CF-e ${versao} ainda não homologado`
    )
  }

  const idCFe =
    infCFe.getAttribute('Id') || ''

  const chaveCFe =
    idCFe.replace(/^CFe/i, '').trim()

  const dEmi = get(ide, 'dEmi')
  const hEmi = get(ide, 'hEmi')

  let dataEmissao = null
  let competencia = null

  if (/^\d{8}$/.test(dEmi)) {
    const ano = dEmi.slice(0, 4)
    const mes = dEmi.slice(4, 6)
    const dia = dEmi.slice(6, 8)

    dataEmissao = `${ano}-${mes}-${dia}`
    competencia = `${mes}/${ano}`
  }

  const mapaUF = {
    '11': 'RO',
    '12': 'AC',
    '13': 'AM',
    '14': 'RR',
    '15': 'PA',
    '16': 'AP',
    '17': 'TO',
    '21': 'MA',
    '22': 'PI',
    '23': 'CE',
    '24': 'RN',
    '25': 'PB',
    '26': 'PE',
    '27': 'AL',
    '28': 'SE',
    '29': 'BA',
    '31': 'MG',
    '32': 'ES',
    '33': 'RJ',
    '35': 'SP',
    '41': 'PR',
    '42': 'SC',
    '43': 'RS',
    '50': 'MS',
    '51': 'MT',
    '52': 'GO',
    '53': 'DF',
  }

  const cUF = get(ide, 'cUF')

  const dets =
    infCFe.getElementsByTagNameNS('*', 'det')

  const itens = []

  let totalDescontoItens = 0

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i]
    const prod = getNode(det, 'prod')
    const imposto = getNode(det, 'imposto')

    if (!prod) continue

    const icms = getNode(imposto, 'ICMS')
    const pis = getNode(imposto, 'PIS')
    const pisST = getNode(imposto, 'PISST')
    const cofins = getNode(imposto, 'COFINS')
    const cofinsST = getNode(imposto, 'COFINSST')

    const numeroItem =
      det.getAttribute('nItem') ||
      String(i + 1)

    const vDesc = num(get(prod, 'vDesc'))
    const vRatDesc = num(get(det, 'vRatDesc'))

    totalDescontoItens +=
      vDesc + vRatDesc

    itens.push({
      numeroItem,
      nItem: numeroItem,

      cProd: get(prod, 'cProd'),
      cEAN: get(prod, 'cEAN'),
      xProd: get(prod, 'xProd'),

      ncm: get(prod, 'NCM'),
      CEST: get(prod, 'CEST'),
      cfop: get(prod, 'CFOP'),

      uCom: get(prod, 'uCom'),
      qCom: num(get(prod, 'qCom')),
      vUnCom: num(get(prod, 'vUnCom')),
      vProd: num(get(prod, 'vProd')),

      vDesc,
      vOutro: num(get(prod, 'vOutro')),

      vRatDesc,
      vRatAcr: num(get(det, 'vRatAcr')),
      vItem: num(get(det, 'vItem')),

      qTrib: 0,
      uTrib: null,
      vUnTrib: 0,

      indTot: null,
      cBenef: get(prod, 'cBenef') || null,
      xPed: null,
      nItemPed: null,
      infAdProd: null,

      cstPIS:
        get(pis, 'CST') || null,

      vBCPIS:
        num(get(pis, 'vBC')),

      pPIS:
        num(get(pis, 'pPIS')),

      qBCProdPIS:
        num(get(pis, 'qBCProd')),

      vAliqProdPIS:
        num(get(pis, 'vAliqProd')),

      vItemPIS:
        num(get(pis, 'vPIS')),

      vPISST:
        num(get(pisST, 'vPIS')),

      cstCOFINS:
        get(cofins, 'CST') || null,

      vBCCOFINS:
        num(get(cofins, 'vBC')),

      pCOFINS:
        num(get(cofins, 'pCOFINS')),

      qBCProdCOFINS:
        num(get(cofins, 'qBCProd')),

      vAliqProdCOFINS:
        num(get(cofins, 'vAliqProd')),

      vItemCOFINS:
        num(get(cofins, 'vCOFINS')),

      vCOFINSST:
        num(get(cofinsST, 'vCOFINS')),

      cstICMS:
        get(icms, 'CST') || null,

      csosn:
        get(icms, 'CSOSN') || null,

      origICMS:
        getAny(icms, ['Orig', 'orig']) || null,

      modBC:
        get(icms, 'modBC') || null,

      vBCICMS:
        num(get(icms, 'vBC')),

      pRedBC:
        num(get(icms, 'pRedBC')),

      pICMS:
        num(get(icms, 'pICMS')),

      vICMS:
        num(get(icms, 'vICMS')),

      vICMSDeson:
        num(get(icms, 'vICMSDeson')),

      motDesICMS:
        get(icms, 'motDesICMS') || null,

      modBCST:
        get(icms, 'modBCST') || null,

      pMVAST:
        num(get(icms, 'pMVAST')),

      pRedBCST:
        num(get(icms, 'pRedBCST')),

      vBCST:
        num(get(icms, 'vBCST')),

      pICMSST:
        num(get(icms, 'pICMSST')),

      vICMSST:
        num(get(icms, 'vICMSST')),

      pFCP:
        num(get(icms, 'pFCP')),

      vFCP:
        num(get(icms, 'vFCP')),

      pFCPST:
        num(get(icms, 'pFCPST')),

      vFCPST:
        num(get(icms, 'vFCPST')),

      cstIPI: null,
      cEnqIPI: null,
      vBCIPI: 0,
      pIPI: 0,
      vIPI: 0,

      EXTIPI: null,
      vFrete: 0,
      vSeg: 0,
    })
  }

  const valorCFe =
    num(get(total, 'vCFe')) ||
    itens.reduce(
      (soma, item) =>
        soma +
        Number(
          item.vItem ||
          item.vProd ||
          0
        ),
      0
    )

  return {
    tipoDocumento: 'cfe',

    modelo: '59',
    versao,

    chNFe: chaveCFe || null,
    chaveCFe: chaveCFe || null,

    nNF:
      get(ide, 'nCFe') || null,

    serie:
      get(ide, 'nserieSAT') || null,

    dataEmissao,
    horaEmissao: hEmi || null,
    competencia,

    emitCNPJ:
      get(emit, 'CNPJ') || null,

    emitNome:
      get(emit, 'xNome') ||
      get(emit, 'xFant') ||
      'Emitente CF-e',

    emitUF:
      mapaUF[cUF] || null,

    destCNPJ:
      get(dest, 'CNPJ') || null,

    destCPF:
      get(dest, 'CPF') || null,

    destUF: null,

    tipoOperacao: 'saida',
    tipo: 'saida',
    naturezaOperacao:
      'VENDA AO CONSUMIDOR',

    finNFe: '1',
    idDest: '1',
    indFinal: '1',
    indPres: '1',

    totalNF: valorCFe,
    totalDesconto: totalDescontoItens,

    itens,
  }
}