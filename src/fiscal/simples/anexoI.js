function calcularAliquotaEfetiva(rbt12, aliquotaNominal, parcelaDeduzir) {
	if (
  rbt12 === null ||
  rbt12 === undefined ||
  String(rbt12).trim() === ''
  ) {
  return null
  }
  
  const rbt12Informado = Number(rbt12)
  const receita12 = rbt12Informado === 0 ? 1 : rbt12Informado
  const aliquota = Number(aliquotaNominal)
  const deducao = Number(parcelaDeduzir)

  if (
    !Number.isFinite(receita12) ||
    !Number.isFinite(aliquota) ||
    !Number.isFinite(deducao) ||
    receita12 < 0
  ) {
    return null
  }

  return ((receita12 * aliquota) - deducao) / receita12
}

// ============================================================
// ANEXO I — COMÉRCIO
// Vigência utilizada para competências de 01/2018 a 12/2026
// LC 123/2006 — Anexo I
// ============================================================

const ANEXO_I_2018_2026 = [
  {
    faixa: 1,
    limiteAte: 180000,
    aliquotaNominal: 0.04,
    parcelaDeduzir: 0,
  },
  {
    faixa: 2,
    limiteAte: 360000,
    aliquotaNominal: 0.073,
    parcelaDeduzir: 5940,
  },
  {
    faixa: 3,
    limiteAte: 720000,
    aliquotaNominal: 0.095,
    parcelaDeduzir: 13860,
  },
  {
    faixa: 4,
    limiteAte: 1800000,
    aliquotaNominal: 0.107,
    parcelaDeduzir: 22500,
  },
  {
    faixa: 5,
    limiteAte: 3600000,
    aliquotaNominal: 0.143,
    parcelaDeduzir: 87300,
  },
  {
    faixa: 6,
    limiteAte: 4800000,
    aliquotaNominal: 0.19,
    parcelaDeduzir: 378000,
  },
]

function identificarFaixaAnexoI(rbt12) {
  // Dado ausente não pode ser interpretado como RBT12 zero.
  if (
    rbt12 === null ||
    rbt12 === undefined ||
    String(rbt12).trim() === ''
  ) {
    return null
  }

  const receita12 = Number(rbt12)

  if (
    !Number.isFinite(receita12) ||
    receita12 < 0 ||
    receita12 > 4800000
  ) {
    return null
  }

  return (
    ANEXO_I_2018_2026.find(
      faixa => receita12 <= faixa.limiteAte
    ) || null
  )
}

// ============================================================
// PARÂMETROS AUTOMÁTICOS DO ANEXO I
// RBT12 → faixa → alíquota nominal → PD → alíquota efetiva
// ============================================================

function calcularParametrosAnexoI(rbt12) {
  const faixa = identificarFaixaAnexoI(rbt12)

  if (!faixa) {
    return null
  }

  const aliquotaEfetiva = calcularAliquotaEfetiva(
    rbt12,
    faixa.aliquotaNominal,
    faixa.parcelaDeduzir
  )

  if (aliquotaEfetiva == null) {
    return null
  }

  return {
    anexo: 'I',
    faixa: faixa.faixa,
    rbt12: Number(rbt12),
    aliquotaNominal: faixa.aliquotaNominal,
    parcelaDeduzir: faixa.parcelaDeduzir,
    aliquotaEfetiva,
  }
}

// ============================================================
// DAS TEÓRICO-BASE
// Receita da competência × alíquota efetiva
// Ainda sem segregações ou tratamentos específicos
// ============================================================

function calcularDasTeoricoBase(receitaCompetencia, aliquotaEfetiva) {
  if (
    receitaCompetencia === null ||
    receitaCompetencia === undefined ||
    String(receitaCompetencia).trim() === ''
  ) {
    return null
  }

  const receita = Number(receitaCompetencia)
  const aliquota = Number(aliquotaEfetiva)

  if (
    !Number.isFinite(receita) ||
    !Number.isFinite(aliquota) ||
    receita < 0 ||
    aliquota < 0
  ) {
    return null
  }

  return receita * aliquota
}

// ============================================================
// APURAÇÃO-BASE — ANEXO I
// Consolida as etapas matemáticas já validadas
// ============================================================

function calcularApuracaoBaseAnexoI(
  rbt12,
  receitaCompetencia,
  receitaMonofasica
) {
  const parametros = calcularParametrosAnexoI(rbt12)

  if (!parametros) {
    return null
  }

  const segregacao = segregarReceitaPisCofinsMonofasica(
    receitaCompetencia,
    receitaMonofasica
  )

  if (!segregacao) {
    return null
  }

  const dasTeoricoBase = calcularDasTeoricoBase(
    segregacao.receitaTotal,
    parametros.aliquotaEfetiva
  )

  if (dasTeoricoBase == null) {
    return null
  }

  const aliquotasTributos = calcularAliquotasEfetivasPorTributo(
    parametros.faixa,
    parametros.aliquotaEfetiva
  )

  const valoresTributosTeoricosBase = aliquotasTributos
    ? calcularValoresTributosTeoricosBase(
        segregacao.receitaTotal,
        aliquotasTributos
      )
    : null

  return {
    ...parametros,
    ...segregacao,

    receitaCompetencia: segregacao.receitaTotal,
    dasTeoricoBase,

    reparticaoDisponivel: Boolean(
      aliquotasTributos &&
      valoresTributosTeoricosBase
    ),

    aliquotasTributos,
    valoresTributosTeoricosBase,
  }
}

// ============================================================
// REPARTIÇÃO DO ANEXO I — COMÉRCIO
// Percentuais oficiais de repartição do DAS
// Neste momento, faixas 1 a 5.
// Faixa 6 será tratada separadamente.
// ============================================================

const REPARTICAO_ANEXO_I = {
  1: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.415,
    icms: 0.34,
  },

  2: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.415,
    icms: 0.34,
  },

  3: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.42,
    icms: 0.335,
  },

  4: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.42,
    icms: 0.335,
  },

  5: {
    irpj: 0.055,
    csll: 0.035,
    cofins: 0.1274,
    pis: 0.0276,
    cpp: 0.42,
    icms: 0.335,
  },
}

// ============================================================
// ALÍQUOTAS EFETIVAS POR TRIBUTO — ANEXO I
// Alíquota efetiva × percentual de repartição da faixa
// ============================================================

function calcularAliquotasEfetivasPorTributo(faixa, aliquotaEfetiva) {
  const numeroFaixa = Number(faixa)
  const aliquota = Number(aliquotaEfetiva)

  const reparticao = REPARTICAO_ANEXO_I[numeroFaixa]

  if (
    !reparticao ||
    !Number.isFinite(aliquota) ||
    aliquota < 0
  ) {
    return null
  }

  return {
    irpj: aliquota * reparticao.irpj,
    csll: aliquota * reparticao.csll,
    cofins: aliquota * reparticao.cofins,
    pis: aliquota * reparticao.pis,
    cpp: aliquota * reparticao.cpp,
    icms: aliquota * reparticao.icms,
  }
}

// ============================================================
// VALORES TEÓRICOS POR TRIBUTO — ANEXO I
// Receita da competência × alíquota efetiva de cada tributo
// Ainda sem segregações específicas
// ============================================================

function calcularValoresTributosTeoricosBase(
  receitaCompetencia,
  aliquotasTributos
) {
  if (
    receitaCompetencia === null ||
    receitaCompetencia === undefined ||
    String(receitaCompetencia).trim() === '' ||
    !aliquotasTributos
  ) {
    return null
  }

  const receita = Number(receitaCompetencia)

  if (
    !Number.isFinite(receita) ||
    receita < 0
  ) {
    return null
  }

  const {
    irpj,
    csll,
    cofins,
    pis,
    cpp,
    icms,
  } = aliquotasTributos

  const aliquotas = [
    irpj,
    csll,
    cofins,
    pis,
    cpp,
    icms,
  ]

  if (
    aliquotas.some(
      valor =>
        !Number.isFinite(Number(valor)) ||
        Number(valor) < 0
    )
  ) {
    return null
  }

  return {
    irpj: receita * Number(irpj),
    csll: receita * Number(csll),
    cofins: receita * Number(cofins),
    pis: receita * Number(pis),
    cpp: receita * Number(cpp),
    icms: receita * Number(icms),
  }
}
export {
  calcularAliquotaEfetiva,
  ANEXO_I_2018_2026,
  identificarFaixaAnexoI,
  calcularParametrosAnexoI,
  calcularDasTeoricoBase,
  calcularApuracaoBaseAnexoI,
  REPARTICAO_ANEXO_I,
  calcularAliquotasEfetivasPorTributo,
  calcularValoresTributosTeoricosBase,
}