const S = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  red: '#DC2626',
  yellow: '#F59E0B',
  green: '#16A34A',
  navy: '#0F172A',
}

function Passo({ numero, icone, titulo, descricao }) {
  return (
    <div
      style={{
        background: S.white,
        border: `1px solid ${S.border}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          background: '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 19,
          flexShrink: 0,
        }}
      >
        {icone}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: S.blue,
            letterSpacing: 0.8,
            marginBottom: 2,
          }}
        >
          PASSO {numero}
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: S.text,
            marginBottom: 3,
          }}
        >
          {titulo}
        </div>

        {descricao && (
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.45,
              color: S.muted,
            }}
          >
            {descricao}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ManualOperacao() {
  const passos = [
    [
      '01',
      '👤',
      'Cadastrar o cliente',
      'Cadastre a empresa que será analisada.',
    ],
    [
      '02',
      '🔎',
      'Abrir ou selecionar o cliente',
      'Se a empresa já estiver cadastrada, selecione o cliente correto antes de iniciar.',
    ],
    [
      '03',
      '📥',
      'Importar e Analisar XML',
      'Na seção Motor do Simples, no menu lateral, acesse Importar e Analisar XML. Importe os arquivos XML das NF-e e execute a análise dos documentos.',
    ],
    [
      '04',
      '📄',
      'Importar PGDAS-D',
      'No menu lateral, acesse Importar PGDAS-D e importe a declaração correspondente à competência analisada.',
    ],
    [
      '05',
      '🏷️',
      'Classificação e Segregação de Itens',
      'Revise os NCMs e confirme a classificação tributária dos produtos. Nesta etapa, os itens são segregados conforme o tratamento aplicável para utilização na apuração do Simples.',
    ],
    [
      '06',
      '🧮',
      'Apuração do Simples',
      'Execute a conferência e a apuração da competência.',
    ],
    [
      '07',
      '📊',
      'Resultado e Memória de Cálculo',
      'Confira o resultado da apuração e a memória de cálculo gerada pelo sistema.',
    ],
    [
      '08',
      '🪞',
      'Espelho de Retificação',
      'Gere e confira o espelho que servirá como roteiro para a retificação do PGDAS-D.',
    ],
    [
      '09',
      '💰',
      'Retificação e Recuperação',
      'Após a retificação no ambiente oficial, siga para a etapa de restituição ou compensação dos valores.',
    ],
  ]

  return (
    <div
      style={{
        minHeight: '100%',
        background: S.bg,
        paddingBottom: 24,
      }}
    >
      {/* ABERTURA DO MANUAL */}
      <section
        style={{
          background:
            'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
          borderRadius: 14,
          padding: '12px 20px',
          color: '#FFFFFF',
          marginBottom: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: 22,
            top: 10,
            fontSize: 54,
            opacity: 0.12,
          }}
        >
          📖
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            color: '#BFDBFE',
            marginBottom: 4,
          }}
        >
          FISCALTRIBE • GUIA OPERACIONAL
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            marginBottom: 4,
            maxWidth: 700,
          }}
        >
          Manual de Operação do FiscalTribe
        </div>

        <div
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            color: '#DBEAFE',
            maxWidth: 760,
            marginBottom: 10,
          }}
        >
          Passo a passo para executar os principais trabalhos na
          plataforma, desde a seleção do cliente até a apuração,
          documentação e recuperação tributária.
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            style={{
              border: 'none',
              background: S.red,
              color: '#FFFFFF',
              borderRadius: 7,
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Começar pela Importação XML
          </button>

          <button
            type="button"
            style={{
              border: 'none',
              background: '#FBBF24',
              color: '#78350F',
              borderRadius: 7,
              padding: '7px 13px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Ver passo a passo
          </button>
        </div>
      </section>

      {/* INTRODUÇÃO */}
      <section
        style={{
          background: S.white,
          border: `1px solid ${S.border}`,
          borderRadius: 12,
          padding: '11px 14px',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: S.blue,
            letterSpacing: 1.1,
            marginBottom: 3,
          }}
        >
          COMO UTILIZAR
        </div>

        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: S.text,
            marginBottom: 4,
          }}
        >
          Escolha o trabalho que deseja realizar
        </div>

        <div
          style={{
            fontSize: 12,
            lineHeight: 1.45,
            color: S.muted,
          }}
        >
          O Manual de Operação acompanha o usuário durante a execução
          dos trabalhos no FiscalTribe, mostrando onde clicar, o que
          conferir, qual resultado deve aparecer e qual é a próxima
          etapa do procedimento.
        </div>
      </section>

      {/* PRIMEIRO TRABALHO */}
      <section
        style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 12,
          padding: '11px 14px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 250,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: S.blue,
                letterSpacing: 1.1,
                marginBottom: 3,
              }}
            >
              PRIMEIRO FLUXO OPERACIONAL
            </div>

            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: S.text,
                marginBottom: 4,
              }}
            >
              Recuperação de PIS e COFINS — Produtos Monofásicos
            </div>

            <div
              style={{
                fontSize: 12,
                lineHeight: 1.45,
                color: S.muted,
              }}
            >
              Utilize este fluxo para identificar possíveis créditos de
              PIS/COFINS, conferir as competências do Simples Nacional,
              realizar a apuração e gerar o espelho necessário para
              orientar a retificação do PGDAS-D.
            </div>
          </div>

          <div
            style={{
              background: S.white,
              border: '1px solid #BFDBFE',
              borderRadius: 10,
              padding: '8px 12px',
              minWidth: 210,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: S.muted,
                marginBottom: 3,
              }}
            >
              Resultado esperado
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: S.green,
                lineHeight: 1.4,
              }}
            >
              Apuração + Memória + Espelho de Retificação
            </div>
          </div>
        </div>
      </section>

      {/* PASSO A PASSO */}
      <section>
        <div
          style={{
            marginBottom: 9,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: S.blue,
              letterSpacing: 1.1,
              marginBottom: 3,
            }}
          >
            FLUXO RECOMENDADO
          </div>

          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: S.text,
            }}
          >
            Passo a passo
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 9,
          }}
        >
          {passos.map(([numero, icone, titulo, descricao]) => (
            <Passo
              key={numero}
              numero={numero}
              icone={icone}
              titulo={titulo}
              descricao={descricao}
            />
          ))}
        </div>
      </section>

      {/* AVISO */}
      <section
        style={{
          marginTop: 14,
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 10,
          padding: '10px 12px',
          display: 'flex',
          gap: 9,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            fontSize: 18,
          }}
        >
          ⚠️
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#92400E',
              marginBottom: 2,
            }}
          >
            Atenção
          </div>

          <div
            style={{
              fontSize: 11,
              lineHeight: 1.45,
              color: '#92400E',
            }}
          >
            A identificação de produtos monofásicos representa uma
            etapa do trabalho. A confirmação do resultado ocorre após
            a conferência e a apuração completa da competência.
          </div>
        </div>
      </section>
    </div>
  )
}
