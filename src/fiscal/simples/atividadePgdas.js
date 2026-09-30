// Resolução conservadora de atividade PGDAS a partir da evidência documental.
//
// O CFOP é usado aqui somente para identificar a natureza operacional da receita
// (produção própria x mercadoria de terceiros), mantendo PIS/COFINS e ICMS como
// dimensões tributárias independentes.

const CFOPS_PRODUCAO_PROPRIA = new Set([
  '5101', '5103', '5105', '5109', '5111', '5113', '5116', '5118', '5122',
  '5129', '5132', '5159', '5401', '5402', '5651', '5652', '5653',
  '6101', '6103', '6105', '6107', '6109', '6111', '6113', '6116', '6118',
  '6122', '6129', '6132', '6159', '6401', '6402', '6651', '6652', '6653',
  '7101', '7105', '7127', '7129', '7651',
])

const CFOPS_REVENDA = new Set([
  '5102', '5104', '5106', '5110', '5112', '5114', '5115', '5117', '5119',
  '5120', '5123', '5160', '5403', '5405', '5654', '5655', '5656',
  '6102', '6104', '6106', '6108', '6110', '6112', '6114', '6115', '6117',
  '6119', '6120', '6123', '6160', '6403', '6404', '6654', '6655', '6656',
  '7102', '7106', '7654',
])

const CFOPS_SERVICOS = new Set([
  '5301', '5302', '5303', '5304', '5305', '5306', '5307',
  '5351', '5352', '5353', '5354', '5355', '5356', '5357', '5359', '5360',
  '5932', '5933',
  '6301', '6302', '6303', '6304', '6305', '6306', '6307',
  '6351', '6352', '6353', '6354', '6355', '6356', '6357', '6359', '6360',
  '6932', '6933', '7301', '7358',
])

function normalizarTextoAtividade(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizarCfopAtividade(valor) {
  const cfop = String(valor ?? '').replace(/\D/g, '')
  return /^\d{4}$/.test(cfop) ? cfop : null
}

function identificarNaturezaDocumentoPorCfop(cfopOriginal) {
  const cfop = normalizarCfopAtividade(cfopOriginal)

  if (!cfop) {
    return {
      status: 'cfop_invalido',
      natureza: null,
      cfop: null,
    }
  }

  if (CFOPS_PRODUCAO_PROPRIA.has(cfop)) {
    return {
      status: 'ok',
      natureza: 'industrializacao',
      cfop,
    }
  }

  if (CFOPS_REVENDA.has(cfop)) {
    return {
      status: 'ok',
      natureza: 'revenda',
      cfop,
    }
  }

  if (CFOPS_SERVICOS.has(cfop)) {
    return {
      status: 'ok',
      natureza: 'servicos',
      cfop,
    }
  }

  return {
    status: 'cfop_sem_natureza_operacional_segura',
    natureza: null,
    cfop,
  }
}

function dadosOriginaisAtividade(atividade) {
  return atividade?.dados_originais &&
    typeof atividade.dados_originais === 'object'
    ? atividade.dados_originais
    : {}
}

function numeroSeguroAtividade(valor) {
  const numero = Number(valor ?? 0)
  return Number.isFinite(numero) ? numero : 0
}

function identificarNaturezaAtividadePgdas(atividade) {
  const dados = dadosOriginaisAtividade(atividade)

  const marcadores = [
    ['revenda', numeroSeguroAtividade(dados.receita_revenda)],
    ['industrializacao', numeroSeguroAtividade(dados.receita_industrializacao)],
    ['servicos', numeroSeguroAtividade(dados.receita_servicos)],
  ].filter(([, valor]) => valor > 0)

  if (marcadores.length === 1) {
    return marcadores[0][0]
  }

  const texto = normalizarTextoAtividade(
    [
      atividade?.tipo_atividade,
      atividade?.descricao_original,
      dados?.tipo_atividade,
      dados?.descricao,
      dados?.texto_original,
    ].filter(Boolean).join(' ')
  )

  const candidatos = new Set()

  if (/\brevenda\b|mercadoria adquirida|mercadoria recebida de terceiros/.test(texto)) {
    candidatos.add('revenda')
  }

  if (/industrializ|producao do estabelecimento|producao propria/.test(texto)) {
    candidatos.add('industrializacao')
  }

  if (/\bservic/.test(texto)) {
    candidatos.add('servicos')
  }

  return candidatos.size === 1
    ? Array.from(candidatos)[0]
    : null
}

function mercadosAtividadePgdas(atividade) {
  const dados = dadosOriginaisAtividade(atividade)
  const mercados = new Set()

  const interno = numeroSeguroAtividade(
    dados.mercado_interno ?? atividade?.mercado_interno
  )
  const externo = numeroSeguroAtividade(
    dados.mercado_externo ?? atividade?.mercado_externo
  )

  if (interno > 0) mercados.add('mercado_interno')
  if (externo > 0 || atividade?.exportacao === true) mercados.add('mercado_externo')

  return mercados
}

function atividadeTemTratamentoPisCofins(atividade, classificacao) {
  const classe = String(classificacao ?? '').trim()

  if (classe === 'monofasico' || classe === 'st_pis_cofins') {
    return Boolean(atividade?.pis_cofins_monofasico)
  }

  if (classe === 'tributado') {
    return !Boolean(atividade?.pis_cofins_monofasico)
  }

  return null
}

function rotuloAtividadePgdas(atividade, atividadesPgdas = []) {
  const base = String(
    atividade?.tipo_atividade ||
    atividade?.descricao_original ||
    ''
  ).trim()

  if (!base) return null

  const iguais = atividadesPgdas.filter(item =>
    String(
      item?.tipo_atividade ||
      item?.descricao_original ||
      ''
    ).trim() === base
  )

  if (iguais.length <= 1) return base

  const ordem = Number(atividade?.ordem_atividade || 0)
  return ordem > 0 ? `${base} [PGDAS ${ordem}]` : base
}


function resolverMercadoDocumentoParaAtividade(item) {
  const indicador = String(item?.indicador_destino ?? '').trim()

  if (indicador === '3') return 'mercado_externo'
  if (indicador === '1' || indicador === '2') return 'mercado_interno'

  if (indicador) return null

  const cfop = normalizarCfopAtividade(item?.cfop)
  const grupo = cfop?.charAt(0) || ''

  if (['1', '2', '5', '6'].includes(grupo)) return 'mercado_interno'
  if (['3', '7'].includes(grupo)) return 'mercado_externo'

  return null
}

function resolverAtividadePgdasDocumental({
  atividadesPgdas = [],
  item = null,
  mercado = null,
  classificacaoPisCofins = null,
} = {}) {
  if (!Array.isArray(atividadesPgdas)) {
    return {
      status: 'atividades_pgdas_invalidas',
      atividade: null,
      registro: null,
      origem: null,
    }
  }

  const atividadesComReceita = atividadesPgdas.filter(
    atividade => numeroSeguroAtividade(atividade?.receita_bruta) > 0
  )

  if (atividadesComReceita.length === 0) {
    return {
      status: 'atividade_pgdas_ausente',
      atividade: null,
      registro: null,
      origem: null,
    }
  }

  if (atividadesComReceita.length === 1) {
    const registro = atividadesComReceita[0]
    return {
      status: 'ok',
      atividade: rotuloAtividadePgdas(registro, atividadesComReceita),
      registro,
      origem: 'atividade_unica_pgdas',
      naturezaDocumento: identificarNaturezaDocumentoPorCfop(item?.cfop),
    }
  }

  const naturezaDocumento = identificarNaturezaDocumentoPorCfop(item?.cfop)
  let candidatas = [...atividadesComReceita]
  const criterios = []

  /*
   * Em multiatividade, um CFOP sem natureza operacional segura não pode
   * deixar o PIS/COFINS "escolher" entre naturezas diferentes. Isso
   * transformaria uma qualificação tributária em identidade de atividade.
   * Se todas as atividades concorrentes possuem a mesma natureza conhecida,
   * o PIS/COFINS ainda pode distinguir as segregações dentro dessa natureza.
   */
  if (!naturezaDocumento.natureza) {
    const naturezas = candidatas.map(identificarNaturezaAtividadePgdas)
    const naturezasConhecidas = new Set(naturezas.filter(Boolean))
    const possuiNaturezaNaoIdentificada = naturezas.some(natureza => !natureza)

    if (
      candidatas.length > 1 &&
      (naturezasConhecidas.size > 1 || possuiNaturezaNaoIdentificada)
    ) {
      return {
        status: 'atividade_pgdas_cfop_insuficiente',
        atividade: null,
        registro: null,
        origem: null,
        naturezaDocumento,
        criterios: [],
        candidatas: candidatas.map(atividade => ({
          id: atividade?.id || null,
          ordem: atividade?.ordem_atividade || null,
          rotulo: rotuloAtividadePgdas(atividade, atividadesComReceita),
          natureza: identificarNaturezaAtividadePgdas(atividade),
          pisCofinsMonofasico: Boolean(atividade?.pis_cofins_monofasico),
        })),
      }
    }
  }

  if (naturezaDocumento.natureza) {
    const porNatureza = candidatas.filter(
      atividade =>
        identificarNaturezaAtividadePgdas(atividade) ===
        naturezaDocumento.natureza
    )

    /*
     * O CFOP conhecido e inequívoco é evidência operacional.
     * Em cenário multiatividade, não fazemos fallback para uma natureza
     * diferente apenas para conseguir fechar uma atividade. Se o PGDAS
     * não possui atividade compatível, a operação fica pendente.
     */
    if (porNatureza.length === 0) {
      return {
        status: 'atividade_pgdas_sem_correspondencia_cfop',
        atividade: null,
        registro: null,
        origem: null,
        naturezaDocumento,
        criterios: ['cfop_natureza_atividade'],
        candidatas: candidatas.map(atividade => ({
          id: atividade?.id || null,
          ordem: atividade?.ordem_atividade || null,
          rotulo: rotuloAtividadePgdas(atividade, atividadesComReceita),
          natureza: identificarNaturezaAtividadePgdas(atividade),
          pisCofinsMonofasico: Boolean(atividade?.pis_cofins_monofasico),
        })),
      }
    }

    candidatas = porNatureza
    criterios.push('cfop_natureza_atividade')
  }

  const mercadoNormalizado = String(
    mercado || resolverMercadoDocumentoParaAtividade(item) || ''
  ).trim()

  if (mercadoNormalizado) {
    const candidatasComMercadoExplicito = candidatas.filter(
      atividade => mercadosAtividadePgdas(atividade).size > 0
    )

    const comMercadoExplicito = candidatasComMercadoExplicito.filter(atividade => {
      const mercados = mercadosAtividadePgdas(atividade)
      return mercados.has(mercadoNormalizado)
    })

    if (
      candidatasComMercadoExplicito.length > 0 &&
      comMercadoExplicito.length === 0
    ) {
      return {
        status: 'atividade_pgdas_sem_correspondencia_mercado',
        atividade: null,
        registro: null,
        origem: null,
        naturezaDocumento,
        criterios: [...criterios, 'mercado_documental'],
        mercado: mercadoNormalizado,
        candidatas: candidatas.map(atividade => ({
          id: atividade?.id || null,
          ordem: atividade?.ordem_atividade || null,
          rotulo: rotuloAtividadePgdas(atividade, atividadesComReceita),
          natureza: identificarNaturezaAtividadePgdas(atividade),
          mercados: Array.from(mercadosAtividadePgdas(atividade)),
          pisCofinsMonofasico: Boolean(atividade?.pis_cofins_monofasico),
        })),
      }
    }

    if (comMercadoExplicito.length > 0) {
      candidatas = comMercadoExplicito
      criterios.push('mercado_documental')
    }
  }

  const tratamentoPisCofinsConhecido =
    ['monofasico', 'st_pis_cofins', 'tributado'].includes(
      String(classificacaoPisCofins ?? '').trim()
    )

  const porPisCofins = candidatas.filter(atividade =>
    atividadeTemTratamentoPisCofins(
      atividade,
      classificacaoPisCofins
    ) === true
  )

  if (tratamentoPisCofinsConhecido) {
    if (porPisCofins.length === 0) {
      return {
        status: 'atividade_pgdas_sem_correspondencia_pis_cofins',
        atividade: null,
        registro: null,
        origem: null,
        naturezaDocumento,
        criterios: [...criterios, 'qualificacao_pis_cofins'],
        candidatas: candidatas.map(atividade => ({
          id: atividade?.id || null,
          ordem: atividade?.ordem_atividade || null,
          rotulo: rotuloAtividadePgdas(atividade, atividadesComReceita),
          natureza: identificarNaturezaAtividadePgdas(atividade),
          pisCofinsMonofasico: Boolean(atividade?.pis_cofins_monofasico),
        })),
      }
    }

    candidatas = porPisCofins
    criterios.push('qualificacao_pis_cofins')
  }

  if (candidatas.length !== 1) {
    return {
      status: candidatas.length === 0
        ? 'atividade_pgdas_sem_correspondencia'
        : 'atividade_pgdas_ambigua',
      atividade: null,
      registro: null,
      origem: null,
      naturezaDocumento,
      criterios,
      candidatas: candidatas.map(atividade => ({
        id: atividade?.id || null,
        ordem: atividade?.ordem_atividade || null,
        rotulo: rotuloAtividadePgdas(atividade, atividadesComReceita),
        natureza: identificarNaturezaAtividadePgdas(atividade),
        pisCofinsMonofasico: Boolean(atividade?.pis_cofins_monofasico),
      })),
    }
  }

  const registro = candidatas[0]

  return {
    status: 'ok',
    atividade: rotuloAtividadePgdas(registro, atividadesComReceita),
    registro,
    origem: criterios.join('+') || 'correspondencia_unica',
    naturezaDocumento,
    criterios,
  }
}

export {
  CFOPS_PRODUCAO_PROPRIA,
  CFOPS_REVENDA,
  CFOPS_SERVICOS,
  normalizarCfopAtividade,
  identificarNaturezaDocumentoPorCfop,
  identificarNaturezaAtividadePgdas,
  mercadosAtividadePgdas,
  resolverMercadoDocumentoParaAtividade,
  resolverAtividadePgdasDocumental,
}
