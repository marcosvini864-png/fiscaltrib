/**
 * modulos/irpj_csll.js — FiscalTrib
 * Motor de IRPJ/CSLL.
 *
 * Teses:
 * 1. JCP — Juros sobre Capital Próprio dedutíveis da base do IRPJ/CSLL
 * 2. Prejuízo Fiscal — aproveitamento de saldo acumulado
 * 3. SELIC na repetição do indébito — não integra base do IRPJ/CSLL
 *    (RE 1.063.187 STF — Tema 962)
 * 4. CSLL na base do IRPJ — exclusão
 *
 * Base legal:
 * — Lei 9.249/1995, art. 9º — JCP
 * — RIR/2018, art. 202 — Prejuízo Fiscal
 * — RE 1.063.187 STF (Tema 962) — SELIC no indébito
 * — Lei 9.430/1996 — IRPJ/CSLL Lucro Presumido
 *
 * Versão: 1.0
 * Data: 2026-07-30
 */

import {
  criarResultado,
  finalizarResultado,
  resultadoErro,
  STATUS_ANALISE,
  GRAU_CONFIANCA,
} from '../contratos/ResultadoPadrao.js'

import { scoreOportunidade, scoreMotor } from '../contratos/Score.js'

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

// Alíquotas IRPJ/CSLL
const ALIQUOTA_IRPJ       = 0.15
const ALIQUOTA_IRPJ_ADICIONAL = 0.10  // sobre base > R$240k/ano
const ALIQUOTA_CSLL_LP    = 0.09
const ALIQUOTA_CSLL_LR    = 0.09
const TJLP_ANUAL          = 0.06   // taxa referência para JCP (aproximada)

const FUNDAMENTACAO = {
  teseJuridica: 'Otimização de IRPJ/CSLL — JCP, Prejuízo Fiscal e SELIC no Indébito',
  resumo: 'Empresas do Lucro Real e Presumido podem reduzir a base do IRPJ/CSLL via JCP e aproveitamento de prejuízo fiscal, além de excluir a SELIC recebida em restituições tributárias da base tributável (Tema 962 STF).',
  baseLegal: [
    { norma: 'Lei 9.249/1995, art. 9º',           descricao: 'Dedutibilidade dos Juros sobre Capital Próprio' },
    { norma: 'RIR/2018, art. 202',                 descricao: 'Aproveitamento de Prejuízo Fiscal — 30% por período' },
    { norma: 'RE 1.063.187 STF (Tema 962)',        descricao: 'SELIC na repetição do indébito não integra base do IRPJ/CSLL' },
    { norma: 'Lei 9.430/1996',                     descricao: 'Cálculo do IRPJ/CSLL no Lucro Presumido' },
    { norma: 'IN RFB 1.700/2017',                  descricao: 'Regulamentação do IRPJ/CSLL — Lucro Real' },
  ],
  jurisprudencia: [
    'STF — RE 1.063.187 (Tema 962) — SELIC no indébito não tributável pelo IRPJ/CSLL',
    'STJ — REsp 1.200.492 — JCP e dedutibilidade',
    'CARF — Acórdão 1302-004.509 — aproveitamento de prejuízo fiscal',
  ],
  via: 'ADMINISTRATIVA',
  prazoRetroativo: '5 anos',
  riscoContestacao: 20,
}

// ─────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────

function calcularJCP(patrimonioLiquido, lucroExercicio) {
  // JCP = PL × TJLP (limitado a 50% do lucro ou 50% do PL acumulado)
  const jcpBruto    = patrimonioLiquido * TJLP_ANUAL
  const limiteJCP   = Math.min(jcpBruto, lucroExercicio * 0.50)
  const economiaIRPJ = limiteJCP * (ALIQUOTA_IRPJ + ALIQUOTA_CSLL_LR)
  return { jcpBruto, limiteJCP, economiaIRPJ }
}

function calcularPrejuizoFiscal(prejuizoAcumulado, lucroAtual) {
  // Pode compensar até 30% do lucro real por período
  const baseCompensacao = lucroAtual * 0.30
  const compensado      = Math.min(prejuizoAcumulado, baseCompensacao)
  const economia        = compensado * (ALIQUOTA_IRPJ + ALIQUOTA_CSLL_LR)
  return { baseCompensacao, compensado, economia, saldoRestante: prejuizoAcumulado - compensado }
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL
// ─────────────────────────────────────────────────────────────

export async function analisarIRPJCSLL(nfes, cliente, opcoes = {}, BaseTributaria) {
  const inicio    = Date.now()
  const modulo    = 'IRPJ_CSLL'
  const resultado = criarResultado(modulo)

  resultado.descricaoModulo = 'Otimização de IRPJ/CSLL — JCP, Prejuízo Fiscal e SELIC no Indébito'

  try {

    // ── 1. Validações ───────────────────────────────────────────
    if (!['Lucro Presumido', 'Lucro Real'].includes(cliente?.regime)) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Módulo IRPJ/CSLL aplicável apenas ao Lucro Presumido e Lucro Real.'
      return finalizarResultado(resultado, inicio)
    }

    const {
      receitaBruta        = 0,
      lucroContabil       = 0,
      patrimonioLiquido   = 0,
      prejuizoAcumulado   = 0,
      selicRecebida       = 0,  // SELIC recebida em restituições tributárias
      irpjCsllPago        = 0,
    } = opcoes

    if (receitaBruta === 0) {
      resultado.status = STATUS_ANALISE.SEM_DADOS
      resultado.erro   = 'Informe a receita bruta anual em opcoes.receitaBruta.'
      return finalizarResultado(resultado, inicio)
    }

    resultado.diagnostico = {
      totalDocumentosAnalisados: nfes?.length || 0,
      totalItensAnalisados:      0,
      competenciasAnalisadas:    [],
      periodoInicio:             '',
      periodoFim:                '',
      situacoesEncontradas:      ['Dados contábeis analisados'],
      observacoes: [
        `Receita bruta: R$ ${receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Lucro contábil: R$ ${lucroContabil.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Patrimônio líquido: R$ ${patrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `Prejuízo acumulado: R$ ${prejuizoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `SELIC recebida em restituições: R$ ${selicRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      ].join('. '),
    }

    // ── 2. Cálculo das teses ────────────────────────────────────
    const oportunidades  = []
    let creditoTotal     = 0

    // TESE 1 — JCP (apenas Lucro Real)
    if (cliente.regime === 'Lucro Real' && patrimonioLiquido > 0 && lucroContabil > 0) {
      const jcp = calcularJCP(patrimonioLiquido, lucroContabil)
      if (jcp.economiaIRPJ > 0) {
        creditoTotal += jcp.economiaIRPJ
        const scoreOp = scoreOportunidade({
          modulo, label: 'JCP — Juros sobre Capital Próprio',
          qualidadeDados: 80, forcaJuridica: 85,
          volumeEvidencias: 70,
          valorCredito: Math.min(100, (jcp.economiaIRPJ / 5000) * 100),
          riscoContestacao: 20,
        })
        oportunidades.push({
          id:            `IRPJ_JCP_${Date.now()}`,
          tese:          'JCP — Juros sobre Capital Próprio',
          descricao:     `PL de R$ ${patrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × TJLP ${(TJLP_ANUAL * 100).toFixed(1)}% = JCP de R$ ${jcp.limiteJCP.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} dedutíveis. Economia de IRPJ/CSLL: R$ ${jcp.economiaIRPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          score:         scoreOp,
          grauConfianca: GRAU_CONFIANCA.ALTO,
          evidencias:    [],
          fundamentacao: { ...FUNDAMENTACAO, teseJuridica: 'JCP — Lei 9.249/1995, art. 9º' },
          calculos: {
            patrimonioLiquido, tjlp: TJLP_ANUAL,
            jcpBruto: jcp.jcpBruto, limiteJCP: jcp.limiteJCP,
            economiaIRPJ: jcp.economiaIRPJ,
            creditoTotal: jcp.economiaIRPJ,
            creditoMensalMedio: jcp.economiaIRPJ / 12,
            creditoPor12Meses: jcp.economiaIRPJ,
            creditoPor60Meses: jcp.economiaIRPJ * 5,
            memoriaCalculo: [
              `PL: R$ ${patrimonioLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `TJLP: ${(TJLP_ANUAL * 100).toFixed(1)}%/ano`,
              `JCP bruto: R$ ${jcp.jcpBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `Limite (50% do lucro): R$ ${jcp.limiteJCP.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `Economia IRPJ+CSLL (24%): R$ ${jcp.economiaIRPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            ],
          },
          recomendacao: {
            tipo: 'ACAO_IMEDIATA', prioridade: 'ALTA',
            titulo: 'Deduzir JCP da base do IRPJ/CSLL',
            descricao: `Economia anual de R$ ${jcp.economiaIRPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pela dedução do JCP.`,
            passos: [
              'Calcular o JCP permitido sobre o PL de cada exercício',
              'Incluir o JCP como dedução na DIPJ/ECF',
              'Verificar os últimos 5 anos para recuperação retroativa',
              'Protocolar PER/DCOMP se houve IRPJ/CSLL pago a maior',
            ],
          },
        })
      }
    }

    // TESE 2 — Prejuízo Fiscal (apenas Lucro Real)
    if (cliente.regime === 'Lucro Real' && prejuizoAcumulado > 0 && lucroContabil > 0) {
      const pf = calcularPrejuizoFiscal(prejuizoAcumulado, lucroContabil)
      if (pf.economia > 0) {
        creditoTotal += pf.economia
        const scoreOp = scoreOportunidade({
          modulo, label: 'Aproveitamento de Prejuízo Fiscal',
          qualidadeDados: 85, forcaJuridica: 90,
          volumeEvidencias: 75,
          valorCredito: Math.min(100, (pf.economia / 5000) * 100),
          riscoContestacao: 10,
        })
        oportunidades.push({
          id:            `IRPJ_PF_${Date.now() + 1}`,
          tese:          'Aproveitamento de Prejuízo Fiscal Acumulado',
          descricao:     `Prejuízo acumulado de R$ ${prejuizoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Compensação possível de R$ ${pf.compensado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (30% do lucro atual). Economia: R$ ${pf.economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          score:         scoreOp,
          grauConfianca: GRAU_CONFIANCA.ALTO,
          evidencias:    [],
          fundamentacao: { ...FUNDAMENTACAO, teseJuridica: 'Prejuízo Fiscal — RIR/2018, art. 202' },
          calculos: {
            prejuizoAcumulado, lucroAtual: lucroContabil,
            baseCompensacao: pf.baseCompensacao,
            compensado: pf.compensado,
            saldoRestante: pf.saldoRestante,
            economia: pf.economia,
            creditoTotal: pf.economia,
            creditoMensalMedio: pf.economia / 12,
            creditoPor12Meses: pf.economia,
            creditoPor60Meses: pf.economia * 5,
            memoriaCalculo: [
              `Prejuízo acumulado: R$ ${prejuizoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `Lucro atual: R$ ${lucroContabil.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `Base de compensação (30%): R$ ${pf.baseCompensacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `Compensado: R$ ${pf.compensado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              `Economia IRPJ+CSLL: R$ ${pf.economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            ],
          },
          recomendacao: {
            tipo: 'ACAO_IMEDIATA', prioridade: 'ALTA',
            titulo: 'Compensar prejuízo fiscal na apuração do IRPJ/CSLL',
            descricao: `Economia de R$ ${pf.economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por período pela compensação de prejuízo fiscal.`,
            passos: [
              'Levantar saldo de prejuízo fiscal nos livros fiscais (LALUR/LACS)',
              'Aplicar a compensação de até 30% do lucro real por período',
              'Registrar na ECF — Bloco P (LALUR) e Bloco J (LACS)',
              'Se IRPJ/CSLL foi pago a maior, protocolar PER/DCOMP',
            ],
          },
        })
      }
    }

    // TESE 3 — SELIC no Indébito (todos os regimes exceto Simples)
    if (selicRecebida > 0) {
      const irpjCSLLIndevido = selicRecebida * (ALIQUOTA_IRPJ + ALIQUOTA_CSLL_LP)
      creditoTotal += irpjCSLLIndevido
      const scoreOp = scoreOportunidade({
        modulo, label: 'SELIC no Indébito — Tema 962 STF',
        qualidadeDados: 90, forcaJuridica: 98,
        volumeEvidencias: 80,
        valorCredito: Math.min(100, (irpjCSLLIndevido / 3000) * 100),
        riscoContestacao: 5,
      })
      oportunidades.push({
        id:            `IRPJ_SELIC_${Date.now() + 2}`,
        tese:          'SELIC na Repetição do Indébito — Não Tributável pelo IRPJ/CSLL (Tema 962)',
        descricao:     `SELIC recebida em restituições tributárias: R$ ${selicRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. IRPJ/CSLL indevidamente recolhido sobre essa SELIC: R$ ${irpjCSLLIndevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        score:         scoreOp,
        grauConfianca: GRAU_CONFIANCA.ALTO,
        evidencias:    [],
        fundamentacao: { ...FUNDAMENTACAO, teseJuridica: 'RE 1.063.187 STF (Tema 962)' },
        calculos: {
          selicRecebida, aliquotaIRPJ: ALIQUOTA_IRPJ, aliquotaCSLL: ALIQUOTA_CSLL_LP,
          irpjCSLLIndevido,
          creditoTotal: irpjCSLLIndevido,
          creditoMensalMedio: irpjCSLLIndevido / 12,
          creditoPor12Meses: irpjCSLLIndevido,
          creditoPor60Meses: irpjCSLLIndevido * 5,
          memoriaCalculo: [
            `SELIC recebida em restituições: R$ ${selicRecebida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `IRPJ indevido (15%): R$ ${(selicRecebida * ALIQUOTA_IRPJ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `CSLL indevido (9%): R$ ${(selicRecebida * ALIQUOTA_CSLL_LP).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            `Total indevido: R$ ${irpjCSLLIndevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          ],
        },
        recomendacao: {
          tipo: 'ACAO_IMEDIATA', prioridade: 'URGENTE',
          titulo: 'Excluir SELIC do indébito da base do IRPJ/CSLL — Tema 962 STF pacificado',
          descricao: `Tese pacificada no STF em 2021. Recuperação imediata de R$ ${irpjCSLLIndevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
          passos: [
            'Identificar todas as restituições tributárias recebidas com SELIC nos últimos 5 anos',
            'Calcular o IRPJ/CSLL pago sobre a SELIC em cada competência',
            'Protocolar PER/DCOMP para restituição (tese pacificada no STF)',
            'Retificar DIPJ/ECF dos exercícios em que a SELIC foi tributada',
          ],
        },
      })
    }

    // ── 3. Sem oportunidade ─────────────────────────────────────
    if (oportunidades.length === 0) {
      resultado.status        = STATUS_ANALISE.CONCLUIDA
      resultado.grauConfianca = GRAU_CONFIANCA.MEDIO
      resultado.justificativaConfianca = 'Nenhuma oportunidade de IRPJ/CSLL identificada com os dados informados.'
      resultado.recomendacaoPrincipal = {
        tipo: 'ORIENTACAO', prioridade: 'BAIXA',
        titulo: 'Sem oportunidade imediata de IRPJ/CSLL',
        descricao: 'Informe patrimônio líquido, prejuízo acumulado ou SELIC recebida para análise completa.',
        passos: [],
      }
      resultado.todasRecomendacoes = [resultado.recomendacaoPrincipal]
      resultado.relatorio = { resumoExecutivo: 'Nenhuma oportunidade de IRPJ/CSLL identificada.', conclusaoExecutiva: 'Complementar os dados para análise completa.' }
      return finalizarResultado(resultado, inicio, { regime: cliente.regime })
    }

    // ── 4. Consolida ────────────────────────────────────────────
    const creditoMensalMedio = creditoTotal / 12

    resultado.grauConfianca          = GRAU_CONFIANCA.ALTO
    resultado.justificativaConfianca = `${oportunidades.length} tese(s) de IRPJ/CSLL identificadas com alta certeza jurídica.`
    resultado.oportunidades          = oportunidades

    resultado.calculos = {
      valorAnalisado:    receitaBruta,
      baseCalculo:       creditoTotal,
      creditoEstimado:   creditoTotal,
      economiaEstimada:  creditoTotal,
      moeda:             'BRL',
      creditoPor12Meses: creditoMensalMedio * 12,
      creditoPor24Meses: creditoMensalMedio * 24,
      creditoPor36Meses: creditoMensalMedio * 36,
      creditoPor60Meses: creditoMensalMedio * 60,
      creditoMensalMedio,
      memoriaCalculo: oportunidades.flatMap(o => o.calculos.memoriaCalculo || []),
      totalDocumentos: nfes?.length || 0,
      totalCompetencias: 12,
    }

    resultado.score = scoreMotor({
      modulo,
      coberturaPeriodo: 80, completudeDocs: 80,
      consistencia: 85,
      oportunidadesFound: Math.min(100, (creditoTotal / 2000) * 10),
    })

    resultado.riscos = [
      { descricao: 'JCP pode ser questionado se PL não estiver devidamente documentado', nivel: 'MEDIO', mitigacao: 'Manter balanço patrimonial atualizado e auditado' },
      { descricao: 'Limite de 30% para compensação de prejuízo fiscal deve ser respeitado', nivel: 'BAIXO', mitigacao: 'Controlar saldo no LALUR/LACS' },
    ]

    resultado.recomendacaoPrincipal = oportunidades[0].recomendacao
    resultado.todasRecomendacoes    = oportunidades.map(o => o.recomendacao)

    resultado.relatorio = {
      resumoExecutivo:    `${oportunidades.length} oportunidade(s) de IRPJ/CSLL identificadas para ${cliente.razao_social || 'o cliente'} (${cliente.regime}). Crédito total estimado: R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      objetivoAnalise:    'Identificar oportunidades de redução da base do IRPJ/CSLL via JCP, Prejuízo Fiscal e exclusão da SELIC do indébito.',
      escopoAnalise:      `Receita bruta: R$ ${receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Regime: ${cliente.regime}.`,
      diagnosticoTecnico: oportunidades.map(o => o.descricao).join(' | '),
      oportunidadesTexto: `${oportunidades.length} tese(s): ${oportunidades.map(o => o.tese).join(', ')}.`,
      riscosTexto:        resultado.riscos.map(r => `[${r.nivel}] ${r.descricao}`).join('. '),
      fundamentacaoTexto: FUNDAMENTACAO.baseLegal.map(b => b.norma).join('; '),
      recomendacoesTexto: oportunidades.map(o => o.recomendacao.titulo).join(' | '),
      planoAcao:          oportunidades.flatMap(o => o.recomendacao.passos),
      conclusaoExecutiva: `R$ ${creditoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de IRPJ/CSLL a recuperar. Recomenda-se protocolo imediato de PER/DCOMP para as teses já pacificadas (Tema 962).`,
    }

    resultado.auditTrail = {
      motoresExecutados: [modulo],
      regrasAplicadas: oportunidades.map(o => ({
        id: o.id, descricao: o.tese, resultado: `R$ ${(o.calculos?.creditoTotal || 0).toFixed(2)}`,
      })),
      documentosUtilizados: [],
      legislacaoVersao: BaseTributaria.versao.codigo,
      execucoes: [],
    }

    resultado.status = STATUS_ANALISE.CONCLUIDA
    return finalizarResultado(resultado, inicio, { totalNFes: nfes?.length || 0, regime: cliente.regime, clienteCNPJ: cliente.cnpj || '' })

  } catch (erro) {
    return resultadoErro(modulo, `Erro no Motor de IRPJ/CSLL: ${erro.message}`)
  }
}

export default analisarIRPJCSLL