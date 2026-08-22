import {
  qualificarItensApuracao,
} from './qualificacaoApuracao'
function normalizarCompetenciaApuracao(valor) {
  if (!valor) return null

  const s = String(valor).trim()

  let m = s.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) {
    return String(m[1]).padStart(2, "0") + "/" + m[2]
  }

  m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (m) {
    return String(m[2]).padStart(2, "0") + "/" + m[1]
  }

  return null
}

function competenciaParaDataIso(valor) {
  const competencia = normalizarCompetenciaApuracao(valor)
  if (!competencia) return null

  const partes = competencia.split("/")
  const mes = partes[0]
  const ano = partes[1]

  return ano + "-" + mes + "-01"
}

function resolverClassificacaoPisCofinsVigente({
  itemFiscal,
  classificacoesHistoricas = [],
  competencia,
} = {}) {
  if (!itemFiscal?.id) {
    return {
      status: "item_fiscal_ausente",
      classificacao: null,
      considerarReceita: null,
      registro: null,
    }
  }

  const dataReferencia = competenciaParaDataIso(competencia)

  if (!dataReferencia) {
    return {
      status: "competencia_invalida",
      classificacao: null,
      considerarReceita: null,
      registro: null,
    }
  }

  const historicoItem = classificacoesHistoricas.filter(
    registro => registro?.item_id === itemFiscal.id
  )

  const vigentes = historicoItem.filter(registro => {
    const inicioValido =
      !registro.data_inicio ||
      String(registro.data_inicio).slice(0, 10) <= dataReferencia

    const fimValido =
      !registro.data_fim ||
      String(registro.data_fim).slice(0, 10) >= dataReferencia

    return inicioValido && fimValido
  })

  if (vigentes.length === 0) {
    return {
      status: "classificacao_sem_vigencia",
      classificacao: null,
      considerarReceita: null,
      registro: null,
      classificacaoAtual:
        itemFiscal.class_pis_cofins_considerado || null,
    }
  }

  const assinaturas = new Set(
    vigentes.map(registro =>
      String(registro.classificacao || "") +
      "|" +
      String(registro.considerar_receita !== false)
    )
  )

  if (assinaturas.size > 1) {
    return {
      status: "classificacao_ambigua",
      classificacao: null,
      considerarReceita: null,
      registro: null,
      registros: vigentes,
    }
  }

  const ordenados = [...vigentes].sort((a, b) =>
    String(b.data_inicio || "").localeCompare(
      String(a.data_inicio || "")
    )
  )

  const registro = ordenados[0]

  if (!registro?.classificacao) {
    return {
      status: "classificacao_vazia",
      classificacao: null,
      considerarReceita: null,
      registro,
    }
  }

  return {
    status: "ok",
    classificacao: registro.classificacao,
    considerarReceita: registro.considerar_receita !== false,
    registro,
  }
}

function identificarAtividadeUnicaPgdas(atividadesPgdas = []) {
  if (!Array.isArray(atividadesPgdas)) return null

  const atividadesComReceita = atividadesPgdas.filter(
    atividade => Number(atividade?.receita_bruta || 0) > 0
  )

  if (atividadesComReceita.length !== 1) return null

  const atividade = atividadesComReceita[0]

  return String(
    atividade.tipo_atividade ||
    atividade.descricao_original ||
    ""
  ).trim() || null
}

function prepararBaseApuracaoSimples({
  competencia,
  pgdas,
  atividadesPgdas = [],
  itensDocumentais = [],
  itensFiscais = [],
  classificacoesHistoricas = [],
  clienteCnpj = null,
  alterarIcms = false,
} = {}) {
  const pendencias = []

  const competenciaNormalizada =
    normalizarCompetenciaApuracao(competencia)

  if (!competenciaNormalizada) {
    pendencias.push({
      tipo: "competencia_invalida",
      mensagem: "A competencia da apuracao e invalida.",
    })
  }

  if (!pgdas) {
    pendencias.push({
      tipo: "pgdas_ausente",
      mensagem: "Nao foi localizado PGDAS-D para a competencia.",
    })
  }

  const competenciaPgdas =
    normalizarCompetenciaApuracao(pgdas?.competencia)

  if (
    competenciaNormalizada &&
    competenciaPgdas &&
    competenciaNormalizada !== competenciaPgdas
  ) {
    pendencias.push({
      tipo: "pgdas_competencia_divergente",
      mensagem: "O PGDAS-D informado pertence a outra competencia.",
    })
  }

  const atividadeUnica =
    identificarAtividadeUnicaPgdas(atividadesPgdas)

  const mapaItensFiscais = new Map()

  for (const item of itensFiscais) {
    const codigo = String(item?.codigo || "").trim()
    if (codigo) mapaItensFiscais.set(codigo, item)
  }

  const itensDaCompetencia = itensDocumentais.filter(item =>
    normalizarCompetenciaApuracao(item?.competencia) ===
    competenciaNormalizada
  )

  if (competenciaNormalizada && itensDaCompetencia.length === 0) {
    pendencias.push({
      tipo: "movimentacao_ausente",
      mensagem:
        "Nao foram localizados itens documentais para a competencia.",
    })
  }

  const itensPreparados = []
  const itensIgnorados = []

  for (const item of itensDaCompetencia) {
    const codigo = String(item?.codigo || "").trim()
    const valor = Number(item?.valor_produto)

    if (!codigo) {
      pendencias.push({
        tipo: "item_sem_codigo",
        nf: item?.nf || null,
      })
      continue
    }

    if (!Number.isFinite(valor) || valor < 0) {
      pendencias.push({
        tipo: "item_valor_invalido",
        codigo,
        nf: item?.nf || null,
      })
      continue
    }

    const itemFiscal = mapaItensFiscais.get(codigo)

    if (!itemFiscal) {
      pendencias.push({
        tipo: "item_sem_cadastro_fiscal",
        codigo,
        nf: item?.nf || null,
      })
      continue
    }

    const classificacao =
      resolverClassificacaoPisCofinsVigente({
        itemFiscal,
        classificacoesHistoricas,
        competencia: competenciaNormalizada,
      })

    if (classificacao.status !== "ok") {
      pendencias.push({
        tipo: classificacao.status,
        codigo,
        itemFiscalId: itemFiscal.id,
        nf: item?.nf || null,
      })
      continue
    }

    if (!classificacao.considerarReceita) {
      itensIgnorados.push({
        item,
        itemFiscal,
        classificacao,
        motivo: "classificacao_vigente_nao_considera_receita",
      })
      continue
    }

    itensPreparados.push({
      item,
      itemFiscal,
      classificacao,
      qualificacao: {
        estabelecimento: null,
        mercado: null,
        atividade: atividadeUnica,
        classificacaoPisCofins: classificacao.classificacao,
        classificacaoIcms: null,
        valor,
      },
      pronta: false,
    })
  }

  const qualificacao =
    qualificarItensApuracao({
      itensPreparados,
      clienteCnpj,
      alterarIcms,
    })

  for (const pendencia of qualificacao.pendencias) {
    pendencias.push({
      ...pendencia,
      origem: "qualificacao",
    })
  }

  /*
   * PORTAO DOCUMENTAL TEMPORARIO
   *
   * Os XMLs ainda entram inicialmente com
   * consideraReceita = true.
   *
   * Enquanto a regra segura de CFOP / entrada /
   * devolucao / composicao da receita nao estiver
   * implementada, a base NAO pode ser liberada
   * para o orquestrador.
   */
  if (itensPreparados.length > 0) {
    pendencias.push({
      tipo: "regra_receita_cfop_pendente",
      mensagem:
        "A composicao documental da receita por CFOP ainda precisa ser validada.",
    })
  }

  const parcelas = qualificacao.parcelas

  return {
    competencia: competenciaNormalizada,
    pgdas: pgdas || null,
    atividadesPgdas,
    itensDocumentais: itensDaCompetencia,
    itensPreparados,
    itensIgnorados,
    qualificacao,
    parcelas,
    pendencias,
    prontaParaConferencia:
      pendencias.length === 0 &&
      parcelas.length > 0,
  }
}

export {
  normalizarCompetenciaApuracao,
  competenciaParaDataIso,
  resolverClassificacaoPisCofinsVigente,
  identificarAtividadeUnicaPgdas,
  prepararBaseApuracaoSimples,
}
