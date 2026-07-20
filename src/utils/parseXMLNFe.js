// parseXMLNFe.js — Parser de XML de NF-e para o FiscalTrib
// Extrai itens de NF-e e agrupa por competência para o Motor

export function parseXMLNFe(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const get = (el, tag) => el?.getElementsByTagNameNS('*', tag)?.[0]?.textContent?.trim() || ''

  // Dados da nota
  const dhEmi = get(doc, 'dhEmi') || get(doc, 'dEmi')
  const data = new Date(dhEmi)
  const competencia = dhEmi
    ? `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    : null

  const tpNF = get(doc, 'tpNF') // 0=entrada, 1=saída
  const tipo = tpNF === '0' ? 'entrada' : 'saida'

  const emitCNPJ = get(doc, 'CNPJ') // primeiro CNPJ = emitente
  const emitNome = get(doc, 'xNome')

  const nNF = get(doc, 'nNF')
  const chNFe = get(doc, 'chNFe') || doc.querySelector('[Id]')?.getAttribute('Id')?.replace('NFe', '') || ''

  // Itens
  const dets = doc.getElementsByTagNameNS('*', 'det')
  const itens = []

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i]
    const prod = det.getElementsByTagNameNS('*', 'prod')[0]
    const imposto = det.getElementsByTagNameNS('*', 'imposto')[0]

    if (!prod) continue

    const ncm = get(prod, 'NCM')
    const xProd = get(prod, 'xProd')
    const cfop = get(prod, 'CFOP')
    const vProd = parseFloat(get(prod, 'vProd') || '0')
    const cProd = get(prod, 'cProd')

    // PIS
    const vPIS = parseFloat(
      get(imposto, 'vPIS') || '0'
    )
    const pPIS = parseFloat(
      get(imposto, 'pPIS') || '0'
    )
    const cstPIS = get(imposto, 'CST') // pega o primeiro CST (PIS)

    // COFINS
    const vCOFINS = parseFloat(
      get(imposto, 'vCOFINS') || '0'
    )
    const pCOFINS = parseFloat(
      get(imposto, 'pCOFINS') || '0'
    )

    // ICMS
    const vICMS = parseFloat(get(imposto, 'vICMS') || '0')
    const vST = parseFloat(get(imposto, 'vST') || '0')
    const vBCST = parseFloat(get(imposto, 'vBCST') || '0')

    // CSOSN (Simples Nacional)
    const csosn = get(imposto, 'CSOSN')

    itens.push({
      ncm,
      xProd,
      cfop,
      cProd,
      vProd,
      vPIS,
      pPIS,
      vCOFINS,
      pCOFINS,
      vICMS,
      vST,
      vBCST,
      cstPIS,
      csosn,
    })
  }

  // Totais da nota
  const tot = doc.getElementsByTagNameNS('*', 'ICMSTot')[0]
  const totalProd = parseFloat(get(tot, 'vProd') || '0')
  const totalNF = parseFloat(get(tot, 'vNF') || '0')
  const totalPIS = parseFloat(get(tot, 'vPIS') || '0')
  const totalCOFINS = parseFloat(get(tot, 'vCOFINS') || '0')
  const totalST = parseFloat(get(tot, 'vST') || '0')
  const totalICMS = parseFloat(get(tot, 'vICMS') || '0')

  // CRT do emitente (1=Simples, 3=Normal)
  const crt = get(doc, 'CRT')

  return {
    competencia,
    tipo,
    nNF,
    chNFe,
    emitCNPJ,
    emitNome,
    crt,
    totalProd,
    totalNF,
    totalPIS,
    totalCOFINS,
    totalST,
    totalICMS,
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