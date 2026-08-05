/**
 * monofasicos.js — Base de Conhecimento Tributária — FiscalTrib
 * Tabela oficial de NCMs sujeitos ao regime monofásico de PIS/COFINS.
 *
 * IMPORTANTE: Este arquivo distingue três categorias distintas:
 *
 * 1. MONOFÁSICO COM CRÉDITO — tributação concentrada no fabricante,
 *    revendedor tem alíquota zero E direito à restituição do que
 *    pagou indevidamente. (Lei 10.147/2000, 10.336/2001, 10.485/2002, 13.097/2015)
 *
 * 2. ALÍQUOTA ZERO — produto isento ou com alíquota zero por política
 *    tributária, mas SEM regime monofásico. Revendedor simplesmente
 *    não recolhe — não há crédito a recuperar. (Lei 10.925/2004)
 *
 * 3. REGIME CONCENTRADO/DIFERENCIADO — tributação especial que pode
 *    ou não gerar crédito dependendo da situação.
 *
 * Versão: 2.0
 * Data: 2026-08-05
 * Atualização: Adicionados autopeças (Lei 10.485/2002), veículos,
 *              pneus/câmaras, cosméticos complementares (9603, 9619, 3401).
 *              Tabela alinhada à Tabela SPED 4.3.10 v1.25 (30/03/2026).
 */

import { VERSAO_ATUAL } from '../versionamento/versoes.js'

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIAS
// ─────────────────────────────────────────────────────────────────────────────

export const CATEGORIAS_MONOFASICAS = {
  COMBUSTIVEIS:        'COMBUSTIVEIS',
  FARMACEUTICOS:       'FARMACEUTICOS',
  PERFUMES_COSMETICOS: 'PERFUMES_COSMETICOS',
  BEBIDAS:             'BEBIDAS',
  EMBALAGENS_BEBIDAS:  'EMBALAGENS_BEBIDAS',
  VEICULOS:            'VEICULOS',
  AUTOPECAS:           'AUTOPECAS',
  PNEUS_CAMARAS:       'PNEUS_CAMARAS',
  BORRACHA:            'BORRACHA',
}

export const CATEGORIAS_ALIQUOTA_ZERO = {
  CEREAIS: 'CEREAIS',
  OURO:    'OURO',
}

// ─────────────────────────────────────────────────────────────────────────────
// TABELA MONOFÁSICOS COM DIREITO A CRÉDITO
// Revendedor tem alíquota zero E pode recuperar o que pagou indevidamente
// ─────────────────────────────────────────────────────────────────────────────

export const TABELA_NCM_MONOFASICOS = [

  // ── COMBUSTÍVEIS E LUBRIFICANTES ─────────────────────────────────────────
  { ncm: '2701', descricao: 'Hulhas e coque de hulha',                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2702', descricao: 'Linhito',                                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2703', descricao: 'Turfa',                                      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2704', descricao: 'Coque de carvão mineral',                    categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2705', descricao: 'Gás de carvão, gás de água',                 categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2706', descricao: 'Alcatrões de hulha, linhito ou turfa',       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2707', descricao: 'Óleos e outros produtos da destilação',      categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2708', descricao: 'Breu e coque de breu',                       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2709', descricao: 'Óleos brutos de petróleo',                   categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º',  geraCredito: true },
  { ncm: '2710', descricao: 'Óleos de petróleo — gasolina, diesel, QAV',  categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º',  geraCredito: true },
  { ncm: '2711', descricao: 'Gás natural, GLP, butano, propano',          categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 10.336/2001 Art. 4º',  geraCredito: true },
  { ncm: '2712', descricao: 'Vaselina, parafina, ceras minerais',         categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2713', descricao: 'Coque de petróleo e resíduos',               categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2714', descricao: 'Betume de petróleo, asfalto',                categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },
  { ncm: '2715', descricao: 'Misturas betuminosas',                       categoria: CATEGORIAS_MONOFASICAS.COMBUSTIVEIS, aliqPIS: 5.08,  aliqCOFINS: 23.44, baseLegal: 'Lei 9.718/1998 Art. 4º',   geraCredito: true },

  // ── FARMACÊUTICOS ─────────────────────────────────────────────────────────
  // Lei 10.147/2000, Art. 1º, I — Fabricante: PIS 2,10% / COFINS 9,90%
  // Revendedor: alíquota zero (CST 04) — exceto 3003.90.56 e 3004.90.46
  { ncm: '3001', descricao: 'Glândulas e órgãos para uso opoterápico',    categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3002', descricao: 'Sangue humano/animal, antissoros, vacinas',  categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3003', descricao: 'Medicamentos (não em doses) — exceto 3003.90.56', categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true, excecoes: ['300390560'] },
  { ncm: '3004', descricao: 'Medicamentos (em doses) — exceto 3004.90.46', categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true, excecoes: ['300490460'] },
  { ncm: '3005', descricao: 'Pastas, gazes, ataduras, esparadrapos',      categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3006', descricao: 'Preparações farmacêuticas diversas',         categoria: CATEGORIAS_MONOFASICAS.FARMACEUTICOS, aliqPIS: 2.10, aliqCOFINS: 9.90, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },

  // ── PERFUMES E COSMÉTICOS ─────────────────────────────────────────────────
  // Lei 10.147/2000, Art. 1º, II — Fabricante: PIS 2,20% / COFINS 10,30%
  { ncm: '3303', descricao: 'Perfumes e águas de colônia',                categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3304', descricao: 'Produtos de beleza e maquiagem',             categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3305', descricao: 'Preparações capilares',                      categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3306', descricao: 'Preparações higiene bucal e dental',         categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3307', descricao: 'Preparações barba, desodorantes, sais banho',categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '3401', descricao: 'Sabões de toucador e sabões líquidos',       categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '9603', descricao: 'Escovas de dentes (pos. 9603.21.00)',        categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },
  { ncm: '9619', descricao: 'Absorventes, tampões higiênicos, fraldas',   categoria: CATEGORIAS_MONOFASICAS.PERFUMES_COSMETICOS, aliqPIS: 2.20, aliqCOFINS: 10.30, baseLegal: 'Lei 10.147/2000 Art. 1º', geraCredito: true },

  // ── BEBIDAS ───────────────────────────────────────────────────────────────
  // Lei 13.097/2015, Art. 14 — Tributação por pauta (R$/litro)
  // Alíquotas percentuais abaixo são referenciais — o cálculo real é por pauta
  { ncm: '2201', descricao: 'Águas, incluindo águas minerais e gaseificadas', categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2202', descricao: 'Águas, refrigerantes, energéticos e outras bebidas não alcoólicas', categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2203', descricao: 'Cervejas de malte',                          categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 2.32, aliqCOFINS: 10.68, baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2204', descricao: 'Vinhos de uvas frescas',                     categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2205', descricao: 'Vermutes e outros vinhos',                   categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2206', descricao: 'Outras bebidas fermentadas',                 categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2207', descricao: 'Álcool etílico não desnaturado',             categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2208', descricao: 'Aguardentes, uísques, rum, gin e outras',    categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2209', descricao: 'Vinagres e seus sucedâneos',                 categoria: CATEGORIAS_MONOFASICAS.BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54,  baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },
  { ncm: '2106', descricao: 'Preparações alimentícias diversas (concentrados para bebidas)', categoria: CATEGORIAS_MONOFASICAS.EMBALAGENS_BEBIDAS, aliqPIS: 1.86, aliqCOFINS: 8.54, baseLegal: 'Lei 13.097/2015 Art. 14', geraCredito: true, tributacaoPorPauta: true },

  // ── VEÍCULOS — Lei 10.485/2002, Art. 1º ──────────────────────────────────
  // Fabricante/importador: PIS 2,00% / COFINS 9,50%
  // Concessionária/revendedor: alíquota zero (CST 04)
  { ncm: '8701', descricao: 'Tratores (exceto para comboios ferroviários)', categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },
  { ncm: '8702', descricao: 'Veículos para transporte de 10 ou mais pessoas', categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },
  { ncm: '8703', descricao: 'Automóveis de passeio e outros veículos para transporte de pessoas', categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },
  { ncm: '8704', descricao: 'Veículos para transporte de mercadorias (caminhões, furgões)', categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },
  { ncm: '8705', descricao: 'Veículos para usos especiais (guindastes, betoneiras)', categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },
  { ncm: '8706', descricao: 'Chassis com motor para veículos automóveis', categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },
  { ncm: '8711', descricao: 'Motocicletas e ciclomotores',                categoria: CATEGORIAS_MONOFASICAS.VEICULOS, aliqPIS: 2.00, aliqCOFINS: 9.50, baseLegal: 'Lei 10.485/2002 Art. 1º', geraCredito: true },

  // ── PNEUS E CÂMARAS DE AR — Lei 10.485/2002, Art. 5º ─────────────────────
  // Fabricante/importador: PIS 2,00% / COFINS 9,60%
  { ncm: '4011', descricao: 'Pneus novos de borracha para veículos automotores', categoria: CATEGORIAS_MONOFASICAS.PNEUS_CAMARAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Art. 5º', geraCredito: true },
  { ncm: '4012', descricao: 'Pneus recauchutados e usados de borracha',   categoria: CATEGORIAS_MONOFASICAS.PNEUS_CAMARAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Art. 5º', geraCredito: true },
  { ncm: '4013', descricao: 'Câmaras de ar de borracha',                  categoria: CATEGORIAS_MONOFASICAS.PNEUS_CAMARAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Art. 5º', geraCredito: true },

  // ── AUTOPEÇAS — Lei 10.485/2002, Anexos I e II ───────────────────────────
  // Fabricante/importador: PIS 2,00% / COFINS 9,60%
  // Revendedor: alíquota zero (CST 04)
  { ncm: '3917', descricao: 'Tubos, canos e mangueiras de plástico (autopeças)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '3918', descricao: 'Revestimentos de plástico para veículos',    categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '3926', descricao: 'Outras obras de plástico para veículos',     categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '4016', descricao: 'Outras obras de borracha vulcanizada (juntas, buchas)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '7007', descricao: 'Vidros de segurança (parabrisa)',             categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '7009', descricao: 'Espelhos retrovisores',                      categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '7320', descricao: 'Molas e folhas de molas de ferro ou aço',    categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8407', descricao: 'Motores de pistão alternativo para veículos',categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8408', descricao: 'Motores de ignição por compressão (diesel)',  categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8409', descricao: 'Partes para motores 84.07 e 84.08',          categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8413', descricao: 'Bombas para líquidos (combustível, óleo, água)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8414', descricao: 'Bombas de ar e vácuo; compressores',         categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8415', descricao: 'Aparelhos de ar condicionado para veículos', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8421', descricao: 'Filtros de ar, óleo e combustível',          categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8431', descricao: 'Partes para máquinas de terraplanagem',      categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8481', descricao: 'Torneiras, válvulas para tubagens automotivas', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8482', descricao: 'Rolamentos de esferas, rolos ou agulhas',    categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8483', descricao: 'Árvores de transmissão, engrenagens, caixas de câmbio', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8484', descricao: 'Juntas e conjuntos de juntas',               categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8501', descricao: 'Motores e geradores elétricos (alternadores, motores de partida)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8505', descricao: 'Eletroímãs; aparelhos de pega eletromagnéticos', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8507', descricao: 'Acumuladores elétricos (baterias automotivas)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8511', descricao: 'Aparelhos de ignição (velas, distribuidores, bobinas)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8512', descricao: 'Aparelhos elétricos de iluminação e sinalização (faróis, lanternas)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8519', descricao: 'Aparelhos de gravação de som (rádios automotivos)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8527', descricao: 'Aparelhos receptores de radiodifusão (autoradio)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8536', descricao: 'Aparelhos para interrupção de circuitos (fusíveis, relés)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8539', descricao: 'Lâmpadas e tubos elétricos para veículos',   categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8544', descricao: 'Fios e cabos elétricos isolados (chicote elétrico)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo I', geraCredito: true },
  { ncm: '8708', descricao: 'Partes e acessórios para veículos (freios, suspensão, direção, carroceria)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo II', geraCredito: true },
  { ncm: '8714', descricao: 'Partes e acessórios para motocicletas',      categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo II', geraCredito: true },
  { ncm: '9032', descricao: 'Instrumentos para regulação automática (sensores automotivos)', categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo II', geraCredito: true },
  { ncm: '9401', descricao: 'Assentos (bancos para veículos)',             categoria: CATEGORIAS_MONOFASICAS.AUTOPECAS, aliqPIS: 2.00, aliqCOFINS: 9.60, baseLegal: 'Lei 10.485/2002 Anexo II', geraCredito: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// TABELA DE ALÍQUOTA ZERO — NÃO GERAM CRÉDITO MONOFÁSICO
// ─────────────────────────────────────────────────────────────────────────────

export const TABELA_NCM_ALIQUOTA_ZERO = [
  { ncm: '1001', descricao: 'Trigo e mistura de trigo com centeio',       categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1002', descricao: 'Centeio',                                    categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1003', descricao: 'Cevada',                                     categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1004', descricao: 'Aveia',                                      categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1005', descricao: 'Milho',                                      categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1006', descricao: 'Arroz',                                      categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1007', descricao: 'Sorgo de grão',                              categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '1008', descricao: 'Trigo sarraceno, painço, alpiste e outros',  categoria: CATEGORIAS_ALIQUOTA_ZERO.CEREAIS, baseLegal: 'Lei 10.925/2004 Art. 1º' },
  { ncm: '7108', descricao: 'Ouro — formas brutas',                       categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7109', descricao: 'Metais comuns folheados de ouro',            categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7110', descricao: 'Platina — formas brutas ou em pó',           categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7111', descricao: 'Metais comuns folheados de platina',         categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
  { ncm: '7112', descricao: 'Desperdícios e resíduos de metais preciosos',categoria: CATEGORIAS_ALIQUOTA_ZERO.OURO,    baseLegal: 'Lei 11.033/2004' },
]

// ─────────────────────────────────────────────────────────────────────────────
// ÍNDICES DE CONSULTA RÁPIDA
// ─────────────────────────────────────────────────────────────────────────────

const _indiceMonofasicos  = new Map(TABELA_NCM_MONOFASICOS.map(item  => [item.ncm, item]))
const _indiceAliquotaZero = new Map(TABELA_NCM_ALIQUOTA_ZERO.map(item => [item.ncm, item]))

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PÚBLICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se um NCM é sujeito ao regime monofásico COM DIREITO A CRÉDITO.
 * Detecção por NCM — independente do CST informado na NF-e.
 * Respeita exceções (ex: 3003.90.56 e 3004.90.46 não são monofásicos).
 */
export function isMonofasico(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indiceMonofasicos) {
    if (n.startsWith(chave)) {
      // Verifica exceções
      if (registro.excecoes && registro.excecoes.some(exc => n.startsWith(exc))) {
        return false
      }
      return true
    }
  }
  return false
}

/**
 * Verifica se um NCM tem alíquota zero mas NÃO é monofásico.
 * Esses produtos não geram crédito — revendedor simplesmente não recolhe.
 */
export function isAliquotaZero(ncm) {
  if (!ncm) return false
  const n = ncm.replace(/\D/g, '')
  for (const [chave] of _indiceAliquotaZero) {
    if (n.startsWith(chave)) return true
  }
  return false
}

/**
 * Classifica um NCM: 'monofasico' | 'aliquota_zero' | 'comum'
 */
export function classificarNCMTributario(ncm) {
  if (isMonofasico(ncm))   return 'monofasico'
  if (isAliquotaZero(ncm)) return 'aliquota_zero'
  return 'comum'
}

/**
 * Retorna o registro completo de um NCM monofásico.
 */
export function getNCMMonofasico(ncm) {
  if (!ncm) return null
  const n = ncm.replace(/\D/g, '')
  for (const [chave, registro] of _indiceMonofasicos) {
    if (n.startsWith(chave)) {
      if (registro.excecoes && registro.excecoes.some(exc => n.startsWith(exc))) return null
      return registro
    }
  }
  return null
}

export function getNCMsMonofasicos() {
  return TABELA_NCM_MONOFASICOS
}

export function getCategoriaMonofasica(ncm) {
  const registro = getNCMMonofasico(ncm)
  return registro ? registro.categoria : null
}

export function getNCMsPorCategoria(categoria) {
  return TABELA_NCM_MONOFASICOS.filter(item => item.categoria === categoria)
}

export function getAliquotasMonofasico(ncm) {
  const registro = getNCMMonofasico(ncm)
  if (!registro) return null
  return { aliqPIS: registro.aliqPIS, aliqCOFINS: registro.aliqCOFINS }
}

export const META_TABELA_MONOFASICOS = {
  versaoBase:         VERSAO_ATUAL.codigo,
  versaoTabela:       '2.0',
  totalMonofasicos:   TABELA_NCM_MONOFASICOS.length,
  totalAliquotaZero:  TABELA_NCM_ALIQUOTA_ZERO.length,
  categorias:         Object.values(CATEGORIAS_MONOFASICAS),
  atualizadaEm:       '2026-08-05',
  observacao:         'v2.0 — Adicionados veículos, autopeças, pneus (Lei 10.485/2002), cosméticos complementares (3401, 9603, 9619). Exceções 3003.90.56 e 3004.90.46 implementadas. Tabela alinhada ao SPED 4.3.10 v1.25.',
  baseLegalPrincipal: [
    'Lei 9.718/1998', 'Lei 10.147/2000', 'Lei 10.336/2001',
    'Lei 10.485/2002', 'Lei 10.833/2003', 'Lei 10.925/2004',
    'Lei 13.097/2015', 'IN RFB 2.121/2022',
    'Tabela SPED 4.3.10 v1.25 (30/03/2026)',
  ],
}