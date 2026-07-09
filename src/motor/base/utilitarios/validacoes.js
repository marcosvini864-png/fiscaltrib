/**
 * validacoes.js — Base de Conhecimento Tributária — FiscalTrib
 * Funções de validação de documentos, campos e dados fiscais.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CNPJ
// ─────────────────────────────────────────────────────────────

/**
 * Valida um CNPJ.
 * Aceita formatado (XX.XXX.XXX/XXXX-XX) ou apenas números.
 *
 * @param {string} cnpj
 * @returns {{ valido: boolean, motivo: string, cnpjLimpo: string }}
 */
export function validarCNPJ(cnpj) {
  if (!cnpj) return { valido: false, motivo: 'CNPJ não informado', cnpjLimpo: '' }

  const limpo = cnpj.replace(/\D/g, '')

  if (limpo.length !== 14) {
    return { valido: false, motivo: 'CNPJ deve ter 14 dígitos', cnpjLimpo: limpo }
  }

  // Verifica sequências inválidas
  if (/^(\d)\1+$/.test(limpo)) {
    return { valido: false, motivo: 'CNPJ inválido — todos os dígitos iguais', cnpjLimpo: limpo }
  }

  // Cálculo do primeiro dígito verificador
  const calcDigito = (cnpjParcial, pesos) => {
    const soma = cnpjParcial.split('').reduce((s, d, i) => s + parseInt(d) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigito(limpo.slice(0, 12), pesos1)
  const d2 = calcDigito(limpo.slice(0, 13), pesos2)

  if (d1 !== parseInt(limpo[12]) || d2 !== parseInt(limpo[13])) {
    return { valido: false, motivo: 'CNPJ inválido — dígitos verificadores incorretos', cnpjLimpo: limpo }
  }

  return { valido: true, motivo: '', cnpjLimpo: limpo }
}

/**
 * Formata um CNPJ para exibição.
 *
 * @param {string} cnpj
 * @returns {string}
 */
export function formatarCNPJ(cnpj) {
  if (!cnpj) return ''
  const limpo = cnpj.replace(/\D/g, '').padStart(14, '0')
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CPF
// ─────────────────────────────────────────────────────────────

/**
 * Valida um CPF.
 *
 * @param {string} cpf
 * @returns {{ valido: boolean, motivo: string, cpfLimpo: string }}
 */
export function validarCPF(cpf) {
  if (!cpf) return { valido: false, motivo: 'CPF não informado', cpfLimpo: '' }

  const limpo = cpf.replace(/\D/g, '')

  if (limpo.length !== 11) {
    return { valido: false, motivo: 'CPF deve ter 11 dígitos', cpfLimpo: limpo }
  }

  if (/^(\d)\1+$/.test(limpo)) {
    return { valido: false, motivo: 'CPF inválido — todos os dígitos iguais', cpfLimpo: limpo }
  }

  const calcDigito = (cpfParcial, tamanho) => {
    let soma = 0
    for (let i = 0; i < tamanho; i++) {
      soma += parseInt(cpfParcial[i]) * (tamanho + 1 - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 || resto === 11 ? 0 : resto
  }

  const d1 = calcDigito(limpo, 9)
  const d2 = calcDigito(limpo, 10)

  if (d1 !== parseInt(limpo[9]) || d2 !== parseInt(limpo[10])) {
    return { valido: false, motivo: 'CPF inválido — dígitos verificadores incorretos', cpfLimpo: limpo }
  }

  return { valido: true, motivo: '', cpfLimpo: limpo }
}

/**
 * Formata um CPF para exibição.
 *
 * @param {string} cpf
 * @returns {string}
 */
export function formatarCPF(cpf) {
  if (!cpf) return ''
  const limpo = cpf.replace(/\D/g, '').padStart(11, '0')
  return limpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE NCM
// ─────────────────────────────────────────────────────────────

/**
 * Valida um código NCM.
 * NCM válido: 8 dígitos numéricos.
 *
 * @param {string} ncm
 * @returns {{ valido: boolean, motivo: string, ncmLimpo: string }}
 */
export function validarNCM(ncm) {
  if (!ncm) return { valido: false, motivo: 'NCM não informado', ncmLimpo: '' }

  const limpo = ncm.replace(/\D/g, '')

  if (limpo.length < 4 || limpo.length > 8) {
    return {
      valido: false,
      motivo: `NCM deve ter entre 4 e 8 dígitos — informado: ${limpo.length}`,
      ncmLimpo: limpo,
    }
  }

  // NCM com 4 dígitos é válido (nível de posição)
  // NCM com 6 dígitos é válido (nível de subposição)
  // NCM com 8 dígitos é válido (nível de item)
  return { valido: true, motivo: '', ncmLimpo: limpo }
}

/**
 * Formata um NCM para exibição (XXXX.XX.XX).
 *
 * @param {string} ncm
 * @returns {string}
 */
export function formatarNCM(ncm) {
  if (!ncm) return ''
  const limpo = ncm.replace(/\D/g, '')
  if (limpo.length === 8) {
    return limpo.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3')
  }
  return limpo
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CHAVE DE NF-e
// ─────────────────────────────────────────────────────────────

/**
 * Valida a chave de acesso de uma NF-e (44 dígitos).
 *
 * @param {string} chave
 * @returns {{ valida: boolean, motivo: string, chaveFormatada: string }}
 */
export function validarChaveNFe(chave) {
  if (!chave) return { valida: false, motivo: 'Chave não informada', chaveFormatada: '' }

  const limpa = chave.replace(/\D/g, '')

  if (limpa.length !== 44) {
    return {
      valida: false,
      motivo: `Chave NF-e deve ter 44 dígitos — informado: ${limpa.length}`,
      chaveFormatada: '',
    }
  }

  // Valida o dígito verificador da chave (módulo 11)
  const pesos = []
  for (let i = 0; i < 43; i++) {
    pesos.push(2 + (i % 8))
  }

  const soma = limpa.slice(0, 43).split('').reduce((s, d, i) => s + parseInt(d) * pesos[42 - i], 0)
  const resto = soma % 11
  const dv    = resto < 2 ? 0 : 11 - resto

  if (dv !== parseInt(limpa[43])) {
    return {
      valida: false,
      motivo: 'Chave NF-e inválida — dígito verificador incorreto',
      chaveFormatada: '',
    }
  }

  // Formata a chave em grupos de 4
  const formatada = limpa.replace(/(\d{4})(?=\d)/g, '$1 ').trim()

  return { valida: true, motivo: '', chaveFormatada: formatada, chaveLimpa: limpa }
}

/**
 * Extrai informações da chave NF-e.
 *
 * @param {string} chave - 44 dígitos
 * @returns {object|null}
 */
export function extrairInfoChaveNFe(chave) {
  if (!chave) return null
  const limpa = chave.replace(/\D/g, '')
  if (limpa.length !== 44) return null

  return {
    cUF:        limpa.slice(0, 2),   // código UF emitente
    aamm:       limpa.slice(2, 6),   // ano e mês de emissão
    cnpj:       limpa.slice(6, 20),  // CNPJ emitente
    mod:        limpa.slice(20, 22), // modelo (55=NF-e, 65=NFC-e)
    serie:      limpa.slice(22, 25), // série
    nNF:        limpa.slice(25, 34), // número da NF
    tpEmis:     limpa.slice(34, 35), // tipo emissão
    cNF:        limpa.slice(35, 43), // código numérico
    cDV:        limpa.slice(43, 44), // dígito verificador
    competencia: `${limpa.slice(2, 4).replace(/^(\d{2})$/, '20$1')}-${limpa.slice(4, 6)}`,
  }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CEST
// ─────────────────────────────────────────────────────────────

/**
 * Valida um código CEST.
 * Formato: XX.XXX.XX (7 dígitos)
 *
 * @param {string} cest
 * @returns {{ valido: boolean, motivo: string }}
 */
export function validarCEST(cest) {
  if (!cest) return { valido: false, motivo: 'CEST não informado' }

  const limpo = cest.replace(/\D/g, '')

  if (limpo.length !== 7) {
    return { valido: false, motivo: `CEST deve ter 7 dígitos — informado: ${limpo.length}` }
  }

  return { valido: true, motivo: '', cestFormatado: limpo.replace(/^(\d{2})(\d{3})(\d{2})$/, '$1.$2.$3') }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CST E CSOSN
// ─────────────────────────────────────────────────────────────

// CSTs válidos de ICMS (regime normal)
const CST_ICMS_VALIDOS = [
  '00','10','20','30','40','41','50','51','60','70','90',
]

// CSOSNs válidos (Simples Nacional)
const CSOSN_VALIDOS = [
  '101','102','103','201','202','203','300','400','500','900',
]

// CSTs de PIS/COFINS
const CST_PIS_COFINS_VALIDOS = [
  '01','02','03','04','05','06','07','08','09',
  '49','50','51','52','53','54','55','56','60','61','62','63','64','65','66','67','70','71','72','73','74','75','98','99',
]

/**
 * Valida um CST de ICMS.
 *
 * @param {string} cst
 * @returns {{ valido: boolean, motivo: string, isST: boolean }}
 */
export function validarCSTICMS(cst) {
  if (!cst) return { valido: false, motivo: 'CST não informado', isST: false }
  const limpo = cst.replace(/\D/g, '').padStart(2, '0')
  const valido = CST_ICMS_VALIDOS.includes(limpo)
  const isST   = ['10', '30', '60', '70', '90'].includes(limpo)
  return {
    valido,
    motivo:  valido ? '' : `CST "${limpo}" não reconhecido`,
    isST,
    cstLimpo: limpo,
  }
}

/**
 * Valida um CSOSN (Simples Nacional).
 *
 * @param {string} csosn
 * @returns {{ valido: boolean, motivo: string, isST: boolean }}
 */
export function validarCSOSN(csosn) {
  if (!csosn) return { valido: false, motivo: 'CSOSN não informado', isST: false }
  const limpo  = csosn.replace(/\D/g, '')
  const valido = CSOSN_VALIDOS.includes(limpo)
  const isST   = ['201', '202', '203', '500', '900'].includes(limpo)
  return {
    valido,
    motivo:    valido ? '' : `CSOSN "${limpo}" não reconhecido`,
    isST,
    csosnLimpo: limpo,
  }
}

/**
 * Valida um CST de PIS/COFINS.
 *
 * @param {string} cst
 * @returns {{ valido: boolean, motivo: string, isAliqZero: boolean, isMonofasico: boolean }}
 */
export function validarCSTPISCOFINS(cst) {
  if (!cst) return { valido: false, motivo: 'CST PIS/COFINS não informado' }
  const limpo       = cst.replace(/\D/g, '').padStart(2, '0')
  const valido      = CST_PIS_COFINS_VALIDOS.includes(limpo)
  const isAliqZero  = ['04', '06', '07', '08', '09'].includes(limpo)
  const isMonofasico = ['04'].includes(limpo)  // CST 04 = monofásico alíquota zero

  return {
    valido,
    motivo:      valido ? '' : `CST PIS/COFINS "${limpo}" não reconhecido`,
    isAliqZero,
    isMonofasico,
    cstLimpo:    limpo,
  }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CFOP
// ─────────────────────────────────────────────────────────────

/**
 * Valida e classifica um CFOP.
 *
 * @param {string} cfop
 * @returns {object}
 */
export function validarCFOP(cfop) {
  if (!cfop) return { valido: false, motivo: 'CFOP não informado' }

  const limpo = cfop.replace(/\D/g, '')

  if (limpo.length !== 4) {
    return { valido: false, motivo: `CFOP deve ter 4 dígitos — informado: ${limpo.length}` }
  }

  const primeiro = parseInt(limpo[0])
  const isEntrada = [1, 2, 3].includes(primeiro)
  const isSaida   = [5, 6, 7].includes(primeiro)
  const isNacional    = [1, 5].includes(primeiro)
  const isInterestadual = [2, 6].includes(primeiro)
  const isExterior    = [3, 7].includes(primeiro)

  if (!isEntrada && !isSaida) {
    return { valido: false, motivo: `CFOP "${limpo}" com primeiro dígito inválido` }
  }

  return {
    valido:           true,
    motivo:           '',
    cfopLimpo:        limpo,
    isEntrada,
    isSaida,
    isNacional,
    isInterestadual,
    isExterior,
    tipo:             isEntrada ? 'ENTRADA' : 'SAIDA',
    abrangencia:      isNacional ? 'NACIONAL' : isInterestadual ? 'INTERESTADUAL' : 'EXTERIOR',
  }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE COMPETÊNCIA
// ─────────────────────────────────────────────────────────────

/**
 * Valida uma competência no formato 'AAAA-MM'.
 *
 * @param {string} competencia
 * @returns {{ valida: boolean, motivo: string }}
 */
export function validarCompetencia(competencia) {
  if (!competencia) return { valida: false, motivo: 'Competência não informada' }

  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return { valida: false, motivo: `Formato inválido "${competencia}" — esperado: AAAA-MM` }
  }

  const [ano, mes] = competencia.split('-').map(Number)

  if (ano < 2000 || ano > 2100) {
    return { valida: false, motivo: `Ano inválido: ${ano}` }
  }

  if (mes < 1 || mes > 12) {
    return { valida: false, motivo: `Mês inválido: ${mes}` }
  }

  return { valida: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE REGIME TRIBUTÁRIO
// ─────────────────────────────────────────────────────────────

const REGIMES_VALIDOS = ['Simples Nacional', 'Lucro Presumido', 'Lucro Real']

/**
 * Valida um regime tributário.
 *
 * @param {string} regime
 * @returns {{ valido: boolean, motivo: string }}
 */
export function validarRegime(regime) {
  if (!regime) return { valido: false, motivo: 'Regime tributário não informado' }
  if (!REGIMES_VALIDOS.includes(regime)) {
    return {
      valido: false,
      motivo: `Regime "${regime}" inválido. Válidos: ${REGIMES_VALIDOS.join(', ')}`,
    }
  }
  return { valido: true, motivo: '' }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE NF-e PARSEADA
// ─────────────────────────────────────────────────────────────

/**
 * Valida um objeto NF-e parseado pelo parseXMLNFe.
 *
 * @param {object} nfe
 * @returns {{ valida: boolean, motivo: string, alertas: string[] }}
 */
export function validarNFeParsada(nfe) {
  const alertas = []

  if (!nfe) return { valida: false, motivo: 'NF-e é nula', alertas }

  if (!nfe.competencia) {
    return { valida: false, motivo: 'Competência não identificada na NF-e', alertas }
  }

  if (!nfe.vNF || nfe.vNF <= 0) {
    return { valida: false, motivo: 'Valor total da NF-e é zero ou negativo', alertas }
  }

  // Alertas não bloqueantes
  if (!nfe.chNFe) alertas.push('Chave NF-e não disponível — deduplicação não garantida')
  if (!nfe.tpNF)  alertas.push('Tipo da NF-e (entrada/saída) não disponível — parser desatualizado')
  if (!nfe.cnpjEmi) alertas.push('CNPJ emitente não identificado')
  if (!nfe.itens || nfe.itens.length === 0) alertas.push('NF-e sem itens identificados')

  // Verifica itens
  if (nfe.itens && nfe.itens.length > 0) {
    const semNCM  = nfe.itens.filter(i => !i.ncm).length
    const semCFOP = nfe.itens.filter(i => !i.cfop).length
    if (semNCM  > 0) alertas.push(`${semNCM} item(ns) sem NCM`)
    if (semCFOP > 0) alertas.push(`${semCFOP} item(ns) sem CFOP`)
  }

  return { valida: true, motivo: '', alertas }
}

/**
 * Valida um lote de NF-es e retorna estatísticas.
 *
 * @param {Array} nfes
 * @returns {object}
 */
export function validarLoteNFes(nfes) {
  if (!nfes || nfes.length === 0) {
    return { validas: 0, invalidas: 0, total: 0, erros: [], alertas: [] }
  }

  let validas = 0
  let invalidas = 0
  const erros   = []
  const alertas = []

  nfes.forEach((nfe, idx) => {
    const validacao = validarNFeParsada(nfe)
    if (validacao.valida) {
      validas++
    } else {
      invalidas++
      erros.push({ indice: idx, arquivo: nfe.arquivo || `NF-e ${idx + 1}`, motivo: validacao.motivo })
    }
    validacao.alertas.forEach(alerta => {
      alertas.push({ indice: idx, arquivo: nfe.arquivo || `NF-e ${idx + 1}`, alerta })
    })
  })

  return {
    total:      nfes.length,
    validas,
    invalidas,
    percentualValidas: nfes.length > 0 ? Math.round((validas / nfes.length) * 100) : 0,
    erros,
    alertas,
    qualidade:  validas / nfes.length >= 0.95 ? 'BOA' :
                validas / nfes.length >= 0.80 ? 'REGULAR' : 'RUIM',
  }
}

// ─────────────────────────────────────────────────────────────
// VALIDAÇÕES GERAIS
// ─────────────────────────────────────────────────────────────

/**
 * Verifica se uma string não está vazia.
 *
 * @param {string} valor
 * @param {string} campo
 * @returns {{ valido: boolean, motivo: string }}
 */
export function validarCampoObrigatorio(valor, campo = 'Campo') {
  if (!valor || String(valor).trim() === '') {
    return { valido: false, motivo: `${campo} é obrigatório` }
  }
  return { valido: true, motivo: '' }
}

/**
 * Valida um valor numérico positivo.
 *
 * @param {any}    valor
 * @param {string} campo
 * @param {boolean} permitirZero
 * @returns {{ valido: boolean, motivo: string }}
 */
export function validarValorPositivo(valor, campo = 'Valor', permitirZero = false) {
  const num = parseFloat(valor)
  if (isNaN(num)) return { valido: false, motivo: `${campo} deve ser numérico` }
  if (!permitirZero && num <= 0) return { valido: false, motivo: `${campo} deve ser maior que zero` }
  if (permitirZero && num < 0)   return { valido: false, motivo: `${campo} não pode ser negativo` }
  return { valido: true, motivo: '' }
}

/**
 * Consolida múltiplas validações em um único resultado.
 *
 * @param {Array} validacoes - [{ valido: boolean, motivo: string }]
 * @returns {{ valido: boolean, erros: string[] }}
 */
export function consolidarValidacoes(validacoes) {
  const erros = validacoes
    .filter(v => !v.valido && v.motivo)
    .map(v => v.motivo)

  return {
    valido: erros.length === 0,
    erros,
    totalErros: erros.length,
  }
}

/**
 * Metadados deste utilitário.
 */
export const META_VALIDACOES = {
  versaoBase:   VERSAO_ATUAL.codigo,
  atualizadaEm: '2026-07-08',
  observacao:   'Funções de validação usadas por todos os parsers e motores do FiscalTrib.',
}