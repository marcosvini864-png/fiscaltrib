import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtN = v => parseInt(v || 0).toLocaleString('pt-BR')

// ─── CONFIGURAÇÃO DOS LAYOUTS ─────────────────────────────────────────────────
const LAYOUTS = {
  'empresa.csv': {
    tabela: 'clientes', descricao: 'Empresa',
    colunas: ['cnpj','razao_social','nome_fantasia','cnae_principal','regime_tributario','municipio','uf','inscricao_estadual','inscricao_municipal','competencia_inicio','competencia_fim'],
    obrigatorios: ['cnpj','razao_social','regime_tributario','municipio','uf'],
    enums: { regime_tributario: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj: row.cnpj, razao_social: row.razao_social, nome_fantasia: row.nome_fantasia||'', cnae_principal: row.cnae_principal||'', cnaes_secundarios: '', regime: row.regime_tributario, municipio: row.municipio, uf: row.uf, inscricao_estadual: row.inscricao_estadual||'', inscricao_municipal: row.inscricao_municipal||'', competencia_inicio: row.competencia_inicio||'', competencia_fim: row.competencia_fim||'', responsavel_contabil: '', observacoes: '', status: 'Em análise' }),
  },
  'socios.csv': {
    tabela: 'socios', descricao: 'Sócios',
    colunas: ['cnpj_empresa','cpf_socio','nome','percentual_participacao','data_entrada','qualificacao'],
    obrigatorios: ['cnpj_empresa','cpf_socio','nome','percentual_participacao','data_entrada'],
    decimais: ['percentual_participacao'], datas: ['data_entrada'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cpf_socio: row.cpf_socio, nome: row.nome, percentual_participacao: parseFloat(row.percentual_participacao), data_entrada: row.data_entrada, qualificacao: row.qualificacao||'' }),
  },
  'fornecedores.csv': {
    tabela: 'fornecedores', descricao: 'Fornecedores',
    colunas: ['cnpj_empresa','cnpj_cpf_fornecedor','nome','tipo','municipio','uf','email','telefone'],
    obrigatorios: ['cnpj_empresa','cnpj_cpf_fornecedor','nome','tipo'],
    enums: { tipo: ['F','J'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cnpj_cpf_fornecedor: row.cnpj_cpf_fornecedor, nome: row.nome, tipo: row.tipo, municipio: row.municipio||'', uf: row.uf||'', email: row.email||'', telefone: row.telefone||'' }),
  },
  'funcionarios.csv': {
    tabela: 'funcionarios', descricao: 'Funcionários',
    colunas: ['cnpj_empresa','cpf','nome','data_admissao','data_demissao','cargo','salario_base','cbo'],
    obrigatorios: ['cnpj_empresa','cpf','nome','data_admissao','salario_base'],
    decimais: ['salario_base'], datas: ['data_admissao','data_demissao'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cpf: row.cpf, nome: row.nome, data_admissao: row.data_admissao, data_demissao: row.data_demissao||null, cargo: row.cargo||'', salario_base: parseFloat(row.salario_base), cbo: row.cbo||'' }),
  },
  'produtos.csv': {
    tabela: 'produtos', descricao: 'Produtos',
    colunas: ['cnpj_empresa','codigo','descricao','ncm','cfop_saida','unidade','preco_unitario','cst_pis','cst_cofins','aliquota_pis','aliquota_cofins'],
    obrigatorios: ['cnpj_empresa','codigo','descricao','ncm'],
    decimais: ['preco_unitario','aliquota_pis','aliquota_cofins'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, codigo: row.codigo, descricao: row.descricao, ncm: row.ncm, cfop_saida: row.cfop_saida||'', unidade: row.unidade||'', preco_unitario: parseFloat(row.preco_unitario||0), cst_pis: row.cst_pis||'', cst_cofins: row.cst_cofins||'', aliquota_pis: parseFloat(row.aliquota_pis||0), aliquota_cofins: parseFloat(row.aliquota_cofins||0) }),
  },
  'notas_saida.csv': {
    tabela: 'entradas', descricao: 'Notas de Saída',
    colunas: ['cnpj_empresa','numero_nf','serie','data_emissao','cnpj_cpf_destinatario','cfop','valor_total','valor_icms','valor_pis','valor_cofins','valor_st','competencia'],
    obrigatorios: ['cnpj_empresa','numero_nf','data_emissao','valor_total','competencia'],
    decimais: ['valor_total','valor_icms','valor_pis','valor_cofins','valor_st'], datas: ['data_emissao'],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: 'NF-e Saída', receita_bruta: parseFloat(row.valor_total), tributo_pago: parseFloat(row.valor_icms||0)+parseFloat(row.valor_pis||0)+parseFloat(row.valor_cofins||0), tributo_devido: parseFloat(row.valor_icms||0)+parseFloat(row.valor_pis||0)+parseFloat(row.valor_cofins||0), credito: 0, tipo_oportunidade: '', risco: 'baixo' }),
  },
  'notas_entrada.csv': {
    tabela: 'entradas', descricao: 'Notas de Entrada',
    colunas: ['cnpj_empresa','numero_nf','serie','data_emissao','cnpj_fornecedor','cfop','valor_total','valor_icms','valor_pis','valor_cofins','valor_st','competencia'],
    obrigatorios: ['cnpj_empresa','numero_nf','data_emissao','valor_total','competencia'],
    decimais: ['valor_total','valor_icms','valor_pis','valor_cofins','valor_st'], datas: ['data_emissao'],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: 'NF-e Entrada', receita_bruta: parseFloat(row.valor_total), tributo_pago: 0, tributo_devido: 0, credito: 0, tipo_oportunidade: '', risco: 'baixo' }),
  },
  'folha.csv': {
    tabela: 'folha', descricao: 'Folha de Pagamento',
    colunas: ['cnpj_empresa','competencia','cpf_funcionario','salario_bruto','inss_funcionario','irrf','salario_liquido','inss_patronal','fgts','rat','terceiros'],
    obrigatorios: ['cnpj_empresa','competencia','cpf_funcionario','salario_bruto','salario_liquido'],
    decimais: ['salario_bruto','inss_funcionario','irrf','salario_liquido','inss_patronal','fgts','rat','terceiros'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_funcionario: row.cpf_funcionario, salario_bruto: parseFloat(row.salario_bruto), inss_funcionario: parseFloat(row.inss_funcionario||0), irrf: parseFloat(row.irrf||0), salario_liquido: parseFloat(row.salario_liquido), inss_patronal: parseFloat(row.inss_patronal||0), fgts: parseFloat(row.fgts||0), rat: parseFloat(row.rat||0), terceiros: parseFloat(row.terceiros||0) }),
  },
  'pagamentos.csv': {
    tabela: 'pagamentos', descricao: 'Pagamentos',
    colunas: ['cnpj_empresa','data_pagamento','descricao','valor','categoria','cnpj_cpf_favorecido','competencia'],
    obrigatorios: ['cnpj_empresa','data_pagamento','descricao','valor','competencia'],
    decimais: ['valor'], datas: ['data_pagamento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, data_pagamento: row.data_pagamento, descricao: row.descricao, valor: parseFloat(row.valor), categoria: row.categoria||'', cnpj_cpf_favorecido: row.cnpj_cpf_favorecido||'', competencia: row.competencia }),
  },
  'recebimentos.csv': {
    tabela: 'recebimentos', descricao: 'Recebimentos',
    colunas: ['cnpj_empresa','data_recebimento','descricao','valor','categoria','cnpj_cpf_pagador','competencia'],
    obrigatorios: ['cnpj_empresa','data_recebimento','descricao','valor','competencia'],
    decimais: ['valor'], datas: ['data_recebimento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, data_recebimento: row.data_recebimento, descricao: row.descricao, valor: parseFloat(row.valor), categoria: row.categoria||'', cnpj_cpf_pagador: row.cnpj_cpf_pagador||'', competencia: row.competencia }),
  },
  'tributos.csv': {
    tabela: 'tributos_lab', descricao: 'Tributos',
    colunas: ['cnpj_empresa','competencia','tributo','valor_devido','valor_pago','data_pagamento','numero_guia','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','tributo','situacao'],
    decimais: ['valor_devido','valor_pago'], datas: ['data_pagamento'],
    enums: { situacao: ['pago','pendente','atraso'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, tributo: row.tributo, valor_devido: parseFloat(row.valor_devido||0), valor_pago: parseFloat(row.valor_pago||0), data_pagamento: row.data_pagamento||null, numero_guia: row.numero_guia||'', situacao: row.situacao }),
  },
  'fgts.csv': {
    tabela: 'fgts', descricao: 'FGTS',
    colunas: ['cnpj_empresa','competencia','cpf_funcionario','remuneracao','aliquota','valor_fgts','data_recolhimento','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','cpf_funcionario','remuneracao','valor_fgts','situacao'],
    decimais: ['remuneracao','aliquota','valor_fgts'], datas: ['data_recolhimento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_funcionario: row.cpf_funcionario, remuneracao: parseFloat(row.remuneracao), aliquota: parseFloat(row.aliquota||8), valor_fgts: parseFloat(row.valor_fgts), data_recolhimento: row.data_recolhimento||null, situacao: row.situacao }),
  },
  'irrf.csv': {
    tabela: 'irrf', descricao: 'IRRF',
    colunas: ['cnpj_empresa','competencia','cpf_beneficiario','natureza_rendimento','valor_rendimento','base_calculo','aliquota','valor_irrf','data_recolhimento'],
    obrigatorios: ['cnpj_empresa','competencia','cpf_beneficiario'],
    decimais: ['valor_rendimento','base_calculo','aliquota','valor_irrf'], datas: ['data_recolhimento'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_beneficiario: row.cpf_beneficiario, natureza_rendimento: row.natureza_rendimento||'', valor_rendimento: parseFloat(row.valor_rendimento||0), base_calculo: parseFloat(row.base_calculo||0), aliquota: parseFloat(row.aliquota||0), valor_irrf: parseFloat(row.valor_irrf||0), data_recolhimento: row.data_recolhimento||null }),
  },
  'dctfweb.csv': {
    tabela: 'dctfweb_lab', descricao: 'DCTFWeb',
    colunas: ['cnpj_empresa','competencia','total_debito','total_credito','total_recolher','data_transmissao','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','situacao'],
    decimais: ['total_debito','total_credito','total_recolher'], datas: ['data_transmissao'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, total_debito: parseFloat(row.total_debito||0), total_credito: parseFloat(row.total_credito||0), total_recolher: parseFloat(row.total_recolher||0), data_transmissao: row.data_transmissao||null, situacao: row.situacao }),
  },
  'esocial.csv': {
    tabela: 'esocial', descricao: 'eSocial',
    colunas: ['cnpj_empresa','competencia','evento','numero_recibo','data_envio','situacao','valor_contribuicao'],
    obrigatorios: ['cnpj_empresa','competencia','evento','situacao'],
    decimais: ['valor_contribuicao'], datas: ['data_envio'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, evento: row.evento, numero_recibo: row.numero_recibo||'', data_envio: row.data_envio||null, situacao: row.situacao, valor_contribuicao: parseFloat(row.valor_contribuicao||0) }),
  },
  'efd_reinf.csv': {
    tabela: 'efd_reinf', descricao: 'EFD-Reinf',
    colunas: ['cnpj_empresa','competencia','evento','numero_recibo','data_envio','base_calculo','aliquota','valor_retencao','situacao'],
    obrigatorios: ['cnpj_empresa','competencia','evento','situacao'],
    decimais: ['base_calculo','aliquota','valor_retencao'], datas: ['data_envio'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, evento: row.evento, numero_recibo: row.numero_recibo||'', data_envio: row.data_envio||null, base_calculo: parseFloat(row.base_calculo||0), aliquota: parseFloat(row.aliquota||0), valor_retencao: parseFloat(row.valor_retencao||0), situacao: row.situacao }),
  },
  'pis_cofins.csv': {
    tabela: 'pis_cofins', descricao: 'PIS/COFINS',
    colunas: ['cnpj_empresa','competencia','regime','base_calculo_pis','aliquota_pis','valor_pis','base_calculo_cofins','aliquota_cofins','valor_cofins','creditos_pis','creditos_cofins','pis_recolher','cofins_recolher'],
    obrigatorios: ['cnpj_empresa','competencia','regime'],
    decimais: ['base_calculo_pis','aliquota_pis','valor_pis','base_calculo_cofins','aliquota_cofins','valor_cofins','creditos_pis','creditos_cofins','pis_recolher','cofins_recolher'],
    enums: { regime: ['cumulativo','nao_cumulativo'] },
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, regime: row.regime, base_calculo_pis: parseFloat(row.base_calculo_pis||0), aliquota_pis: parseFloat(row.aliquota_pis||0), valor_pis: parseFloat(row.valor_pis||0), base_calculo_cofins: parseFloat(row.base_calculo_cofins||0), aliquota_cofins: parseFloat(row.aliquota_cofins||0), valor_cofins: parseFloat(row.valor_cofins||0), creditos_pis: parseFloat(row.creditos_pis||0), creditos_cofins: parseFloat(row.creditos_cofins||0), pis_recolher: parseFloat(row.pis_recolher||0), cofins_recolher: parseFloat(row.cofins_recolher||0) }),
  },
  'irpj_csll.csv': {
    tabela: 'irpj_csll', descricao: 'IRPJ/CSLL',
    colunas: ['cnpj_empresa','competencia','trimestre','receita_bruta','percentual_presuncao_irpj','base_irpj','aliquota_irpj','adicional_irpj','valor_irpj','percentual_presuncao_csll','base_csll','aliquota_csll','valor_csll'],
    obrigatorios: ['cnpj_empresa','competencia'],
    decimais: ['receita_bruta','percentual_presuncao_irpj','base_irpj','aliquota_irpj','adicional_irpj','valor_irpj','percentual_presuncao_csll','base_csll','aliquota_csll','valor_csll'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, trimestre: row.trimestre||'', receita_bruta: parseFloat(row.receita_bruta||0), percentual_presuncao_irpj: parseFloat(row.percentual_presuncao_irpj||0), base_irpj: parseFloat(row.base_irpj||0), aliquota_irpj: parseFloat(row.aliquota_irpj||0), adicional_irpj: parseFloat(row.adicional_irpj||0), valor_irpj: parseFloat(row.valor_irpj||0), percentual_presuncao_csll: parseFloat(row.percentual_presuncao_csll||0), base_csll: parseFloat(row.base_csll||0), aliquota_csll: parseFloat(row.aliquota_csll||0), valor_csll: parseFloat(row.valor_csll||0) }),
  },
  'oportunidades.csv': {
    tabela: 'entradas', descricao: 'Oportunidades',
    colunas: ['cnpj_empresa','competencia','tributo','tipo_oportunidade','valor_pago','valor_devido','credito','risco','tese_aplicada','observacao'],
    obrigatorios: ['cnpj_empresa','competencia','tributo','credito','risco'],
    decimais: ['valor_pago','valor_devido','credito'],
    enums: { risco: ['baixo','medio','alto'] },
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: row.tributo, receita_bruta: 0, tributo_pago: parseFloat(row.valor_pago||0), tributo_devido: parseFloat(row.valor_devido||0), credito: parseFloat(row.credito||0), tipo_oportunidade: row.tipo_oportunidade||'', risco: row.risco }),
  },
  'gabarito.csv': {
    tabela: 'gabarito', descricao: 'Gabarito',
    colunas: ['cnpj_empresa','competencia','tributo','valor_esperado','tolerancia','descricao_teste'],
    obrigatorios: ['cnpj_empresa','competencia','tributo','valor_esperado'],
    decimais: ['valor_esperado','tolerancia'],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, tributo: row.tributo, valor_esperado: parseFloat(row.valor_esperado), tolerancia: parseFloat(row.tolerancia||0.01), descricao_teste: row.descricao_teste||'' }),
  },
}

// Prioridade 7 — arquitetura extensível para futuros formatos
const FORMATOS_FUTUROS = [
  { ext: '.xlsx', label: 'Excel', status: 'Em breve' },
  { ext: '.txt (SPED)', label: 'SPED Fiscal', status: 'Em breve' },
  { ext: '.txt (SPED)', label: 'SPED Contribuições', status: 'Em breve' },
  { ext: '.txt (ECD)', label: 'ECD', status: 'Em breve' },
  { ext: '.txt (ECF)', label: 'ECF', status: 'Em breve' },
  { ext: '.xml', label: 'XML NF-e', status: 'Em breve' },
  { ext: '.xml (DCTF)', label: 'DCTF', status: 'Em breve' },
]

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

function validarRow(row, layout, arquivo) {
  const erros = []
  const { obrigatorios=[], decimais=[], datas=[], enums={} } = layout
  obrigatorios.forEach(col => { if (!row[col]||row[col].toString().trim()==='') erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Campo obrigatório vazio` }) })
  decimais.forEach(col => { if (row[col]&&row[col]!=='') { const v=parseFloat(row[col].replace(',','.')); if(isNaN(v)) erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Valor numérico inválido: "${row[col]}"` }) } })
  datas.forEach(col => { if (row[col]&&row[col]!=='') { if(!/^\d{4}-\d{2}-\d{2}$/.test(row[col])) erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Data inválida: "${row[col]}" (use AAAA-MM-DD)` }) } })
  Object.entries(enums).forEach(([col,vals]) => { if (row[col]&&!vals.includes(row[col])) erros.push({ arquivo, linha: row._linha, campo: col, motivo: `Valor "${row[col]}" inválido. Permitidos: ${vals.join(', ')}` }) })
  return erros
}

export default function Laboratorio() {
  const inputRef    = useRef()
  const inputPasta  = useRef()

  const [aba,          setAba]          = useState('importar')
  const [processando,  setProcessando]  = useState(false)
  const [progresso,    setProgresso]    = useState({ atual: 0, total: 0, arquivo: '' })
  const [resultados,   setResultados]   = useState([])
  const [erroGlobal,   setErroGlobal]   = useState([])
  const [resumoEmpresa,setResumoEmpresa]= useState(null)
  const [comparacao,   setComparacao]   = useState([])
  const [comparando,   setComparando]   = useState(false)
  const [historico,    setHistorico]    = useState([])
  const [limpando,     setLimpando]     = useState(false)
  const [cnpjAtivo,    setCnpjAtivo]    = useState('')

  useEffect(() => { carregarHistorico() }, [])

  async function carregarHistorico() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('log_importacao').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false }).limit(30)
    setHistorico(data || [])
  }

  // ── Prioridade 1 — importar pasta ou arquivos avulsos ────────────────────
  async function processarArquivos(files) {
    setProcessando(true)
    setResultados([])
    setErroGlobal([])
    setResumoEmpresa(null)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user.id
    const inicio = Date.now()
    const novosResultados = []
    const todosErros = []

    // Ordenar: empresa.csv primeiro para garantir que o cliente exista
    const filesOrdenados = Array.from(files).sort((a, b) => {
      if (a.name.toLowerCase() === 'empresa.csv') return -1
      if (b.name.toLowerCase() === 'empresa.csv') return 1
      return 0
    })

    setProgresso({ atual: 0, total: filesOrdenados.length, arquivo: '' })
    let cnpjDetectado = ''
    let clienteIdDetectado = null

    for (let fi = 0; fi < filesOrdenados.length; fi++) {
      const file = filesOrdenados[fi]
      const nomeArquivo = file.name.toLowerCase()
      setProgresso({ atual: fi + 1, total: filesOrdenados.length, arquivo: file.name })

      const layout = LAYOUTS[nomeArquivo]
      if (!layout) {
        novosResultados.push({ arquivo: file.name, status: 'ignorado', motivo: 'Layout não reconhecido', importados: 0, rejeitados: 0, erros: [], total: 0 })
        continue
      }

      const texto = await file.text()
      const { cabecalho, rows } = parseCSV(texto)

      const colsFaltando = layout.colunas.filter(c => !cabecalho.includes(c))
      if (colsFaltando.length > 0) {
        novosResultados.push({ arquivo: file.name, status: 'erro', motivo: `Colunas faltando: ${colsFaltando.join(', ')}`, importados: 0, rejeitados: rows.length, erros: [], total: rows.length })
        continue
      }

      // Detectar CNPJ automaticamente
      if (nomeArquivo === 'empresa.csv' && rows.length > 0) {
        cnpjDetectado = rows[0].cnpj || ''
        setCnpjAtivo(cnpjDetectado)
      }

      // Detectar clienteId
      let clienteId = clienteIdDetectado
      const precisaCliente = ['notas_saida.csv','notas_entrada.csv','oportunidades.csv'].includes(nomeArquivo)
      if (precisaCliente && !clienteId && cnpjDetectado) {
        const { data: cli } = await supabase.from('clientes').select('id').eq('cnpj', cnpjDetectado).eq('usuario_id', uid).single()
        clienteId = cli?.id || null
        clienteIdDetectado = clienteId
      }

      let importados = 0; let rejeitados = 0; const errosArquivo = []

      for (const row of rows) {
        const erros = validarRow(row, layout, file.name)
        if (erros.length > 0) { errosArquivo.push(...erros); todosErros.push(...erros); rejeitados++; continue }
        try {
          const payload = layout.mapear(row, uid, clienteId)
          const { error } = await supabase.from(layout.tabela).insert(payload)
          if (error) { errosArquivo.push({ arquivo: file.name, linha: row._linha, campo: '-', motivo: error.message }); rejeitados++ }
          else importados++
        } catch(e) { errosArquivo.push({ arquivo: file.name, linha: row._linha, campo: '-', motivo: e.message }); rejeitados++ }
      }

      // Se foi empresa.csv, buscar clienteId logo após inserir
      if (nomeArquivo === 'empresa.csv' && cnpjDetectado && !clienteIdDetectado) {
        const { data: cli } = await supabase.from('clientes').select('id').eq('cnpj', cnpjDetectado).eq('usuario_id', uid).single()
        clienteIdDetectado = cli?.id || null
      }

      await supabase.from('log_importacao').insert({ usuario_id: uid, arquivo: file.name, tabela: layout.tabela, total_linhas: rows.length, importados, rejeitados, erros: errosArquivo, tempo_ms: Date.now()-inicio })
      novosResultados.push({ arquivo: file.name, descricao: layout.descricao, tabela: layout.tabela, status: rejeitados===0?'sucesso':importados===0?'erro':'parcial', importados, rejeitados, erros: errosArquivo, total: rows.length })
    }

    setResultados(novosResultados)
    setErroGlobal(todosErros)
    setProcessando(false)

    // Prioridade 4 — resumo da empresa
    if (cnpjDetectado) await carregarResumoEmpresa(uid, cnpjDetectado)
    carregarHistorico()
  }

  // ── Prioridade 4 — resumo da empresa importada ────────────────────────────
  async function carregarResumoEmpresa(uid, cnpj) {
    const { data: emp } = await supabase.from('clientes').select('*').eq('cnpj', cnpj).eq('usuario_id', uid).single()
    if (!emp) return
    const { data: funcs } = await supabase.from('funcionarios').select('id').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const { data: nfes  } = await supabase.from('entradas').select('receita_bruta,tributo_pago').eq('cliente_id', emp.id).eq('usuario_id', uid)
    const { data: tribs } = await supabase.from('tributos_lab').select('tributo,valor_pago').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const receitaBruta   = (nfes||[]).filter(n=>n.tributo_pago>=0).reduce((s,n)=>s+(n.receita_bruta||0),0)
    const tributosTotal  = (tribs||[]).reduce((s,t)=>s+(t.valor_pago||0),0)
    setResumoEmpresa({ ...emp, qtd_funcionarios: (funcs||[]).length, qtd_nfes: (nfes||[]).length, receita_bruta: receitaBruta, tributos_total: tributosTotal, tributos: tribs||[] })
  }

  // ── Prioridade 3 — comparar gabarito ─────────────────────────────────────
  async function compararGabarito() {
    setComparando(true); setComparacao([])
    const { data: { user } } = await supabase.auth.getUser()
    const { data: gab }  = await supabase.from('gabarito').select('*').eq('usuario_id', user.id)
    if (!gab||gab.length===0) { setComparando(false); return }
    const { data: tribs } = await supabase.from('tributos_lab').select('*').eq('usuario_id', user.id)
    const { data: ents  } = await supabase.from('entradas').select('*').eq('usuario_id', user.id)
    const res = gab.map(g => {
      let valorCalculado = 0
      const t = (tribs||[]).find(x => x.cnpj_empresa===g.cnpj_empresa && x.competencia===g.competencia && x.tributo===g.tributo)
      if (t) valorCalculado = t.valor_pago
      const e = (ents||[]).find(x => x.competencia===g.competencia && x.tributo===g.tributo)
      if (e&&!t) valorCalculado = e.credito
      const diferenca = Math.abs(valorCalculado - g.valor_esperado)
      return { ...g, valor_calculado: valorCalculado, diferenca, aprovado: diferenca<=(g.tolerancia||0.01) }
    })
    setComparacao(res); setComparando(false)
  }

  // ── Prioridade 5 — limpar cenário ────────────────────────────────────────
  async function limparCenario() {
    if (!window.confirm('Isso vai apagar TODOS os dados importados no Laboratório (funcionários, notas, folha, tributos, gabarito etc). Continuar?')) return
    setLimpando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user.id
    const tabelas = ['funcionarios','socios','fornecedores','produtos','folha','pagamentos','recebimentos','tributos_lab','fgts','irrf','dctfweb_lab','esocial','efd_reinf','pis_cofins','irpj_csll','gabarito','log_importacao']
    for (const t of tabelas) await supabase.from(t).delete().eq('usuario_id', uid)
    // Apagar clientes importados via laboratório (que tenham cnpj detectado)
    if (cnpjAtivo) await supabase.from('clientes').delete().eq('cnpj', cnpjAtivo).eq('usuario_id', uid)
    setResultados([]); setErroGlobal([]); setResumoEmpresa(null); setComparacao([]); setCnpjAtivo(''); setHistorico([])
    setLimpando(false)
    alert('✅ Cenário limpo com sucesso! Pode importar um novo cenário.')
  }

  const totalImportados = resultados.reduce((s,r)=>s+r.importados, 0)
  const totalRejeitados = resultados.reduce((s,r)=>s+r.rejeitados, 0)
  const aprovados  = comparacao.filter(c=>c.aprovado).length
  const reprovados = comparacao.filter(c=>!c.aprovado).length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>FISCALTRIB — QUALIDADE E HOMOLOGAÇÃO</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8, color: '#fff' }}>🧪 Laboratório FiscalTrib</h1>
            <p style={{ fontSize: 14, color: '#93c5fd', margin: 0 }}>Importe cenários completos de empresas e valide todos os cálculos do sistema.</p>
          </div>
          {/* Prioridade 5 — botão limpar cenário */}
          <button onClick={limparCenario} disabled={limpando}
            style={{ padding: '10px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: limpando?'default':'pointer', opacity: limpando?0.7:1, whiteSpace: 'nowrap' }}>
            {limpando ? '⏳ Limpando...' : '🗑️ Limpar Cenário'}
          </button>
        </div>
        {cnpjAtivo && (
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
            🏢 Cenário ativo: CNPJ {cnpjAtivo}
          </div>
        )}
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[['importar','📥 Importar CSVs'],['resumo','🏢 Resumo da Empresa'],['gabarito','🎯 Comparar Gabarito'],['historico','📋 Histórico'],['formatos','🔮 Formatos Futuros']].map(([id,lb]) => (
          <div key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 18px', fontSize: 13, fontWeight: aba===id?700:500, color: aba===id?'#0B1F4D':'#64748b', cursor: 'pointer', borderBottom: `2px solid ${aba===id?'#0B1F4D':'transparent'}`, marginBottom: -2, whiteSpace: 'nowrap' }}>
            {lb}
          </div>
        ))}
      </div>

      {/* ── ABA IMPORTAR ── */}
      {aba==='importar' && <>
        {/* Área de upload — Prioridade 1: pasta ou arquivos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div onClick={() => inputPasta.current.click()}
            style={{ background: '#f0fdf4', border: '3px dashed #86efac', borderRadius: 14, padding: '32px 24px', textAlign: 'center', cursor: 'pointer' }}
            onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='#dcfce7' }}
            onDragLeave={e=>e.currentTarget.style.background='#f0fdf4'}
            onDrop={e=>{ e.preventDefault(); e.currentTarget.style.background='#f0fdf4'; processarArquivos(e.dataTransfer.files) }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#166534', marginBottom: 4 }}>Selecionar Pasta</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Empresa001/ com todos os CSVs</div>
            <input ref={inputPasta} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }}
              onChange={e => processarArquivos(e.target.files)} />
          </div>
          <div onClick={() => inputRef.current.click()}
            style={{ background: '#eff6ff', border: '3px dashed #bfdbfe', borderRadius: 14, padding: '32px 24px', textAlign: 'center', cursor: 'pointer' }}
            onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='#dbeafe' }}
            onDragLeave={e=>e.currentTarget.style.background='#eff6ff'}
            onDrop={e=>{ e.preventDefault(); e.currentTarget.style.background='#eff6ff'; processarArquivos(e.dataTransfer.files) }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>Selecionar Arquivos</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Escolha um ou vários CSVs</div>
            <input ref={inputRef} type="file" accept=".csv" multiple style={{ display: 'none' }}
              onChange={e => processarArquivos(e.target.files)} />
          </div>
        </div>

        {/* Barra de progresso */}
        {processando && (
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #bfdbfe', padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af' }}>⏳ Processando: {progresso.arquivo}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{progresso.atual} / {progresso.total}</div>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 10, overflow: 'hidden' }}>
              <div style={{ background: '#0B1F4D', height: 10, borderRadius: 99, width: `${progresso.total>0?(progresso.atual/progresso.total*100):0}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Prioridade 2 — relatório detalhado por arquivo */}
        {resultados.length > 0 && !processando && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Arquivos',   valor: resultados.length,  cor: '#0B1F4D' },
                { label: 'Importados', valor: fmtN(totalImportados), cor: '#16a34a' },
                { label: 'Rejeitados', valor: fmtN(totalRejeitados), cor: '#dc2626' },
                { label: 'Sucesso',    valor: totalImportados+totalRejeitados>0?`${Math.round(totalImportados/(totalImportados+totalRejeitados)*100)}%`:'—', cor: '#2563eb' },
              ].map((c,i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '2px solid #e2e8f0', padding: '14px 18px' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Resultado por arquivo */}
            <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>📊 Resultado por arquivo</div>
              {resultados.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i<resultados.length-1?'1px solid #f1f5f9':'none', background: r.status==='sucesso'?'#f0fdf4':r.status==='erro'?'#fff1f2':r.status==='ignorado'?'#f8fafc':'#fffbeb' }}>
                  <div style={{ fontSize: 16 }}>{r.status==='sucesso'?'✅':r.status==='erro'?'❌':r.status==='ignorado'?'⏭️':'⚠️'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D' }}>{r.arquivo}</div>
                    {r.motivo && <div style={{ fontSize: 12, color: '#dc2626' }}>{r.motivo}</div>}
                  </div>
                  {r.status !== 'ignorado' && (
                    <div style={{ fontSize: 13, color: '#64748b', textAlign: 'right' }}>
                      {r.importados > 0 && <span style={{ color: '#16a34a', fontWeight: 700 }}>{fmtN(r.importados)} importado(s)</span>}
                      {r.rejeitados > 0 && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 8 }}>{fmtN(r.rejeitados)} rejeitado(s)</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Erros detalhados */}
            {erroGlobal.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #fecdd3', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #fecdd3', fontSize: 14, fontWeight: 700, color: '#dc2626' }}>❌ Erros detalhados ({erroGlobal.length})</div>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: '#fff1f2' }}>{['Arquivo','Linha','Campo','Motivo'].map(h=><th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#dc2626', borderBottom:'1px solid #fecdd3' }}>{h}</th>)}</tr></thead>
                    <tbody>{erroGlobal.map((e,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid #fff1f2' }}>
                        <td style={{ padding:'8px 14px', color:'#374151' }}>{e.arquivo}</td>
                        <td style={{ padding:'8px 14px', color:'#dc2626', fontWeight:700 }}>{e.linha}</td>
                        <td style={{ padding:'8px 14px', fontWeight:600 }}>{e.campo}</td>
                        <td style={{ padding:'8px 14px', color:'#64748b' }}>{e.motivo}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layouts suportados */}
        {resultados.length === 0 && !processando && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D', marginBottom: 12 }}>📋 Arquivos suportados ({Object.keys(LAYOUTS).length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(LAYOUTS).map(([nome, l]) => (
                <span key={nome} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#475569', fontWeight: 500 }}>
                  {nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </>}

      {/* ── ABA RESUMO DA EMPRESA — Prioridade 4 ── */}
      {aba==='resumo' && (
        resumoEmpresa ? (
          <div>
            <div style={{ background: 'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius: 14, padding: '24px 28px', color: '#fff', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>EMPRESA IMPORTADA</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>{resumoEmpresa.razao_social}</div>
              <div style={{ fontSize: 14, color: '#93c5fd' }}>{resumoEmpresa.cnpj} · {resumoEmpresa.regime} · {resumoEmpresa.municipio}/{resumoEmpresa.uf}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Regime',          valor: resumoEmpresa.regime,                            cor: '#2563eb' },
                { label: 'Período',         valor: `${resumoEmpresa.competencia_inicio||'—'} a ${resumoEmpresa.competencia_fim||'—'}`, cor: '#7c3aed' },
                { label: 'Funcionários',    valor: fmtN(resumoEmpresa.qtd_funcionarios),            cor: '#0d9488' },
                { label: 'Notas Fiscais',   valor: fmtN(resumoEmpresa.qtd_nfes),                   cor: '#d97706' },
              ].map((c,i) => (
                <div key={i} style={{ background: '#fff', borderRadius: 10, border: '2px solid #e2e8f0', padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ background: '#f0fdf4', borderRadius: 12, border: '2px solid #86efac', padding: '20px 24px' }}>
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginBottom: 4 }}>RECEITA BRUTA TOTAL</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a' }}>{fmtR(resumoEmpresa.receita_bruta)}</div>
              </div>
              <div style={{ background: '#fff1f2', borderRadius: 12, border: '2px solid #fecdd3', padding: '20px 24px' }}>
                <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>TRIBUTOS CALCULADOS</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>{fmtR(resumoEmpresa.tributos_total)}</div>
              </div>
            </div>
            {resumoEmpresa.tributos.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>💰 Tributos por tipo</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f8fafc' }}>{['Tributo','Competência','Valor Pago','Status'].map(h=><th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                  <tbody>{resumoEmpresa.tributos.map((t,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#0B1F4D' }}>{t.tributo}</td>
                      <td style={{ padding:'10px 14px', color:'#64748b' }}>{t.competencia}</td>
                      <td style={{ padding:'10px 14px', color:'#16a34a', fontWeight:700 }}>{fmtR(t.valor_pago)}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ background: t.situacao==='pago'?'#dcfce7':t.situacao==='pendente'?'#fef9c3':'#fee2e2', color: t.situacao==='pago'?'#166534':t.situacao==='pendente'?'#854d0e':'#991b1b', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{t.situacao}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma empresa importada ainda</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Importe o arquivo <strong>empresa.csv</strong> para ver o resumo aqui</div>
          </div>
        )
      )}

      {/* ── ABA GABARITO — Prioridade 3 ── */}
      {aba==='gabarito' && <>
        <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 8 }}>🎯 Comparação com Gabarito</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Importe o <strong>gabarito.csv</strong> primeiro e depois clique em Comparar.</div>
          <button onClick={compararGabarito} disabled={comparando}
            style={{ padding: '12px 28px', background: '#0B1F4D', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: comparando?'default':'pointer', opacity: comparando?0.7:1 }}>
            {comparando ? '⏳ Comparando...' : '🔍 Comparar com Gabarito'}
          </button>
        </div>

        {comparacao.length > 0 && <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total de testes', valor: comparacao.length, cor: '#0B1F4D' },
              { label: '✅ Aprovados',     valor: aprovados,         cor: '#16a34a' },
              { label: '❌ Reprovados',    valor: reprovados,        cor: '#dc2626' },
            ].map((c,i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 10, border: '2px solid #e2e8f0', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: c.cor }}>{c.valor}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{c.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Competência','Tributo','Esperado','Calculado','Diferença','Status'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparacao.map((c,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background: c.aprovado?'#f0fdf4':'#fff1f2' }}>
                    <td style={{ padding:'10px 14px', color:'#374151' }}>{c.competencia}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:'#0B1F4D' }}>{c.tributo}</td>
                    <td style={{ padding:'10px 14px', color:'#16a34a', fontWeight:700 }}>{fmtR(c.valor_esperado)}</td>
                    <td style={{ padding:'10px 14px', color: c.aprovado?'#16a34a':'#dc2626', fontWeight:700 }}>{fmtR(c.valor_calculado)}</td>
                    <td style={{ padding:'10px 14px', color: c.aprovado?'#94a3b8':'#dc2626', fontWeight: c.aprovado?400:700 }}>{fmtR(c.diferenca)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background: c.aprovado?'#dcfce7':'#fee2e2', color: c.aprovado?'#166534':'#991b1b', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                        {c.aprovado ? '✅ OK' : '❌ Divergente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}
      </>}

      {/* ── ABA HISTÓRICO — Prioridade 6 ── */}
      {aba==='historico' && (
        historico.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma importação realizada ainda</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#0B1F4D' }}>📋 Histórico de importações</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Data','Arquivo','Tabela','Importados','Rejeitados','Tempo'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((l,i) => (
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'10px 14px', color:'#64748b', fontSize:12 }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:'#0B1F4D' }}>{l.arquivo}</td>
                    <td style={{ padding:'10px 14px', color:'#64748b' }}>{l.tabela}</td>
                    <td style={{ padding:'10px 14px', color:'#16a34a', fontWeight:700 }}>{fmtN(l.importados)}</td>
                    <td style={{ padding:'10px 14px', color: l.rejeitados>0?'#dc2626':'#94a3b8', fontWeight: l.rejeitados>0?700:400 }}>{fmtN(l.rejeitados)}</td>
                    <td style={{ padding:'10px 14px', color:'#64748b' }}>{l.tempo_ms?`${l.tempo_ms}ms`:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── ABA FORMATOS FUTUROS — Prioridade 7 ── */}
      {aba==='formatos' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 8 }}>✅ Formatos ativos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(LAYOUTS).map(([nome]) => (
                <span key={nome} style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#166534', fontWeight: 600 }}>
                  ✅ {nome}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #e2e8f0', padding: '20px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F4D', marginBottom: 8 }}>🔮 Formatos em desenvolvimento</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>A arquitetura do Laboratório foi projetada para receber novos formatos sem alterar a estrutura principal. Cada novo formato basta registrar um novo parser na tabela LAYOUTS.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FORMATOS_FUTUROS.map((f,i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 20 }}>🔮</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0B1F4D' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{f.ext}</div>
                  </div>
                  <span style={{ background: '#fef9c3', color: '#854d0e', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Em breve</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}