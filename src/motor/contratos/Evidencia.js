/**
 * Evidencia.js — FiscalTrib
 * Contrato para representação de evidências no Motor de Inteligência Tributária.
 *
 * Uma evidência é qualquer documento ou dado concreto que sustenta
 * uma oportunidade identificada pelo motor.
 *
 * Versão: 1.0
 * Data: 2026-07-08
 */

// ─────────────────────────────────────────────────────────────
// ENUMERAÇÕES
// ─────────────────────────────────────────────────────────────

export const TIPO_EVIDENCIA = {
  XML_NFE:        'XML_NFE',        // XML de NF-e (entrada ou saída)
  PGDAS:          'PGDAS',          // PGDAS-D
  DAS:            'DAS',            // DAS pago
  DCTFWEB:        'DCTFWEB',        // DCTFWeb
  SPED_FISCAL:    'SPED_FISCAL',    // SPED Fiscal
  SPED_CONTRIB:   'SPED_CONTRIB',   // SPED Contribuições
  ECD:            'ECD',            // Escrituração Contábil Digital
  ECF:            'ECF',            // Escrituração Contábil Fiscal
  CSV:            'CSV',            // arquivo CSV importado
  EXTRATO_DEBITO: 'EXTRATO_DEBITO', // extrato de débitos PGFN/e-CAC
  MANUAL:         'MANUAL',         // dado inserido manualmente
  CALCULADO:      'CALCULADO',      // valor derivado de cálculo interno
}

export const ORIGEM_EVIDENCIA = {
  PARSER_XML:   'PARSER_XML',    // extraído pelo parseXMLNFe
  PARSER_SPED:  'PARSER_SPED',   // extraído pelo parseSPED
  PARSER_CSV:   'PARSER_CSV',    // extraído de CSV importado
  MOTOR:        'MOTOR',         // gerado internamente pelo motor
  USUARIO:      'USUARIO',       // informado pelo usuário
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

/**
 * Cria uma Evidencia vazia.
 * Todo motor deve usar esta função para criar evidências.
 *
 * @param {string} tipo - Um dos valores de TIPO_EVIDENCIA
 * @returns {object}
 */
export function criarEvidencia(tipo) {
  return {

    // ─── Identificação ───────────────────────────────────────
    id:              gerarIdEvidencia(),
    tipo,                          // TIPO_EVIDENCIA
    origem:          '',           // ORIGEM_EVIDENCIA

    // ─── Documento de origem ─────────────────────────────────
    documento: {
      chaveAcesso:   '',   // chNFe (44 dígitos) ou identificador equivalente
      numero:        '',   // número da NF-e, DAS, etc.
      serie:         '',   // série do documento
      arquivo:       '',   // nome do arquivo importado
      tipoOperacao:  '',   // '0'=entrada, '1'=saída (NF-e)
    },

    // ─── Emitente / Destinatário ─────────────────────────────
    emitente: {
      cnpj:        '',
      razaoSocial: '',
    },

    // ─── Produto / Item ──────────────────────────────────────
    item: {
      codigoProduto: '',   // cProd
      descricao:     '',   // xProd
      ncm:           '',
      cest:          '',
      cfop:          '',
      cst:           '',
      csosn:         '',
      quantidade:    0,
      valorUnitario: 0,
    },

    // ─── Período ─────────────────────────────────────────────
    competencia:   '',   // 'AAAA-MM'
    dataEmissao:   '',   // 'AAAA-MM-DD'

    // ─── Valores relevantes ──────────────────────────────────
    valores: {
      vProd:        0,   // valor do produto/item
      vICMS:        0,
      vICMSST:      0,
      vPIS:         0,
      vCOFINS:      0,
      vIPI:         0,
      vBC:          0,   // base de cálculo ICMS
      pICMS:        0,   // alíquota ICMS
      vBCST:        0,
      pICMSST:      0,
      pPIS:         0,
      pCOFINS:      0,
      vBCPIS:       0,
      vBCCOFINS:    0,
      creditoIdentificado: 0,   // valor do crédito que esta evidência sustenta
    },

    // ─── Relevância para a oportunidade ──────────────────────
    relevancia: {
      motivo:          '',   // por que esta evidência é relevante
      regraAplicada:   '',   // qual regra do motor identificou isso
      grauConfianca:   '',   // GRAU_CONFIANCA
    },

    // ─── Observações ─────────────────────────────────────────
    observacoes: '',
  }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

/**
 * Cria uma evidência a partir de um item de NF-e já parseado.
 * Atalho para o motor não precisar preencher campo por campo.
 *
 * @param {object} nfe  - Objeto retornado pelo parseXMLNFe
 * @param {object} item - Um item do array nfe.itens
 * @param {string} motivo - Por que este item é uma evidência
 * @param {number} creditoIdentificado - Valor do crédito desta evidência
 * @returns {object}
 */
export function evidenciaDaNFe(nfe, item, motivo, creditoIdentificado = 0) {
  const ev = criarEvidencia(TIPO_EVIDENCIA.XML_NFE)
  ev.origem                        = ORIGEM_EVIDENCIA.PARSER_XML
  ev.documento.chaveAcesso         = nfe.chNFe        || ''
  ev.documento.numero              = nfe.nNF          || ''
  ev.documento.serie               = nfe.serie        || ''
  ev.documento.arquivo             = nfe.arquivo      || ''
  ev.documento.tipoOperacao        = nfe.tpNF         || ''
  ev.emitente.cnpj                 = nfe.cnpjEmi      || ''
  ev.competencia                   = nfe.competencia  || ''
  ev.item.codigoProduto            = item.cProd       || ''
  ev.item.descricao                = item.xProd       || ''
  ev.item.ncm                      = item.ncm         || ''
  ev.item.cest                     = item.cest        || ''
  ev.item.cfop                     = item.cfop        || ''
  ev.item.cst                      = item.cst         || ''
  ev.item.quantidade               = item.qCom        || 0
  ev.item.valorUnitario            = item.vUnCom      || 0
  ev.valores.vProd                 = item.vProd       || 0
  ev.valores.vICMS                 = item.vItemICMS   || 0
  ev.valores.vICMSST               = item.vItemST     || 0
  ev.valores.vPIS                  = item.vItemPIS    || 0
  ev.valores.vCOFINS               = item.vItemCOFINS || 0
  ev.valores.vIPI                  = item.vItemIPI    || 0
  ev.valores.vBC                   = item.vBC         || 0
  ev.valores.pICMS                 = item.pICMS       || 0
  ev.valores.vBCST                 = item.vBCST       || 0
  ev.valores.pICMSST               = item.pICMSST     || 0
  ev.valores.pPIS                  = item.pPIS        || 0
  ev.valores.pCOFINS               = item.pCOFINS     || 0
  ev.valores.vBCPIS                = item.vBCPIS      || 0
  ev.valores.vBCCOFINS             = item.vBCCOFINS   || 0
  ev.valores.creditoIdentificado   = creditoIdentificado
  ev.relevancia.motivo             = motivo
  ev.relevancia.grauConfianca      = creditoIdentificado > 0 ? 'ALTO' : 'MEDIO'
  return ev
}

/**
 * Gera um ID único para a evidência.
 * Formato: EV-timestamp-random
 */
function gerarIdEvidencia() {
  return `EV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
}