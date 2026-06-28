import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabase'

const fmtR = v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtN = v => parseInt(v || 0).toLocaleString('pt-BR')

// ─── LAYOUTS OFICIAIS FiscalTrib ──────────────────────────────────────────────
const LAYOUTS = {
  'empresa.csv': {
    descricao: 'Empresa',
    tabela: 'clientes',
    colunas: [
      { nome: 'cnpj',               tipo: 'texto',    obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'razao_social',       tipo: 'texto',    obrigatorio: true,  exemplo: 'Mercado Exemplo Ltda' },
      { nome: 'nome_fantasia',      tipo: 'texto',    obrigatorio: false, exemplo: 'Mercado Exemplo' },
      { nome: 'regime_tributario',  tipo: 'enum',     obrigatorio: true,  exemplo: 'Simples Nacional', valores: ['Simples Nacional','Lucro Presumido','Lucro Real'] },
      { nome: 'cnae',               tipo: 'texto',    obrigatorio: true,  exemplo: '47.11-3-01' },
      { nome: 'abertura',           tipo: 'data',     obrigatorio: false, exemplo: '2015-03-01' },
      { nome: 'municipio',          tipo: 'texto',    obrigatorio: true,  exemplo: 'São Paulo' },
      { nome: 'uf',                 tipo: 'texto2',   obrigatorio: true,  exemplo: 'SP' },
      { nome: 'inscricao_estadual', tipo: 'texto',    obrigatorio: false, exemplo: '111222333' },
      { nome: 'inscricao_municipal',tipo: 'texto',    obrigatorio: false, exemplo: '445566' },
      { nome: 'competencia_inicio', tipo: 'aaaa-mm',  obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'competencia_fim',    tipo: 'aaaa-mm',  obrigatorio: true,  exemplo: '2024-12' },
    ],
    mapear: (row, uid) => ({
      usuario_id: uid, cnpj: row.cnpj, razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia||'', cnae_principal: row.cnae||'',
      cnaes_secundarios: '', regime: row.regime_tributario,
      municipio: row.municipio, uf: row.uf,
      inscricao_estadual: row.inscricao_estadual||'',
      inscricao_municipal: row.inscricao_municipal||'',
      competencia_inicio: row.competencia_inicio||'',
      competencia_fim: row.competencia_fim||'',
      responsavel_contabil: '', observacoes: '', status: 'Em análise',
    }),
  },
  'socios.csv': {
    descricao: 'Sócios', tabela: 'socios',
    colunas: [
      { nome: 'cnpj_empresa',             tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'cpf_socio',                tipo: 'texto',   obrigatorio: true,  exemplo: '111.222.333-44' },
      { nome: 'nome',                     tipo: 'texto',   obrigatorio: true,  exemplo: 'Carlos Eduardo Martins' },
      { nome: 'percentual_participacao',  tipo: 'decimal', obrigatorio: true,  exemplo: '60.00' },
      { nome: 'data_entrada',             tipo: 'data',    obrigatorio: true,  exemplo: '2015-03-01' },
      { nome: 'qualificacao',             tipo: 'texto',   obrigatorio: false, exemplo: 'Sócio-Administrador' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cpf_socio: row.cpf_socio, nome: row.nome, percentual_participacao: parseFloat(row.percentual_participacao), data_entrada: row.data_entrada, qualificacao: row.qualificacao||'' }),
  },
  'clientes_empresa.csv': {
    descricao: 'Clientes da Empresa', tabela: 'clientes_empresa',
    colunas: [
      { nome: 'cnpj_empresa',       tipo: 'texto', obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'cnpj_cpf_cliente',   tipo: 'texto', obrigatorio: true,  exemplo: '98.765.432/0001-10' },
      { nome: 'nome',               tipo: 'texto', obrigatorio: true,  exemplo: 'Cliente Exemplo SA' },
      { nome: 'tipo',               tipo: 'enum',  obrigatorio: true,  exemplo: 'J', valores: ['F','J'] },
      { nome: 'municipio',          tipo: 'texto', obrigatorio: false, exemplo: 'Rio de Janeiro' },
      { nome: 'uf',                 tipo: 'texto2',obrigatorio: false, exemplo: 'RJ' },
      { nome: 'email',              tipo: 'texto', obrigatorio: false, exemplo: 'contato@cliente.com' },
      { nome: 'telefone',           tipo: 'texto', obrigatorio: false, exemplo: '(21)99999-0000' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cnpj_cpf_cliente: row.cnpj_cpf_cliente, nome: row.nome, tipo: row.tipo, municipio: row.municipio||'', uf: row.uf||'', email: row.email||'', telefone: row.telefone||'' }),
  },
  'fornecedores.csv': {
    descricao: 'Fornecedores', tabela: 'fornecedores',
    colunas: [
      { nome: 'cnpj_empresa',           tipo: 'texto', obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'cnpj_cpf_fornecedor',    tipo: 'texto', obrigatorio: true,  exemplo: '11.222.333/0001-44' },
      { nome: 'nome',                   tipo: 'texto', obrigatorio: true,  exemplo: 'Fornecedor Ltda' },
      { nome: 'tipo',                   tipo: 'enum',  obrigatorio: true,  exemplo: 'J', valores: ['F','J'] },
      { nome: 'municipio',              tipo: 'texto', obrigatorio: false, exemplo: 'Campinas' },
      { nome: 'uf',                     tipo: 'texto2',obrigatorio: false, exemplo: 'SP' },
      { nome: 'email',                  tipo: 'texto', obrigatorio: false, exemplo: 'nfe@fornecedor.com' },
      { nome: 'telefone',               tipo: 'texto', obrigatorio: false, exemplo: '(19)3333-0000' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cnpj_cpf_fornecedor: row.cnpj_cpf_fornecedor, nome: row.nome, tipo: row.tipo, municipio: row.municipio||'', uf: row.uf||'', email: row.email||'', telefone: row.telefone||'' }),
  },
  'funcionarios.csv': {
    descricao: 'Funcionários', tabela: 'funcionarios',
    colunas: [
      { nome: 'cnpj_empresa',   tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'cpf',            tipo: 'texto',   obrigatorio: true,  exemplo: '987.654.321-00' },
      { nome: 'nome',           tipo: 'texto',   obrigatorio: true,  exemplo: 'Maria Souza' },
      { nome: 'data_admissao',  tipo: 'data',    obrigatorio: true,  exemplo: '2020-01-01' },
      { nome: 'data_demissao',  tipo: 'data',    obrigatorio: false, exemplo: '' },
      { nome: 'cargo',          tipo: 'texto',   obrigatorio: false, exemplo: 'Caixa' },
      { nome: 'salario_base',   tipo: 'decimal', obrigatorio: true,  exemplo: '1600.00' },
      { nome: 'cbo',            tipo: 'texto',   obrigatorio: false, exemplo: '5211-05' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, cpf: row.cpf, nome: row.nome, data_admissao: row.data_admissao, data_demissao: row.data_demissao||null, cargo: row.cargo||'', salario_base: parseFloat(row.salario_base), cbo: row.cbo||'' }),
  },
  'produtos.csv': {
    descricao: 'Produtos', tabela: 'produtos',
    colunas: [
      { nome: 'cnpj_empresa',     tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'codigo',           tipo: 'texto',   obrigatorio: true,  exemplo: '001' },
      { nome: 'descricao',        tipo: 'texto',   obrigatorio: true,  exemplo: 'Arroz Tipo 1 5kg' },
      { nome: 'ncm',              tipo: 'texto',   obrigatorio: true,  exemplo: '1006.30.21' },
      { nome: 'cfop_saida',       tipo: 'texto',   obrigatorio: false, exemplo: '5102' },
      { nome: 'unidade',          tipo: 'texto',   obrigatorio: false, exemplo: 'PCT' },
      { nome: 'preco_unitario',   tipo: 'decimal', obrigatorio: false, exemplo: '18.90' },
      { nome: 'cst_pis',          tipo: 'texto',   obrigatorio: false, exemplo: '07' },
      { nome: 'cst_cofins',       tipo: 'texto',   obrigatorio: false, exemplo: '07' },
      { nome: 'aliquota_pis',     tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'aliquota_cofins',  tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, codigo: row.codigo, descricao: row.descricao, ncm: row.ncm, cfop_saida: row.cfop_saida||'', unidade: row.unidade||'', preco_unitario: parseFloat(row.preco_unitario||0), cst_pis: row.cst_pis||'', cst_cofins: row.cst_cofins||'', aliquota_pis: parseFloat(row.aliquota_pis||0), aliquota_cofins: parseFloat(row.aliquota_cofins||0) }),
  },
  'notas_saida.csv': {
    descricao: 'Notas de Saída', tabela: 'entradas',
    colunas: [
      { nome: 'cnpj_empresa',           tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'numero_nf',              tipo: 'texto',   obrigatorio: true,  exemplo: '000001' },
      { nome: 'serie',                  tipo: 'texto',   obrigatorio: false, exemplo: '1' },
      { nome: 'data_emissao',           tipo: 'data',    obrigatorio: true,  exemplo: '2024-01-05' },
      { nome: 'cnpj_cpf_destinatario',  tipo: 'texto',   obrigatorio: false, exemplo: '000.000.000-00' },
      { nome: 'cfop',                   tipo: 'texto',   obrigatorio: false, exemplo: '5102' },
      { nome: 'valor_total',            tipo: 'decimal', obrigatorio: true,  exemplo: '15000.00' },
      { nome: 'valor_icms',             tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_pis',              tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_cofins',           tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_st',               tipo: 'decimal', obrigatorio: false, exemplo: '1200.00' },
      { nome: 'competencia',            tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
    ],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: 'NF-e Saída', receita_bruta: parseFloat(row.valor_total), tributo_pago: parseFloat(row.valor_icms||0)+parseFloat(row.valor_pis||0)+parseFloat(row.valor_cofins||0), tributo_devido: parseFloat(row.valor_icms||0)+parseFloat(row.valor_pis||0)+parseFloat(row.valor_cofins||0), credito: 0, tipo_oportunidade: '', risco: 'baixo' }),
  },
  'notas_entrada.csv': {
    descricao: 'Notas de Entrada', tabela: 'entradas',
    colunas: [
      { nome: 'cnpj_empresa',     tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'numero_nf',        tipo: 'texto',   obrigatorio: true,  exemplo: '005001' },
      { nome: 'serie',            tipo: 'texto',   obrigatorio: false, exemplo: '1' },
      { nome: 'data_emissao',     tipo: 'data',    obrigatorio: true,  exemplo: '2024-01-03' },
      { nome: 'cnpj_fornecedor',  tipo: 'texto',   obrigatorio: false, exemplo: '11.222.333/0001-44' },
      { nome: 'cfop',             tipo: 'texto',   obrigatorio: false, exemplo: '1102' },
      { nome: 'valor_total',      tipo: 'decimal', obrigatorio: true,  exemplo: '28000.00' },
      { nome: 'valor_icms',       tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_pis',        tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_cofins',     tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_st',         tipo: 'decimal', obrigatorio: false, exemplo: '2240.00' },
      { nome: 'competencia',      tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
    ],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: 'NF-e Entrada', receita_bruta: parseFloat(row.valor_total), tributo_pago: 0, tributo_devido: 0, credito: 0, tipo_oportunidade: '', risco: 'baixo' }),
  },
  'folha.csv': {
    descricao: 'Folha de Pagamento', tabela: 'folha',
    colunas: [
      { nome: 'cnpj_empresa',     tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',      tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'cpf_funcionario',  tipo: 'texto',   obrigatorio: true,  exemplo: '987.654.321-00' },
      { nome: 'salario_bruto',    tipo: 'decimal', obrigatorio: true,  exemplo: '1600.00' },
      { nome: 'inss_funcionario', tipo: 'decimal', obrigatorio: false, exemplo: '120.00' },
      { nome: 'irrf',             tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'salario_liquido',  tipo: 'decimal', obrigatorio: true,  exemplo: '1480.00' },
      { nome: 'inss_patronal',    tipo: 'decimal', obrigatorio: false, exemplo: '176.00' },
      { nome: 'fgts',             tipo: 'decimal', obrigatorio: false, exemplo: '128.00' },
      { nome: 'rat',              tipo: 'decimal', obrigatorio: false, exemplo: '16.00' },
      { nome: 'terceiros',        tipo: 'decimal', obrigatorio: false, exemplo: '88.00' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_funcionario: row.cpf_funcionario, salario_bruto: parseFloat(row.salario_bruto), inss_funcionario: parseFloat(row.inss_funcionario||0), irrf: parseFloat(row.irrf||0), salario_liquido: parseFloat(row.salario_liquido), inss_patronal: parseFloat(row.inss_patronal||0), fgts: parseFloat(row.fgts||0), rat: parseFloat(row.rat||0), terceiros: parseFloat(row.terceiros||0) }),
  },
  'pagamentos.csv': {
    descricao: 'Pagamentos', tabela: 'pagamentos',
    colunas: [
      { nome: 'cnpj_empresa',         tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'data_pagamento',        tipo: 'data',    obrigatorio: true,  exemplo: '2024-01-05' },
      { nome: 'descricao',             tipo: 'texto',   obrigatorio: true,  exemplo: 'Aluguel janeiro' },
      { nome: 'valor',                 tipo: 'decimal', obrigatorio: true,  exemplo: '4500.00' },
      { nome: 'categoria',             tipo: 'texto',   obrigatorio: false, exemplo: 'Aluguel' },
      { nome: 'cnpj_cpf_favorecido',   tipo: 'texto',   obrigatorio: false, exemplo: '33.000.118/0001-79' },
      { nome: 'competencia',           tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, data_pagamento: row.data_pagamento, descricao: row.descricao, valor: parseFloat(row.valor), categoria: row.categoria||'', cnpj_cpf_favorecido: row.cnpj_cpf_favorecido||'', competencia: row.competencia }),
  },
  'recebimentos.csv': {
    descricao: 'Recebimentos', tabela: 'recebimentos',
    colunas: [
      { nome: 'cnpj_empresa',     tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'data_recebimento', tipo: 'data',    obrigatorio: true,  exemplo: '2024-01-31' },
      { nome: 'descricao',        tipo: 'texto',   obrigatorio: true,  exemplo: 'Vendas janeiro' },
      { nome: 'valor',            tipo: 'decimal', obrigatorio: true,  exemplo: '45000.00' },
      { nome: 'categoria',        tipo: 'texto',   obrigatorio: false, exemplo: 'Vendas' },
      { nome: 'cnpj_cpf_pagador', tipo: 'texto',   obrigatorio: false, exemplo: '000.000.000-00' },
      { nome: 'competencia',      tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, data_recebimento: row.data_recebimento, descricao: row.descricao, valor: parseFloat(row.valor), categoria: row.categoria||'', cnpj_cpf_pagador: row.cnpj_cpf_pagador||'', competencia: row.competencia }),
  },
  'tributos.csv': {
    descricao: 'Tributos', tabela: 'tributos_lab',
    colunas: [
      { nome: 'cnpj_empresa',   tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',    tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'tributo',        tipo: 'texto',   obrigatorio: true,  exemplo: 'DAS' },
      { nome: 'valor_devido',   tipo: 'decimal', obrigatorio: false, exemplo: '2250.00' },
      { nome: 'valor_pago',     tipo: 'decimal', obrigatorio: false, exemplo: '2250.00' },
      { nome: 'data_pagamento', tipo: 'data',    obrigatorio: false, exemplo: '2024-02-20' },
      { nome: 'numero_guia',    tipo: 'texto',   obrigatorio: false, exemplo: '85001110001' },
      { nome: 'situacao',       tipo: 'enum',    obrigatorio: true,  exemplo: 'pago', valores: ['pago','pendente','atraso'] },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, tributo: row.tributo, valor_devido: parseFloat(row.valor_devido||0), valor_pago: parseFloat(row.valor_pago||0), data_pagamento: row.data_pagamento||null, numero_guia: row.numero_guia||'', situacao: row.situacao }),
  },
  'fgts.csv': {
    descricao: 'FGTS', tabela: 'fgts',
    colunas: [
      { nome: 'cnpj_empresa',      tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',       tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'cpf_funcionario',   tipo: 'texto',   obrigatorio: true,  exemplo: '987.654.321-00' },
      { nome: 'remuneracao',       tipo: 'decimal', obrigatorio: true,  exemplo: '1600.00' },
      { nome: 'aliquota',          tipo: 'decimal', obrigatorio: false, exemplo: '8.00' },
      { nome: 'valor_fgts',        tipo: 'decimal', obrigatorio: true,  exemplo: '128.00' },
      { nome: 'data_recolhimento', tipo: 'data',    obrigatorio: false, exemplo: '2024-02-07' },
      { nome: 'situacao',          tipo: 'enum',    obrigatorio: true,  exemplo: 'pago', valores: ['pago','pendente','atraso'] },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_funcionario: row.cpf_funcionario, remuneracao: parseFloat(row.remuneracao), aliquota: parseFloat(row.aliquota||8), valor_fgts: parseFloat(row.valor_fgts), data_recolhimento: row.data_recolhimento||null, situacao: row.situacao }),
  },
  'irrf.csv': {
    descricao: 'IRRF', tabela: 'irrf',
    colunas: [
      { nome: 'cnpj_empresa',         tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',           tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'cpf_beneficiario',      tipo: 'texto',   obrigatorio: true,  exemplo: '987.654.321-00' },
      { nome: 'natureza_rendimento',   tipo: 'texto',   obrigatorio: false, exemplo: 'Salário' },
      { nome: 'valor_rendimento',      tipo: 'decimal', obrigatorio: false, exemplo: '1600.00' },
      { nome: 'base_calculo',          tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'aliquota',              tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_irrf',            tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'data_recolhimento',     tipo: 'data',    obrigatorio: false, exemplo: '2024-02-20' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, cpf_beneficiario: row.cpf_beneficiario, natureza_rendimento: row.natureza_rendimento||'', valor_rendimento: parseFloat(row.valor_rendimento||0), base_calculo: parseFloat(row.base_calculo||0), aliquota: parseFloat(row.aliquota||0), valor_irrf: parseFloat(row.valor_irrf||0), data_recolhimento: row.data_recolhimento||null }),
  },
  'dctfweb.csv': {
    descricao: 'DCTFWeb', tabela: 'dctfweb_lab',
    colunas: [
      { nome: 'cnpj_empresa',      tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',       tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'total_debito',      tipo: 'decimal', obrigatorio: false, exemplo: '693.00' },
      { nome: 'total_credito',     tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'total_recolher',    tipo: 'decimal', obrigatorio: false, exemplo: '693.00' },
      { nome: 'data_transmissao',  tipo: 'data',    obrigatorio: false, exemplo: '2024-02-15' },
      { nome: 'situacao',          tipo: 'enum',    obrigatorio: true,  exemplo: 'transmitida', valores: ['transmitida','pendente','retificada'] },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, total_debito: parseFloat(row.total_debito||0), total_credito: parseFloat(row.total_credito||0), total_recolher: parseFloat(row.total_recolher||0), data_transmissao: row.data_transmissao||null, situacao: row.situacao }),
  },
  'esocial.csv': {
    descricao: 'eSocial', tabela: 'esocial',
    colunas: [
      { nome: 'cnpj_empresa',       tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',        tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'evento',             tipo: 'texto',   obrigatorio: true,  exemplo: 'S-1200' },
      { nome: 'numero_recibo',      tipo: 'texto',   obrigatorio: false, exemplo: '1.1.2024.00001' },
      { nome: 'data_envio',         tipo: 'data',    obrigatorio: false, exemplo: '2024-02-07' },
      { nome: 'situacao',           tipo: 'enum',    obrigatorio: true,  exemplo: 'processado', valores: ['processado','pendente','erro','retificado'] },
      { nome: 'valor_contribuicao', tipo: 'decimal', obrigatorio: false, exemplo: '520.50' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, evento: row.evento, numero_recibo: row.numero_recibo||'', data_envio: row.data_envio||null, situacao: row.situacao, valor_contribuicao: parseFloat(row.valor_contribuicao||0) }),
  },
  'efd_reinf.csv': {
    descricao: 'EFD-Reinf', tabela: 'efd_reinf',
    colunas: [
      { nome: 'cnpj_empresa',   tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',    tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'evento',         tipo: 'texto',   obrigatorio: true,  exemplo: 'R-2010' },
      { nome: 'numero_recibo',  tipo: 'texto',   obrigatorio: false, exemplo: '9.1.2024.00001' },
      { nome: 'data_envio',     tipo: 'data',    obrigatorio: false, exemplo: '2024-02-15' },
      { nome: 'base_calculo',   tipo: 'decimal', obrigatorio: false, exemplo: '5000.00' },
      { nome: 'aliquota',       tipo: 'decimal', obrigatorio: false, exemplo: '1.50' },
      { nome: 'valor_retencao', tipo: 'decimal', obrigatorio: false, exemplo: '75.00' },
      { nome: 'situacao',       tipo: 'enum',    obrigatorio: true,  exemplo: 'processado', valores: ['processado','pendente','erro'] },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, evento: row.evento, numero_recibo: row.numero_recibo||'', data_envio: row.data_envio||null, base_calculo: parseFloat(row.base_calculo||0), aliquota: parseFloat(row.aliquota||0), valor_retencao: parseFloat(row.valor_retencao||0), situacao: row.situacao }),
  },
  'pis_cofins.csv': {
    descricao: 'PIS/COFINS', tabela: 'pis_cofins',
    colunas: [
      { nome: 'cnpj_empresa',       tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',        tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'regime',             tipo: 'enum',    obrigatorio: true,  exemplo: 'cumulativo', valores: ['cumulativo','nao_cumulativo'] },
      { nome: 'base_calculo_pis',   tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'aliquota_pis',       tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_pis',          tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'base_calculo_cofins',tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'aliquota_cofins',    tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_cofins',       tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'creditos_pis',       tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'creditos_cofins',    tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'pis_recolher',       tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'cofins_recolher',    tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, regime: row.regime, base_calculo_pis: parseFloat(row.base_calculo_pis||0), aliquota_pis: parseFloat(row.aliquota_pis||0), valor_pis: parseFloat(row.valor_pis||0), base_calculo_cofins: parseFloat(row.base_calculo_cofins||0), aliquota_cofins: parseFloat(row.aliquota_cofins||0), valor_cofins: parseFloat(row.valor_cofins||0), creditos_pis: parseFloat(row.creditos_pis||0), creditos_cofins: parseFloat(row.creditos_cofins||0), pis_recolher: parseFloat(row.pis_recolher||0), cofins_recolher: parseFloat(row.cofins_recolher||0) }),
  },
  'irpj_csll.csv': {
    descricao: 'IRPJ/CSLL', tabela: 'irpj_csll',
    colunas: [
      { nome: 'cnpj_empresa',              tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',               tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'trimestre',                 tipo: 'texto',   obrigatorio: false, exemplo: '1T2024' },
      { nome: 'receita_bruta',             tipo: 'decimal', obrigatorio: false, exemplo: '45000.00' },
      { nome: 'percentual_presuncao_irpj', tipo: 'decimal', obrigatorio: false, exemplo: '8.00' },
      { nome: 'base_irpj',                 tipo: 'decimal', obrigatorio: false, exemplo: '3600.00' },
      { nome: 'aliquota_irpj',             tipo: 'decimal', obrigatorio: false, exemplo: '15.00' },
      { nome: 'adicional_irpj',            tipo: 'decimal', obrigatorio: false, exemplo: '0.00' },
      { nome: 'valor_irpj',                tipo: 'decimal', obrigatorio: false, exemplo: '540.00' },
      { nome: 'percentual_presuncao_csll', tipo: 'decimal', obrigatorio: false, exemplo: '12.00' },
      { nome: 'base_csll',                 tipo: 'decimal', obrigatorio: false, exemplo: '5400.00' },
      { nome: 'aliquota_csll',             tipo: 'decimal', obrigatorio: false, exemplo: '9.00' },
      { nome: 'valor_csll',                tipo: 'decimal', obrigatorio: false, exemplo: '486.00' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, trimestre: row.trimestre||'', receita_bruta: parseFloat(row.receita_bruta||0), percentual_presuncao_irpj: parseFloat(row.percentual_presuncao_irpj||0), base_irpj: parseFloat(row.base_irpj||0), aliquota_irpj: parseFloat(row.aliquota_irpj||0), adicional_irpj: parseFloat(row.adicional_irpj||0), valor_irpj: parseFloat(row.valor_irpj||0), percentual_presuncao_csll: parseFloat(row.percentual_presuncao_csll||0), base_csll: parseFloat(row.base_csll||0), aliquota_csll: parseFloat(row.aliquota_csll||0), valor_csll: parseFloat(row.valor_csll||0) }),
  },
  'oportunidades.csv': {
    descricao: 'Oportunidades', tabela: 'entradas',
    colunas: [
      { nome: 'cnpj_empresa',      tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',       tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'tributo',           tipo: 'texto',   obrigatorio: true,  exemplo: 'DAS' },
      { nome: 'tipo_oportunidade', tipo: 'texto',   obrigatorio: false, exemplo: 'Exclusão ICMS-ST' },
      { nome: 'valor_pago',        tipo: 'decimal', obrigatorio: false, exemplo: '2250.00' },
      { nome: 'valor_devido',      tipo: 'decimal', obrigatorio: false, exemplo: '1890.00' },
      { nome: 'credito',           tipo: 'decimal', obrigatorio: true,  exemplo: '360.00' },
      { nome: 'risco',             tipo: 'enum',    obrigatorio: true,  exemplo: 'baixo', valores: ['baixo','medio','alto'] },
      { nome: 'tese_aplicada',     tipo: 'texto',   obrigatorio: false, exemplo: 'Exclusão ICMS-ST da Base do Simples' },
      { nome: 'observacao',        tipo: 'texto',   obrigatorio: false, exemplo: 'ICMS-ST R$1200 excluído da base' },
    ],
    mapear: (row, uid, clienteId) => ({ usuario_id: uid, cliente_id: clienteId, competencia: row.competencia, tributo: row.tributo, receita_bruta: 0, tributo_pago: parseFloat(row.valor_pago||0), tributo_devido: parseFloat(row.valor_devido||0), credito: parseFloat(row.credito||0), tipo_oportunidade: row.tipo_oportunidade||'', risco: row.risco }),
  },
  'gabarito.csv': {
    descricao: 'Gabarito', tabela: 'gabarito',
    colunas: [
      { nome: 'cnpj_empresa',   tipo: 'texto',   obrigatorio: true,  exemplo: '14.123.456/0001-89' },
      { nome: 'competencia',    tipo: 'aaaa-mm', obrigatorio: true,  exemplo: '2024-01' },
      { nome: 'tributo',        tipo: 'texto',   obrigatorio: true,  exemplo: 'DAS' },
      { nome: 'valor_esperado', tipo: 'decimal', obrigatorio: true,  exemplo: '2250.00' },
      { nome: 'tolerancia',     tipo: 'decimal', obrigatorio: false, exemplo: '0.01' },
      { nome: 'descricao_teste',tipo: 'texto',   obrigatorio: false, exemplo: 'DAS Simples Nacional janeiro 2024' },
    ],
    mapear: (row, uid) => ({ usuario_id: uid, cnpj_empresa: row.cnpj_empresa, competencia: row.competencia, tributo: row.tributo, valor_esperado: parseFloat(row.valor_esperado), tolerancia: parseFloat(row.tolerancia||0.01), descricao_teste: row.descricao_teste||'' }),
  },
}

// ─── FORMATOS FUTUROS — Prioridade 8 ─────────────────────────────────────────
const FORMATOS_FUTUROS = [
  { label: 'Excel (.xlsx)',         status: 'Em breve', cor: '#16a34a' },
  { label: 'SPED Fiscal (.txt)',    status: 'Em breve', cor: '#2563eb' },
  { label: 'SPED Contribuições',    status: 'Em breve', cor: '#2563eb' },
  { label: 'ECD (.txt)',            status: 'Em breve', cor: '#7c3aed' },
  { label: 'ECF (.txt)',            status: 'Em breve', cor: '#7c3aed' },
  { label: 'XML NF-e',              status: 'Em breve', cor: '#d97706' },
  { label: 'DCTF (.xml)',           status: 'Em breve', cor: '#d97706' },
]

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

// ─── VALIDADOR — Prioridade 3 ─────────────────────────────────────────────────
function validarRow(row, layout, arquivo) {
  const erros = []
  layout.colunas.forEach(col => {
    const val = row[col.nome]
    if (col.obrigatorio && (!val || val.toString().trim() === ''))
      erros.push({ arquivo, linha: row._linha, coluna: col.nome, motivo: `Campo obrigatório vazio` })
    if (val && val !== '') {
      if (col.tipo === 'decimal') { const v = parseFloat(val.replace(',','.')); if (isNaN(v)) erros.push({ arquivo, linha: row._linha, coluna: col.nome, motivo: `Valor numérico inválido: "${val}"` }) }
      if (col.tipo === 'data')    { if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) erros.push({ arquivo, linha: row._linha, coluna: col.nome, motivo: `Data inválida: "${val}" — use AAAA-MM-DD` }) }
      if (col.tipo === 'aaaa-mm') { if (!/^\d{4}-\d{2}$/.test(val)) erros.push({ arquivo, linha: row._linha, coluna: col.nome, motivo: `Competência inválida: "${val}" — use AAAA-MM` }) }
      if (col.tipo === 'texto2')  { if (val.length > 2) erros.push({ arquivo, linha: row._linha, coluna: col.nome, motivo: `UF inválida: "${val}" — use 2 letras` }) }
      if (col.tipo === 'enum' && col.valores) { if (!col.valores.includes(val)) erros.push({ arquivo, linha: row._linha, coluna: col.nome, motivo: `Valor "${val}" inválido. Permitidos: ${col.valores.join(', ')}` }) }
    }
  })
  return erros
}

// ─── DOWNLOAD MODELO CSV — Prioridade 2 ──────────────────────────────────────
function baixarModelo(nomeArquivo) {
  const layout = LAYOUTS[nomeArquivo]
  if (!layout) return
  const cabecalho = layout.colunas.map(c => c.nome).join(';')
  const exemplo   = layout.colunas.map(c => c.exemplo || '').join(';')
  const conteudo  = `${cabecalho}\n${exemplo}\n`
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = nomeArquivo; a.click()
  URL.revokeObjectURL(url)
}

// ─── EXPORT CENÁRIO — Prioridade 7 ───────────────────────────────────────────
async function exportarCenario(uid, cnpjEmpresa, codigoCenario) {
  const tabelas = [
    { arquivo: 'empresa_export.csv',      tabela: 'clientes',     filtro: { campo: 'cnpj',         valor: cnpjEmpresa } },
    { arquivo: 'funcionarios_export.csv', tabela: 'funcionarios', filtro: { campo: 'cnpj_empresa', valor: cnpjEmpresa } },
    { arquivo: 'folha_export.csv',        tabela: 'folha',        filtro: { campo: 'cnpj_empresa', valor: cnpjEmpresa } },
    { arquivo: 'tributos_export.csv',     tabela: 'tributos_lab', filtro: { campo: 'cnpj_empresa', valor: cnpjEmpresa } },
    { arquivo: 'gabarito_export.csv',     tabela: 'gabarito',     filtro: { campo: 'cnpj_empresa', valor: cnpjEmpresa } },
  ]
  for (const t of tabelas) {
    const { data } = await supabase.from(t.tabela).select('*').eq(t.filtro.campo, t.filtro.valor).eq('usuario_id', uid)
    if (!data || data.length === 0) continue
    const cols = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'usuario_id' && k !== 'created_at')
    const cabecalho = cols.join(';')
    const linhas    = data.map(row => cols.map(c => row[c] ?? '').join(';'))
    const conteudo  = [cabecalho, ...linhas].join('\n')
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${codigoCenario}_${t.arquivo}`; a.click()
    URL.revokeObjectURL(url)
    await new Promise(r => setTimeout(r, 300))
  }
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Laboratorio() {
  const inputRef   = useRef()
  const inputPasta = useRef()

  const [aba,           setAba]           = useState('importar')
  const [processando,   setProcessando]   = useState(false)
  const [progresso,     setProgresso]     = useState({ atual: 0, total: 0, arquivo: '' })
  const [resultados,    setResultados]    = useState([])
  const [erroGlobal,    setErroGlobal]    = useState([])
  const [resumo,        setResumo]        = useState(null)
  const [comparacao,    setComparacao]    = useState([])
  const [comparando,    setComparando]    = useState(false)
  const [historico,     setHistorico]     = useState([])
  const [limpando,      setLimpando]      = useState(false)
  const [cnpjAtivo,     setCnpjAtivo]     = useState('')
  const [cenarios,      setCenarios]      = useState([])
  const [novoCenario,   setNovoCenario]   = useState({ codigo: '', nome: '' })
  const [exportando,    setExportando]    = useState(false)

  useEffect(() => { carregarHistorico(); carregarCenarios() }, [])

  async function carregarHistorico() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('log_importacao').select('*').eq('usuario_id', user.id).order('created_at', { ascending: false }).limit(50)
    setHistorico(data || [])
  }

  async function carregarCenarios() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('log_importacao')
      .select('arquivo,created_at')
      .eq('usuario_id', user.id)
      .eq('arquivo', 'empresa.csv')
      .order('created_at', { ascending: false })
    setCenarios(data || [])
  }

  // ── Prioridade 1 — importar pasta ou arquivos ────────────────────────────
  async function processarArquivos(files) {
    setProcessando(true); setResultados([]); setErroGlobal([]); setResumo(null)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user.id
    const inicio = Date.now()
    const novosResultados = []; const todosErros = []

    const filesOrdenados = Array.from(files).sort((a, b) => {
      if (a.name.toLowerCase() === 'empresa.csv') return -1
      if (b.name.toLowerCase() === 'empresa.csv') return 1
      return 0
    })

    setProgresso({ atual: 0, total: filesOrdenados.length, arquivo: '' })
    let cnpjDetectado = ''; let clienteIdDetectado = null

    for (let fi = 0; fi < filesOrdenados.length; fi++) {
      const file = filesOrdenados[fi]
      const nomeArquivo = file.name.toLowerCase()
      setProgresso({ atual: fi + 1, total: filesOrdenados.length, arquivo: file.name })

      const layout = LAYOUTS[nomeArquivo]
      if (!layout) { novosResultados.push({ arquivo: file.name, status: 'ignorado', motivo: 'Layout não reconhecido', importados: 0, rejeitados: 0, erros: [], total: 0 }); continue }

      const texto = await file.text()
      const { cabecalho, rows } = parseCSV(texto)

      // Verificar colunas
      const nomesEsperados = layout.colunas.map(c => c.nome)
      const colsFaltando   = nomesEsperados.filter(c => !cabecalho.includes(c))
      if (colsFaltando.length > 0) { novosResultados.push({ arquivo: file.name, status: 'erro', motivo: `Colunas faltando: ${colsFaltando.join(', ')}`, importados: 0, rejeitados: rows.length, erros: [], total: rows.length }); continue }

      if (nomeArquivo === 'empresa.csv' && rows.length > 0) { cnpjDetectado = rows[0].cnpj || ''; setCnpjAtivo(cnpjDetectado) }

      let clienteId = clienteIdDetectado
      const precisaCliente = ['notas_saida.csv','notas_entrada.csv','oportunidades.csv'].includes(nomeArquivo)
      if (precisaCliente && !clienteId && cnpjDetectado) {
        const { data: cli } = await supabase.from('clientes').select('id').eq('cnpj', cnpjDetectado).eq('usuario_id', uid).single()
        clienteId = cli?.id || null; clienteIdDetectado = clienteId
      }

      let importados = 0; let rejeitados = 0; const errosArquivo = []

      for (const row of rows) {
        const erros = validarRow(row, layout, file.name)
        if (erros.length > 0) { errosArquivo.push(...erros); todosErros.push(...erros); rejeitados++; continue }
        try {
          const payload = layout.mapear(row, uid, clienteId)
          const { error } = await supabase.from(layout.tabela).insert(payload)
          if (error) { errosArquivo.push({ arquivo: file.name, linha: row._linha, coluna: '-', motivo: error.message }); rejeitados++ }
          else importados++
        } catch(e) { errosArquivo.push({ arquivo: file.name, linha: row._linha, coluna: '-', motivo: e.message }); rejeitados++ }
      }

      if (nomeArquivo === 'empresa.csv' && cnpjDetectado && !clienteIdDetectado) {
        const { data: cli } = await supabase.from('clientes').select('id').eq('cnpj', cnpjDetectado).eq('usuario_id', uid).single()
        clienteIdDetectado = cli?.id || null
      }

      await supabase.from('log_importacao').insert({ usuario_id: uid, arquivo: file.name, tabela: layout.tabela, total_linhas: rows.length, importados, rejeitados, erros: errosArquivo, tempo_ms: Date.now()-inicio })
      novosResultados.push({ arquivo: file.name, descricao: layout.descricao, tabela: layout.tabela, status: rejeitados===0?'sucesso':importados===0?'erro':'parcial', importados, rejeitados, erros: errosArquivo, total: rows.length })
    }

    setResultados(novosResultados); setErroGlobal(todosErros); setProcessando(false)
    if (cnpjDetectado) await carregarResumo(uid, cnpjDetectado)
    carregarHistorico(); carregarCenarios()
  }

  // ── Prioridade 4 — resumo após importação ────────────────────────────────
  async function carregarResumo(uid, cnpj) {
    const { data: emp }   = await supabase.from('clientes').select('*').eq('cnpj', cnpj).eq('usuario_id', uid).single()
    if (!emp) return
    const { data: funcs } = await supabase.from('funcionarios').select('id').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const { data: clis  } = await supabase.from('fornecedores').select('id').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const { data: prods } = await supabase.from('produtos').select('id').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const { data: nfes  } = await supabase.from('entradas').select('receita_bruta,tributo,tributo_pago').eq('cliente_id', emp.id).eq('usuario_id', uid)
    const { data: folhas} = await supabase.from('folha').select('id,competencia').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const { data: tribs } = await supabase.from('tributos_lab').select('tributo,valor_pago,competencia').eq('cnpj_empresa', cnpj).eq('usuario_id', uid)
    const nfSaida  = (nfes||[]).filter(n => n.tributo === 'NF-e Saída')
    const nfEntrada= (nfes||[]).filter(n => n.tributo === 'NF-e Entrada')
    const recBruta = nfSaida.reduce((s,n) => s + (n.receita_bruta||0), 0)
    const tribTotal= (tribs||[]).reduce((s,t) => s + (t.valor_pago||0), 0)
    const folhasComp = [...new Set((folhas||[]).map(f => f.competencia))].length
    setResumo({ emp, qtd_funcionarios: (funcs||[]).length, qtd_clientes: (clis||[]).length, qtd_produtos: (prods||[]).length, qtd_nf_saida: nfSaida.length, qtd_nf_entrada: nfEntrada.length, qtd_folhas: folhasComp, receita_bruta: recBruta, tributos_total: tribTotal, tributos: tribs||[] })
  }

  // ── Prioridade 5 — comparar gabarito com índice de conformidade ──────────
  async function compararGabarito() {
    setComparando(true); setComparacao([])
    const { data: { user } } = await supabase.auth.getUser()
    const { data: gab   } = await supabase.from('gabarito').select('*').eq('usuario_id', user.id)
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

  // ── Prioridade limpar ────────────────────────────────────────────────────
  async function limparCenario() {
    if (!window.confirm('Apagar TODOS os dados do Laboratório? Esta ação não pode ser desfeita.')) return
    setLimpando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uid = user.id
    const tabelas = ['funcionarios','socios','fornecedores','produtos','folha','pagamentos','recebimentos','tributos_lab','fgts','irrf','dctfweb_lab','esocial','efd_reinf','pis_cofins','irpj_csll','gabarito','log_importacao']
    for (const t of tabelas) await supabase.from(t).delete().eq('usuario_id', uid)
    if (cnpjAtivo) await supabase.from('clientes').delete().eq('cnpj', cnpjAtivo).eq('usuario_id', uid)
    setResultados([]); setErroGlobal([]); setResumo(null); setComparacao([]); setCnpjAtivo(''); setHistorico([]); setCenarios([])
    setLimpando(false)
    alert('✅ Cenário limpo! Pronto para um novo cenário.')
  }

  // ── Prioridade 7 — exportar cenário ─────────────────────────────────────
  async function handleExportar() {
    if (!cnpjAtivo) { alert('Nenhum cenário ativo para exportar.'); return }
    setExportando(true)
    const { data: { user } } = await supabase.auth.getUser()
    const codigo = novoCenario.codigo || 'FT-001'
    await exportarCenario(user.id, cnpjAtivo, codigo)
    setExportando(false)
  }

  const totalImportados = resultados.reduce((s,r)=>s+r.importados,0)
  const totalRejeitados = resultados.reduce((s,r)=>s+r.rejeitados,0)
  const aprovados  = comparacao.filter(c=>c.aprovado).length
  const reprovados = comparacao.filter(c=>!c.aprovado).length
  const conformidade = comparacao.length > 0 ? (aprovados/comparacao.length*100).toFixed(2) : null

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius: 16, padding: '24px 28px', marginBottom: 24, color: '#fff' }}>
        <div style={{ fontSize: 11, color: '#7CC4FF', fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>FISCALTRIB — QUALIDADE E HOMOLOGAÇÃO</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4, color: '#fff' }}>🧪 Laboratório FiscalTrib</h1>
            <p style={{ fontSize: 13, color: '#93c5fd', margin: 0 }}>Ambiente oficial de homologação — importe cenários completos e valide todos os cálculos.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleExportar} disabled={exportando || !cnpjAtivo}
              style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: !cnpjAtivo?'default':'pointer', opacity: !cnpjAtivo?0.5:1 }}>
              {exportando ? '⏳' : '📤 Exportar Cenário'}
            </button>
            <button onClick={limparCenario} disabled={limpando}
              style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {limpando ? '⏳' : '🗑️ Limpar Cenário'}
            </button>
          </div>
        </div>

        {/* Identificador do cenário — Prioridade 6 */}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={novoCenario.codigo} onChange={e=>setNovoCenario(p=>({...p,codigo:e.target.value}))}
            placeholder="Código (ex: FT-001)"
            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12, width: 140, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
          <input value={novoCenario.nome} onChange={e=>setNovoCenario(p=>({...p,nome:e.target.value}))}
            placeholder="Nome do cenário"
            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', fontSize: 12, width: 200, background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none' }} />
          {cnpjAtivo && <div style={{ background: 'rgba(74,222,128,0.2)', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: '#4ade80', fontWeight: 600 }}>🏢 CNPJ ativo: {cnpjAtivo}</div>}
        </div>
      </div>

      {/* ABAS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0', overflowX: 'auto' }}>
        {[['importar','📥 Importar'],['modelos','📋 Modelos CSV'],['resumo','🏢 Resumo'],['gabarito','🎯 Gabarito'],['historico','📋 Histórico'],['formatos','🔮 Formatos']].map(([id,lb]) => (
          <div key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 16px', fontSize: 13, fontWeight: aba===id?700:500, color: aba===id?'#0B1F4D':'#64748b', cursor: 'pointer', borderBottom: `2px solid ${aba===id?'#0B1F4D':'transparent'}`, marginBottom: -2, whiteSpace: 'nowrap' }}>
            {lb}
          </div>
        ))}
      </div>

      {/* ── ABA IMPORTAR ── */}
      {aba==='importar' && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div onClick={() => inputPasta.current.click()}
            style={{ background: '#f0fdf4', border: '3px dashed #86efac', borderRadius: 14, padding: '28px 24px', textAlign: 'center', cursor: 'pointer' }}
            onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='#dcfce7' }}
            onDragLeave={e=>e.currentTarget.style.background='#f0fdf4'}
            onDrop={e=>{ e.preventDefault(); e.currentTarget.style.background='#f0fdf4'; processarArquivos(e.dataTransfer.files) }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#166534', marginBottom: 4 }}>Selecionar Pasta</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Empresa001/ com todos os CSVs</div>
            <input ref={inputPasta} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={e => processarArquivos(e.target.files)} />
          </div>
          <div onClick={() => inputRef.current.click()}
            style={{ background: '#eff6ff', border: '3px dashed #bfdbfe', borderRadius: 14, padding: '28px 24px', textAlign: 'center', cursor: 'pointer' }}
            onDragOver={e=>{ e.preventDefault(); e.currentTarget.style.background='#dbeafe' }}
            onDragLeave={e=>e.currentTarget.style.background='#eff6ff'}
            onDrop={e=>{ e.preventDefault(); e.currentTarget.style.background='#eff6ff'; processarArquivos(e.dataTransfer.files) }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e40af', marginBottom: 4 }}>Selecionar Arquivos</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Escolha um ou vários CSVs</div>
            <input ref={inputRef} type="file" accept=".csv" multiple style={{ display: 'none' }} onChange={e => processarArquivos(e.target.files)} />
          </div>
        </div>

        {/* Progresso */}
        {processando && (
          <div style={{ background: '#fff', borderRadius: 12, border: '2px solid #bfdbfe', padding: '18px 22px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af' }}>⏳ {progresso.arquivo}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{progresso.atual}/{progresso.total}</div>
            </div>
            <div style={{ background: '#e2e8f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{ background: '#0B1F4D', height: 8, borderRadius: 99, width: `${progresso.total>0?(progresso.atual/progresso.total*100):0}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Prioridade 2 — resultado por arquivo */}
        {resultados.length > 0 && !processando && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label:'Arquivos',   valor: resultados.length,                         cor:'#0B1F4D' },
                { label:'Importados', valor: fmtN(totalImportados),                     cor:'#16a34a' },
                { label:'Rejeitados', valor: fmtN(totalRejeitados),                     cor:'#dc2626' },
                { label:'Sucesso',    valor: totalImportados+totalRejeitados>0?`${Math.round(totalImportados/(totalImportados+totalRejeitados)*100)}%`:'—', cor:'#2563eb' },
              ].map((c,i)=>(
                <div key={i} style={{ background:'#fff', borderRadius:10, border:'2px solid #e2e8f0', padding:'12px 16px' }}>
                  <div style={{ fontSize:20, fontWeight:800, color:c.cor }}>{c.valor}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{c.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', overflow:'hidden', marginBottom:16 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#0B1F4D' }}>📊 Resultado por arquivo</div>
              {resultados.map((r,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', borderBottom: i<resultados.length-1?'1px solid #f1f5f9':'none', background: r.status==='sucesso'?'#f0fdf4':r.status==='erro'?'#fff1f2':r.status==='ignorado'?'#f8fafc':'#fffbeb' }}>
                  <div style={{ fontSize:15 }}>{r.status==='sucesso'?'✅':r.status==='erro'?'❌':r.status==='ignorado'?'⏭️':'⚠️'}</div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0B1F4D' }}>{r.arquivo}</span>
                    {r.motivo && <span style={{ fontSize:12, color:'#dc2626', marginLeft:8 }}>{r.motivo}</span>}
                  </div>
                  {r.status!=='ignorado' && (
                    <div style={{ fontSize:12, textAlign:'right' }}>
                      {r.importados>0 && <span style={{ color:'#16a34a', fontWeight:700 }}>→ {fmtN(r.importados)} importado(s)</span>}
                      {r.rejeitados>0 && <span style={{ color:'#dc2626', fontWeight:700, marginLeft:8 }}>{fmtN(r.rejeitados)} rejeitado(s)</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Prioridade 3 — erros com arquivo, linha, coluna, motivo */}
            {erroGlobal.length > 0 && (
              <div style={{ background:'#fff', borderRadius:12, border:'2px solid #fecdd3', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #fecdd3', fontSize:13, fontWeight:700, color:'#dc2626' }}>❌ Erros de validação ({erroGlobal.length})</div>
                <div style={{ maxHeight:280, overflowY:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{ background:'#fff1f2' }}>{['Arquivo','Linha','Coluna','Motivo'].map(h=><th key={h} style={{ padding:'7px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#dc2626', borderBottom:'1px solid #fecdd3' }}>{h}</th>)}</tr></thead>
                    <tbody>{erroGlobal.map((e,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid #fff1f2' }}>
                        <td style={{ padding:'7px 12px', color:'#374151' }}>{e.arquivo}</td>
                        <td style={{ padding:'7px 12px', color:'#dc2626', fontWeight:700 }}>{e.linha}</td>
                        <td style={{ padding:'7px 12px', fontWeight:600, color:'#0B1F4D' }}>{e.coluna}</td>
                        <td style={{ padding:'7px 12px', color:'#64748b' }}>{e.motivo}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {resultados.length===0 && !processando && (
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:'16px 20px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0B1F4D', marginBottom:10 }}>📋 {Object.keys(LAYOUTS).length} arquivos suportados — clique em "Modelos CSV" para baixar os templates</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {Object.keys(LAYOUTS).map(nome=>(
                <span key={nome} style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:6, padding:'3px 10px', fontSize:11, color:'#475569', fontWeight:500 }}>{nome}</span>
              ))}
            </div>
          </div>
        )}
      </>}

      {/* ── ABA MODELOS CSV — Prioridade 2 ── */}
      {aba==='modelos' && (
        <div>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:'16px 20px', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#0B1F4D', marginBottom:4 }}>📥 Baixar modelos CSV oficiais</div>
            <div style={{ fontSize:13, color:'#64748b' }}>Cada modelo contém o cabeçalho correto e uma linha de exemplo. Use-o para criar seus arquivos sem erro de importação.</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {Object.entries(LAYOUTS).map(([nome, layout]) => (
              <div key={nome} style={{ background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0B1F4D' }}>{nome}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{layout.descricao} · {layout.colunas.length} colunas · tabela: {layout.tabela}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    Obrigatórios: {layout.colunas.filter(c=>c.obrigatorio).map(c=>c.nome).join(', ')}
                  </div>
                </div>
                <button onClick={() => baixarModelo(nome)}
                  style={{ padding:'7px 14px', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
                  📥 Baixar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ABA RESUMO — Prioridade 4 ── */}
      {aba==='resumo' && (
        resumo ? (
          <div>
            <div style={{ background:'linear-gradient(135deg,#0B1F4D,#163B8C)', borderRadius:14, padding:'22px 26px', color:'#fff', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'#7CC4FF', fontWeight:700, letterSpacing:2, marginBottom:4 }}>EMPRESA IMPORTADA</div>
              <div style={{ fontSize:20, fontWeight:900, marginBottom:4 }}>{resumo.emp.razao_social}</div>
              <div style={{ fontSize:13, color:'#93c5fd' }}>{resumo.emp.cnpj} · {resumo.emp.regime} · {resumo.emp.municipio}/{resumo.emp.uf}</div>
              <div style={{ fontSize:12, color:'#7CC4FF', marginTop:4 }}>Período: {resumo.emp.competencia_inicio} a {resumo.emp.competencia_fim}</div>
            </div>

            {/* Prioridade 4 — resumo completo */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
              {[
                { label:'Funcionários',    valor: fmtN(resumo.qtd_funcionarios), cor:'#0d9488', icon:'👤' },
                { label:'Clientes/Forn.',  valor: fmtN(resumo.qtd_clientes),     cor:'#2563eb', icon:'🤝' },
                { label:'Produtos',        valor: fmtN(resumo.qtd_produtos),      cor:'#7c3aed', icon:'📦' },
                { label:'Notas de Saída',  valor: fmtN(resumo.qtd_nf_saida),     cor:'#16a34a', icon:'🧾' },
                { label:'Notas Entrada',   valor: fmtN(resumo.qtd_nf_entrada),   cor:'#d97706', icon:'📥' },
                { label:'Folhas',          valor: fmtN(resumo.qtd_folhas),        cor:'#dc2626', icon:'📋' },
                { label:'Receita Total',   valor: fmtR(resumo.receita_bruta),     cor:'#16a34a', icon:'💰' },
                { label:'Tributos Calc.',  valor: fmtR(resumo.tributos_total),    cor:'#dc2626', icon:'⚖️' },
              ].map((c,i) => (
                <div key={i} style={{ background:'#fff', borderRadius:10, border:'2px solid #e2e8f0', padding:'14px 16px' }}>
                  <div style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>{c.icon} {c.label}</div>
                  <div style={{ fontSize:i>=6?14:18, fontWeight:800, color:c.cor }}>{c.valor}</div>
                </div>
              ))}
            </div>

            {resumo.tributos.length > 0 && (
              <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', overflow:'hidden' }}>
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#0B1F4D' }}>💰 Tributos calculados</div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead><tr style={{ background:'#f8fafc' }}>{['Tributo','Competência','Valor Pago','Status'].map(h=><th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>)}</tr></thead>
                  <tbody>{resumo.tributos.map((t,i)=>(
                    <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'9px 14px', fontWeight:600, color:'#0B1F4D' }}>{t.tributo}</td>
                      <td style={{ padding:'9px 14px', color:'#64748b' }}>{t.competencia}</td>
                      <td style={{ padding:'9px 14px', color:'#16a34a', fontWeight:700 }}>{fmtR(t.valor_pago)}</td>
                      <td style={{ padding:'9px 14px' }}><span style={{ background: t.situacao==='pago'?'#dcfce7':'#fef9c3', color: t.situacao==='pago'?'#166534':'#854d0e', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{t.situacao}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:48, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏢</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Nenhuma empresa importada ainda</div>
            <div style={{ fontSize:13, marginTop:8 }}>Importe o <strong>empresa.csv</strong> para ver o resumo aqui</div>
          </div>
        )
      )}

      {/* ── ABA GABARITO — Prioridade 5 ── */}
      {aba==='gabarito' && <>
        <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:'18px 22px', marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0B1F4D', marginBottom:6 }}>🎯 Comparação com Gabarito Oficial</div>
          <div style={{ fontSize:13, color:'#64748b', marginBottom:14 }}>Importe o <strong>gabarito.csv</strong> e clique em Comparar para validar os cálculos do sistema.</div>
          <button onClick={compararGabarito} disabled={comparando}
            style={{ padding:'11px 24px', background:'#0B1F4D', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:comparando?'default':'pointer', opacity:comparando?0.7:1 }}>
            {comparando ? '⏳ Comparando...' : '🔍 Comparar com Gabarito'}
          </button>
        </div>

        {comparacao.length > 0 && <>
          {/* Índice de conformidade */}
          <div style={{ background: parseFloat(conformidade)>=99?'#f0fdf4':'#fffbeb', border: `2px solid ${parseFloat(conformidade)>=99?'#86efac':'#fde68a'}`, borderRadius:14, padding:'20px 28px', marginBottom:20, textAlign:'center' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#64748b', marginBottom:4, letterSpacing:1, textTransform:'uppercase' }}>Índice de Conformidade</div>
            <div style={{ fontSize:48, fontWeight:900, color: parseFloat(conformidade)>=99?'#16a34a':'#d97706', lineHeight:1 }}>{conformidade}%</div>
            <div style={{ fontSize:14, color:'#64748b', marginTop:4 }}>{aprovados} de {comparacao.length} testes aprovados</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
            {[
              { label:'Total de testes', valor:comparacao.length, cor:'#0B1F4D' },
              { label:'✅ Aprovados',     valor:aprovados,         cor:'#16a34a' },
              { label:'❌ Reprovados',    valor:reprovados,        cor:'#dc2626' },
            ].map((c,i) => (
              <div key={i} style={{ background:'#fff', borderRadius:10, border:'2px solid #e2e8f0', padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, color:c.cor }}>{c.valor}</div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Competência','Tributo','Esperado','Calculado','Diferença','Status'].map(h=>(
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparacao.map((c,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9', background:c.aprovado?'#f0fdf4':'#fff1f2' }}>
                    <td style={{ padding:'9px 14px', color:'#374151' }}>{c.competencia}</td>
                    <td style={{ padding:'9px 14px', fontWeight:600, color:'#0B1F4D' }}>{c.tributo}</td>
                    <td style={{ padding:'9px 14px', color:'#16a34a', fontWeight:700 }}>{fmtR(c.valor_esperado)}</td>
                    <td style={{ padding:'9px 14px', color:c.aprovado?'#16a34a':'#dc2626', fontWeight:700 }}>{fmtR(c.valor_calculado)}</td>
                    <td style={{ padding:'9px 14px', color:c.aprovado?'#94a3b8':'#dc2626', fontWeight:c.aprovado?400:700 }}>{fmtR(c.diferenca)}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ background:c.aprovado?'#dcfce7':'#fee2e2', color:c.aprovado?'#166534':'#991b1b', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                        {c.aprovado?'✅ OK':'❌ Divergente'}
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
        historico.length===0 ? (
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:48, textAlign:'center', color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
            <div style={{ fontSize:15, fontWeight:600 }}>Nenhuma importação registrada ainda</div>
          </div>
        ) : (
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #e2e8f0', fontSize:13, fontWeight:700, color:'#0B1F4D' }}>📋 Histórico completo de importações</div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Data','Arquivo','Tabela','Importados','Rejeitados','Tempo'].map(h=>(
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748b', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((l,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                    <td style={{ padding:'9px 14px', color:'#64748b' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    <td style={{ padding:'9px 14px', fontWeight:600, color:'#0B1F4D' }}>{l.arquivo}</td>
                    <td style={{ padding:'9px 14px', color:'#64748b' }}>{l.tabela}</td>
                    <td style={{ padding:'9px 14px', color:'#16a34a', fontWeight:700 }}>{fmtN(l.importados)}</td>
                    <td style={{ padding:'9px 14px', color:l.rejeitados>0?'#dc2626':'#94a3b8', fontWeight:l.rejeitados>0?700:400 }}>{fmtN(l.rejeitados)}</td>
                    <td style={{ padding:'9px 14px', color:'#64748b' }}>{l.tempo_ms?`${l.tempo_ms}ms`:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── ABA FORMATOS FUTUROS — Prioridade 8 ── */}
      {aba==='formatos' && (
        <div>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:'16px 20px', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0B1F4D', marginBottom:10 }}>✅ Formatos ativos ({Object.keys(LAYOUTS).length})</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {Object.keys(LAYOUTS).map(nome=>(
                <span key={nome} style={{ background:'#dcfce7', border:'1px solid #86efac', borderRadius:6, padding:'3px 10px', fontSize:11, color:'#166534', fontWeight:600 }}>✅ {nome}</span>
              ))}
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:12, border:'2px solid #e2e8f0', padding:'16px 20px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#0B1F4D', marginBottom:4 }}>🔮 Em desenvolvimento</div>
            <div style={{ fontSize:12, color:'#64748b', marginBottom:14 }}>Arquitetura preparada para receber novos formatos sem alterar a estrutura principal. Cada parser é registrado de forma independente.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {FORMATOS_FUTUROS.map((f,i)=>(
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:18 }}>🔮</div>
                  <div style={{ flex:1, fontSize:13, fontWeight:600, color:'#0B1F4D' }}>{f.label}</div>
                  <span style={{ background:'#fef9c3', color:'#854d0e', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>Em breve</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}