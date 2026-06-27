import { useState, useRef } from 'react'
import { supabase } from './supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// ─── CONFIGURAÇÃO DOS LAYOUTS ─────────────────────────────────────────────────
const LAYOUTS = {
  'empresa.csv': {
    tabela: 'clientes',
    colunas: ['cnpj','razao_social','nome_fantasia','cnae_principal','regime_tributario','municipio','uf','inscricao_estadual','inscricao_municipal','competencia_inicio','competencia_fim'],
    obrigatorios: ['cnpj','razao_social','regime_tributario','municipio','uf'],
    enums: { regime_tributario: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
    mapear: (row, uid) => ({
      usuario_id: uid,
      cnpj: row.cnpj,
      razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia || '',
      cnae_principal: row.cnae_principal || '',
      cnaes_secundarios: '',
      regime: row.regime_tributario,
      municipio: row.municipio,
      uf: row.uf,
      inscricao_estadual: row.inscricao_estadual || '',
      inscricao_municipal: row.inscricao_municipal || '',
      competencia_inicio: row.competencia_inicio || '',
      competencia_fim: row.competencia_fim || '',
      responsavel_contabil: '',
      observacoes: '',
      status: 'Em análise',
    }),
  },
  'socios.csv': {
    tabela: 'socios',
    colunas: ['cnpj_empresa','cpf_socio','nome','percentual_participacao','data_entrada','qualificacao'],
    obrigatorios: ['cnpj_empresa','cpf_socio','nome','percentual_participacao','data_entrada'],
    decimais: ['percentual_participacao'],
    datas: ['data_entrada'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cpf_socio: row.cpf_socio, nome: row.nome, percentual_participacao: parseFloat(row.percentual_participacao), data_entrada: row.data_entrada, qualificacao: row.qualificacao || '' }),
  },
  'fornecedores.csv': {
    tabela: 'fornecedores',
    colunas: ['cnpj_empresa','cnpj_cpf_fornecedor','nome','tipo','municipio','uf','email','telefone'],
    obrigatorios: ['cnpj_empresa','cnpj_cpf_fornecedor','nome','tipo'],
    enums: { tipo: ['F','J'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cnpj_cpf_fornecedor: row.cnpj_cpf_fornecedor, nome: row.nome, tipo: row.tipo, municipio: row.municipio || '', uf: row.uf || '', email: row.email || '', telefone: row.telefone || '' }),
  },
  'funcionarios.csv': {
    tabela: 'funcionarios',
    colunas: ['cnpj_empresa','cpf','nome','data_admissao','data_demissao','cargo','salario_base','cbo'],
    obrigatorios: ['cnpj_empresa','cpf','nome','data_admissao','salario_base'],
    decimais: ['salario_base'],
    datas: ['data_admissao','data_demissao'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cpf: row.cpf, nome: row.nome, data_admissao: row.data_admissao, data_demissao: row.data_demissao || null, cargo: row.cargo || '', salario_base: parseFloat(row.salario_base), cbo: row.cbo || '' }),
  },
  'produtos.csv': {
    tabela: 'produtos',
    colunas: ['cnpj_empresa','codigo','descricao','ncm','cfop_saida','unidade','preco_unitario','cst_pis','cst_cofins','aliquota_pis','aliquota_cofins'],
    obrigatorios: ['cnpj_empresa','codigo','descricao','ncm'],
    decimais: ['preco_unitario','aliquota_pis','aliquota_cofins'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, codigo: row.codigo, descricao: row.descricao, ncm: row.ncm, cfop_saida: row.cfop_saida || '', unidade: row.unidade || '', preco_unitario: parseFloat(row.preco_unitario || 0), cst_pis: row.cst_pis || '', cst_cofins: row.cst_cofins || '', aliquota_pis: parseFloat(row.aliquota_pis || 0), aliquota_cofins: parseFloat(row.aliquota_cofins || 0) }),
  },
  'notas_saida.csv': {
    tabela: 'entradas',
    colunas: ['cnpj_empresa','numero_nf','serie','data_emissao','cnpj_cpf_destinatario','cfop','valor_total','valor_icms','valor_pis','valor_cofins','valor_st','competencia'],
    obrigatorios: ['cnpj_empresa','numero_nf','data_emissao','valor_total','competencia'],
    decimais: ['valor_total','valor_icms','valor_pis','valor_cofins','valor_st'],
    datas: ['data_emissao'],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: 'NF-e Saída', receita_bruta: parseFloat(row.valor_total), tributo_pago: parseFloat(row.valor_icms || 0) + parseFloat(row.valor_pis || 0) + parseFloat(row.valor_cofins || 0), tributo_devido: parseFloat(row.valor_icms || 0) + parseFloat(row.valor_pis || 0) + parseFloat(row.valor_cofins || 0), credito: 0, tipo_oportunidade: '', risco: 'baixo' }),
  },
  'notas_entrada.csv': {
    tabela: 'entradas',
    colunas: ['cnpj_empresa','numero_nf','serie','data_emissao','cnpj_fornecedor','cfop','valor_total','valor_icms','valor_pis','valor_cofins','valor_st','competencia'],
    obrigatorios: ['cnpj_empresa','numero_nf','data_emissao','valor_total','competencia'],
    decimais: ['valor_total','valor_icms','valor_pis','valor_cofins','valor_st'],
    datas: ['data_emissao'],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: 'NF-e Entrada', receita_bruta: parseFloat(row.valor_total), tributo_pago: 0, tributo_devido: 0, credito: 0, tipo_oportunidade: '', risco: 'baixo' }),
  },
  'folha.csv': {
    tabela: 'folha',
    colunas: ['cnpj_empresa','competencia','cpf_funcionario','salario_bruto','inss_funcionario','irrf','salario_liquido','inss_patronal','fgts','rat','terceiros'],
    obrigatorios: ['cnpj_empresa','competencia','cpf_funcionario','salario_bruto','salario_liquido'],
    decimais: ['salario_bruto','inss_funcionario','irrf','salario_liquido','inss_patronal','fgts','rat','terceiros'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_funcionario: row.cpf_funcionario, salario_bruto: parseFloat(row.salario_bruto), inss_funcionario: parseFloat(row.inss_funcionario || 0), irrf: parseFloat(row.irrf || 0), salario_liquido: parseFloat(row.salario_liquido), inss_patronal: parseFloat(row.inss_patronal || 0), fgts: parseFloat(row.fgts || 0), rat: parseFloat(row.rat || 0), terceiros: parseFloat(row.terceiros || 0) }),
  },
  'pagamentos.csv': {
    tabela: 'pagamentos',
    colunas: ['cnpj_empresa','data_pagamento','descricao','valor','categoria','cnpj_cpf_favorecido','competencia'],
    obrigatorios: ['cnpj_empresa','data_pagamento','descricao','valor','competencia'],
    decimais: ['valor'],
    datas: ['data_pagamento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, data_pagamento: row.data_pagamento, descricao: row.descricao, valor: parseFloat(row.valor), categoria: row.categoria || '', cnpj_cpf_favorecido: row.cnpj_cpf_favorecido || '', competencia: row.competencia }),
  },
  'recebimentos.csv': {
    tabela: 'recebimentos',
    colunas: ['cnpj_empresa','data_recebimento','descricao','valor','categoria','cnpj_cpf_pagador','competencia'],
    obrigatorios: ['cnpj_empresa','data_recebimento','descricao','valor','competencia'],
    decimais: ['valor'],
    datas: ['data_recebimento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, data_recebimento: row.data_recebimento, descricao: row.descricao, valor: parseFloat(row.valor), categoria: row.categoria || '', cnpj_cpf_pagador: row.cnpj_cpf_pagador || '', competencia: row.competencia }),
  },
  'tributos.csv': {
    tabela: 'tributos_lab',
    colunas: ['cnpj_empresa','competencia','tributo','valor_devido','valor_pago','data_pagamento','numero_guia','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','tributo','situacao'],
    decimais: ['valor_devido','valor_pago'],
    datas: ['data_pagamento'],
    enums: { situacao: ['pago','pendente','atraso'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, tributo: row.tributo, valor_devido: parseFloat(row.valor_devido || 0), valor_pago: parseFloat(row.valor_pago || 0), data_pagamento: row.data_pagamento || null, numero_guia: row.numero_guia || '', situacao: row.situacao }),
  },
  'fgts.csv': {
    tabela: 'fgts',
    colunas: ['cnpj_empresa','competencia','cpf_funcionario','remuneracao','aliquota','valor_fgts','data_recolhimento','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','cpf_funcionario','remuneracao','valor_fgts','situacao'],
    decimais: ['remuneracao','aliquota','valor_fgts'],
    datas: ['data_recolhimento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_funcionario: row.cpf_funcionario, remuneracao: parseFloat(row.remuneracao), aliquota: parseFloat(row.aliquota || 8), valor_fgts: parseFloat(row.valor_fgts), data_recolhimento: row.data_recolhimento || null, situacao: row.situacao }),
  },
  'irrf.csv': {
    tabela: 'irrf',
    colunas: ['cnpj_empresa','competencia','cpf_beneficiario','natureza_rendimento','valor_rendimento','base_calculo','aliquota','valor_irrf','data_recolhimento'],
    obrigatorios: ['cnpj_empresa','competencia','cpf_beneficiario'],
    decimais: ['valor_rendimento','base_calculo','aliquota','valor_irrf'],
    datas: ['data_recolhimento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_beneficiario: row.cpf_beneficiario, natureza_rendimento: row.natureza_rendimento || '', valor_rendimento: parseFloat(row.valor_rendimento || 0), base_calculo: parseFloat(row.base_calculo || 0), aliquota: parseFloat(row.aliquota || 0), valor_irrf: parseFloat(row.valor_irrf || 0), data_recolhimento: row.data_recolhimento || null }),
  },
  'dctfweb.csv': {
    tabela: 'dctfweb_lab',
    colunas: ['cnpj_empresa','competencia','total_debito','total_credito','total_recolher','data_transmissao','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','situacao'],
    decimais: ['total_debito','total_credito','total_recolher'],
    datas: ['data_transmissao'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, total_debito: parseFloat(row.total_debito || 0), total_credito: parseFloat(row.total_credito || 0), total_recolher: parseFloat(row.total_recolher || 0), data_transmissao: row.data_transmissao || null, situacao: row.situacao }),
  },
  'esocial.csv': {
    tabela: 'esocial',
    colunas: ['cnpj_empresa','competencia','evento','numero_recibo','data_envio','situacao','valor_contribuicao'],
    obrigatorios: ['cnpj_empresa','competencia','evento','situacao'],
    decimais: ['valor_contribuicao'],
    datas: ['data_envio'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, evento: row.evento, numero_recibo: row.numero_recibo || '', data_envio: row.data_envio || null, situacao: row.situacao, valor_contribuicao: parseFloat(row.valor_contribuicao || 0) }),
  },
  'efd_reinf.csv': {
    tabela: 'efd_reinf',
    colunas: ['cnpj_empresa','competencia','evento','numero_recibo','data_envio','base_calculo','aliquota','valor_retencao','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','evento','situacao'],
    decimais: ['base_calculo','aliquota','valor_retencao'],
    datas: ['data_envio'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, evento: row.evento, numero_recibo: row.numero_recibo || '', data_envio: row.data_envio || null, base_calculo: parseFloat(row.base_calculo || 0), aliquota: parseFloat(row.aliquota || 0), valor_retencao: parseFloat(row.valor_retencao || 0), situacao: row.situacao }),
  },
  'pis_cofins.csv': {
    tabela: 'pis_cofins',
    colunas: ['cnpj_empresa','competencia','regime','base_calculo_pis','aliquota_pis','valor_pis','base_calculo_cofins','aliquota_cofins','valor_cofins','creditos_pis','creditos_cofins','pis_recolher','cofins_recolher'],
    obrigatorios: ['cnpj_empresa','competencia','regime'],
    decimais: ['base_calculo_pis','aliquota_pis','valor_pis','base_calculo_cofins','aliquota_cofins','valor_cofins','creditos_pis','creditos_cofins','pis_recolher','cofins_recolher'],
    enums: { regime: ['cumulativo','nao_cumulativo'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, regime: row.regime, base_calculo_pis: parseFloat(row.base_calculo_pis || 0), aliquota_pis: parseFloat(row.aliquota_pis || 0), valor_pis: parseFloat(row.valor_pis || 0), base_calculo_cofins: parseFloat(row.base_calculo_cofins || 0), aliquota_cofins: parseFloat(row.aliquota_cofins || 0), valor_cofins: parseFloat(row.valor_cofins || 0), creditos_pis: parseFloat(row.creditos_pis || 0), creditos_cofins: parseFloat(row.creditos_cofins || 0), pis_recolher: parseFloat(row.pis_recolher || 0), cofins_recolher: parseFloat(row.cofins_recolher || 0) }),
  },
  'irpj_csll.csv': {
    tabela: 'irpj_csll',
    colunas: ['cnpj_empresa','competencia','trimestre','receita_bruta','percentual_presuncao_irpj','base_irpj','aliquota_irpj','adicional_irpj','valor_irpj','percentual_presuncao_csll','base_csll','aliquota_csll','valor_csll'],
    obrigatorios: ['cnpj_empresa','competencia'],
    decimais: ['receita_bruta','percentual_presuncao_irpj','base_irpj','aliquota_irpj','adicional_irpj','valor_irpj','percentual_presuncao_csll','base_csll','aliquota_csll','valor_csll'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, trimestre: row.trimestre || '', receita_bruta: parseFloat(row.receita_bruta || 0), percentual_presuncao_irpj: parseFloat(row.percentual_presuncao_irpj || 0), base_irpj: parseFloat(row.base_irpj || 0), aliquota_irpj: parseFloat(row.aliquota_irpj || 0), adicional_irpj: parseFloat(row.adicional_irpj || 0), valor_irpj: parseFloat(row.valor_irpj || 0), percentual_presuncao_csll: parseFloat(row.percentual_presuncao_csll || 0), base_csll: parseFloat(row.base_csll || 0), aliquota_csll: parseFloat(row.aliquota_csll || 0), valor_csll: parseFloat(row.valor_csll || 0) }),
  },
  'oportunidades.csv': {
    tabela: 'entradas',
    colunas: ['cnpj_empresa','competencia','tributo','tipo_oportunidade','valor_pago','valor_devido','credito','risco','tese_aplicada','observacao'],
    obrigatorios: ['cnpj_empresa','competencia','tributo','credito','risco'],
    decimais: ['valor_pago','valor_devido','credito'],
    enums: { risco: ['baixo','medio','alto'] },
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: row.tributo, receita_bruta: 0, tributo_pago: parseFloat(row.valor_pago || 0), tributo_devido: parseFloat(row.valor_devido || 0), credito: parseFloat(row.credito || 0), tipo_oportunidade: row.tipo_oportunidade || '', risco: row.risco }),
  },
  'gabarito.csv': {
    tabela: 'gabarito',
    colunas: ['cnpj_empresa','competencia','tributo','valor_esperado','tolerancia','descricao_teste'],
    obrigatorios: ['cnpj_empresa','competencia','tributo','valor_esperado'],
    decimais: ['valor_esperado','tolerancia'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, tributo: row.tributo, valor_esperado: parseFloat(row.valor_esperado), tolerancia: parseFloat(row.tolerancia || 0.01), descricao_teste: row.descricao_teste || '' }),
  },
}

// ─── PARSER CSV ───────────────────────────────────────────────────────────────
function parseCSV(texto) {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean)
  if (linhas.length < 2) return { cabecalho: [], rows: [] }
  const cabecalho = linhas[0].split(';').map(c => c.trim().toLowerCase().replace(/"/g,''))
  const rows = linhas.slice(1).map((linha, i) => {
    const valores = linha.split(';').map(v => v.trim().replace(/"/g,''))
    const obj = {}
    cabecalho.forEach((col, j) => { obj[col] = valores[j] || '' })
    obj._linha = i + 2
    return obj
  })
  return { cabecalho, rows }
}

// ─── VALIDADOR ────────────────────────────────────────────────────────────────
function validarRow(row, layout, arquivo) {
  const erros = []
  const { obrigatorios = [], decimais = [], datas = [], enums = {} } = layout

  obrigatorios.forEach(col => {
    if (!row[col] || row[col].toString().trim() === '')
      erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Campo obrigatório vazio` })
  })

  decimais.forEach(col => {
    if (row[col] && row[col] !== '') {
      const v = parseFloat(row[col].replace(',','.'))
      if (isNaN(v)) erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Valor numérico inválido: "${row[col]}"` })
    }
  })

  datas.forEach(col => {
    if (row[col] && row[col] !== '') {
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(row[col])
      if (!ok) erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Data inválida: "${row[col]}" (use AAAA-MM-DD)` })
    }
  })

  Object.entries(enums).forEach(([col, vals]) => {
    if (row[col] && !vals.includes(row[col]))
      erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Valor "${row[col]}" inválido. Permitidos: ${vals.join(', ')}` })
  })

  return erros
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Laboratorio() {
  const inputRef = useRef()
  const [processando,   setProcessando]   = useState(false)
  const [resultados,    setResultados]    = useState([])
  const [erroGlobal,    setErroGlobal]    = useState([])
  const [comparacao,    setComparacao]    = useState([])
  const [comparando,    setComparando]    = useState(false)
  const [aba,           setAba]           = useState('importar')
  const [clientes,      setClientes]      = useState([])
  const [clienteSel,    setClienteSel]    = useState('')

  async function carregarClientes() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('clientes').select('id,razao_social,cnpj').eq('usuario_id', user.id).order('razao_social')
    setClientes(data || [])
  }

  useState(() => { carregarClientes() }, [])

  async function processarArquivos(files) {
    setProcessando(true)
    setResultados([])
    setErroGlobal([])
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user.id
    const novosResultados = []
    const todosErros = []
    const inicio = Date.now()

    for (const file of Array.from(files)) {
      const nomeArquivo = file.name.toLowerCase()
      const layout = LAYOUTS[nomeArquivo]

      if (!layout) {
        novosResultados.push({ arquivo: file.name, status: 'ignorado', motivo: 'Layout não reconhecido', importados: 0, rejeitados: 0, erros: [] })
        continue
      }

      const texto = await file.text()
      const { cabecalho, rows } = parseCSV(texto)

      // Verificar colunas obrigatórias
      const colsFaltando = layout.colunas.filter(c => !cabecalho.includes(c))
      if (colsFaltando.length > 0) {
        novosResultados.push({ arquivo: file.name, status: 'erro', motivo: `Colunas faltando: ${colsFaltando.join(', ')}`, importados: 0, rejeitados: rows.length, erros: [] })
        continue
      }

      // Buscar cliente relacionado se necessário
      let clienteId = clienteSel || null
      if (!clienteId && (nomeArquivo === 'notas_saida.csv' || nomeArquivo === 'notas_entrada.csv' || nomeArquivo === 'oportunidades.csv')) {
        if (rows.length > 0) {
          const cnpjEmpresa = rows[0].cnpj_empresa
          const { data: cli } = await supabase.from('clientes').select('id').eq('cnpj', cnpjEmpresa).eq('usuario_id', uid).single()
          clienteId = cli?.id || null
        }
      }

      let importados = 0
      let rejeitados = 0
      const errosArquivo = []

      for (const row of rows) {
        const erros = validarRow(row, layout, file.name)
        if (erros.length > 0) {
          errosArquivo.push(...erros)
          todosErros.push(...erros)
          rejeitados++
          continue
        }

        try {
          const payload = layout.mapear(row, uid, clienteId)
          const { error } = await supabase.from(layout.tabela).insert(payload)
          if (error) {
            errosArquivo.push({ arquivo: file.name, linha: row._linha, campo: '-', motivo: error.message })
            rejeitados++
          } else {
            importados++
          }
        } catch (e) {
          errosArquivo.push({ arquivo: file.name, linha: row._linha, campo: '-', motivo: e.message })
          rejeitados++
        }
      }

      // Salvar log
      await supabase.from('log_importacao').insert({
        usuario_id: uid, arquivo: file.name, tabela: layout.tabela,
        total_linhas: rows.length, importados, rejeitados,
        erros: errosArquivo, tempo_ms: Date.now() - inicio,
      })

      novosResultados.push({ arquivo: file.name, tabela: layout.tabela, status: rejeitados === 0 ? 'sucesso' : importados === 0 ? 'erro' : 'parcial', importados, rejeitados, erros: errosArquivo, total: rows.length })
    }

    setResultados(novosResultados)
    setErroGlobal(todosErros)
    setProcessando(false)
    carregarClientes()
  }

  async function compararGabarito() {
    setComparando(true)
    setComparacao([])
    const { data: { user } } = await supabase.auth.getUser()

    const { data: gab } = await supabase.from('gabarito').select('*').eq('usuario_id', user.id)
    if (!gab || gab.length === 0) { setComparando(false); return }

    const { data: tributos } = await supabase.from('tributos_lab').select('*').eq('usuario_id', user.id)
    const { data: entradas } = await supabase.from('entradas').select('*').eq('usuario_id', user.id)

    const resultados = gab.map(g => {
      let valorCalculado = 0

      const trib = (tributos || []).find(t =>
        t.cnpj_empresa === g.cnpj_empresa &&
        t.competencia === g.competencia &&
        t.tributo === g.tributo
      )
      if (trib) valorCalculado = trib.valor_pago

      const ent = (entradas || []).find(e =>
        e.competencia === g.competencia &&
        e.tributo === g.tributo
      )
      if (ent && !trib) valorCalculado = ent.credito

      const diferenca = Math.abs(valorCalculado - g.valor_esperado)
      const aprovado = diferenca <= (g.tolerancia || 0.01)

      return {
        cnpj_empresa: g.cnpj_empresa,
        competencia: g.competencia,
        tributo: g.tributo,
        descricao: g.descricao_teste,
        valor_esperado: g.valor_esperado,
        valor_calculado: valorCalculado,
        diferenca,
        tolerancia: g.tolerancia,
        aprovado,
      }
    })

    setComparacao(resultados)
    setComparando(false)
  }

  const totalImportados = resultados.reduce((s, r) => s + r.importados, 0)
  const totalRejeitados = resultados.reduce((s, r) => s + r.rejeitados, 0)
  const totalArquivos   = resultados.length
  const aprovados       = comparacao.filter(c => c.aprovado).length
  const reprovados      = comparacao.filter(c => !c.aprovado).length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — QUALIDADE E HOMOLOGAÇÃO</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, color: '#fff' }}>🧪 Laboratório FiscalTrib</h1>
        <p style={{ fontSize: 14, color: '#93c5fd', margin: 0 }}>Importe CSVs completos de empresas reais ou fictícias e valide todos os cálculos do sistema.</p>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[['importar','📥 Importar CSVs'],['gabarito','🎯 Comparar Gabarito'],['historico','📋 Histórico']].map(([id,lb]) => (
          <div key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 20px', fontSize: 13, fontWeight: aba===id?700:500, color: aba===id?'#0B1F4D':'#64748b', cursor: 'pointer', borderBottom: `2px solid ${aba===id?'#0B1F4D':'transparent'}`, marginBottom: -2 }}>
            {lb}
          </div>
        ))}
      </div>

      {/* ABA IMPORTAR */}
      {aba === 'importar' && <>

        {/* Seleção de cliente */}
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '16px 20px', marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', display: 'block', marginBottom: 8 }}>
            👤 Cliente de referência (opcional — necessário para notas e oportunidades)
          </label>
          <select value={clienteSel} onChange={e => setClienteSel(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}>
            <option value=''>— Detectar automaticamente pelo CNPJ do CSV —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social} ({c.cnpj})</option>)}
          </select>
        </div>

        {/* Área de upload */}
        <div onClick={() => inputRef.current.click()}
          style={{ background: '#f8fafc', border: '3px dashed #e2e8f0', borderRadius: 16, padding: '48px 32px', textAlign: 'center', cursor: 'pointer', marginBottom: 20 }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = '#eff6ff' }}
          onDragLeave={e => e.currentTarget.style.background = '#f8fafc'}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.background = '#f8fafc'; processarArquivos(e.dataTransfer.files) }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0B1F4D', marginBottom: 8 }}>Arraste os arquivos CSV aqui</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Selecione um ou vários arquivos CSV — o sistema identifica automaticamente o tipo
          </div>
          <div style={{ display: 'inline-block', padding: '10px 28px', background: '#0B1F4D', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>
            📂 Selecionar arquivos
          </div>
          <input ref={inputRef} type="file" accept=".csv" multiple style={{ display: 'none' }}
            onChange={e => processarArquivos(e.target.files)} />
        </div>

        {/* Layouts suportados */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 12 }}>📋 Arquivos suportados</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.keys(LAYOUTS).map(nome => (
              <span key={nome} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#475569', fontWeight: 500 }}>
                {nome}
              </span>
            ))}
          </div>
        </div>

        {/* Processando */}
        {processando && (
          <div style={{ background: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>Processando arquivos... aguarde</div>
          </div>
        )}

        {/* Resultados */}
        {resultados.length > 0 && !processando && (
          <div>
            {/* Resumo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Arquivos processados', valor: totalArquivos,   cor: '#0B1F4D' },
                { label: 'Registros importados', valor: totalImportados, cor: '#16a34a' },
                { label: 'Registros rejeitados', valor: totalRejeitados, cor: '#dc2626' },
                { label: 'Taxa de sucesso',       valor: totalImportados + totalRejeitados > 0 ? `${Math.round(totalImportados/(totalImportados+totalRejeitados)*100)}%` : '—', cor: '#2563eb' },
              ].map((c, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '2px solid #e2e8f0', padding: '16px 18px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Por arquivo */}
            <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>
                📊 Resultado por arquivo
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Arquivo','Tabela','Status','Importados','Rejeitados','Total'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0B1F4D' }}>{r.arquivo}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{r.tabela || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          background: r.status==='sucesso'?'#dcfce7':r.status==='parcial'?'#fef9c3':r.status==='ignorado'?'#f1f5f9':'#fee2e2',
                          color: r.status==='sucesso'?'#166534':r.status==='parcial'?'#854d0e':r.status==='ignorado'?'#475569':'#991b1b',
                          padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700
                        }}>
                          {r.status==='sucesso'?'✅ Sucesso':r.status==='parcial'?'⚠️ Parcial':r.status==='ignorado'?'⏭️ Ignorado':'❌ Erro'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>{r.importados}</td>
                      <td style={{ padding: '10px 14px', color: r.rejeitados > 0 ? '#dc2626' : '#94a3b8', fontWeight: r.rejeitados > 0 ? 700 : 400 }}>{r.rejeitados}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{r.total || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Erros detalhados */}
            {erroGlobal.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #fecdd3', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #fecdd3', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
                  ❌ Erros detalhados ({erroGlobal.length})
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#fff1f2' }}>
                        {['Arquivo','Linha','Campo','Motivo'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#dc2626', borderBottom: '1px solid #fecdd3' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {erroGlobal.map((e, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #fff1f2' }}>
                          <td style={{ padding: '8px 14px', color: '#374151' }}>{e.arquivo}</td>
                          <td style={{ padding: '8px 14px', color: '#dc2626', fontWeight: 700 }}>{e.linha}</td>
                          <td style={{ padding: '8px 14px', color: '#374151', fontWeight: 600 }}>{e.campo}</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>{e.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </>}

      {/* ABA GABARITO */}
      {aba === 'gabarito' && <>
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 8 }}>🎯 Comparação de resultados com gabarito</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
            Importa o <strong>gabarito.csv</strong> primeiro pela aba Importar, depois clique em Comparar para validar os cálculos.
          </div>
          <button onClick={compararGabarito} disabled={comparando}
            style={{ padding: '12px 28px', background: '#0B1F4D', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: comparando?'default':'pointer', opacity: comparando?0.7:1 }}>
            {comparando ? '⏳ Comparando...' : '🔍 Comparar com gabarito'}
          </button>
        </div>

        {comparacao.length > 0 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Total de testes', valor: comparacao.length, cor: '#0B1F4D' },
                { label: '✅ Aprovados',     valor: aprovados,         cor: '#16a34a' },
                { label: '❌ Reprovados',    valor: reprovados,        cor: '#dc2626' },
              ].map((c, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '2px solid #e2e8f0', padding: '16px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Competência','Tributo','Esperado','Calculado','Diferença','Resultado'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparacao.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: c.aprovado ? '#f0fdf4' : '#fff1f2' }}>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{c.competencia}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0B1F4D' }}>{c.tributo}</td>
                      <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>{fmtR(c.valor_esperado)}</td>
                      <td style={{ padding: '10px 14px', color: c.aprovado?'#16a34a':'#dc2626', fontWeight: 700 }}>{fmtR(c.valor_calculado)}</td>
                      <td style={{ padding: '10px 14px', color: c.aprovado?'#64748b':'#dc2626', fontWeight: c.aprovado?400:700 }}>{fmtR(c.diferenca)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: c.aprovado?'#dcfce7':'#fee2e2', color: c.aprovado?'#166534':'#991b1b', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                          {c.aprovado ? '✅ OK' : '❌ Divergente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>}

      {/* ABA HISTÓRICO */}
      {aba === 'historico' && <HistoricoImportacoes />}
    </div>
  )
}

function HistoricoImportacoes() {
  const [logs, setLogs] = useState([])
  const [carregando, setCarregando] = useState(true)

  useState(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('log_importacao').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false }).limit(50)
      setLogs(data || [])
      setCarregando(false)
    }
    carregar()
  }, [])

  if (carregando) return <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Carregando histórico...</div>
  if (logs.length === 0) return (
    <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma importação realizada ainda</div>
    </div>
  )

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>
        📋 Últimas 50 importações
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['Data','Arquivo','Tabela','Importados','Rejeitados','Tempo'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
              <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0B1F4D' }}>{l.arquivo}</td>
              <td style={{ padding: '10px 14px', color: '#64748b' }}>{l.tabela}</td>
              <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>{l.importados}</td>
              <td style={{ padding: '10px 14px', color: l.rejeitados > 0 ? '#dc2626' : '#94a3b8', fontWeight: l.rejeitados > 0 ? 700 : 400 }}>{l.rejeitados}</td>
              <td style={{ padding: '10px 14px', color: '#64748b' }}>{l.tempo_ms ? `${l.tempo_ms}ms` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}