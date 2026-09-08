export function detectarDocumentoFiscalXML(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const parserError =
    doc.getElementsByTagName('parsererror')[0]

  if (parserError) {
    return {
      tipo: 'INVALIDO',
      modelo: '',
      versao: '',
      suportado: false,
    }
  }

  const getPrimeiro = tag =>
    doc.getElementsByTagNameNS('*', tag)?.[0] || null

  // EVENTOS NF-e / NFC-e
  const infEvento = getPrimeiro('infEvento')

  if (infEvento) {
    return {
      tipo: 'EVENTO_NFE',
      modelo: '',
      versao:
        infEvento.getAttribute('versao') ||
        '',
      suportado: true,
    }
  }

  // NF-e / NFC-e
  const infNFe = getPrimeiro('infNFe')
  const ide = getPrimeiro('ide')

  if (infNFe && ide) {
    const modelo =
      ide.getElementsByTagNameNS('*', 'mod')?.[0]
        ?.textContent
        ?.trim() || ''

    const versao =
      infNFe.getAttribute('versao') || ''

    if (modelo === '55') {
      return {
        tipo: 'NFE',
        modelo: '55',
        versao,
        suportado: true,
      }
    }

    if (modelo === '65') {
      return {
        tipo: 'NFCE',
        modelo: '65',
        versao,
        suportado: true,
      }
    }

    return {
      tipo: 'NFE_OUTRO_MODELO',
      modelo,
      versao,
      suportado: false,
    }
  }

  // CF-e SAT / MFE
  const infCFe = getPrimeiro('infCFe')
  const cfe = getPrimeiro('CFe')

  if (infCFe || cfe) {
    const origem = infCFe || cfe

    const versao =
      origem.getAttribute('versao') ||
      origem.getAttribute('versaoDadosEnt') ||
      ''

    return {
      tipo: 'CFE',
      modelo: '59',
      versao,
      suportado: true,
    }
  }

  // Outros XMLs fiscais/documentos
  const cte = getPrimeiro('infCte')
  if (cte) {
    return {
      tipo: 'CTE',
      modelo: '57',
      versao: cte.getAttribute('versao') || '',
      suportado: false,
    }
  }

  const mdfe = getPrimeiro('infMDFe')
  if (mdfe) {
    return {
      tipo: 'MDFE',
      modelo: '58',
      versao: mdfe.getAttribute('versao') || '',
      suportado: false,
    }
  }

  return {
    tipo: 'DESCONHECIDO',
    modelo: '',
    versao: '',
    suportado: false,
  }
}