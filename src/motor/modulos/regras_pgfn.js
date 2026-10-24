/**
 * regras_pgfn.js — e-FiscalTribe
 * Fonte única de regras para Transação / Editais PGFN.
 *
 * Snapshot operacional: 04/10/2026.
 * IMPORTANTE: regras de editais mudam. Atualize este arquivo quando a PGFN
 * publicar novo edital, prorrogação ou retificação.
 */

export const PGFN_RULESET = {
  versao: '2026-10-04',
  atualizadoEm: '2026-10-04',
  portal: 'https://www.regularize.pgfn.gov.br',
  basesGerais: [
    'Lei 13.988/2020',
    'Lei 14.375/2022',
    'Portaria PGFN 6.757/2022',
  ],
}

export const PERFIS_FAVORECIDOS = [
  'pf',
  'mei',
  'me',
  'epp',
  'santa_casa',
  'cooperativa',
  'osc',
  'ies',
]

export function isPerfilFavorecido(tipoPessoa, emRecuperacaoJudicial = false) {
  return PERFIS_FAVORECIDOS.includes(tipoPessoa) || !!emRecuperacaoJudicial
}

export function isDebitoPrevidenciario(tipoDebito = '') {
  return ['previdenciario', 'previdenciaria'].includes(String(tipoDebito).toLowerCase())
}

export const EDITAIS_PGFN = [
  {
    id: 'EDITAL_6_CAPAG',
    grupo: 'Edital PGDAU 6/2026',
    nome: 'Transação conforme a capacidade de pagamento',
    status: 'VIGENTE',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    inscricaoAte: '2026-07-03',
    limiteConsolidado: 45_000_000,
    exigeCapag: true,
    fonte: 'Edital PGDAU 6/2026, prorrogado pelo Edital PGDAU 10/2026',
  },
  {
    id: 'EDITAL_6_DIFICIL',
    grupo: 'Edital PGDAU 6/2026',
    nome: 'Débitos de difícil recuperação ou irrecuperáveis',
    status: 'VIGENTE',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    inscricaoAte: '2026-07-03',
    limiteConsolidado: 45_000_000,
    exigeCapag: false,
    fonte: 'Edital PGDAU 6/2026, prorrogado pelo Edital PGDAU 10/2026',
  },
  {
    id: 'EDITAL_6_PEQUENO_VALOR',
    grupo: 'Edital PGDAU 6/2026',
    nome: 'Transação de pequeno valor',
    status: 'VIGENTE',
    prazoAdesao: '2027-07-29T19:00:00-03:00',
    inscricaoAte: '2025-06-01',
    exigeCapag: false,
    fonte: 'Edital PGDAU 6/2026, prorrogado pelo Edital PGDAU 10/2026',
  },
  {
    id: 'EDITAL_6_GARANTIDO',
    grupo: 'Edital PGDAU 6/2026',
    nome: 'Seguro garantia / carta fiança com trânsito em julgado',
    status: 'VIGENTE',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    inscricaoAte: '2026-07-03',
    limiteConsolidado: 45_000_000,
    exigeCapag: false,
    fonte: 'Edital PGDAU 6/2026, prorrogado pelo Edital PGDAU 10/2026',
  },
  {
    id: 'DESENROLA_RURAL_8_2026',
    grupo: 'Edital PGDAU 8/2026',
    nome: 'Desenrola Rural',
    status: 'VIGENTE',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    exigeCapag: false,
    fonte: 'Edital PGDAU 8/2026, prorrogado pelo Edital PGDAU 10/2026',
  },
  {
    id: 'DESENROLA_MEI_9_2026',
    grupo: 'Edital PGDAU 9/2026',
    nome: 'Desenrola MEI',
    status: 'VIGENTE',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    limiteConsolidado: 20_000,
    publico: ['mei'],
    fonte: 'Edital PGDAU 9/2026, prorrogado pelo Edital PGDAU 10/2026',
  },
  {
    id: 'MEI_PEQUENO_VALOR_2970_2026',
    grupo: 'Portaria PGFN 2.970/2026',
    nome: 'MEI Pequeno Valor — até 5 salários mínimos',
    status: 'VIGENTE',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    limiteConsolidado: 8_105,
    publico: ['mei'],
    fonte: 'Portaria PGFN 2.970/2026',
  },
  {
    id: 'FGTS_12_2026',
    grupo: 'Edital PGDAU 12/2026',
    nome: 'FGTS e Contribuição Social da LC 110/2001',
    status: 'ABERTURA_PROGRAMADA',
    abreEm: '2026-10-15T00:00:00-03:00',
    prazoAdesao: '2027-01-29T19:00:00-03:00',
    limiteConsolidado: 45_000_000,
    fonte: 'Edital PGDAU 12/2026',
  },
  {
    id: 'TIS',
    grupo: 'Modalidade permanente',
    nome: 'Transação Individual Simplificada',
    status: 'PERMANENTE',
    limiteMin: 1_000_000,
    limiteMax: 10_000_000,
    fonte: 'Portaria PGFN 6.757/2022',
  },
  {
    id: 'INDIVIDUAL',
    grupo: 'Modalidade permanente',
    nome: 'Transação Individual',
    status: 'PERMANENTE',
    limiteMin: 10_000_000,
    limiteMax: Infinity,
    fonte: 'Lei 13.988/2020 e Portaria PGFN 6.757/2022',
  },
]

export function regraPorId(id) {
  return EDITAIS_PGFN.find(r => r.id === id) || null
}

export function calcularLimiteMaximoDesconto({
  totalDivida = 0,
  valorPrincipal = 0,
  valorMultas = 0,
  valorJuros = 0,
  valorEncargos = 0,
  limiteGlobalPct = 0.65,
}) {
  const total = Math.max(0, Number(totalDivida) || 0)
  const principal = Math.max(0, Number(valorPrincipal) || 0)
  const acrescimosInformados =
    Math.max(0, Number(valorMultas) || 0) +
    Math.max(0, Number(valorJuros) || 0) +
    Math.max(0, Number(valorEncargos) || 0)

  const tetoSemPrincipal = principal > 0
    ? Math.max(0, total - principal)
    : acrescimosInformados

  const tetoPorAcrescimos = acrescimosInformados > 0
    ? Math.min(acrescimosInformados, tetoSemPrincipal || acrescimosInformados)
    : 0

  const tetoGlobal = total * limiteGlobalPct

  return {
    composicaoCompleta: principal > 0 && acrescimosInformados > 0,
    acrescimosInformados,
    tetoSemPrincipal,
    tetoGlobal,
    descontoMaximoTeorico: Math.max(0, Math.min(tetoPorAcrescimos, tetoGlobal)),
  }
}

export function regrasCapagEdital6({
  capag,
  tipoPessoa = 'pj_demais',
  tipoDebito = '',
  emRecuperacaoJudicial = false,
}) {
  const favorecido = isPerfilFavorecido(tipoPessoa, emRecuperacaoJudicial)
  const previdenciario = isDebitoPrevidenciario(tipoDebito)
  const capagNorm = String(capag || '').toUpperCase()
  const permiteDesconto = ['C', 'D'].includes(capagNorm)

  const entradaPct = 0.06
  const entradaParcelas = favorecido ? 12 : 6
  const saldoParcelasRegra = favorecido ? 133 : 114
  const totalPrazoConstitucional = previdenciario ? 60 : null
  const saldoParcelasMax = previdenciario
    ? Math.max(1, totalPrazoConstitucional - entradaParcelas)
    : saldoParcelasRegra

  return {
    capag: capagNorm,
    favorecido,
    previdenciario,
    permiteDesconto,
    entradaPct,
    entradaParcelas,
    saldoParcelasMax,
    totalPrazoMax: previdenciario ? 60 : entradaParcelas + saldoParcelasRegra,
    limiteGlobalDescontoPct: favorecido ? 0.70 : 0.65,
    parcelaMinima: tipoPessoa === 'mei' ? 25 : 100,
    observacao:
      permiteDesconto
        ? 'CAPAG C/D: pode haver desconto sobre juros, multas e encargo legal, limitado pelas regras do edital e sem redução do principal.'
        : 'CAPAG A/B: no Edital 6/2026 há entrada facilitada; a modalidade por CAPAG não concede automaticamente desconto.',
  }
}

export function regrasDificilRecuperacao({
  tipoPessoa = 'pj_demais',
  tipoDebito = '',
  emRecuperacaoJudicial = false,
}) {
  const favorecido = isPerfilFavorecido(tipoPessoa, emRecuperacaoJudicial)
  const previdenciario = isDebitoPrevidenciario(tipoDebito)
  const entradaPct = 0.05
  const entradaParcelas = 12
  const saldoParcelasRegra = favorecido ? 133 : 108
  const saldoParcelasMax = previdenciario
    ? Math.max(1, 60 - entradaParcelas)
    : saldoParcelasRegra

  return {
    favorecido,
    previdenciario,
    entradaPct,
    entradaParcelas,
    saldoParcelasMax,
    limiteGlobalDescontoPct: favorecido ? 0.70 : 0.65,
    parcelaMinima: tipoPessoa === 'mei' ? 25 : 100,
  }
}
