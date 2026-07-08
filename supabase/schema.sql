CREATE TABLE acompanhamentos (id uuid NOT NULL, usuario_id uuid, cliente_id uuid, numero_processo text, tipo_recuperacao text, responsavel text, status text, data_abertura date, credito_identificado numeric, credito_recuperado numeric, pendencias jsonb, timeline jsonb, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone);

CREATE TABLE analises (id integer NOT NULL, usuario_id uuid, cliente_id integer, razao_social text, cnpj text, tipo_analise text, status text, numero_cda text, numero_processo text, dados jsonb, versoes jsonb, created_at timestamp without time zone, updated_at timestamp without time zone);

CREATE TABLE assinaturas (id uuid NOT NULL, usuario_id uuid, plano text NOT NULL, valor numeric NOT NULL, status text, ativo boolean, referencia text, ultimo_pagamento timestamp with time zone, valor_pago numeric, created_at timestamp with time zone, updated_at timestamp with time zone, data_inicio date, data_fim date);

CREATE TABLE base_juridica (id uuid NOT NULL, tipo_norma text NOT NULL, numero text NOT NULL, titulo text NOT NULL, orgao_emissor text, data_vigencia date, hierarquia_normativa text, escopo ARRAY, tipo_credito ARRAY, assunto ARRAY, palavras_chave ARRAY, regra_pratica text, texto_referencia text, link_oficial text, status text, usuario_id uuid, created_at timestamp with time zone);

CREATE TABLE base_juridica_relacoes (id uuid NOT NULL, norma_origem_id uuid, norma_relacionada_id uuid, tipo_relacao text, created_at timestamp with time zone);

CREATE TABLE base_teses (id uuid NOT NULL, nome_tese text NOT NULL, base_juridica_id uuid, motor_regra_id uuid, precedentes text, requisitos text, excecoes text, estrategia_recomendada text, documentos_necessarios ARRAY, grau_sucesso text, visivel_usuario_final boolean, created_at timestamp with time zone);

CREATE TABLE checklist (id uuid NOT NULL, cliente_id uuid, usuario_id uuid, documento text NOT NULL, obtido boolean, atualizado_em timestamp with time zone);

CREATE TABLE clientes (id uuid NOT NULL, usuario_id uuid, razao_social text NOT NULL, nome_fantasia text, cnpj text NOT NULL, cnae_principal text, cnaes_secundarios text, inscricao_estadual text, inscricao_municipal text, municipio text, uf text, regime text NOT NULL, competencia_inicio text, competencia_fim text, responsavel_contabil text, observacoes text, status text, criado_em timestamp with time zone, atualizado_em timestamp with time zone);

CREATE TABLE divida_ativa (id integer NOT NULL, usuario_id uuid, cliente_id integer, razao_social text, cnpj text, valor_total text, orgao_credor text, processo_execucao text, possui_parcelamento boolean, possui_transacao_anterior boolean, possui_garantia boolean, possui_penhora boolean, possui_bloqueio boolean, possui_embargos boolean, observacoes text, cdas jsonb, diagnostico jsonb, score integer, created_at timestamp without time zone, updated_at timestamp without time zone);

CREATE TABLE entradas (id uuid NOT NULL, cliente_id uuid, usuario_id uuid, competencia text NOT NULL, tributo text NOT NULL, receita_bruta numeric, receita_tributada numeric, receita_monofasica numeric, base_calculo numeric, tributo_declarado numeric, tributo_pago numeric, tributo_devido numeric, credito numeric, tipo_oportunidade text, risco text, documentos text, criado_em timestamp with time zone);

CREATE TABLE exigencias_fiscais (id uuid NOT NULL, perdcomp_id uuid, cliente_id uuid, data_exigencia timestamp with time zone, tipo_exigencia text, prazo_resposta timestamp with time zone, responsavel text, situacao text, resposta text, data_resposta timestamp with time zone, created_at timestamp with time zone);

CREATE TABLE extensao_permissoes (usuario_id uuid NOT NULL, dashboard boolean NOT NULL, kanban boolean NOT NULL, chatbot boolean NOT NULL, campanhas boolean NOT NULL, importar boolean NOT NULL, link_qr boolean NOT NULL, lembretes boolean NOT NULL, webhooks boolean NOT NULL, atualizado_em timestamp with time zone NOT NULL);

CREATE TABLE kanban_colunas (id bigint NOT NULL, usuario_id uuid NOT NULL, col1 text, col2 text, col3 text, col4 text, col5 text, col6 text, col7 text, col8 text);

CREATE TABLE mensagens_rapidas (id uuid NOT NULL, user_id uuid, titulo text NOT NULL, mensagem text NOT NULL, categoria text, created_at timestamp with time zone, nome_sequencia text, sequencia_ordem integer, sequencia_id text, tipo_conteudo text NOT NULL, midia_url text);

CREATE TABLE modulos_permissoes (id bigint NOT NULL, usuario_id uuid NOT NULL, painel boolean, clientes boolean, analise boolean, recuperacao boolean, prazos boolean, relatorios boolean, inteligencia boolean, divida boolean, prospeccao boolean, mensagens boolean);

CREATE TABLE monitor_obrigacoes (id uuid NOT NULL, cliente_id uuid, obrigacao_id text, competencia text, status text, updated_at timestamp with time zone);

CREATE TABLE motor_regras (id uuid NOT NULL, nome_regra text NOT NULL, descricao text, base_juridica_id uuid, condicao jsonb, resultado text, modulos_aplicaveis ARRAY, status text, created_at timestamp with time zone);

CREATE TABLE pagamentos (id uuid NOT NULL, referencia text, status text, valor numeric, pagbank_status integer, notification_code text, created_at timestamp with time zone, assinatura_id uuid, metodo text, pagbank_charge_id text);

CREATE TABLE perdcomp (id uuid NOT NULL, recuperacao_id uuid, cliente_id uuid, numero_perdcomp text, competencia text, tributo text, valor_credito numeric, valor_protocolado numeric, valor_homologado numeric, valor_recuperado numeric, valor_glosado numeric, tese_aplicada text, status text, data_protocolo timestamp with time zone, data_homologacao timestamp with time zone, data_recuperacao timestamp with time zone, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone);

CREATE TABLE prazos_fiscais (id uuid NOT NULL, usuario_id uuid, cliente_id uuid, obrigacao text, regime text, competencia text, vencimento date, situacao text, observacoes text, created_at timestamp with time zone, updated_at timestamp with time zone);

CREATE TABLE prospeccao_clientes (id uuid NOT NULL, user_id uuid, cnpj text NOT NULL, razao_social text, nome_fantasia text, situacao_cadastral text, data_abertura date, natureza_juridica text, porte text, cnae_principal text, cnae_descricao text, endereco_logradouro text, endereco_numero text, endereco_complemento text, endereco_bairro text, endereco_municipio text, endereco_uf text, endereco_cep text, socios jsonb, pgfn_tem_divida boolean, pgfn_valor_total numeric, pgfn_qtd_inscricoes integer, pgfn_situacao text, trf_regiao text, trf_tem_execucao boolean, trf_qtd_processos integer, trf_tem_advogado boolean, trf_processos jsonb, tem_site boolean, site_url text, tem_instagram boolean, instagram_url text, tem_facebook boolean, facebook_url text, score_prospeccao integer, classificacao text, observacoes text, status_prospeccao text, created_at timestamp with time zone, updated_at timestamp with time zone, telefone text, whatsapp text, email_contato text, linkedin_url text, contato_nome text, socios_manual text, status_lead text, trf_observacao text, proxima_acao text, data_proxima_acao date, hora_proxima_acao time without time zone, temperatura text, ultimo_contato date, responsavel_atendimento text, historico_contatos jsonb, historico_mensagens jsonb);

CREATE TABLE recuperacoes (id uuid NOT NULL, cliente_id uuid, competencia text, tributo text, valor_credito numeric, potencial_recuperavel numeric, valor_homologado numeric, valor_recuperado numeric, tese_aplicada text, risco text, origem text, status text, score_fiscal integer, observacoes text, data_identificacao timestamp with time zone, data_protocolo timestamp with time zone, data_homologacao timestamp with time zone, data_recuperacao timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone);

CREATE TABLE relatorios_importacao (id uuid NOT NULL, usuario_id uuid, cliente_id uuid, cliente_nome text, cliente_cnpj text, cliente_regime text, origem text, total_nfes integer, periodo_inicio text, periodo_fim text, total_faturamento numeric, total_impostos numeric, oportunidades_count integer, potencial_total numeric, dados_json jsonb, created_at timestamp with time zone);

CREATE TABLE scores_fiscais (id uuid NOT NULL, cliente_id uuid, score integer, classificacao text, respostas jsonb, regime text, created_at timestamp with time zone);

CREATE TABLE sessoes_ativas (id integer NOT NULL, usuario_id uuid NOT NULL, email text, nome text, ultima_atividade timestamp without time zone, pagina_atual text, created_at timestamp without time zone);

CREATE TABLE tb_cest (id integer NOT NULL, codigo text NOT NULL, descricao text NOT NULL, ncm_relacionado text, segmento text, created_at timestamp without time zone);

CREATE TABLE tb_cfop (id integer NOT NULL, codigo text NOT NULL, descricao text NOT NULL, aplicacao text, tipo text, created_at timestamp without time zone);

CREATE TABLE tb_cnae (id integer NOT NULL, codigo text NOT NULL, descricao text NOT NULL, secao text, divisao text, grupo text, classe text, regime_permitido text, anexo_simples text, fator_r boolean, observacoes text, created_at timestamp without time zone);

CREATE TABLE tb_csosn (id integer NOT NULL, codigo text NOT NULL, descricao text NOT NULL, aplicacao text, created_at timestamp without time zone);

CREATE TABLE tb_cst (id integer NOT NULL, codigo text NOT NULL, descricao text NOT NULL, tipo text NOT NULL, aplicacao text, created_at timestamp without time zone);

CREATE TABLE tb_ncm (id integer NOT NULL, codigo text NOT NULL, descricao text NOT NULL, unidade text, aliquota_ii numeric, aliquota_ipi numeric, aliquota_pis numeric, aliquota_cofins numeric, created_at timestamp without time zone);

CREATE TABLE tb_oportunidades (id integer NOT NULL, cnae_codigo text, tese_id integer, descricao text, potencial text, regime text, created_at timestamp without time zone);

CREATE TABLE tb_reforma_tributaria (id integer NOT NULL, tema text NOT NULL, descricao text, impacto text, tipo text, cnae_relacionado text, regime_relacionado text, oportunidade text, risco text, vigencia_inicio date, created_at timestamp without time zone);

CREATE TABLE tb_teses (id integer NOT NULL, nome text NOT NULL, descricao text, fundamentacao text, regime text, tributo text, complexidade text, potencial text, prazo_prescricional integer, documentacao text, observacoes text, created_at timestamp without time zone);

CREATE TABLE timeline_recuperacao (id uuid NOT NULL, recuperacao_id uuid, perdcomp_id uuid, evento text, descricao text, data_evento timestamp with time zone, usuario text, created_at timestamp with time zone);

CREATE TABLE usuarios (id uuid NOT NULL, email text NOT NULL, nome text, escritorio text, telefone text, plano text NOT NULL, status text NOT NULL, trial_expira_em timestamp with time zone, plano_expira_em timestamp with time zone, criado_em timestamp with time zone, atualizado_em timestamp with time zone, tipo_perfil text, nome_completo text, cep text, rua text, numero text, bairro text, cidade text, estado text, perfil_completo boolean, nome_escritorio text, cnpj text, crc text, nome_sociedade text, oab text, oab_uf text, cpf text, nome_empresa text, ativo boolean);