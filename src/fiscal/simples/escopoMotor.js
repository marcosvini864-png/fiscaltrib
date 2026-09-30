import {
  identificarNaturezaAtividadePgdas,
  mercadosAtividadePgdas,
} from './atividadePgdas.js'

function numeroMonetario(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return null
  }

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function normalizarCompetenciaEscopo(valor) {
  const texto = String(valor ?? '').trim()

  let m = texto.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) {
    const mes = Number(m[1])
    const ano = Number(m[2])
    if (mes >= 1 && mes <= 12) return { mes, ano, chave: ano * 100 + mes }
  }

  m = texto.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/)
  if (m) {
    const ano = Number(m[1])
    const mes = Number(m[2])
    if (mes >= 1 && mes <= 12) return { mes, ano, chave: ano * 100 + mes }
  }

  return null
}

function extrairAnexoAtividade(atividade) {
  const direto = String(
    atividade?.anexo ||
    atividade?.dados_originais?.anexo ||
    ''
  ).trim().toUpperCase()

  if (['I', 'II', 'III', 'IV', 'V'].includes(direto)) {
    return direto
  }

  const texto = String(
    atividade?.descricao_original ||
    atividade?.dados_originais?.texto_original ||
    ''
  )
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  const m = texto.match(/\bANEXO\s+(I{1,3}|IV|V)\b/)
  return m ? m[1] : null
}

function resolverBaseRbt12Pgdas(pgdas) {
  const rbt12p = numeroMonetario(
    pgdas?.rbt12p ?? pgdas?.dados_originais?.rbt12p
  )
  const rbt12 = numeroMonetario(pgdas?.rbt12)

  if (rbt12p !== null && rbt12p > 0) {
    return {
      valor: rbt12p,
      fonte: 'rbt12p',
      rbt12,
      rbt12p,
    }
  }

  if (rbt12 !== null && rbt12 >= 0) {
    return {
      valor: rbt12,
      fonte: 'rbt12',
      rbt12,
      rbt12p,
    }
  }

  return {
    valor: null,
    fonte: null,
    rbt12,
    rbt12p,
  }
}

function validarEscopoMotorSimples({
  competencia,
  pgdas,
  atividadesPgdas = [],
} = {}) {
  const bloqueios = []
  const alertas = []
  const periodo = normalizarCompetenciaEscopo(competencia)

  if (!periodo) {
    bloqueios.push({
      tipo: 'competencia_invalida',
      mensagem: 'A competência informada é inválida.',
    })
  } else if (periodo.ano >= 2027) {
    bloqueios.push({
      tipo: 'competencia_fora_motor_2018_2026',
      mensagem:
        'A V1 homologada deste motor utiliza as regras do Simples até 12/2026. Competências de 2027 em diante exigem o motor IBS/CBS.',
    })
  }

  if (!pgdas || typeof pgdas !== 'object') {
    bloqueios.push({
      tipo: 'pgdas_ausente',
      mensagem: 'PGDAS-D não localizado.',
    })
  }

    const atividades = Array.isArray(atividadesPgdas)
    ? atividadesPgdas.filter(
        item =>
          Number(item?.receita_bruta || 0) > 0
      )
    : []

  const atividadesRevenda =
    atividades.filter(
      atividade =>
        identificarNaturezaAtividadePgdas(
          atividade
        ) === 'revenda'
    )

  if (atividades.length === 0) {
    bloqueios.push({
      tipo: 'atividades_pgdas_ausentes',
      mensagem:
        'O PGDAS-D não possui atividades com receita para a competência.',
    })
  } else if (atividadesRevenda.length === 0) {
    bloqueios.push({
      tipo: 'revenda_pgdas_ausente',
      mensagem:
        'A competência não possui atividade de revenda elegível para a automação de comércio da V1.',
    })
  }

  for (const atividade of atividades) {
    const anexo = extrairAnexoAtividade(atividade)
    const natureza = identificarNaturezaAtividadePgdas(atividade)
    const mercados = mercadosAtividadePgdas(atividade)

        if (natureza === 'revenda') {
      if (!anexo) {
        bloqueios.push({
          tipo: 'anexo_pgdas_nao_identificado',
          ordemAtividade:
            atividade?.ordem_atividade || null,
          mensagem:
            'Não foi possível identificar o Anexo da atividade de revenda no PGDAS-D.',
        })
      } else if (anexo !== 'I') {
        bloqueios.push({
          tipo: 'anexo_fora_escopo_v1',
          anexo,
          ordemAtividade:
            atividade?.ordem_atividade || null,
          mensagem:
            `A atividade de revenda está no Anexo ${anexo}. A automação de comércio exige Anexo I.`,
        })
      }
    }

    if (natureza === 'servicos') {
      alertas.push({
        tipo: 'servicos_fora_automacao_v1',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem:
          'Receita de serviços exige inclusão/validação própria e não será inferida a partir de XML de mercadorias.',
      })
    } else if (natureza === 'industrializacao') {
      alertas.push({
        tipo: 'industrializacao_fora_automacao_v1',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem:
          'Receita de produção própria/industrialização não pertence ao escopo automático de comércio da V1.',
      })
    } else if (!natureza) {
      bloqueios.push({
        tipo: 'natureza_atividade_nao_identificada',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem:
          'A natureza operacional da atividade do PGDAS-D não pôde ser identificada com segurança.',
      })
    }

    if (
      atividade?.pis_cofins_monofasico === true &&
      (Number(atividade?.pis || 0) !== 0 || Number(atividade?.cofins || 0) !== 0)
    ) {
      bloqueios.push({
        tipo: 'pgdas_tratamento_pis_cofins_inconsistente',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem:
          'A atividade foi marcada como PIS/COFINS monofásico/ST, mas possui PIS/COFINS declarados. Revisar a extração do PGDAS-D.',
      })
    }

    if (mercados.has('mercado_externo') || atividade?.exportacao === true) {
      bloqueios.push({
        tipo: 'mercado_externo_fora_automacao_v1',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem:
          'A atividade possui receita de mercado externo/exportação. Este cenário ainda não está homologado na V1 automática.',
      })
    }

    const suspensos = [
      'irpj_susp', 'csll_susp', 'cofins_susp', 'pis_susp',
      'inss_susp', 'icms_susp', 'ipi_susp', 'iss_susp',
    ].some(campo => Number(atividade?.[campo] || 0) > 0)

    if (suspensos) {
      bloqueios.push({
        tipo: 'exigibilidade_suspensa_fora_automacao_v1',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem:
          'A atividade possui tributo com exigibilidade suspensa. O cálculo automático foi bloqueado para revisão técnica.',
      })
    }

    if (atividade?.imune === true) {
      bloqueios.push({
        tipo: 'imunidade_fora_automacao_v1',
        ordemAtividade: atividade?.ordem_atividade || null,
        mensagem: 'A atividade possui imunidade e exige revisão técnica fora da automação V1.',
      })
    }
  }

  /*
   * O ICMS permanece preservado na V1. Isso só é seguro automaticamente
   * quando a competência não mistura qualificações distintas de ICMS entre
   * as atividades concorrentes (normal x ST x antecipação com encerramento).
   * Em cenário misto, a automação bloqueia em vez de redistribuir ICMS por
   * aproximação.
   */
    const assinaturasIcms = new Set(
    atividades
      .filter(
        atividade =>
          identificarNaturezaAtividadePgdas(
            atividade
          ) === 'revenda'
      )
      .map(atividade =>
        JSON.stringify({
          icmsSt:
            Boolean(atividade?.icms_st),

          antecipacaoEncerramento:
            Boolean(
              atividade?.antecipacao_encerramento
            ),
        })
      )
  )

  if (assinaturasIcms.size > 1) {
    bloqueios.push({
      tipo: 'tratamento_icms_misto_fora_automacao_v1',
      mensagem:
        'A competência mistura qualificações distintas de ICMS entre atividades. Como o ICMS é preservado na V1, o cálculo automático foi bloqueado para evitar redistribuição indevida.',
    })
  }

  const receitaPgdas = numeroMonetario(pgdas?.receita_bruta_total)
  const somaAtividades = atividades.reduce(
    (total, atividade) => total + Number(atividade?.receita_bruta || 0),
    0
  )

  if (receitaPgdas === null || receitaPgdas < 0) {
    bloqueios.push({
      tipo: 'receita_pgdas_invalida',
      mensagem: 'A receita bruta da competência (RPA) está ausente ou inválida no PGDAS-D.',
    })
  } else if (atividades.length > 0) {
    const pgdasCentavos = Math.round(receitaPgdas * 100)
    const atividadesCentavos = Math.round(somaAtividades * 100)

    if (pgdasCentavos !== atividadesCentavos) {
      bloqueios.push({
        tipo: 'pgdas_atividades_nao_fecham_rpa',
        receitaPgdas: pgdasCentavos / 100,
        somaAtividades: atividadesCentavos / 100,
        mensagem:
          'A soma das atividades do PGDAS-D não coincide com a receita bruta da competência.',
      })
    }
  }

  const totalTributosAtividade = atividade => {
    const totalInformado = numeroMonetario(atividade?.total_tributos)

    if (totalInformado !== null && totalInformado > 0) {
      return totalInformado
    }

    return [
      'irpj', 'csll', 'cofins', 'pis', 'inss_cpp', 'icms', 'ipi', 'iss',
    ].reduce((total, campo) => total + Number(atividade?.[campo] || 0), 0)
  }

  const dasPgdas = numeroMonetario(pgdas?.das_recolhido)
  const somaTributosAtividades = atividades.reduce(
    (total, atividade) => total + totalTributosAtividade(atividade),
    0
  )

  if (dasPgdas !== null && atividades.length > 0) {
    const dasCentavos = Math.round(dasPgdas * 100)
    const atividadesCentavos = Math.round(somaTributosAtividades * 100)

    if (dasCentavos !== atividadesCentavos) {
      bloqueios.push({
        tipo: 'pgdas_tributos_atividades_nao_fecham_das',
        dasPgdas: dasCentavos / 100,
        somaTributosAtividades: atividadesCentavos / 100,
        mensagem:
          'A soma dos tributos das atividades não coincide com o DAS consolidado do PGDAS-D.',
      })
    }
  }

  if (pgdas?.impedido_recolher_icms_iss_das === true) {
    bloqueios.push({
      tipo: 'impedido_recolher_icms_iss_das',
      mensagem:
        'O PGDAS indica impedimento de recolher ICMS/ISS no DAS. Este cenário requer tratamento específico.',
    })
  }

  const regimeApuracao = String(
    pgdas?.regime_apuracao ||
    pgdas?.dados_originais?.regime_apuracao ||
    ''
  )
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

  if (regimeApuracao.includes('caixa')) {
    bloqueios.push({
      tipo: 'regime_caixa_fora_automacao_v1',
      mensagem:
        'O PGDAS indica regime de caixa. A V1 automática atual trabalha com a conciliação documental por competência.',
    })
  } else if (!regimeApuracao) {
    bloqueios.push({
      tipo: 'regime_apuracao_nao_identificado',
      mensagem:
        'O regime de apuração (competência/caixa) não foi identificado no PGDAS-D. A V1 não calcula sem essa confirmação.',
    })
  } else if (!regimeApuracao.includes('competencia')) {
    bloqueios.push({
      tipo: 'regime_apuracao_nao_homologado',
      mensagem:
        'O regime de apuração informado não corresponde ao regime de competência homologado na V1.',
    })
  }

  const baseRbt12 = resolverBaseRbt12Pgdas(pgdas)

  if (baseRbt12.valor === null || baseRbt12.valor < 0 || baseRbt12.valor > 4800000) {
    bloqueios.push({
      tipo: 'base_rbt12_invalida',
      mensagem: 'RBT12/RBT12p inválida para cálculo do Anexo I.',
    })
  }

  return {
    status: bloqueios.length === 0 ? 'escopo_v1_validado' : 'escopo_v1_bloqueado',
    podeCalcular: bloqueios.length === 0,
    bloqueios,
    alertas,
    competencia: periodo,
    atividades,
    baseRbt12,
  }
}

export {
  normalizarCompetenciaEscopo,
  extrairAnexoAtividade,
  resolverBaseRbt12Pgdas,
  validarEscopoMotorSimples,
}
