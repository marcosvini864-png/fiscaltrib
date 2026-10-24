import { useState } from 'react'

const ABAS = [
  { id: 'molestia', label: 'Moléstia Grave', curto: 'IRPF' },
  { id: 'inss', label: 'INSS > Teto', curto: 'INSS' },
  { id: 'regimes', label: 'Regimes', curto: 'REG' },
  { id: 'irpj', label: 'IRPJ / CSLL', curto: 'IR' },
  { id: 'prescricao', label: 'Prescrição', curto: '5A' },
  { id: 'fator', label: 'Fator R', curto: 'FR' },
  { id: 'das', label: 'DAS / Simples', curto: 'DAS' },
]

const DOENCAS = [
  ['neoplasia', 'Neoplasia maligna'],
  ['cardiopatia', 'Cardiopatia grave'],
  ['cegueira', 'Cegueira, inclusive monocular'],
  ['parkinson', 'Doença de Parkinson'],
  ['esclerose', 'Esclerose múltipla'],
  ['nefropatia', 'Nefropatia grave'],
  ['hepatopatia', 'Hepatopatia grave'],
  ['paralisia', 'Paralisia irreversível e incapacitante'],
  ['tuberculose', 'Tuberculose ativa'],
  ['alienacao', 'Alienação mental'],
  ['hanseniase', 'Hanseníase'],
  ['paget', 'Doença de Paget em estado avançado'],
  ['radiacao', 'Contaminação por radiação'],
  ['aids', 'Aids'],
  ['espondiloartrose', 'Espondiloartrose anquilosante'],
  ['fibrose', 'Fibrose cística'],
  ['profissional', 'Moléstia profissional'],
]

function numeroBR(valor) {
  if (valor === null || valor === undefined || valor === '') return 0

  let texto = String(valor)
    .trim()
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/%/g, '')

  if (texto.includes(',') && texto.includes('.')) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (texto.includes(',')) {
    texto = texto.replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '')
  }

  const numero = Number(texto)

  return Number.isFinite(numero) ? numero : 0
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function dataLocal(valor) {
  if (!valor) return null

  const partes = valor.split('-').map(Number)

  if (partes.length !== 3) return null

  const [ano, mes, dia] = partes

  return new Date(ano, mes - 1, dia, 12, 0, 0)
}

function inicioMes(data) {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    1,
    12,
    0,
    0
  )
}

function maiorData(a, b) {
  return a > b ? a : b
}

function dataBR(data) {
  if (!data) return '-'
  return data.toLocaleDateString('pt-BR')
}

function mesesInclusivos(inicio, fim) {
  if (!inicio || !fim || inicio > fim) return 0

  return (
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth() - inicio.getMonth()) +
    1
  )
}

function contarDezembros(inicio, fim) {
  if (!inicio || !fim || inicio > fim) return 0

  let total = 0

  for (
    let ano = inicio.getFullYear();
    ano <= fim.getFullYear();
    ano++
  ) {
    const dezembro = new Date(ano, 11, 1, 12, 0, 0)

    if (dezembro >= inicio && dezembro <= fim) {
      total++
    }
  }

  return total
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  observacao,
}) {
  return (
    <label className="ct-field">
      <span>{label}</span>

      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={type === 'text' ? 'decimal' : undefined}
      />

      {observacao && (
        <small>{observacao}</small>
      )}
    </label>
  )
}

function Selecao({
  label,
  value,
  onChange,
  options,
  observacao,
}) {
  return (
    <label className="ct-field">
      <span>{label}</span>

      <select
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>

      {observacao && (
        <small>{observacao}</small>
      )}
    </label>
  )
}

function CardCalculadora({
  sigla,
  titulo,
  subtitulo,
  children,
  acao = 'Calcular',
  onAction,
  disabled = false,
  colunas = 3,
  resultado,
}) {
  return (
    <section className="ct-card">
      <div className="ct-card-head">
        <div className="ct-badge">
          {sigla}
        </div>

        <div className="ct-card-title">
          <h3>{titulo}</h3>
          <p>{subtitulo}</p>
        </div>
      </div>

      <div className={`ct-fields ct-cols-${colunas}`}>
        {children}
      </div>

      <div className="ct-actions">
        <button
          type="button"
          className="ct-button"
          onClick={onAction}
          disabled={disabled}
        >
          {acao}
        </button>

        {disabled && (
          <span className="ct-development">
            Motor em preparação
          </span>
        )}
      </div>

      {resultado ? (
        resultado
      ) : (
        <div className="ct-waiting">
          <span>RESULTADO</span>

          <strong>
            {disabled
              ? 'Esta calculadora será ativada na próxima etapa.'
              : 'Preencha os dados e faça o cálculo.'}
          </strong>
        </div>
      )}
    </section>
  )
}

export default function CalculadorasTributarias() {
  const [abaAtiva, setAbaAtiva] = useState('molestia')

  const [dados, setDados] = useState({
    molDoenca: 'neoplasia',
    molTipo: 'aposentadoria',
    molLaudoOficial: 'sim',
    molDataDoenca: '',
    molDataLaudo: '',
    molInicioBeneficio: '',
    molBeneficio: '',
    molIrMensal: '',
    molIr13: '',

    inssCompetencia: '',
    inssV1: '',
    inssV2: '',
    inssV3: '',
    inssDescontado: '',

    regFat: '',
    regFolha: '',
    regCustos: '',
    regDespesas: '',
    regMargem: '',
    regAtividade: 'comercio',

    irpjReceita: '',
    irpjAtividade: 'comercio',
    irpjOutras: '',

    prescData: '',
    prescValor: '',
    prescTributo: 'federal',

    fatorFolha: '',
    fatorReceita: '',

    dasRbt12: '',
    dasReceitaMes: '',
    dasAnexo: 'I',
  })

  const [resultadoMolestia, setResultadoMolestia] =
    useState(null)

  const temaAtivo =
    ABAS.find(item => item.id === abaAtiva) || ABAS[0]

  const set = (campo, valor) => {
    setDados(prev => ({
      ...prev,
      [campo]: valor,
    }))

    if (campo.startsWith('mol')) {
      setResultadoMolestia(null)
    }
  }

  function calcularMolestia() {
    const beneficioInicio =
      dataLocal(dados.molInicioBeneficio)

    const dataDoenca =
      dataLocal(dados.molDataDoenca)

    const dataLaudo =
      dataLocal(dados.molDataLaudo)

    if (!beneficioInicio) {
      setResultadoMolestia({
        erro:
          'Informe a data de início da aposentadoria, pensão ou reforma.',
      })
      return
    }

    if (!dataDoenca && !dataLaudo) {
      setResultadoMolestia({
        erro:
          'Informe a data da doença constante no laudo ou, se ela não constar, a data de emissão do laudo.',
      })
      return
    }

    const marcoDoenca =
      dataDoenca || dataLaudo

    const inicioDireito = maiorData(
      inicioMes(beneficioInicio),
      inicioMes(marcoDoenca)
    )

    const limiteRetificacao2026 =
      new Date(2021, 0, 1, 12, 0, 0)

    const inicioRecuperavel = maiorData(
      inicioDireito,
      limiteRetificacao2026
    )

    const agora = new Date()
    const fimCalculo = inicioMes(agora)

    if (inicioRecuperavel > fimCalculo) {
      setResultadoMolestia({
        erro:
          'A data inicial apurada é posterior ao período atual. Confira as datas informadas.',
      })
      return
    }

    const meses = mesesInclusivos(
      inicioRecuperavel,
      fimCalculo
    )

    const qtd13 = contarDezembros(
      inicioRecuperavel,
      fimCalculo
    )

    const beneficioMensal =
      numeroBR(dados.molBeneficio)

    const irMensal =
      numeroBR(dados.molIrMensal)

    const ir13 =
      numeroBR(dados.molIr13)

    const irMensalPeriodo =
      irMensal * meses

    const ir13Periodo =
      ir13 * qtd13

    const potencial =
      irMensalPeriodo + ir13Periodo

    const rendimentoReferencia =
      beneficioMensal > 0
        ? beneficioMensal * meses +
          beneficioMensal * qtd13
        : 0

    setResultadoMolestia({
      erro: '',
      inicioDireito,
      inicioRecuperavel,
      meses,
      qtd13,
      irMensalPeriodo,
      ir13Periodo,
      potencial,
      rendimentoReferencia,
      laudoOficial:
        dados.molLaudoOficial === 'sim',
      limitado:
        inicioDireito < limiteRetificacao2026,
    })
  }

  const blocoResultadoMolestia =
    resultadoMolestia ? (
      resultadoMolestia.erro ? (
        <div className="ct-error">
          <strong>Atenção</strong>
          <p>{resultadoMolestia.erro}</p>
        </div>
      ) : (
        <div className="ct-mol-result">
          <div className="ct-result-top">
            <div className="ct-result-main">
              <span>
                VALOR POTENCIAL A REVISAR
              </span>

              <strong>
                {moeda(
                  resultadoMolestia.potencial
                )}
              </strong>

              <small>
                Estimativa preliminar baseada no
                IR informado.
              </small>
            </div>

            <div className="ct-result-status">
              <span>
                {resultadoMolestia.laudoOficial
                  ? 'DOCUMENTAÇÃO'
                  : 'TRIAGEM'}
              </span>

              <strong>
                {resultadoMolestia.laudoOficial
                  ? 'Laudo oficial informado'
                  : 'Laudo oficial ainda não informado'}
              </strong>
            </div>
          </div>

          <div className="ct-metrics">
            <div>
              <span>Início do direito</span>
              <strong>
                {dataBR(
                  resultadoMolestia.inicioDireito
                )}
              </strong>
            </div>

            <div>
              <span>
                Início do período analisado
              </span>
              <strong>
                {dataBR(
                  resultadoMolestia.inicioRecuperavel
                )}
              </strong>
            </div>

            <div>
              <span>Meses analisados</span>
              <strong>
                {resultadoMolestia.meses}
              </strong>
            </div>

            <div>
              <span>13º considerados</span>
              <strong>
                {resultadoMolestia.qtd13}
              </strong>
            </div>
          </div>

          <div className="ct-memory">
            <div className="ct-memory-title">
              Memória do cálculo
            </div>

            <div className="ct-memory-row">
              <span>
                IR mensal informado ×{' '}
                {resultadoMolestia.meses} meses
              </span>

              <strong>
                {moeda(
                  resultadoMolestia.irMensalPeriodo
                )}
              </strong>
            </div>

            <div className="ct-memory-row">
              <span>
                IR sobre 13º ×{' '}
                {resultadoMolestia.qtd13}
              </span>

              <strong>
                {moeda(
                  resultadoMolestia.ir13Periodo
                )}
              </strong>
            </div>

            <div className="ct-memory-row total">
              <span>
                Total potencial para revisão
              </span>

              <strong>
                {moeda(
                  resultadoMolestia.potencial
                )}
              </strong>
            </div>

            {resultadoMolestia.rendimentoReferencia >
              0 && (
              <div className="ct-memory-row">
                <span>
                  Rendimentos de benefício no
                  período — referência estimada
                </span>

                <strong>
                  {moeda(
                    resultadoMolestia.rendimentoReferencia
                  )}
                </strong>
              </div>
            )}
          </div>

          {resultadoMolestia.limitado && (
            <div className="ct-info">
              O direito informado começa antes
              do período considerado nesta
              triagem. Para 2026, a orientação
              da Receita Federal informa
              retificação do exercício 2022 em
              diante.
            </div>
          )}

          {!resultadoMolestia.laudoOficial && (
            <div className="ct-warning">
              O cálculo é apenas uma triagem.
              Para o reconhecimento
              administrativo da isenção, a
              documentação deve ser analisada,
              inclusive o laudo médico oficial.
            </div>
          )}

          <div className="ct-legal">
            <strong>
              Base da análise:
            </strong>{' '}
            Lei nº 7.713/1988, art. 6º,
            incisos XIV e XXI. A isenção
            alcança rendimentos elegíveis de
            aposentadoria, pensão, reforma ou
            reserva remunerada. Outros
            rendimentos devem ser analisados
            separadamente.
          </div>
        </div>
      )
    ) : null

  function renderCalculadora() {
    if (abaAtiva === 'molestia') {
      return (
        <CardCalculadora
          sigla={temaAtivo.curto}
          titulo="IRPF — Moléstia Grave"
          subtitulo="Triagem do direito à isenção e estimativa preliminar do IR potencialmente recuperável."
          acao="Calcular recuperação"
          onAction={calcularMolestia}
          colunas={3}
          resultado={blocoResultadoMolestia}
        >
          <Selecao
            label="Doença"
            value={dados.molDoenca}
            onChange={v =>
              set('molDoenca', v)
            }
            options={DOENCAS}
          />

          <Selecao
            label="Tipo de rendimento"
            value={dados.molTipo}
            onChange={v =>
              set('molTipo', v)
            }
            options={[
              [
                'aposentadoria',
                'Aposentadoria',
              ],
              ['pensao', 'Pensão'],
              [
                'reforma',
                'Reforma / reserva remunerada',
              ],
            ]}
          />

          <Selecao
            label="Possui laudo médico oficial?"
            value={dados.molLaudoOficial}
            onChange={v =>
              set('molLaudoOficial', v)
            }
            options={[
              ['sim', 'Sim'],
              ['nao', 'Não / ainda não'],
            ]}
          />

          <Campo
            label="Início do benefício"
            type="date"
            value={dados.molInicioBeneficio}
            onChange={v =>
              set('molInicioBeneficio', v)
            }
          />

          <Campo
            label="Data da doença indicada no laudo"
            type="date"
            value={dados.molDataDoenca}
            onChange={v =>
              set('molDataDoenca', v)
            }
            observacao="Se o laudo não indicar a data da doença, deixe vazio."
          />

          <Campo
            label="Data de emissão do laudo"
            type="date"
            value={dados.molDataLaudo}
            onChange={v =>
              set('molDataLaudo', v)
            }
          />

          <Campo
            label="Valor mensal do benefício"
            value={dados.molBeneficio}
            onChange={v =>
              set('molBeneficio', v)
            }
            placeholder="Ex.: 8.500,00"
          />

          <Campo
            label="IR retido mensal — média"
            value={dados.molIrMensal}
            onChange={v =>
              set('molIrMensal', v)
            }
            placeholder="Ex.: 950,00"
          />

          <Campo
            label="IR retido sobre o 13º"
            value={dados.molIr13}
            onChange={v =>
              set('molIr13', v)
            }
            placeholder="Ex.: 950,00"
          />
        </CardCalculadora>
      )
    }

    if (abaAtiva === 'inss') {
      return (
        <CardCalculadora
          sigla={temaAtivo.curto}
          titulo="INSS acima do teto"
          subtitulo="Análise de contribuições previdenciárias em múltiplos vínculos na mesma competência."
          acao="Calcular"
          disabled
          colunas={3}
        >
          <Campo
            label="Competência"
            type="month"
            value={dados.inssCompetencia}
            onChange={v =>
              set('inssCompetencia', v)
            }
          />

          <Campo
            label="Remuneração — vínculo 1"
            value={dados.inssV1}
            onChange={v =>
              set('inssV1', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="Remuneração — vínculo 2"
            value={dados.inssV2}
            onChange={v =>
              set('inssV2', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="Remuneração — vínculo 3"
            value={dados.inssV3}
            onChange={v =>
              set('inssV3', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="INSS descontado no total"
            value={dados.inssDescontado}
            onChange={v =>
              set('inssDescontado', v)
            }
            placeholder="R$ 0,00"
          />
        </CardCalculadora>
      )
    }

    if (abaAtiva === 'regimes') {
      return (
        <CardCalculadora
          sigla={temaAtivo.curto}
          titulo="Comparação de Regimes"
          subtitulo="Comparação estruturada entre Simples Nacional, Lucro Presumido e Lucro Real."
          acao="Comparar regimes"
          disabled
          colunas={3}
        >
          <Campo
            label="Faturamento anual"
            value={dados.regFat}
            onChange={v =>
              set('regFat', v)
            }
            placeholder="R$ 0,00"
          />

          <Selecao
            label="Atividade principal"
            value={dados.regAtividade}
            onChange={v =>
              set('regAtividade', v)
            }
            options={[
              ['comercio', 'Comércio'],
              ['industria', 'Indústria'],
              ['servicos', 'Serviços'],
            ]}
          />

          <Campo
            label="Folha anual"
            value={dados.regFolha}
            onChange={v =>
              set('regFolha', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="Custos anuais"
            value={dados.regCustos}
            onChange={v =>
              set('regCustos', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="Despesas anuais"
            value={dados.regDespesas}
            onChange={v =>
              set('regDespesas', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="Margem líquida estimada"
            value={dados.regMargem}
            onChange={v =>
              set('regMargem', v)
            }
            placeholder="Ex.: 15%"
          />
        </CardCalculadora>
      )
    }

    if (abaAtiva === 'irpj') {
      return (
        <CardCalculadora
          sigla={temaAtivo.curto}
          titulo="IRPJ / CSLL"
          subtitulo="Estimativa de IRPJ e CSLL conforme atividade, receita e período de apuração."
          acao="Calcular"
          disabled
          colunas={3}
        >
          <Campo
            label="Receita bruta trimestral"
            value={dados.irpjReceita}
            onChange={v =>
              set('irpjReceita', v)
            }
            placeholder="R$ 0,00"
          />

          <Selecao
            label="Atividade"
            value={dados.irpjAtividade}
            onChange={v =>
              set('irpjAtividade', v)
            }
            options={[
              [
                'comercio',
                'Comércio / Indústria',
              ],
              ['transporte', 'Transporte'],
              ['servicos', 'Serviços'],
            ]}
          />

          <Campo
            label="Outras receitas tributáveis"
            value={dados.irpjOutras}
            onChange={v =>
              set('irpjOutras', v)
            }
            placeholder="R$ 0,00"
          />
        </CardCalculadora>
      )
    }

    if (abaAtiva === 'prescricao') {
      return (
        <CardCalculadora
          sigla={temaAtivo.curto}
          titulo="Prescrição Tributária"
          subtitulo="Triagem de prazo para análise de recuperação de tributos pagos indevidamente ou a maior."
          acao="Analisar prazo"
          disabled
          colunas={3}
        >
          <Campo
            label="Data do pagamento"
            type="date"
            value={dados.prescData}
            onChange={v =>
              set('prescData', v)
            }
          />

          <Campo
            label="Valor"
            value={dados.prescValor}
            onChange={v =>
              set('prescValor', v)
            }
            placeholder="R$ 0,00"
          />

          <Selecao
            label="Natureza do tributo"
            value={dados.prescTributo}
            onChange={v =>
              set('prescTributo', v)
            }
            options={[
              ['federal', 'Federal'],
              ['estadual', 'Estadual'],
              ['municipal', 'Municipal'],
            ]}
          />
        </CardCalculadora>
      )
    }

    if (abaAtiva === 'fator') {
      return (
        <CardCalculadora
          sigla={temaAtivo.curto}
          titulo="Fator R"
          subtitulo="Relação entre folha e receita para atividades do Simples sujeitas ao enquadramento pelos Anexos III e V."
          acao="Calcular Fator R"
          disabled
          colunas={2}
        >
          <Campo
            label="Folha dos últimos 12 meses"
            value={dados.fatorFolha}
            onChange={v =>
              set('fatorFolha', v)
            }
            placeholder="R$ 0,00"
          />

          <Campo
            label="Receita bruta dos últimos 12 meses"
            value={dados.fatorReceita}
            onChange={v =>
              set('fatorReceita', v)
            }
            placeholder="R$ 0,00"
          />
        </CardCalculadora>
      )
    }

    return (
      <CardCalculadora
        sigla={temaAtivo.curto}
        titulo="DAS / Simples Nacional"
        subtitulo="Cálculo da alíquota efetiva e estimativa do DAS conforme anexo e faixa."
        acao="Calcular DAS"
        disabled
        colunas={3}
      >
        <Campo
          label="RBT12"
          value={dados.dasRbt12}
          onChange={v =>
            set('dasRbt12', v)
          }
          placeholder="R$ 0,00"
        />

        <Campo
          label="Receita da competência"
          value={dados.dasReceitaMes}
          onChange={v =>
            set('dasReceitaMes', v)
          }
          placeholder="R$ 0,00"
        />

        <Selecao
          label="Anexo"
          value={dados.dasAnexo}
          onChange={v =>
            set('dasAnexo', v)
          }
          options={[
            ['I', 'Anexo I'],
            ['II', 'Anexo II'],
            ['III', 'Anexo III'],
            ['IV', 'Anexo IV'],
            ['V', 'Anexo V'],
          ]}
        />
      </CardCalculadora>
    )
  }

  return (
    <div className="ct-root">
      <style>{`

        .ct-root {
          width: 100%;
          box-sizing: border-box;
          font-family: Inter, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #0F172A;
          padding-top: 2px;
        }

        /* CABEÇALHO */

        .ct-hero {
          max-width: 1080px;
          margin: 0 auto 14px;
          box-sizing: border-box;
          background:
            linear-gradient(
              120deg,
              #FFFFFF 0%,
              #FAFBFC 58%,
              #F1F5F9 100%
            );
          border: 1px solid #DCE3EA;
          border-radius: 14px;
          padding: 14px 20px;
        }

        .ct-eyebrow {
          font-size: 9.5px;
          font-weight: 900;
          letter-spacing: 1.15px;
          color: #64748B;
          margin-bottom: 4px;
        }

        .ct-hero h2 {
          margin: 0 0 4px;
          font-size: 21px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: -.25px;
          color: #0F172A;
        }

        .ct-hero p {
          margin: 0;
          color: #64748B;
          font-size: 11.5px;
          line-height: 1.4;
        }

        /* ABAS DAS CALCULADORAS */

        .ct-tabs-wrap {
          max-width: 1080px;
          margin: 0 auto 22px;
          overflow-x: auto;
          scrollbar-width: thin;
          padding-bottom: 2px;
        }

        .ct-tabs {
          display: flex;
          gap: 7px;
          min-width: max-content;
        }

        .ct-tab {
          height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 12px;
          border-radius: 9px;
          border: 1px solid #D8E0E8;
          background: #FFFFFF;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background .12s ease,
            border-color .12s ease,
            color .12s ease,
            transform .12s ease,
            box-shadow .12s ease;
        }

        .ct-tab:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
          transform: translateY(-1px);
          box-shadow:
            0 2px 6px rgba(15, 23, 42, .05);
        }

        .ct-tab.active {
  background: #0078ED;
  border-color: #0078ED;
  color: #FFFFFF;
  box-shadow:
    0 3px 8px rgba(0, 120, 237, .18);
}

        .ct-tab-code {
          min-width: 28px;
          height: 22px;
          padding: 0 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          border-radius: 6px;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          color: #64748B;
          font-size: 8px;
          font-weight: 900;
        }

        .ct-tab.active .ct-tab-code {
          background: rgba(255,255,255,.14);
          border-color: rgba(255,255,255,.20);
          color: #FFFFFF;
        }

        /* ÁREA DA CALCULADORA */

        .ct-stage {
          max-width: 1080px;
          margin: 0 auto;
        }

        .ct-card {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #FFFFFF;
          border: 1px solid #DDE4EA;
          border-top: 3px solid #CBD5E1;
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow:
            0 3px 12px rgba(15, 23, 42, .045);
        }

        .ct-card-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding-bottom: 11px;
          margin-bottom: 13px;
          border-bottom: 1px solid #EEF2F6;
        }

        .ct-badge {
          flex: 0 0 auto;
          min-width: 42px;
          height: 42px;
          padding: 0 6px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #F1F5F9;
          border: 1px solid #DDE4EA;
          color: #475569;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .2px;
        }

        .ct-card-title {
          min-width: 0;
        }

        .ct-card-title h3 {
          margin: 1px 0 3px;
          font-size: 16px;
          line-height: 1.2;
          font-weight: 800;
          color: #0F172A;
        }

        .ct-card-title p {
          margin: 0;
          color: #64748B;
          font-size: 10.5px;
          line-height: 1.4;
        }

        /* CAMPOS */

        .ct-fields {
          display: grid;
          gap: 10px 12px;
        }

        .ct-cols-2 {
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
        }

        .ct-cols-3 {
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
        }

        .ct-field {
          display: block;
          min-width: 0;
        }

        .ct-field > span {
          display: block;
          color: #475569;
          font-size: 10.5px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .ct-field input,
        .ct-field select {
          width: 100%;
          min-width: 0;
          height: 39px;
          box-sizing: border-box;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          background: #FFFFFF;
          color: #0F172A;
          padding: 0 10px;
          font-size: 12px;
          outline: none;
          transition:
            border-color .12s ease,
            box-shadow .12s ease;
        }

        .ct-field input:hover,
        .ct-field select:hover {
          border-color: #AEBBC9;
        }

       .ct-field input:focus,
.ct-field select:focus {
  border-color: #0078ED;
  box-shadow:
    0 0 0 3px #EAF5FF;
}

        .ct-field input::placeholder {
          color: #94A3B8;
        }

        .ct-field small {
          display: block;
          margin-top: 4px;
          color: #94A3B8;
          font-size: 9.5px;
          line-height: 1.3;
        }

        /* BOTÃO */

        .ct-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }

        .ct-button {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  padding: 0 17px;
  background: #0078ED;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  opacity: 1;
  box-shadow:
    0 3px 8px rgba(0, 120, 237, .18);
  transition:
    background .12s ease,
    transform .12s ease,
    box-shadow .12s ease;
}

.ct-button:hover:not(:disabled) {
  background: #0068D1;
  transform: translateY(-1px);
  box-shadow:
    0 4px 10px rgba(0, 120, 237, .24);
}

.ct-button:disabled {
  cursor: not-allowed;
  opacity: 1;
  background: #0078ED;
  color: #FFFFFF;
  box-shadow:
    0 3px 8px rgba(0, 120, 237, .18);
}

        .ct-development {
          color: #94A3B8;
          font-size: 10px;
          font-weight: 700;
        }

        /* RESULTADO AINDA NÃO CALCULADO */

        .ct-waiting {
          margin-top: 12px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          border-radius: 9px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
        }

        .ct-waiting span {
          color: #64748B;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: .8px;
          margin-bottom: 2px;
        }

        .ct-waiting strong {
          color: #475569;
          font-size: 11px;
        }

        /* RESULTADO MOLÉSTIA GRAVE */

        .ct-mol-result {
          margin-top: 14px;
          border: 1px solid #DDE4EA;
          background: #FAFBFC;
          border-radius: 12px;
          padding: 13px;
        }

        .ct-result-top {
          display: grid;
          grid-template-columns: 1.25fr .75fr;
          gap: 10px;
        }

        .ct-result-main,
        .ct-result-status {
          border-radius: 10px;
          padding: 13px;
        }

        /*
          Verde é usado aqui com significado:
          valor financeiro potencialmente recuperável.
        */

        .ct-result-main {
          background: #059669;
          color: #FFFFFF;
          box-shadow:
            0 3px 8px rgba(5, 150, 105, .12);
        }

        .ct-result-main span,
        .ct-result-status span {
          display: block;
          font-size: 8.5px;
          font-weight: 900;
          letter-spacing: .75px;
          margin-bottom: 4px;
        }

        .ct-result-main strong {
          display: block;
          font-size: 25px;
          line-height: 1.1;
          margin-bottom: 4px;
        }

        .ct-result-main small {
          font-size: 10px;
          opacity: .94;
        }

        .ct-result-status {
          background: #F1F5F9;
          border: 1px solid #DDE4EA;
          color: #475569;
        }

        .ct-result-status span {
          color: #64748B;
        }

        .ct-result-status strong {
          font-size: 12px;
          color: #334155;
        }

        .ct-metrics {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-top: 10px;
        }

        .ct-metrics > div {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 9px 10px;
        }

        .ct-metrics span {
          display: block;
          color: #64748B;
          font-size: 9px;
          margin-bottom: 3px;
        }

        .ct-metrics strong {
          color: #0F172A;
          font-size: 12px;
        }

        /* MEMÓRIA DO CÁLCULO */

        .ct-memory {
          margin-top: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 9px;
          overflow: hidden;
        }

        .ct-memory-title {
          padding: 8px 10px;
          background: #F1F5F9;
          border-bottom: 1px solid #E2E8F0;
          font-size: 10px;
          font-weight: 800;
          color: #334155;
        }

        .ct-memory-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 8px 10px;
          border-bottom: 1px solid #F1F5F9;
          font-size: 10px;
          color: #475569;
        }

        .ct-memory-row:last-child {
          border-bottom: 0;
        }

        .ct-memory-row strong {
          color: #0F172A;
          white-space: nowrap;
        }

        .ct-memory-row.total {
          background: #ECFDF5;
          color: #047857;
          font-weight: 800;
        }

        .ct-memory-row.total strong {
          color: #047857;
        }

        /* MENSAGENS SEMÂNTICAS */

        .ct-info,
        .ct-warning,
        .ct-legal,
        .ct-error {
          margin-top: 10px;
          border-radius: 8px;
          padding: 9px 10px;
          font-size: 9.8px;
          line-height: 1.45;
        }

        .ct-info {
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          color: #1E40AF;
        }

        .ct-warning {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          color: #92400E;
        }

        .ct-legal {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: #64748B;
        }

        .ct-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #991B1B;
        }

        .ct-error strong {
          display: block;
          margin-bottom: 3px;
        }

        .ct-error p {
          margin: 0;
        }

        /* TABLET */

        @media (max-width: 950px) {

          .ct-cols-3 {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .ct-result-top {
            grid-template-columns: 1fr;
          }

          .ct-metrics {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

        }

        /* CELULAR */

        @media (max-width: 700px) {

          .ct-hero {
            padding: 13px 14px;
            border-radius: 12px;
          }

          .ct-hero h2 {
            font-size: 19px;
          }

          .ct-tabs-wrap {
            margin-bottom: 18px;
          }

          .ct-tab {
            height: 40px;
            padding: 0 11px;
          }

          .ct-card {
            padding: 14px 12px;
            border-radius: 12px;
          }

          .ct-cols-2,
          .ct-cols-3 {
            grid-template-columns: 1fr;
          }

          .ct-field input,
          .ct-field select {
            height: 48px;
            font-size: 16px;
          }

          .ct-button {
            width: 100%;
            min-height: 48px;
            font-size: 12px;
          }

          .ct-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .ct-development {
            text-align: center;
          }

          .ct-metrics {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .ct-memory-row {
            flex-direction: column;
            gap: 3px;
          }

          .ct-result-main strong {
            font-size: 22px;
          }

        }

      `}</style>

      <header className="ct-hero">
        <div className="ct-eyebrow">
          e-FISCALTRIBE — PLANEJAMENTO TRIBUTÁRIO
        </div>

        <h2>
          Calculadoras Tributárias
        </h2>

        <p>
          Selecione uma ferramenta para realizar o cálculo,
          analisar o resultado e consultar a memória de cálculo.
        </p>
      </header>

      <nav className="ct-tabs-wrap">
        <div className="ct-tabs">
          {ABAS.map(aba => (
            <button
              key={aba.id}
              type="button"
              className={`ct-tab ${
                abaAtiva === aba.id
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setAbaAtiva(aba.id)
              }
            >
              <span className="ct-tab-code">
                {aba.curto}
              </span>

              {aba.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="ct-stage">
        {renderCalculadora()}
      </main>
    </div>
  )
}