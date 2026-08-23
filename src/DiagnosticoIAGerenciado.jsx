import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import AnalisadorIA from './AnalisadorIA'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const C = {
  navy: '#0B1F4D',
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  white: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  bg: '#F8FAFC',
}

const fmtDataHora = valor => {
  if (!valor) return '-'

  try {
    return new Date(valor).toLocaleString('pt-BR')
  } catch {
    return String(valor)
  }
}

const fmtR = valor =>
  'R$ ' +
  Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const escaparHtml = valor =>
  String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[caractere]))

function markdownInline(texto) {
  return escaparHtml(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function markdownParaHtml(texto) {
  if (!texto) return '<p>Sem parecer da IA.</p>'

  const linhas = String(texto).split(/\r?\n/)
  const html = []

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim()

    if (!linha) {
      html.push('<div style="height:6px"></div>')
      continue
    }

    const limpa = linha
      .replace(/^\*\*/, '')
      .replace(/\*\*$/, '')
      .trim()

    if (/^###\s+/.test(limpa)) {
      html.push(
        '<h4>' +
          markdownInline(limpa.replace(/^###\s+/, '')) +
        '</h4>'
      )
      continue
    }

    if (/^##\s+/.test(limpa)) {
      html.push(
        '<h3>' +
          markdownInline(limpa.replace(/^##\s+/, '')) +
        '</h3>'
      )
      continue
    }

    if (/^#\s+/.test(limpa)) {
      html.push(
        '<h2>' +
          markdownInline(limpa.replace(/^#\s+/, '')) +
        '</h2>'
      )
      continue
    }

    const ehTabela =
      linha.startsWith('|') &&
      i + 1 < linhas.length &&
      /^\s*\|?[\s:|-]+\|[\s:|-]+/.test(linhas[i + 1])

    if (ehTabela) {
      const cabecalhos = linha
        .replace(/^\||\|$/g, '')
        .split('|')
        .map(c => c.trim())

      i += 2

      const linhasTabela = []

      while (
        i < linhas.length &&
        linhas[i].trim().startsWith('|')
      ) {
        linhasTabela.push(
          linhas[i]
            .trim()
            .replace(/^\||\|$/g, '')
            .split('|')
            .map(c => c.trim())
        )

        i++
      }

      i--

      html.push(
        '<table class="tabela-parecer"><thead><tr>' +
        cabecalhos
          .map(c => '<th>' + markdownInline(c) + '</th>')
          .join('') +
        '</tr></thead><tbody>' +
        linhasTabela
          .map(
            row =>
              '<tr>' +
              row
                .map(c => '<td>' + markdownInline(c) + '</td>')
                .join('') +
              '</tr>'
          )
          .join('') +
        '</tbody></table>'
      )

      continue
    }

    if (/^[-*]\s+/.test(linha)) {
      html.push(
        '<div class="item">• ' +
          markdownInline(linha.replace(/^[-*]\s+/, '')) +
        '</div>'
      )
      continue
    }

    if (/^\d+\.\s+/.test(linha)) {
      const numero = linha.match(/^(\d+)\./)?.[1] || ''
      const textoLinha = linha.replace(/^\d+\.\s+/, '')

      html.push(
        '<div class="item"><strong>' +
          numero +
          '.</strong> ' +
          markdownInline(textoLinha) +
        '</div>'
      )

      continue
    }

    html.push(
      '<p>' + markdownInline(linha) + '</p>'
    )
  }

  return html.join('')
}

function tratamentosAtividade(a) {
  const lista = []

  if (a?.icms_st) lista.push('ICMS-ST')
  if (a?.pis_cofins_monofasico) lista.push('PIS/COFINS Monofásico')
  if (a?.antecipacao_com_encerramento) lista.push('Antecipação')
  if (a?.iss_retido) lista.push('ISS Retido')
  if (a?.imunidade) lista.push('Imune')
  if (a?.exportacao) lista.push('Exportação')

  return lista.length ? lista.join(', ') : 'Normal'
}

function montarDossieHtml({
  snapshot,
  parecer,
  cliente,
  competencia,
  criadoEm,
}) {
  const s = snapshot || {}
  const d = s.declaracao || {}
  const resumo = s.resumo || {}
  const trib = s.tributos || {}
  const susp = s.tributos_suspensos || {}
  const conferencia = s.conferencia || {}
  const atividades = Array.isArray(s.atividades)
    ? s.atividades
    : []

  const nome =
    s?.cliente?.razao_social ||
    cliente?.razao_social ||
    'Cliente'

  const cnpj =
    s?.cliente?.cnpj ||
    cliente?.cnpj ||
    ''

  const comp =
    s.competencia ||
    competencia ||
    d.periodo_apuracao ||
    ''

  const linhasAtividades = atividades.length
    ? atividades
        .map(
          (a, index) => `
            <tr>
              <td>${Number(a.ordem || index + 1)}</td>
              <td>
                <strong>${escaparHtml(
                  a.descricao ||
                  a.tipo_atividade ||
                  'Atividade'
                )}</strong>
                ${
                  a.texto_original &&
                  a.texto_original !== a.descricao
                    ? `<div class="subtexto">${escaparHtml(
                        a.texto_original
                      )}</div>`
                    : ''
                }
              </td>
              <td>${escaparHtml(a.anexo || '—')}</td>
              <td class="num">${fmtR(a.receita)}</td>
              <td>${escaparHtml(tratamentosAtividade(a))}</td>
              <td class="num">${fmtR(a.irpj)}</td>
              <td class="num">${fmtR(a.csll)}</td>
              <td class="num">${fmtR(a.pis)}</td>
              <td class="num">${fmtR(a.cofins)}</td>
              <td class="num">${fmtR(a.inss_cpp)}</td>
              <td class="num">${fmtR(a.icms)}</td>
              <td class="num">${fmtR(a.ipi)}</td>
              <td class="num">${fmtR(a.iss)}</td>
              <td class="num"><strong>${fmtR(
                a.valor_total_tributos
              )}</strong></td>
            </tr>
          `
        )
        .join('')
    : `
        <tr>
          <td colspan="14" class="vazio">
            Nenhuma atividade registrada.
          </td>
        </tr>
      `

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>e-FiscalTribe - Dossiê PGDAS-D</title>

<style>
  * {
    box-sizing: border-box;
  }

  @page {
    margin: 10mm;
  }

  body {
    margin: 0;
    padding: 22px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    color: #0F172A;
    background: #FFFFFF;
  }

  .cabecalho {
    border-bottom: 3px solid #0B1F4D;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }

  .marca {
    font-size: 21px;
    font-weight: 800;
    color: #0B1F4D;
  }

  .titulo {
    font-size: 16px;
    font-weight: 700;
    color: #0B1F4D;
    margin-top: 5px;
  }

  .meta {
    margin-top: 8px;
    color: #475569;
    line-height: 1.5;
  }

  .secao {
    margin: 18px 0;
    break-inside: auto;
  }

  .secao-titulo {
    font-size: 12px;
    font-weight: 800;
    color: #0B1F4D;
    text-transform: uppercase;
    border-bottom: 2px solid #0B1F4D;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .campo {
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 7px 9px;
    min-height: 48px;
  }

  .label {
    font-size: 9px;
    color: #64748B;
    font-weight: 700;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .valor {
    font-size: 11px;
    font-weight: 600;
    color: #0F172A;
    word-break: break-word;
  }

  .kpis {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }

  .kpi {
    border: 1px solid #E2E8F0;
    background: #F8FAFC;
    border-radius: 7px;
    padding: 8px;
    text-align: center;
  }

  .kpi .valor {
    font-size: 14px;
    font-weight: 800;
    color: #0B1F4D;
  }

  .conferencia {
    border: 1px solid ${
      conferencia.conferido ? '#86EFAC' : '#FED7AA'
    };
    background: ${
      conferencia.conferido ? '#F0FDF4' : '#FFF7ED'
    };
    color: ${
      conferencia.conferido ? '#166534' : '#9A3412'
    };
    border-radius: 7px;
    padding: 9px 12px;
    line-height: 1.6;
  }

  .parecer {
    border: 1px solid #BFDBFE;
    background: #F8FBFF;
    border-radius: 8px;
    padding: 13px 16px;
    line-height: 1.55;
  }

  .parecer h2,
  .parecer h3,
  .parecer h4 {
    color: #0B1F4D;
    margin: 10px 0 6px;
  }

  .parecer p {
    margin: 5px 0;
  }

  .parecer .item {
    margin: 5px 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }

  th {
    background: #4B5563;
    color: #FFFFFF;
    padding: 6px;
    font-size: 10px;
    text-align: left;
    border: 1px solid #64748B;
  }

  td {
    padding: 5px 6px;
    border: 1px solid #E2E8F0;
    font-size: 10px;
    vertical-align: top;
  }

  .num {
    white-space: nowrap;
    text-align: right;
  }

  .subtexto {
    margin-top: 3px;
    font-size: 9px;
    color: #64748B;
  }

  .vazio {
    text-align: center;
    color: #64748B;
    padding: 12px;
  }

  .observacoes {
    min-height: 60px;
    border: 1px solid #E2E8F0;
    border-radius: 7px;
    padding: 10px;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .rodape {
    margin-top: 20px;
    padding-top: 9px;
    border-top: 1px solid #E2E8F0;
    color: #64748B;
    font-size: 9px;
    display: flex;
    justify-content: space-between;
  }

  .tabela-parecer th,
  .tabela-parecer td {
    font-size: 10px;
  }

  @media print {
    body {
      padding: 0;
    }

    .secao {
      break-inside: auto;
    }

    tr {
      break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }
  }
</style>
</head>

<body>

  <div class="cabecalho">
    <div class="marca">e-FiscalTribe®</div>
    <div class="titulo">
      Dossiê Completo de Análise PGDAS-D
    </div>

    <div class="meta">
      <strong>Cliente:</strong> ${escaparHtml(nome)}
      &nbsp; | &nbsp;
      <strong>CNPJ:</strong> ${escaparHtml(cnpj || '—')}
      &nbsp; | &nbsp;
      <strong>Competência:</strong> ${escaparHtml(comp || '—')}
      <br>
      <strong>Regime:</strong> ${escaparHtml(
        s.regime || ''
      )}
      &nbsp; | &nbsp;
      <strong>Gerado em:</strong> ${escaparHtml(
        criadoEm || new Date().toLocaleString('pt-BR')
      )}
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      Inteligência Tributária — Análise com IA
    </div>

    <div class="parecer">
      ${markdownParaHtml(parecer)}
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      Resumo da Declaração
    </div>

    <div class="kpis">
      <div class="kpi">
        <div class="valor">${fmtR(resumo.rpa)}</div>
        <div class="label">Receita do Período</div>
      </div>

      <div class="kpi">
        <div class="valor">${atividades.length}</div>
        <div class="label">Atividades</div>
      </div>

      <div class="kpi">
        <div class="valor">${fmtR(
          resumo.total_receita_atividades
        )}</div>
        <div class="label">Receita das Atividades</div>
      </div>

      <div class="kpi">
        <div class="valor">${fmtR(resumo.das_total)}</div>
        <div class="label">DAS Declarado</div>
      </div>

      <div class="kpi">
        <div class="valor">${fmtR(
          Number(trib.pis || 0) +
          Number(trib.cofins || 0)
        )}</div>
        <div class="label">PIS + COFINS</div>
      </div>

      <div class="kpi">
        <div class="valor">
          ${Number(resumo.atividades_icms_st || 0)}
          /
          ${Number(resumo.atividades_monofasicas || 0)}
        </div>
        <div class="label">ICMS-ST / Mono</div>
      </div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      Conferência das Atividades
    </div>

    <div class="conferencia">
      <strong>RPA:</strong> ${fmtR(conferencia.rpa)}
      &nbsp; | &nbsp;
      <strong>Soma das atividades:</strong>
      ${fmtR(conferencia.soma_atividades)}
      &nbsp; | &nbsp;
      <strong>Diferença:</strong>
      ${fmtR(conferencia.diferenca)}
      &nbsp; | &nbsp;
      <strong>Status:</strong>
      ${
        conferencia.conferido
          ? 'Conferido'
          : 'Requer revisão'
      }
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      1. Identificação da Declaração
    </div>

    <div class="grid">
      <div class="campo">
        <div class="label">Período de Apuração</div>
        <div class="valor">${escaparHtml(
          d.periodo_apuracao || comp || '—'
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Tipo de Declaração</div>
        <div class="valor">${escaparHtml(
          d.tipo_declaracao || '—'
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Nº da Declaração</div>
        <div class="valor">${escaparHtml(
          d.num_declaracao || '—'
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Número do Recibo</div>
        <div class="valor">${escaparHtml(
          d.num_recibo || '—'
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Autenticação</div>
        <div class="valor">${escaparHtml(
          d.autenticacao || '—'
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Data de Transmissão</div>
        <div class="valor">${escaparHtml(
          d.data_transmissao || '—'
        )}</div>
      </div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      2. Discriminativo de Receitas
    </div>

    <div class="grid">
      <div class="campo">
        <div class="label">RPA</div>
        <div class="valor">${fmtR(resumo.rpa)}</div>
      </div>

      <div class="campo">
        <div class="label">RBT12</div>
        <div class="valor">${fmtR(resumo.rbt12)}</div>
      </div>

      <div class="campo">
        <div class="label">RBA</div>
        <div class="valor">${fmtR(resumo.rba)}</div>
      </div>

      <div class="campo">
        <div class="label">RBAA</div>
        <div class="valor">${fmtR(resumo.rbaa)}</div>
      </div>

      <div class="campo">
        <div class="label">Revenda de Mercadorias</div>
        <div class="valor">${fmtR(
          resumo.receita_revenda
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Industrialização</div>
        <div class="valor">${fmtR(
          resumo.receita_industrializacao
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Prestação de Serviços</div>
        <div class="valor">${fmtR(
          resumo.receita_servicos
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Receita Monofásica PIS/COFINS</div>
        <div class="valor">${fmtR(
          resumo.receita_monofasica
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Receita com ICMS-ST</div>
        <div class="valor">${fmtR(
          resumo.receita_st
        )}</div>
      </div>

      <div class="campo">
        <div class="label">Receita Imune</div>
        <div class="valor">${fmtR(
          resumo.receita_imune
        )}</div>
      </div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      3. Fator R e DAS
    </div>

    <div class="grid">
      <div class="campo">
        <div class="label">Fator R</div>
        <div class="valor">${escaparHtml(
          resumo.fator_r || '—'
        )}</div>
      </div>

      <div class="campo">
        <div class="label">DAS Total Declarado</div>
        <div class="valor">${fmtR(
          resumo.das_total
        )}</div>
      </div>
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      4. Total do Débito por Tributo
    </div>

    <div class="grid">
      ${[
        ['IRPJ', trib.irpj],
        ['CSLL', trib.csll],
        ['COFINS', trib.cofins],
        ['PIS/Pasep', trib.pis],
        ['INSS/CPP', trib.inss_cpp],
        ['ICMS', trib.icms],
        ['IPI', trib.ipi],
        ['ISS', trib.iss],
      ]
        .map(
          ([label, valor]) => `
            <div class="campo">
              <div class="label">${label}</div>
              <div class="valor">${fmtR(valor)}</div>
            </div>
          `
        )
        .join('')}
    </div>

    <div style="margin-top:8px">
      <strong>Soma dos tributos:</strong>
      ${fmtR(resumo.total_tributos)}
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      5. Débito com Exigibilidade Suspensa
    </div>

    <div class="grid">
      ${[
        ['IRPJ Susp.', susp.irpj],
        ['CSLL Susp.', susp.csll],
        ['COFINS Susp.', susp.cofins],
        ['PIS Susp.', susp.pis],
        ['INSS Susp.', susp.inss_cpp],
        ['ICMS Susp.', susp.icms],
        ['IPI Susp.', susp.ipi],
        ['ISS Susp.', susp.iss],
      ]
        .map(
          ([label, valor]) => `
            <div class="campo">
              <div class="label">${label}</div>
              <div class="valor">${fmtR(valor)}</div>
            </div>
          `
        )
        .join('')}
    </div>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      6. Atividades e Segregações (${atividades.length})
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Atividade</th>
          <th>Anexo</th>
          <th>Receita</th>
          <th>Tratamentos</th>
          <th>IRPJ</th>
          <th>CSLL</th>
          <th>PIS</th>
          <th>COFINS</th>
          <th>CPP</th>
          <th>ICMS</th>
          <th>IPI</th>
          <th>ISS</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${linhasAtividades}
      </tbody>

      <tfoot>
        <tr>
          <td colspan="3">
            <strong>Totais das atividades</strong>
          </td>

          <td class="num">
            <strong>${fmtR(
              resumo.total_receita_atividades
            )}</strong>
          </td>

          <td colspan="9"></td>

          <td class="num">
            <strong>${fmtR(
              resumo.total_tributos_atividades
            )}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="secao">
    <div class="secao-titulo">
      7. Observações
    </div>

    <div class="observacoes">${escaparHtml(
      s.observacoes ||
      d.observacoes ||
      ''
    )}</div>
  </div>

  <div class="rodape">
    <span>
      e-FiscalTribe® — Dossiê de Análise PGDAS-D
    </span>

    <span>
      Documento gerado a partir dos dados registrados na plataforma.
    </span>
  </div>

</body>
</html>`
}

export default function DiagnosticoIAGerenciado({
  contexto,
  dados,
  snapshotCompleto = null,
  cliente,
  regime,
  modelo = 'gemini-3.5-flash',
  modulo,
  referenciaId = null,
  competencia = '',
  onVoltar,
  onAbrirReferencia,
  onRestaurarSnapshot,
  onLimparTudo,
}) {
  const [parecerAtual, setParecerAtual] = useState('')
  const [diagnosticoAtual, setDiagnosticoAtual] = useState(null)
  const [diagnosticos, setDiagnosticos] = useState([])
  const [mostrarLista, setMostrarLista] = useState(false)
  const [carregandoLista, setCarregandoLista] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [chaveAnalisador, setChaveAnalisador] = useState(0)

  const parecerId =
    'parecer-ia-' +
    String(modulo || 'geral').replace(/[^a-z0-9_-]/gi, '-')

  useEffect(() => {
    setParecerAtual('')
    setDiagnosticoAtual(null)
    setDiagnosticos([])
    setMostrarLista(false)
    setChaveAnalisador(valor => valor + 1)
  }, [cliente?.id, modulo])

  async function carregarDiagnosticos() {
    if (!cliente?.id) return []

    setCarregandoLista(true)

    try {
      const { data, error } = await supabase
        .from('diagnosticos_ia')
        .select('*')
        .eq('cliente_id', String(cliente.id))
        .eq('modulo', modulo)
        .order('created_at', { ascending: false })

      if (error) throw error

      const lista = data || []

      setDiagnosticos(lista)

      return lista
    } catch (e) {
      alert('Erro ao carregar análises salvas: ' + e.message)
      return []
    } finally {
      setCarregandoLista(false)
    }
  }

  async function mostrarDiagnosticosSalvos() {
    setMostrarLista(true)
    await carregarDiagnosticos()
  }

  async function salvarDiagnostico() {
    if (!cliente?.id) {
      return alert('Selecione um cliente.')
    }

    if (!parecerAtual.trim()) {
      return alert('Primeiro execute a análise com IA.')
    }

    if (diagnosticoAtual?.id) {
      return
    }

    if (!snapshotCompleto) {
      return alert(
        'Não foi possível montar o dossiê completo desta análise.'
      )
    }

    setSalvando(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) {
        throw new Error('Usuário não autenticado.')
      }

      const competenciaFinal =
        snapshotCompleto?.competencia ||
        competencia ||
        ''

      const titulo =
        'Análise completa PGDAS-D' +
        (competenciaFinal
          ? ' — ' + competenciaFinal
          : '')

      const payload = {
        usuario_id: user.id,
        cliente_id: String(cliente.id),
        modulo,
        referencia_id:
          snapshotCompleto?.referencia_pgdas_id
            ? String(snapshotCompleto.referencia_pgdas_id)
            : referenciaId
              ? String(referenciaId)
              : null,
        competencia: competenciaFinal || null,
        cliente_nome: cliente?.razao_social || '',
        cliente_cnpj: cliente?.cnpj || '',
        regime: regime || '',
        titulo,
        parecer: parecerAtual,
        dados_json: snapshotCompleto,
        modelo,
      }

      const { data: salvo, error } = await supabase
        .from('diagnosticos_ia')
        .insert([payload])
        .select('*')
        .single()

      if (error) throw error

      setDiagnosticoAtual(salvo)

      await carregarDiagnosticos()

      alert('Análise completa salva com sucesso.')
    } catch (e) {
      alert('Erro ao salvar análise: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirDiagnostico(item) {
    if (!item?.id) return

    const confirmar = window.confirm(
      'Excluir esta análise salva?\n\nEsta ação exclui somente a análise/dossiê da IA. O PGDAS-D original não será apagado.'
    )

    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('diagnosticos_ia')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      if (diagnosticoAtual?.id === item.id) {
        setDiagnosticoAtual(null)
        setParecerAtual('')
        setChaveAnalisador(valor => valor + 1)
      }

      await carregarDiagnosticos()

      alert('Análise excluída com sucesso.')
    } catch (e) {
      alert('Erro ao excluir análise: ' + e.message)
    }
  }
  async function abrirDiagnostico(item) {
    try {
      const snapshotSalvo = item?.dados_json || null

      if (
        snapshotSalvo?.declaracao &&
        onRestaurarSnapshot
      ) {
        await onRestaurarSnapshot(snapshotSalvo)
      } else if (
        item?.referencia_id &&
        onAbrirReferencia
      ) {
        await onAbrirReferencia(item.referencia_id)
      }

      setParecerAtual(item?.parecer || '')
      setDiagnosticoAtual(item)
      setMostrarLista(false)
      setChaveAnalisador(valor => valor + 1)
    } catch (e) {
      alert('Erro ao abrir análise: ' + e.message)
    }
  }

  function limparDiagnostico() {
    const temDados =
      !!parecerAtual ||
      !!diagnosticoAtual ||
      !!snapshotCompleto?.competencia

    if (
      temDados &&
      !window.confirm(
        'Limpar a análise e os dados exibidos nesta tela?'
      )
    ) {
      return
    }

    setParecerAtual('')
    setDiagnosticoAtual(null)
    setMostrarLista(false)
    setChaveAnalisador(valor => valor + 1)

    onLimparTudo?.()
  }

  function snapshotParaDocumento() {
    return (
      diagnosticoAtual?.dados_json ||
      snapshotCompleto ||
      null
    )
  }

  function gerarHtmlDossie() {
    const snapshot = snapshotParaDocumento()

    if (!snapshot) {
      alert('Não há dados completos para gerar o dossiê.')
      return null
    }

    return montarDossieHtml({
      snapshot,
      parecer: parecerAtual,
      cliente,
      competencia:
        diagnosticoAtual?.competencia ||
        competencia ||
        '',
      criadoEm:
        diagnosticoAtual?.created_at
          ? fmtDataHora(diagnosticoAtual.created_at)
          : new Date().toLocaleString('pt-BR'),
    })
  }

  function imprimirDiagnostico() {
    const html = gerarHtmlDossie()

    if (!html) return

    const janela = window.open(
      '',
      '_blank',
      'width=1200,height=850'
    )

    if (!janela) {
      return alert(
        'Não foi possível abrir a janela de impressão.'
      )
    }

    janela.document.open()
    janela.document.write(html)
    janela.document.close()

    janela.focus()

    setTimeout(() => {
      janela.print()
    }, 500)
  }

  function exportarDiagnostico() {
    const snapshot =
      diagnosticoAtual?.dados_json ||
      snapshotCompleto ||
      null

    if (!snapshot) {
      return alert(
        'Não há dados completos para exportar.'
      )
    }

    const declaracao = snapshot.declaracao || {}
    const resumo = snapshot.resumo || {}
    const trib = snapshot.tributos || {}
    const susp = snapshot.tributos_suspensos || {}
    const conferencia = snapshot.conferencia || {}

    const atividades =
      Array.isArray(snapshot.atividades)
        ? snapshot.atividades
        : []

    const comp =
      diagnosticoAtual?.competencia ||
      snapshot.competencia ||
      competencia ||
      'sem-competencia'

    const nomeCliente =
      snapshot?.cliente?.razao_social ||
      cliente?.razao_social ||
      'Cliente'

    const cnpj =
      snapshot?.cliente?.cnpj ||
      cliente?.cnpj ||
      ''

    const nomeArquivo =
      'e-FiscalTribe_PGDAS_' +
      String(comp)
        .replace(/[^\dA-Za-z_-]/g, '-') +
      '.pdf'

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const largura =
        doc.internal.pageSize.getWidth()

      const altura =
        doc.internal.pageSize.getHeight()

      const margemX = 12
      const margemInferior = 15
      const larguraUtil =
        largura - margemX * 2

      let y = 14

      doc.setCharSpace(0)

      const moeda = valor =>
        'R$ ' +
        Number(valor || 0).toLocaleString(
          'pt-BR',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }
        )

      const novaPagina = () => {
        doc.addPage()
        doc.setCharSpace(0)
        y = 15
      }

      const garantirEspaco = espaco => {
        if (
          y + espaco >
          altura - margemInferior
        ) {
          novaPagina()
        }
      }

      const normalizarTextoPdf = valor =>
        String(valor ?? '')
          .normalize('NFC')
          .replace(/\u00A0|\u202F/g, ' ')
          .replace(
            /[\u200B-\u200D\uFEFF]/g,
            ''
          )
          .replace(
            /[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g,
            ' '
          )
          .replace(
            /[‐-‒–—―−]/g,
            '-'
          )
          .replace(
            /R\$\s*\/(?=\d)/g,
            'R$ '
          )
          .replace(
            /(^|[\s(])\/(?=\d)/g,
            '$1'
          )
          .replace(
            /\s+\/mi\b/gi,
            ' mi'
          )
          .replace(
            /\bPGDAS\s+D\b/gi,
            'PGDAS-D'
          )
          .replace(
            /\bICMS\s+ST\b/gi,
            'ICMS-ST'
          )
          .replace(
            /PIS\/COFINS\s*-\s*monofásico/gi,
            'PIS/COFINS monofásico'
          )
          .replace(/\s{2,}/g, ' ')
          .trim()

      const tituloSecao = titulo => {
        garantirEspaco(10)

        doc.setFont(
          'helvetica',
          'bold'
        )

        doc.setFontSize(10.5)

        doc.setTextColor(
          11,
          31,
          77
        )

        doc.text(
          titulo,
          margemX,
          y
        )

        y += 2.3

        doc.setDrawColor(
          11,
          31,
          77
        )

        doc.setLineWidth(0.4)

        doc.line(
          margemX,
          y,
          largura - margemX,
          y
        )

        y += 5
      }

      const escreverTextoQuebrado = ({
        texto,
        x = margemX,
        larguraTexto = larguraUtil,
        tamanho = 9.2,
        negrito = false,
        espacoDepois = 1.5,
        alturaLinha = 4,
      }) => {
        const conteudo =
          normalizarTextoPdf(texto)

        if (!conteudo) return

        doc.setFont(
          'helvetica',
          negrito
            ? 'bold'
            : 'normal'
        )

        doc.setFontSize(tamanho)

        doc.setTextColor(
          15,
          23,
          42
        )

        doc.setCharSpace(0)

        const linhas =
          doc.splitTextToSize(
            conteudo,
            larguraTexto
          )

        for (const linha of linhas) {
          garantirEspaco(
            alturaLinha + 0.3
          )

          doc.text(
            linha,
            x,
            y
          )

          y += alturaLinha
        }

        y += espacoDepois
      }

      // =====================================================
      // PAGINA 1 — CABECALHO
      // =====================================================

      doc.setFillColor(
        11,
        31,
        77
      )

      doc.rect(
        0,
        0,
        largura,
        7,
        'F'
      )

      y = 15

      doc.setFont(
        'helvetica',
        'bold'
      )

      doc.setFontSize(17)

      doc.setTextColor(
        11,
        31,
        77
      )

      doc.text(
        'e-FiscalTribe',
        margemX,
        y
      )

      y += 6

      doc.setFontSize(12.5)

      doc.text(
        'Dossiê Completo de Análise PGDAS-D',
        margemX,
        y
      )

      y += 6

      doc.setFont(
        'helvetica',
        'normal'
      )

      doc.setFontSize(8.5)

      doc.setTextColor(
        71,
        85,
        105
      )

      doc.text(
        `Cliente: ${normalizarTextoPdf(
          nomeCliente
        )}`,
        margemX,
        y
      )

      y += 4.5

      doc.setFontSize(8.5)

      doc.text(
        `CNPJ: ${cnpj || '—'}`,
        margemX,
        y
      )

      doc.text(
        `Competência: ${comp}`,
        82,
        y
      )

      doc.text(
        `Regime: ${
          snapshot.regime ||
          regime ||
          '—'
        }`,
        132,
        y
      )

      y += 8

      // =====================================================
      // ANALISE IA
      // =====================================================

      tituloSecao(
        'INTELIGÊNCIA TRIBUTÁRIA - ANÁLISE COM IA'
      )

      const linhasParecer = String(
        parecerAtual ||
          'Sem parecer registrado.'
      )
        .replace(/\r/g, '')
        .split('\n')

      for (
        let i = 0;
        i < linhasParecer.length;
        i++
      ) {
        let linha =
          normalizarTextoPdf(
            linhasParecer[i]
          )

        if (!linha) {
          y += 1.5
          continue
        }

        /*
         * Remove primeiro o Markdown de negrito.
         * Isso resolve casos como:
         * **## DIAGNÓSTICO**
         */
        linha = linha
          .replace(/\*\*/g, '')
          .trim()

        /*
         * Linhas de separacao de tabela Markdown
         * nao devem entrar no PDF.
         */
        if (
          /^\|?[\s:|-]+\|[\s:|-]+/.test(
            linha
          )
        ) {
          continue
        }

        const ehTitulo =
          /^#{1,6}\s+/.test(
            linha
          )

        if (ehTitulo) {
          linha = linha
            .replace(
              /^#{1,6}\s+/,
              ''
            )
            .trim()

          escreverTextoQuebrado({
            texto: linha,
            tamanho: 10,
            negrito: true,
            espacoDepois: 3.8,
            alturaLinha: 5.2,
          })

          continue
        }

        /*
         * Caso a IA mande tabela Markdown,
         * transforma a linha em texto simples,
         * evitando barras verticais soltas.
         */
        if (
          linha.startsWith('|') &&
          linha.endsWith('|')
        ) {
          linha = linha
            .replace(
              /^\||\|$/g,
              ''
            )
            .split('|')
            .map(item =>
              item.trim()
            )
            .filter(Boolean)
            .join('   |   ')
        }

        escreverTextoQuebrado({
          texto: linha,
          tamanho: 9.2,
          negrito: false,
          espacoDepois: 2.2,
          alturaLinha: 5.2,
        })
      }

      y += 2

      // =====================================================
      // RESUMO DA DECLARACAO
      // =====================================================

      novaPagina()

      tituloSecao(
        'RESUMO DA DECLARAÇÃO'
      )

      autoTable(doc, {
        startY: y,

        margin: {
          left: margemX,
          right: margemX,
        },

        tableWidth: larguraUtil,

        theme: 'grid',

        head: [[
          'RPA',
          'RBT12',
          'DAS',
          'Atividades',
          'PIS + COFINS',
          'ICMS-ST / Mono',
        ]],

        body: [[
          moeda(resumo.rpa),
          moeda(resumo.rbt12),
          moeda(resumo.das_total),
          String(
            atividades.length
          ),
          moeda(
            Number(
              trib.pis || 0
            ) +
              Number(
                trib.cofins || 0
              )
          ),
          String(
            Number(
              resumo.atividades_icms_st ||
                0
            )
          ) +
            ' / ' +
            String(
              Number(
                resumo.atividades_monofasicas ||
                  0
              )
            ),
        ]],

        styles: {
          font: 'helvetica',
          fontSize: 8.8,
          cellPadding: 2.1,
          halign: 'center',
          valign: 'middle',
        },

        headStyles: {
          fillColor: [
            75,
            85,
            99,
          ],
          textColor: [
            255,
            255,
            255,
          ],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
      })

      y =
        doc.lastAutoTable.finalY +
        5

      tituloSecao(
        'CONFERÊNCIA DAS ATIVIDADES'
      )

      const textoConferencia =
        `RPA: ${moeda(
          conferencia.rpa
        )} | ` +
        `Soma das atividades: ${moeda(
          conferencia.soma_atividades
        )} | ` +
        `Diferença: ${moeda(
          conferencia.diferenca
        )} | ` +
        `Status: ${
          conferencia.conferido
            ? 'Conferido'
            : 'Requer revisão'
        }`

      escreverTextoQuebrado({
        texto: textoConferencia,
        tamanho: 9,
        espacoDepois: 0,
      })


      // =====================================================
      // 1. IDENTIFICACAO
      // =====================================================

      tituloSecao(
        '1. IDENTIFICAÇÃO DA DECLARAÇÃO'
      )

      garantirEspaco(31)

      const larguraId =
        larguraUtil / 3

      const desenharCampoId = (
        x,
        yCampo,
        label,
        valor
      ) => {
        doc.setFont(
          'helvetica',
          'bold'
        )

        doc.setFontSize(8.2)

        doc.setTextColor(
          71,
          85,
          105
        )

        doc.text(
          label,
          x,
          yCampo
        )

        doc.setFont(
          'helvetica',
          'normal'
        )

        doc.setFontSize(9.1)

        doc.setTextColor(
          15,
          23,
          42
        )

        doc.setCharSpace(0)

        doc.text(
          normalizarTextoPdf(
            valor || '—'
          ),
          x,
          yCampo + 4.3
        )
      }

      desenharCampoId(
        margemX,
        y,
        'Período de Apuração',
        declaracao.periodo_apuracao ||
          comp
      )

      desenharCampoId(
        margemX + larguraId,
        y,
        'Tipo de Declaração',
        declaracao.tipo_declaracao
      )

      desenharCampoId(
        margemX + larguraId * 2,
        y,
        'Nº da Declaração',
        declaracao.num_declaracao
      )

      y += 12

      desenharCampoId(
        margemX,
        y,
        'Número do Recibo',
        declaracao.num_recibo
      )

      desenharCampoId(
        margemX + larguraId,
        y,
        'Autenticação',
        declaracao.autenticacao
      )

      desenharCampoId(
        margemX + larguraId * 2,
        y,
        'Data de Transmissão',
        declaracao.data_transmissao
      )

      y += 12
      // =====================================================
      // 2. RECEITAS
      // =====================================================

      tituloSecao(
        '2. DISCRIMINATIVO DE RECEITAS'
      )

      autoTable(doc, {
        startY: y,

        margin: {
          left: margemX,
          right: margemX,
        },

        tableWidth: larguraUtil,

        theme: 'grid',

        body: [
          [
            'RPA',
            moeda(resumo.rpa),
            'RBT12',
            moeda(resumo.rbt12),
          ],

          [
            'RBA',
            moeda(resumo.rba),
            'RBAA',
            moeda(resumo.rbaa),
          ],

          [
            'Revenda',
            moeda(
              resumo.receita_revenda
            ),
            'Industrialização',
            moeda(
              resumo.receita_industrializacao
            ),
          ],

          [
            'Serviços',
            moeda(
              resumo.receita_servicos
            ),
            'Monofásica PIS/COFINS',
            moeda(
              resumo.receita_monofasica
            ),
          ],

          [
            'Receita ICMS-ST',
            moeda(
              resumo.receita_st
            ),
            'Receita Imune',
            moeda(
              resumo.receita_imune
            ),
          ],
        ],

        styles: {
          font: 'helvetica',
          fontSize: 8.8,
          cellPadding: 1.9,
          valign: 'middle',
        },

        columnStyles: {
          0: {
            fontStyle: 'bold',
            fillColor: [
              248,
              250,
              252,
            ],
          },

          2: {
            fontStyle: 'bold',
            fillColor: [
              248,
              250,
              252,
            ],
          },
        },
      })

      y =
        doc.lastAutoTable.finalY +
        4

      // =====================================================
      // 3. FATOR R E DAS
      // =====================================================

      garantirEspaco(28)

      y += 3

      tituloSecao(
        '3. FATOR R E DAS'
      )

      autoTable(doc, {
        startY: y,

        margin: {
          left: margemX,
          right: margemX,
        },

        tableWidth: larguraUtil,

        theme: 'grid',

        body: [[
          'Fator R',
          resumo.fator_r || '—',
          'DAS Total Declarado',
          moeda(resumo.das_total),
        ]],

        styles: {
          font: 'helvetica',
          fontSize: 9.2,
          cellPadding: 2.4,
          valign: 'middle',
        },

        columnStyles: {
          0: {
            cellWidth: 27,
            fontStyle: 'bold',
            fillColor: [
              248,
              250,
              252,
            ],
            textColor: [
              71,
              85,
              105,
            ],
          },

          1: {
            cellWidth: 35,
          },

          2: {
            cellWidth: 47,
            fontStyle: 'bold',
            fillColor: [
              248,
              250,
              252,
            ],
            textColor: [
              71,
              85,
              105,
            ],
          },

          3: {
            cellWidth: 77,
            fontStyle: 'bold',
          },
        },

        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
      })

      y =
        doc.lastAutoTable.finalY +
        7
      // =====================================================
      // 4. TRIBUTOS
      // =====================================================

      tituloSecao(
        '4. TOTAL DO DÉBITO POR TRIBUTO'
      )

      autoTable(doc, {
        startY: y,

        margin: {
          left: margemX,
          right: margemX,
        },

        tableWidth: larguraUtil,

        theme: 'grid',

        head: [[
          'IRPJ',
          'CSLL',
          'COFINS',
          'PIS',
          'INSS/CPP',
          'ICMS',
          'IPI',
          'ISS',
          'TOTAL',
        ]],

        body: [[
          moeda(trib.irpj),
          moeda(trib.csll),
          moeda(trib.cofins),
          moeda(trib.pis),
          moeda(trib.inss_cpp),
          moeda(trib.icms),
          moeda(trib.ipi),
          moeda(trib.iss),
          moeda(
            resumo.total_tributos
          ),
        ]],

        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 1.5,
          halign: 'center',
          valign: 'middle',
        },

        headStyles: {
          fillColor: [
            75,
            85,
            99,
          ],
          textColor: [
            255,
            255,
            255,
          ],
          fontStyle: 'bold',
          fontSize: 8.3,
        },
      })

      y =
        doc.lastAutoTable.finalY +
        4

      // =====================================================
      // 5. SUSPENSOS
      // =====================================================

      tituloSecao(
        '5. DÉBITO COM EXIGIBILIDADE SUSPENSA'
      )

      autoTable(doc, {
        startY: y,

        margin: {
          left: margemX,
          right: margemX,
        },

        tableWidth: larguraUtil,

        theme: 'grid',

        head: [[
          'IRPJ',
          'CSLL',
          'COFINS',
          'PIS',
          'INSS/CPP',
          'ICMS',
          'IPI',
          'ISS',
        ]],

        body: [[
          moeda(susp.irpj),
          moeda(susp.csll),
          moeda(susp.cofins),
          moeda(susp.pis),
          moeda(susp.inss_cpp),
          moeda(susp.icms),
          moeda(susp.ipi),
          moeda(susp.iss),
        ]],

        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: 1.5,
          halign: 'center',
          valign: 'middle',
        },

        headStyles: {
          fillColor: [
            75,
            85,
            99,
          ],
          textColor: [
            255,
            255,
            255,
          ],
          fontStyle: 'bold',
          fontSize: 8.3,
        },
      })

      y =
        doc.lastAutoTable.finalY +
        4

      // =====================================================
      // 6. ATIVIDADES
      // =====================================================

      tituloSecao(
        `6. ATIVIDADES E SEGREGAÇÕES (${atividades.length})`
      )

      if (
        atividades.length === 0
      ) {
        escreverTextoQuebrado({
          texto:
            'Nenhuma atividade registrada.',
          tamanho: 9,
        })
      }

      for (
        let index = 0;
        index < atividades.length;
        index++
      ) {
        const a =
          atividades[index]

        const tratamentos = []

        if (a.icms_st) {
          tratamentos.push(
            'ICMS-ST'
          )
        }

        if (
          a.pis_cofins_monofasico
        ) {
          tratamentos.push(
            'PIS/COFINS Monofásico'
          )
        }

        if (
          a.antecipacao_com_encerramento
        ) {
          tratamentos.push(
            'Antecipação com encerramento'
          )
        }

        if (a.iss_retido) {
          tratamentos.push(
            'ISS Retido'
          )
        }

        if (a.imunidade) {
          tratamentos.push(
            'Imune'
          )
        }

        if (a.exportacao) {
          tratamentos.push(
            'Exportação'
          )
        }

        const tratamentoTexto =
          tratamentos.length
            ? tratamentos.join(', ')
            : 'Normal'

        const descricaoBase =
          normalizarTextoPdf(
            a.descricao ||
              a.tipo_atividade ||
              'Atividade'
          )

        const descricaoExtra =
          a.texto_original &&
          a.texto_original !==
            a.descricao
            ? normalizarTextoPdf(
                a.texto_original
              )
            : ''

        const descricaoCompleta =
          descricaoExtra
            ? descricaoBase +
              ' - ' +
              descricaoExtra
            : descricaoBase

        /*
         * Estimativa REALISTA do bloco.
         * Sem reserva fixa de 46 mm.
         */
        doc.setFont(
          'helvetica',
          'normal'
        )

        doc.setFontSize(9)

        const linhasDescricao =
          doc.splitTextToSize(
            descricaoCompleta,
            72
          ).length

        const linhasTratamento =
          doc.splitTextToSize(
            tratamentoTexto,
            80
          ).length

        const alturaEstimada =
          27 +
          Math.max(
            0,
            linhasDescricao - 1
          ) *
            3.5 +
          Math.max(
            0,
            linhasTratamento - 1
          ) *
            3.5

        garantirEspaco(
          alturaEstimada
        )

        // -----------------------------------------------
        // IDENTIFICACAO DA ATIVIDADE
        // -----------------------------------------------

        autoTable(doc, {
          startY: y,

          margin: {
            left: margemX,
            right: margemX,
          },

          tableWidth: larguraUtil,

          theme: 'grid',

          body: [
            [
              {
                content:
                  `Atividade ${
                    a.ordem ||
                    index + 1
                  }`,

                colSpan: 6,

                styles: {
                  fillColor: [
                    75,
                    85,
                    99,
                  ],

                  textColor: [
                    255,
                    255,
                    255,
                  ],

                  fontStyle:
                    'bold',

                  fontSize: 9.5,

                  cellPadding: 1.8,
                },
              },
            ],

            [
              'Descrição',

              {
                content:
                  descricaoCompleta,
                colSpan: 1,
              },

              'Anexo',

              a.anexo || '—',

              'Receita',

              moeda(a.receita),
            ],

            [
              'Tratamentos',

              {
                content:
                  tratamentoTexto,
                colSpan: 5,
              },
            ],
          ],

          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 1.6,
            valign: 'middle',
            overflow: 'linebreak',
          },

          columnStyles: {
            0: {
              cellWidth: 22,
              fontStyle: 'bold',
              fillColor: [
                248,
                250,
                252,
              ],
            },

            1: {
              cellWidth: 72,
            },

            2: {
              cellWidth: 15,
              fontStyle: 'bold',
              fillColor: [
                248,
                250,
                252,
              ],
            },

            3: {
              cellWidth: 12,
            },

            4: {
              cellWidth: 20,
              fontStyle: 'bold',
              fillColor: [
                248,
                250,
                252,
              ],
            },

            5: {
              cellWidth: 45,
            },
          },

          pageBreak: 'avoid',
          rowPageBreak: 'avoid',
        })

        y =
          doc.lastAutoTable.finalY +
          1.8

        // -----------------------------------------------
        // TRIBUTOS DA ATIVIDADE
        // -----------------------------------------------

        autoTable(doc, {
          startY: y,

          margin: {
            left: margemX,
            right: margemX,
          },

          tableWidth: larguraUtil,

          theme: 'grid',

          head: [[
            'IRPJ',
            'CSLL',
            'PIS',
            'COFINS',
            'CPP',
            'ICMS',
            'IPI',
            'ISS',
            'TOTAL',
          ]],

          body: [[
            moeda(a.irpj),
            moeda(a.csll),
            moeda(a.pis),
            moeda(a.cofins),
            moeda(a.inss_cpp),
            moeda(a.icms),
            moeda(a.ipi),
            moeda(a.iss),
            moeda(
              a.valor_total_tributos
            ),
          ]],

          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 1.15,
            halign: 'center',
            valign: 'middle',
            overflow: 'linebreak',
          },

          headStyles: {
            fillColor: [
              71,
              85,
              105,
            ],

            textColor: [
              255,
              255,
              255,
            ],

            fontStyle: 'bold',
            fontSize: 8.8,
          },

          columnStyles: {
            8: {
              fontStyle: 'bold',
            },
          },

          pageBreak: 'avoid',
          rowPageBreak: 'avoid',
        })

        y =
          doc.lastAutoTable.finalY +
          3
      }

      // =====================================================
      // TOTAL DAS ATIVIDADES
      // =====================================================

      if (atividades.length > 0) {
        garantirEspaco(18)

        autoTable(doc, {
          startY: y,

          margin: {
            left: margemX,
            right: margemX,
          },

          tableWidth: larguraUtil,

          theme: 'grid',

          head: [[
            'TOTAL DA RECEITA DAS ATIVIDADES',
            'TOTAL DOS TRIBUTOS DAS ATIVIDADES',
          ]],

          body: [[
            moeda(
              resumo.total_receita_atividades
            ),

            moeda(
              resumo.total_tributos_atividades
            ),
          ]],

          styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 1.8,
            halign: 'center',
          },

          headStyles: {
            fillColor: [
              11,
              31,
              77,
            ],

            textColor: [
              255,
              255,
              255,
            ],

            fontStyle: 'bold',
            fontSize: 8.5,
          },

          bodyStyles: {
            fontStyle: 'bold',
            textColor: [
              11,
              31,
              77,
            ],
          },

          pageBreak: 'avoid',
        })

        y =
          doc.lastAutoTable.finalY +
          5
      }

      // =====================================================
      // 7. OBSERVACOES
      // =====================================================

      tituloSecao(
        '7. OBSERVAÇÕES'
      )

      escreverTextoQuebrado({
        texto:
          snapshot.observacoes ||
          declaracao.observacoes ||
          'Sem observações.',
        tamanho: 9.2,
        espacoDepois: 0,
      })

      // =====================================================
      // RODAPE E PAGINACAO
      // =====================================================

      const totalPaginas =
        doc.getNumberOfPages()

      for (
        let pagina = 1;
        pagina <= totalPaginas;
        pagina++
      ) {
        doc.setPage(pagina)

        doc.setDrawColor(
          226,
          232,
          240
        )

        doc.setLineWidth(0.25)

        doc.line(
          margemX,
          altura - 10,
          largura - margemX,
          altura - 10
        )

        doc.setFont(
          'helvetica',
          'normal'
        )

        doc.setFontSize(7.5)

        doc.setTextColor(
          100,
          116,
          139
        )

        doc.setCharSpace(0)

        doc.text(
          'e-FiscalTribe® — Dossiê PGDAS-D',
          margemX,
          altura - 6
        )

        doc.text(
          `Página ${pagina} de ${totalPaginas}`,
          largura - margemX,
          altura - 6,
          {
            align: 'right',
          }
        )
      }

      doc.save(nomeArquivo)

    } catch (e) {
      console.error(
        'Erro ao gerar PDF:',
        e
      )

      alert(
        'Não foi possível gerar o PDF: ' +
        e.message
      )
    }
  }

  function receberParecer(texto, info) {
    const textoRecebido =
      String(texto || '').trim()

    if (
      info?.origem === 'inicio' &&
      !textoRecebido
    ) {
      setParecerAtual('')
      setDiagnosticoAtual(null)
      return
    }

    if (!textoRecebido) {
      return
    }

    /*
     * Modulos diferentes do PGDAS-D continuam
     * funcionando exatamente como antes.
     */
    if (modulo !== 'pgdas_d') {
      setParecerAtual(textoRecebido)
      setDiagnosticoAtual(null)
      return
    }

    // =====================================================
    // 1. DIAGNOSTICO DOCUMENTAL PRODUZIDO PELA IA
    //
    // Qualquer secao posterior criada pela IA e descartada.
    // =====================================================

    let diagnostico =
      textoRecebido
        .replace(
          /^\s*#{1,6}\s*DIAGN[ÓO]STICO(?:\s+DOCUMENTAL)?\s*/i,
          ''
        )
        .trim()

    const inicioSecaoNaoPermitida =
      diagnostico.search(
        /\n\s*(?:#{1,6}\s*)?(?:OPORTUNIDADES|PONTOS\s+PARA\s+VALIDA[CÇ][AÃ]O|PR[ÓO]XIMOS\s+PASSOS)\b/i
      )

    if (inicioSecaoNaoPermitida >= 0) {
      diagnostico =
        diagnostico
          .slice(
            0,
            inicioSecaoNaoPermitida
          )
          .trim()
    }

    // =====================================================
    // HIGIENIZACAO VISUAL DO DIAGNOSTICO
    //
    // Somente apresentacao.
    // Nao altera regras, calculos ou validacoes.
    // =====================================================

    diagnostico = diagnostico
      // Subtitulos internos da IA
      .replace(
        /^#{1,6}\s+(.+)$/gm,
        '**$1**'
      )

      // Campo interno: total de tributos por atividade
      .replace(
        /["']?valor_total_tributos["']?\s*=\s*0\b/gi,
        'total de tributos por atividade não informado'
      )
      .replace(
        /["']?valor_total_tributos["']?/gi,
        'total de tributos por atividade'
      )

      // Campo interno: ICMS-ST
      .replace(
        /["']?icms_st["']?\s*=\s*false\b/gi,
        'sem indicação de ICMS-ST'
      )
      .replace(
        /["']?icms_st["']?\s*=\s*true\b/gi,
        'com indicação de ICMS-ST'
      )
      .replace(
        /["']?icms_st["']?/gi,
        'ICMS-ST'
      )

      // Campo interno: monofasico PIS/COFINS
      .replace(
        /["']?pis_cofins_monofasico["']?\s*=\s*false\b/gi,
        'sem indicação de regime monofásico de PIS/COFINS'
      )
      .replace(
        /["']?pis_cofins_monofasico["']?\s*=\s*true\b/gi,
        'com indicação de regime monofásico de PIS/COFINS'
      )
      .replace(
        /["']?pis_cofins_monofasico["']?/gi,
        'regime monofásico de PIS/COFINS'
      )

      // Remove separador Markdown solto: ---
      .replace(
        /^\s*---+\s*$/gm,
        ''
      )

      // Remove apenas italico Markdown de linha inteira:
      // *texto* -> texto
      // Nao interfere em bullets.
      .replace(
        /^\s*\*(?!\*)(.+?)\*\s*$/gm,
        '$1'
      )

      // Evita excesso de linhas vazias apos a limpeza
      .replace(
        /\n{3,}/g,
        '\n\n'
      )

    if (!diagnostico) {
      diagnostico =
        'Os dados do PGDAS-D foram carregados para conferência documental.'
    }

    // =====================================================
    // 2. DADOS OBJETIVOS DO PGDAS-D
    // =====================================================

    const numero = valor => {
      const n = Number(valor || 0)
      return Number.isFinite(n)
        ? n
        : 0
    }

    const atividadesDocumento =
      Array.isArray(dados?.atividades)
        ? dados.atividades
        : []

    const rpa =
      numero(
        dados?.receitaBrutaPeriodo
      )

    const somaReceitasAtividades =
      atividadesDocumento.reduce(
        (total, atividade) =>
          total +
          numero(
            atividade?.receita
          ),
        0
      )

    const divergenciaReceitas =
      somaReceitasAtividades - rpa

    const tributos =
      dados?.tributos || {}

    const cpp =
      numero(
        tributos.inss_cpp ??
        tributos.inss ??
        0
      )

    const somaTributos =
      numero(tributos.irpj) +
      numero(tributos.csll) +
      numero(tributos.cofins) +
      numero(tributos.pis) +
      cpp +
      numero(tributos.icms) +
      numero(tributos.ipi) +
      numero(tributos.iss)

    const dasDeclarado =
      numero(
        dados?.dasDeclarado
      )

    const divergenciaDas =
      somaTributos -
      dasDeclarado

    const temMonofasico =
      numero(
        dados?.receitaMonofasica
      ) > 0 ||
      atividadesDocumento.some(
        atividade =>
          !!atividade
            ?.pis_cofins_monofasico
      )

    const temICMSST =
      numero(
        dados?.receitaST
      ) > 0 ||
      atividadesDocumento.some(
        atividade =>
          !!atividade?.icms_st
      )

    const atividadeSemTributos =
      somaTributos > 0 &&
      atividadesDocumento.some(
        atividade =>
          numero(
            atividade
              ?.valor_total_tributos
          ) === 0
      )

    // =====================================================
    // 3. PONTOS PARA VALIDACAO
    //    GERADOS PELO FISCALTRIBE
    // =====================================================

    const pontos = []

    if (
      rpa > 0 &&
      somaReceitasAtividades > 0 &&
      Math.abs(
        divergenciaReceitas
      ) >= 0.01
    ) {
      pontos.push(
        'Receitas das atividades — a soma das receitas das atividades diverge do RPA declarado em ' +
        fmtR(
          Math.abs(
            divergenciaReceitas
          )
        ) +
        '. Verificar a origem da diferença.'
      )
    }

    if (
      Math.abs(
        divergenciaDas
      ) >= 0.01
    ) {
      pontos.push(
        'Composição do DAS — a soma dos tributos informados é ' +
        fmtR(somaTributos) +
        ' e o DAS declarado é ' +
        fmtR(dasDeclarado) +
        ', resultando em diferença documental de ' +
        fmtR(
          Math.abs(
            divergenciaDas
          )
        ) +
        '. A causa deve ser conferida na Apuração do Simples.'
      )
    }

    if (temMonofasico) {
      pontos.push(
        'Regime monofásico de PIS/COFINS — existe segregação declarada no PGDAS-D. Validar com os XMLs, documentos fiscais e classificação dos itens na competência correspondente.'
      )
    }

    if (temICMSST) {
      pontos.push(
        'ICMS-ST — existe segregação declarada no PGDAS-D. Validar com os documentos fiscais correspondentes. Esta etapa não conclui crédito ou recuperação de ICMS.'
      )
    }

    if (atividadeSemTributos) {
      pontos.push(
        'Tributos por atividade — existem valores tributários no total geral, mas pelo menos uma atividade não possui total tributário distribuído. Verificar a origem da informação na Apuração do Simples. Não realizar rateio artificial.'
      )
    }

    if (pontos.length === 0) {
      pontos.push(
        'Não foram identificados pelos testes documentais automáticos desta tela pontos adicionais que permitam conclusão tributária nesta etapa.'
      )
    }

    const secaoPontos = [
      '## PONTOS PARA VALIDAÇÃO NA APURAÇÃO',
      '',
      ...pontos.map(
        (ponto, indice) =>
          `${indice + 1}. ${ponto}`
      ),
    ].join('\n')

    // =====================================================
    // 4. PROXIMOS PASSOS
    //    FLUXO FIXO DO FISCALTRIBE
    // =====================================================

    const proximosPassos = [
      '## PRÓXIMOS PASSOS',
      '',
      '1. Conferir a integridade documental do PGDAS-D e os dados declarados na competência.',
      '2. Conciliar o RPA e as receitas do período com os XMLs e demais documentos fiscais.',
      '3. Validar o RBT12 com os dados correspondentes aos 12 meses aplicáveis.',
      '4. Validar a classificação fiscal dos itens e as segregações declaradas na competência correspondente.',
      '5. Encaminhar as inconsistências e os pontos identificados para a Apuração do Simples.',
    ].join('\n')

    const textoFinal = [
      '## DIAGNÓSTICO DOCUMENTAL',
      '',
      diagnostico,
      '',
      secaoPontos,
      '',
      proximosPassos,
    ]
      .join('\n')
      .trim()

    setParecerAtual(textoFinal)
    setDiagnosticoAtual(null)

    /*
     * O AnalisadorIA possui estado interno.
     * Remontamos uma unica vez para exibir
     * exatamente o parecer consolidado acima.
     */
    if (
      textoFinal !==
      textoRecebido
    ) {
      setChaveAnalisador(
        valor => valor + 1
      )
    }
  }

  const existeParecer = !!parecerAtual.trim()
  const estaSalvo = !!diagnosticoAtual?.id
  const existeDossie =
    !!snapshotCompleto ||
    !!diagnosticoAtual?.dados_json

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}
      >
        <button
          onClick={salvarDiagnostico}
          disabled={
            !existeParecer ||
            !existeDossie ||
            estaSalvo ||
            salvando
          }
          style={{
            height: 34,
            padding: '0 16px',
            border: 'none',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            color: C.white,
            background:
              existeParecer &&
              existeDossie &&
              !estaSalvo
                ? C.navy
                : '#CBD5E1',
            cursor:
              existeParecer &&
              existeDossie &&
              !estaSalvo &&
              !salvando
                ? 'pointer'
                : 'not-allowed',
          }}
        >
          {estaSalvo
            ? '✓ Análise salva'
            : salvando
              ? 'Salvando...'
              : 'Salvar análise'}
        </button>

        <button
          onClick={mostrarDiagnosticosSalvos}
          style={{
            height: 34,
            padding: '0 16px',
            border: 'none',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            color: C.white,
            background: C.blue,
            cursor: 'pointer',
          }}
        >
          {carregandoLista
            ? 'Carregando...'
            : 'Abrir análise'}
        </button>

        <button
          onClick={imprimirDiagnostico}
          disabled={!existeDossie}
          style={{
            height: 34,
            padding: '0 16px',
            border: 'none',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            color: C.white,
            background: existeDossie
              ? C.green
              : '#CBD5E1',
            cursor: existeDossie
              ? 'pointer'
              : 'not-allowed',
          }}
        >
          🖨 Imprimir
        </button>

        <button
          onClick={exportarDiagnostico}
          disabled={!existeDossie}
          style={{
            height: 34,
            padding: '0 16px',
            background: existeDossie
              ? '#475569'
              : '#CBD5E1',
            color: C.white,
            border: 'none',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: existeDossie
              ? 'pointer'
              : 'not-allowed',
          }}
        >
          ↓ Exportar PDF
        </button>

        <button
          onClick={() => onVoltar?.()}
          style={{
            height: 34,
            padding: '0 16px',
            background: C.white,
            color: C.navy,
            border: '1px solid ' + C.border,
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Voltar
        </button>

        <button
          onClick={limparDiagnostico}
          style={{
            height: 34,
            padding: '0 16px',
            background: C.white,
            color: C.red,
            border: '1px solid #FCA5A5',
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Limpar dados
        </button>
      </div>

      {mostrarLista && (
        <div
          style={{
            background: C.white,
            border: '1px solid ' + C.border,
            borderRadius: 9,
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              background: C.bg,
              borderBottom: '1px solid ' + C.border,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.navy,
              }}
            >
              Análises completas salvas
            </div>

            <button
              onClick={() =>
                setMostrarLista(false)
              }
              style={{
                border: 'none',
                background: 'none',
                color: C.muted,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>

          <div
            style={{
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {!carregandoLista &&
              diagnosticos.length === 0 && (
                <div
                  style={{
                    padding: 16,
                    fontSize: 12,
                    color: C.muted,
                  }}
                >
                  Nenhuma análise salva para este cliente.
                </div>
              )}

            {diagnosticos.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '10px 14px',
                  borderBottom:
                    '1px solid ' + C.border,
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {item.titulo ||
                      'Análise PGDAS-D'}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      marginTop: 3,
                    }}
                  >
                    {item.competencia
                      ? 'Competência: ' +
                        item.competencia +
                        ' • '
                      : ''}
                    {fmtDataHora(
                      item.created_at
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() =>
                      abrirDiagnostico(item)
                    }
                    style={{
                      padding: '6px 12px',
                      background: C.navy,
                      color: C.white,
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Abrir
                  </button>

                  <button
                    onClick={() =>
                      excluirDiagnostico(item)
                    }
                    title="Excluir análise"
                    style={{
                      padding: '6px 10px',
                      background: '#FEF2F2',
                      color: C.red,
                      border: '1px solid #FECACA',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    🗑 Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnalisadorIA
        key={chaveAnalisador}
        contexto={contexto}
        dados={dados}
        cliente={cliente}
        regime={regime}
        modelo={modelo}
        parecerInicial={parecerAtual}
        onParecerChange={receberParecer}
        parecerId={parecerId}
      />
    </>
  )
}