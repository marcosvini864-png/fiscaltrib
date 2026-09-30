// Regras documentais conservadoras do Motor do Simples.
//
// Esta camada decide somente o efeito do documento sobre a receita:
// venda/receita, devolução, cancelamento, movimento neutro ou revisão.
// A parametrização do valor da receita por CFOP continua em parametrosReceita.js.

const EFEITO_RECEITA = Object.freeze({
  VENDA: 'VENDA',
  DEVOLUCAO: 'DEVOLUCAO',
  CANCELAMENTO: 'CANCELAMENTO',
  NEUTRO: 'NEUTRO',
  REVISAR: 'REVISAR',
})

const CFOPS_NEUTROS = new Set([
  // Remessa / retorno para conserto ou reparo
  '5915', '6915',
  '5916', '6916',

  // Industrialização por encomenda — movimentações sem receita da mercadoria
  '5901', '6901',
  '5902', '6902',
])

const CFOPS_DEVOLUCAO_VENDA = new Set([
  '1201', '1202',
  '1203', '1204',
  '1410', '1411',
  '1660', '1661', '1662',

  '2201', '2202',
  '2203', '2204',
  '2410', '2411',
  '2660', '2661', '2662',

  '3201', '3202',
  '3211',
])

function normalizarTipoOperacaoDocumento(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function classificarEfeitoReceita({
  cfop,
  tipoOperacao,
  naturezaOperacao,
  chaveNFeReferenciada,
  cancelada = false,
} = {}) {
  const codigo = String(cfop || '').replace(/\D/g, '')
  const natureza = String(naturezaOperacao || '').toUpperCase()
  const tipo = normalizarTipoOperacaoDocumento(tipoOperacao)
  const temReferencia = Boolean(
    String(chaveNFeReferenciada || '').trim()
  )

  // Cancelamento fiscal tem precedência sobre qualquer outra classificação.
  if (cancelada) {
    return {
      efeitoReceita: EFEITO_RECEITA.CANCELAMENTO,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita: 'NF-e cancelada',
    }
  }

  // Movimentações documentais que não representam faturamento.
  if (CFOPS_NEUTROS.has(codigo)) {
    return {
      efeitoReceita: EFEITO_RECEITA.NEUTRO,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        `CFOP ${codigo} — movimentação sem composição de receita`,
    }
  }

  // Devolução de venda somente reduz receita com evidência documental suficiente.
  if (CFOPS_DEVOLUCAO_VENDA.has(codigo)) {
    if (tipo === 'entrada' && temReferencia) {
      return {
        efeitoReceita: EFEITO_RECEITA.DEVOLUCAO,
        fatorReceita: -1,
        consideraReceita: false,
        motivoEfeitoReceita:
          `CFOP ${codigo} — devolução de venda vinculada à NF-e original`,
      }
    }

    return {
      efeitoReceita: EFEITO_RECEITA.REVISAR,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        `CFOP ${codigo} indica devolução de venda, mas a operação precisa ser validada`,
    }
  }

  // A palavra "devolução" sem CFOP + vínculo não é suficiente para reduzir receita.
  if (natureza.includes('DEVOLU')) {
    return {
      efeitoReceita: EFEITO_RECEITA.REVISAR,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        'Possível devolução — requer validação do CFOP e da NF-e referenciada',
    }
  }

  // A automação de receita parte de documentos de saída.
  // Entradas comuns (compra, remessa, retorno etc.) não viram faturamento.
  if (tipo === 'entrada') {
    return {
      efeitoReceita: EFEITO_RECEITA.REVISAR,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        'NF-e de entrada fora da receita automática — somente devolução de venda validada pode reduzir a receita',
    }
  }

  // Se tpNF estiver ausente, grupos 1/2/3 funcionam apenas como trava.
  const grupoCfop = codigo.charAt(0)

  if (!tipo && ['1', '2', '3'].includes(grupoCfop)) {
    return {
      efeitoReceita: EFEITO_RECEITA.REVISAR,
      fatorReceita: 0,
      consideraReceita: false,
      motivoEfeitoReceita:
        `CFOP ${codigo} pertence a operação de entrada e exige revisão documental`,
    }
  }

  // Saídas seguem para a parametrização de receita por CFOP.
  return {
    efeitoReceita: EFEITO_RECEITA.VENDA,
    fatorReceita: 1,
    consideraReceita: true,
    motivoEfeitoReceita: null,
  }
}

export {
  EFEITO_RECEITA,
  CFOPS_NEUTROS,
  CFOPS_DEVOLUCAO_VENDA,
  classificarEfeitoReceita,
}
