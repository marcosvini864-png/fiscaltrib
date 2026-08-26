import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

/**
 * FiscalTribe
 * Espelho de Retificação do PGDAS-D
 *
 * REGRAS DE ARQUITETURA
 * ------------------------------------------------------------
 * 1. Esta tela NÃO recalcula a apuração.
 * 2. A fonte principal é o snapshot salvo em `memoria_calculo`.
 * 3. A tela apenas organiza e exibe:
 *      original -> conferido -> diferença
 * 4. ICMS permanece identificado como preservado quando essa
 *    for a regra registrada na memória técnica.
 * 5. Tributos fora do escopo não são alterados automaticamente.
 * 6. Nesta primeira etapa o módulo é SOMENTE LEITURA.
 *
 * Integração esperada posteriormente:
 *
 * navigate("/espelho-retificacao-pgdas", {
 *   state: {
 *     apuracao: apuracaoSalva
 *   }
 * });
 */

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    let normalized = value
      .replace(/\s/g, "")
      .replace(/R\$/gi, "");

    if (normalized.includes(",")) {
      normalized = normalized
        .replace(/\./g, "")
        .replace(",", ".");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatMoney(value) {
  return moneyFormatter.format(toNumber(value));
}

function formatPercent(value) {
  const number = toNumber(value);
  const percentual = Math.abs(number) <= 1 ? number * 100 : number;
  return `${percentFormatter.format(percentual)}%`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCompetencia(value) {
  if (!value) return "—";

  const text = String(value).trim();

  const yyyyMm = text.match(/^(\d{4})-(\d{2})/);
  if (yyyyMm) {
    return `${yyyyMm[2]}/${yyyyMm[1]}`;
  }

  const mmYyyy = text.match(/^(\d{2})\/(\d{4})$/);
  if (mmYyyy) {
    return text;
  }

  return text;
}

function firstDefined(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function getPath(object, path) {
  if (!object || !path) return undefined;

  return path.split(".").reduce((accumulator, key) => {
    if (accumulator === undefined || accumulator === null) return undefined;
    return accumulator[key];
  }, object);
}

function pick(object, paths, fallback = undefined) {
  for (const path of paths) {
    const value = getPath(object, path);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function parseMemoriaCalculo(value) {
  if (!value) return {};

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeTributo(memoria, apuracao, codigo) {
  const upper = codigo.toUpperCase();
  const lower = codigo.toLowerCase();

  const calculo =
    memoria?.calculo_tributario ||
    memoria?.calculoTributario ||
    {};

  const resultado =
    calculo?.resultado ||
    {};

  const dasConferido =
    calculo?.dasConferido ||
    resultado?.dasConferido ||
    {};

  const comparacao =
    calculo?.comparacao ||
    resultado?.comparacao ||
    {};

  const valoresConferidos =
    dasConferido?.valoresConferidos ||
    {};

  const pgdas =
    memoria?.fontes?.pgdas ||
    {};

  const original = firstDefined(
    resultado?.valoresOriginais?.[lower],
    comparacao?.comparacaoTributos?.[lower]?.original,
    pgdas?.[lower],
    pick(memoria, [
      `tributos.${lower}.original`,
      `tributos.${lower}.valor_original`,
      `tributos_originais.${lower}`,
      `valores_originais.${lower}`,
      `${lower}_original`,
      `${lower}Original`,
    ]),
    pick(apuracao, [
      `${lower}_original`,
      `${lower}Original`,
      `tributos_originais.${lower}`,
      `valores_originais.${lower}`,
    ]),
    0
  );

  const conferido = firstDefined(
    resultado?.valoresConferidos?.[lower],
    comparacao?.comparacaoTributos?.[lower]?.conferido,
    valoresConferidos?.[lower],
    lower === "icms"
      ? calculo?.icmsPreservado?.valorIcms
      : undefined,
    pick(memoria, [
      `tributos.${lower}.conferido`,
      `tributos.${lower}.valor_conferido`,
      `tributos_conferidos.${lower}`,
      `valores_conferidos.${lower}`,
      `${lower}_conferido`,
      `${lower}Conferido`,
    ]),
    pick(apuracao, [
      `${lower}_conferido`,
      `${lower}Conferido`,
      `tributos_conferidos.${lower}`,
      `valores_conferidos.${lower}`,
    ]),
    original
  );

  const diferencaSalva = firstDefined(
    pick(memoria, [
      `tributos.${lower}.diferenca`,
      `diferencas.${lower}`,
      `${lower}_diferenca`,
      `${lower}Diferenca`,
    ]),
    pick(apuracao, [
      `${lower}_diferenca`,
      `${lower}Diferenca`,
      `diferencas.${lower}`,
    ])
  );

  /**
   * A diferença abaixo é somente uma apresentação derivada
   * de dois valores JÁ SALVOS no snapshot.
   *
   * Não há aqui qualquer recálculo tributário.
   */
  const diferenca =
    diferencaSalva !== undefined
      ? toNumber(diferencaSalva)
      : toNumber(original) - toNumber(conferido);

  const preservado = Boolean(
    firstDefined(
      lower === "icms" &&
        calculo?.icmsPreservado?.status === "icms_original_preservado",
      pick(memoria, [
        `tributos.${lower}.preservado`,
        `${lower}_preservado`,
        `${lower}Preservado`,
      ]),
      pick(apuracao, [
        `${lower}_preservado`,
        `${lower}Preservado`,
      ]),
      false
    )
  );

  const foraEscopo = Boolean(
    firstDefined(
      pick(memoria, [
        `tributos.${lower}.fora_escopo`,
        `${lower}_fora_escopo`,
      ]),
      false
    )
  );

  return {
    codigo: upper,
    original: toNumber(original),
    conferido: toNumber(conferido),
    diferenca,
    preservado,
    foraEscopo,
  };
}

function InfoCard({ label, value, helper }) {
  return (
    <div style={styles.infoCard}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValue}>{value}</div>
      {helper ? <div style={styles.infoHelper}>{helper}</div> : null}
    </div>
  );
}

function StatusBadge({ children, tone = "neutral" }) {
  const toneStyles = {
    neutral: {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #e5e7eb",
    },
    success: {
      background: "#ecfdf5",
      color: "#047857",
      border: "1px solid #a7f3d0",
    },
    warning: {
      background: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fde68a",
    },
  };

  return (
    <span style={{ ...styles.badge, ...(toneStyles[tone] || toneStyles.neutral) }}>
      {children}
    </span>
  );
}

export default function EspelhoRetificacaoPGDAS({
  apuracao = null,
  onVoltar,
  versaoInicial = null,
  versoesExternas = null,
  modoConsulta = false,
}) {
  const [salvandoEspelho, setSalvandoEspelho] = useState(false);
  const [editandoAdministrativo, setEditandoAdministrativo] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoVersoes, setHistoricoVersoes] = useState([]);
  const [ultimaVersao, setUltimaVersao] = useState(null);
  const [versaoVisualizada, setVersaoVisualizada] = useState(null);
  const [metadados, setMetadados] = useState({
    responsavel: "",
    protocolo: "",
    dataRetificacao: "",
    observacoes: "",
    status: "Rascunho",
  });

  const memoria = useMemo(
    () => parseMemoriaCalculo(apuracao?.memoria_calculo),
    [apuracao]
  );

  const dados = useMemo(() => {
    if (!apuracao) return null;

    const calculo =
      memoria?.calculo_tributario ||
      memoria?.calculoTributario ||
      {};

    const resultado =
      calculo?.resultado ||
      {};

    const dasConferidoObj =
      calculo?.dasConferido ||
      resultado?.dasConferido ||
      {};

    const comparacao =
      calculo?.comparacao ||
      resultado?.comparacao ||
      {};

    const valoresConferidos =
      dasConferidoObj?.valoresConferidos ||
      {};

    const pgdas =
      memoria?.fontes?.pgdas ||
      {};

    const loteXmlMemoria =
      memoria?.fontes?.lote_xml ||
      {};

    const empresa = firstDefined(
      memoria?.cliente?.razao_social,
      memoria?.cliente?.nome,
      pick(memoria, [
        "empresa.nome",
        "empresa.razao_social",
        "cliente.nome",
        "cliente.razao_social",
        "razao_social",
        "empresa_nome",
      ]),
      pick(apuracao, [
        "empresa.nome",
        "empresa.razao_social",
        "cliente.nome",
        "cliente.razao_social",
        "razao_social",
        "empresa_nome",
        "cliente_nome",
      ]),
      "Empresa não identificada"
    );

    const cnpj = firstDefined(
      memoria?.cliente?.cnpj,
      pick(memoria, [
        "empresa.cnpj",
        "cliente.cnpj",
        "cnpj",
      ]),
      pick(apuracao, [
        "empresa.cnpj",
        "cliente.cnpj",
        "cnpj",
        "cliente_cnpj",
      ]),
      "—"
    );

    const competencia = firstDefined(
      memoria?.competencia,
      apuracao?.competencia,
      pick(memoria, [
        "competencia",
        "periodo_apuracao",
        "pa",
      ]),
      pick(apuracao, [
        "competencia",
        "periodo_apuracao",
        "pa",
      ]),
      "—"
    );

    const receitaOriginal = firstDefined(
      resultado?.receita?.originalmenteDeclaradaPgdas,
      pgdas?.receita_bruta_total,
      memoria?.conferencia?.receita_declarada_pgdas,
      apuracao?.receita_apurada,
      pick(memoria, [
        "receita.original",
        "receita.receita_original",
        "receita_original",
        "receita_declarada",
        "receita.pgdas",
        "pgdas.receita_declarada",
      ]),
      pick(apuracao, [
        "receita_original",
        "receita_declarada",
        "receita",
      ]),
      0
    );

    const receitaDocumental = firstDefined(
      memoria?.conferencia?.receita_documental,
      pick(memoria, [
        "receita.documental",
        "receita.receita_documental",
        "receita_documental",
        "documentos.receita_total",
        "xml.receita_total",
      ]),
      pick(apuracao, [
        "receita_documental",
      ]),
      0
    );

    const receitaConsiderada = firstDefined(
      resultado?.receita?.consideradaNaApuracao,
      calculo?.basePisCofins?.receitaTotalConsiderada,
      apuracao?.receita_apurada,
      pick(memoria, [
        "receita.considerada",
        "receita.receita_considerada",
        "receita_considerada",
        "base_receita_considerada",
      ]),
      pick(apuracao, [
        "receita_considerada",
        "receita_total",
      ]),
      receitaOriginal
    );

    const receitaTributada = firstDefined(
      resultado?.receita?.integralmenteTributadaPisCofins,
      calculo?.basePisCofins?.receitaTributadaPisCofins,
      pick(memoria, [
        "receita.tributada",
        "receita.receita_tributada",
        "receita_tributada",
        "segregacao.receita_tributada",
        "segregacao.tributada",
        "pis_cofins.receita_tributada",
      ]),
      pick(apuracao, [
        "receita_tributada",
      ]),
      0
    );

    const receitaTratamentoEspecifico = firstDefined(
      resultado?.receita?.tratamentoEspecificoPisCofins,
      calculo?.basePisCofins?.receitaTratamentoEspecifico,
      pick(memoria, [
        "receita.tratamento_especifico",
        "receita.receita_tratamento_especifico",
        "receita_monofasica",
        "receita_monofasicos",
        "segregacao.receita_monofasica",
        "segregacao.tratamento_especifico",
        "pis_cofins.receita_monofasica",
      ]),
      pick(apuracao, [
        "receita_monofasica",
        "receita_tratamento_especifico",
      ]),
      0
    );

    const dasOriginal = firstDefined(
      resultado?.valoresOriginais?.das,
      comparacao?.dasOriginal,
      pgdas?.das,
      pick(memoria, [
        "das.original",
        "das.valor_original",
        "das_original",
        "pgdas.das_original",
      ]),
      pick(apuracao, [
        "das_original",
        "valor_das_original",
        "das",
      ]),
      0
    );

    const dasConferido = firstDefined(
      resultado?.valoresConferidos?.das,
      valoresConferidos?.das,
      apuracao?.imposto_apurado,
      pick(memoria, [
        "das.conferido",
        "das.valor_conferido",
        "das_conferido",
      ]),
      pick(apuracao, [
        "das_conferido",
        "valor_das_conferido",
      ]),
      dasOriginal
    );

    const creditoPis = firstDefined(
      resultado?.credito?.pis,
      pick(memoria, [
        "creditos.pis",
        "credito.pis",
        "resultado.credito_pis",
        "credito_pis",
      ]),
      pick(apuracao, [
        "credito_pis",
      ]),
      0
    );

    const creditoCofins = firstDefined(
      resultado?.credito?.cofins,
      pick(memoria, [
        "creditos.cofins",
        "credito.cofins",
        "resultado.credito_cofins",
        "credito_cofins",
      ]),
      pick(apuracao, [
        "credito_cofins",
      ]),
      0
    );

    const creditoTotal = firstDefined(
      resultado?.credito?.total,
      pick(memoria, [
        "creditos.total",
        "credito.total",
        "resultado.credito_total",
        "credito_total",
      ]),
      pick(apuracao, [
        "credito_total",
      ]),
      toNumber(creditoPis) + toNumber(creditoCofins)
    );

    const dataApuracao = firstDefined(
      memoria?.gerado_em,
      pick(memoria, [
        "data_apuracao",
        "apuracao.data",
        "gerado_em",
        "created_at",
      ]),
      pick(apuracao, [
        "data_apuracao",
        "updated_at",
        "created_at",
      ])
    );

    const pgdasIdentificacao = firstDefined(
      pgdas?.numero_declaracao,
      pgdas?.id,
      pick(memoria, [
        "pgdas.identificacao",
        "pgdas.numero_declaracao",
        "pgdas.recibo",
        "documento_origem.pgdas",
        "pgdas_id",
      ]),
      pick(apuracao, [
        "pgdas_identificacao",
        "pgdas_id",
      ]),
      "PGDAS-D da competência"
    );

    const loteXml = firstDefined(
      loteXmlMemoria?.nome,
      loteXmlMemoria?.id,
      pick(memoria, [
        "documentos.lote_xml",
        "xml.lote",
        "lote_xml",
        "documento_origem.lote_xml",
      ]),
      pick(apuracao, [
        "lote_xml",
      ]),
      "—"
    );

    const rbt12 = firstDefined(
      dasConferidoObj?.rbt12,
      pgdas?.rbt12,
      pick(memoria, [
        "rbt12",
        "simples.rbt12",
        "pgdas.rbt12",
      ]),
      pick(apuracao, [
        "rbt12",
      ]),
      0
    );

    const aliquotaEfetiva = firstDefined(
      dasConferidoObj?.aliquotaEfetiva,
      calculo?.pisCofins?.aliquotaEfetiva,
      apuracao?.aliquota_efetiva,
      pick(memoria, [
        "aliquota_efetiva",
        "simples.aliquota_efetiva",
        "apuracao.aliquota_efetiva",
      ]),
      pick(apuracao, [
        "aliquota_efetiva",
        "aliquota",
      ])
    );

    const decisaoCodigo = firstDefined(
      memoria?.conferencia?.decisao_divergencia,
      memoria?.decisao_divergencia,
      pick(memoria, [
        "decisao_adotada",
        "decisao.receita",
        "divergencia.decisao",
        "conferencia.decisao",
      ])
    );

    const decisaoAdotada = {
      interromper: "Interromper apuração",
      manter_divergencia: "Manter divergência",
      usar_receita_declarada: "Usar receita declarada",
    }[decisaoCodigo] || decisaoCodigo || "—";

    const tributos = ["PIS", "COFINS", "IRPJ", "CSLL", "CPP", "ICMS"].map(
      (codigo) => normalizeTributo(memoria, apuracao, codigo)
    );

    tributos.push({
      codigo: "DAS",
      original: toNumber(dasOriginal),
      conferido: toNumber(dasConferido),
      diferenca: toNumber(dasOriginal) - toNumber(dasConferido),
      preservado: false,
      foraEscopo: false,
    });

    return {
      empresa,
      cnpj,
      competencia,
      receitaOriginal: toNumber(receitaOriginal),
      receitaDocumental: toNumber(receitaDocumental),
      receitaConsiderada: toNumber(receitaConsiderada),
      receitaTributada: toNumber(receitaTributada),
      receitaTratamentoEspecifico: toNumber(receitaTratamentoEspecifico),
      dasOriginal: toNumber(dasOriginal),
      dasConferido: toNumber(dasConferido),
      creditoPis: toNumber(creditoPis),
      creditoCofins: toNumber(creditoCofins),
      creditoTotal: toNumber(creditoTotal),
      dataApuracao,
      pgdasIdentificacao,
      loteXml,
      rbt12: toNumber(rbt12),
      aliquotaEfetiva,
      decisaoAdotada,
      tributos,
    };
  }, [apuracao, memoria]);

  const dadosExibicao = useMemo(() => {
    return versaoVisualizada?.snapshot?.dados_exibidos || dados;
  }, [versaoVisualizada, dados]);

  const versaoEmExibicao = versaoVisualizada || ultimaVersao;

  const metadadosEmExibicao = versaoVisualizada
    ? {
        responsavel: versaoVisualizada.responsavel || "",
        protocolo: versaoVisualizada.protocolo || "",
        dataRetificacao: versaoVisualizada.data_retificacao || "",
        observacoes: versaoVisualizada.observacoes || "",
        status: versaoVisualizada.status || "Rascunho",
      }
    : metadados;

  function handleAbrirVersao(item) {
    if (!item?.snapshot?.dados_exibidos) {
      alert(
        "Esta versão não possui o snapshot completo do Espelho e não pode ser aberta."
      );
      return;
    }

    setVersaoVisualizada(item);
    setHistoricoAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleVoltarVersaoAtual() {
    setVersaoVisualizada(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function carregarHistoricoEspelho({ abrir = false } = {}) {
    if (Array.isArray(versoesExternas) && versoesExternas.length) {
      const versoes = [...versoesExternas].sort((a, b) => {
        const dataB = new Date(b?.created_at || 0).getTime();
        const dataA = new Date(a?.created_at || 0).getTime();
        if (dataB !== dataA) return dataB - dataA;
        return Number(b?.versao || 0) - Number(a?.versao || 0);
      });

      setHistoricoVersoes(versoes);
      setUltimaVersao(versoes[0] || null);

      if (versaoInicial) {
        setVersaoVisualizada(versaoInicial);
      }

      if (abrir) setHistoricoAberto(true);
      return versoes;
    }

    if (!apuracao?.id) {
      if (abrir) {
        alert("A apuração precisa estar salva antes de consultar o histórico do Espelho.");
      }
      return [];
    }

    try {
      setCarregandoHistorico(true);

      const { data, error } = await supabase
        .from("espelhos_retificacao_pgdas")
        .select("*")
        .eq("apuracao_id", String(apuracao.id))
        .order("versao", { ascending: false });

      if (error) throw error;

      const versoes = Array.isArray(data) ? data : [];
      setHistoricoVersoes(versoes);

      const maisRecente = versoes[0] || null;
      setUltimaVersao(maisRecente);

      if (maisRecente) {
        setMetadados({
          responsavel: maisRecente.responsavel || "",
          protocolo: maisRecente.protocolo || "",
          dataRetificacao: maisRecente.data_retificacao || "",
          observacoes: maisRecente.observacoes || "",
          status: maisRecente.status || "Rascunho",
        });
      }

      if (abrir) {
        setHistoricoAberto(true);
      }

      return versoes;
    } catch (error) {
      const mensagem = error?.message || "Erro desconhecido.";

      if (
        /espelhos_retificacao_pgdas/i.test(mensagem) ||
        /relation .* does not exist/i.test(mensagem)
      ) {
        alert(
          "A tabela espelhos_retificacao_pgdas ainda não existe no Supabase. Execute a migração SQL do Espelho e tente novamente."
        );
      } else {
        alert("Erro ao carregar o histórico do Espelho: " + mensagem);
      }

      return [];
    } finally {
      setCarregandoHistorico(false);
    }
  }

  useEffect(() => {
    if (Array.isArray(versoesExternas) && versoesExternas.length) {
      carregarHistoricoEspelho();
      return;
    }

    if (!apuracao?.id) return;
    carregarHistoricoEspelho();
    // O Espelho permanece vinculado ao registro salvo da apuração.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apuracao?.id, versaoInicial, versoesExternas]);

  function handleEditarAdministrativo() {
    setEditandoAdministrativo(true);
  }

  function handleAplicarEdicaoAdministrativa() {
    setEditandoAdministrativo(false);
  }

  async function handleSalvarEspelho() {
    if (!apuracao?.id) {
      alert("A apuração precisa estar salva antes de salvar o Espelho de Retificação.");
      return;
    }

    if (!dados) {
      alert("Não foi possível montar os dados do Espelho.");
      return;
    }

    try {
      setSalvandoEspelho(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) {
        throw new Error("Usuário autenticado não identificado.");
      }

      const versoesAtuais = await carregarHistoricoEspelho();
      const maiorVersao = versoesAtuais.reduce(
        (maior, item) => Math.max(maior, Number(item?.versao || 0)),
        0
      );
      const novaVersao = maiorVersao + 1;

      const snapshot = {
        gerado_em: new Date().toISOString(),
        apuracao_id: apuracao.id,
        competencia: dados.competencia,
        dados_exibidos: dados,
        memoria_calculo: memoria,
      };

      const payload = {
        usuario_id: user.id,
        apuracao_id: String(apuracao.id),
        cliente_id:
          apuracao?.cliente_id != null
            ? String(apuracao.cliente_id)
            : memoria?.cliente?.id != null
              ? String(memoria.cliente.id)
              : null,
        competencia: String(dados.competencia || ""),
        versao: novaVersao,
        status: metadados.status || "Rascunho",
        responsavel: metadados.responsavel.trim() || null,
        protocolo: metadados.protocolo.trim() || null,
        data_retificacao: metadados.dataRetificacao || null,
        observacoes: metadados.observacoes.trim() || null,
        snapshot,
      };

      const { data, error } = await supabase
        .from("espelhos_retificacao_pgdas")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setUltimaVersao(data);
      setVersaoVisualizada(null);
      setHistoricoVersoes((atual) => [
        data,
        ...atual.filter((item) => item.id !== data.id),
      ]);

      alert(`Espelho salvo com sucesso — versão ${novaVersao}.`);
    } catch (error) {
      const mensagem = error?.message || "Erro desconhecido.";

      if (
        /espelhos_retificacao_pgdas/i.test(mensagem) ||
        /relation .* does not exist/i.test(mensagem)
      ) {
        alert(
          "A tabela espelhos_retificacao_pgdas ainda não existe no Supabase. Execute a migração SQL do Espelho e tente novamente."
        );
      } else {
        alert("Erro ao salvar o Espelho: " + mensagem);
      }
    } finally {
      setSalvandoEspelho(false);
    }
  }

  function handleImprimir() {
    window.print()
  }

  function handleExportarPdf() {
    window.print()
  }

  function handleVoltar() {
  if (typeof onVoltar === 'function') {
    onVoltar()
  }
}

  if (!apuracao || !dados) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>!</div>

          <h1 style={styles.emptyTitle}>Espelho de Retificação do PGDAS-D</h1>

          <p style={styles.emptyText}>
            Nenhuma apuração foi recebida para gerar o espelho.
          </p>

          <p style={styles.emptySubtext}>
            Esta tela deve ser aberta a partir de uma apuração salva e homologada.
            Nenhum cálculo é executado aqui.
          </p>

          <button type="button" onClick={handleVoltar} style={styles.secondaryButton}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const totalSegregado =
    dadosExibicao.receitaTributada + dadosExibicao.receitaTratamentoEspecifico;

  const segregacaoFecha =
    Math.abs(totalSegregado - dadosExibicao.receitaConsiderada) < 0.02;

  return (
    <div className="espelho-print-root" style={styles.page}>
      <div style={styles.container}>
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #FFFFFF !important;
              overflow: visible !important;
            }

            body * {
              visibility: hidden !important;
            }

            .espelho-print-root,
            .espelho-print-root * {
              visibility: visible !important;
            }

            .espelho-print-root {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #FFFFFF !important;
              color: #1E293B !important;
              overflow: visible !important;
            }

            .espelho-print-root > div {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
            }

            .espelho-no-print {
              display: none !important;
              visibility: hidden !important;
            }

            .espelho-print-section {
              break-inside: avoid-page;
              page-break-inside: avoid;
              box-shadow: none !important;
            }

            .espelho-print-table {
              overflow: visible !important;
            }

            .espelho-print-table table {
              width: 100% !important;
              min-width: 0 !important;
              table-layout: auto !important;
            }

            .espelho-print-table thead {
              display: table-header-group;
            }

            .espelho-print-table tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            button {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        <header style={styles.header}>
          <div style={styles.headerMain}>
            <div style={styles.headerIcon}>ER</div>

            <div>
              <div style={styles.eyebrow}>Motor do Simples</div>

              <h1 style={styles.title}>Espelho de Retificação do PGDAS-D</h1>

              <p style={styles.subtitle}>
                Guia operacional gerado a partir da memória técnica da apuração salva.
                Esta tela não recalcula tributos.
              </p>
            </div>
          </div>

          <div className="espelho-no-print" style={styles.headerActions}>
            <button
              type="button"
              onClick={handleSalvarEspelho}
              disabled={salvandoEspelho || !!versaoVisualizada || modoConsulta}
              title={
                modoConsulta
                  ? "O Espelho foi aberto pelo Prontuário em modo de consulta."
                  : versaoVisualizada
                    ? "A versão histórica aberta é somente leitura."
                    : "Salva uma nova versão do Espelho sem alterar a memória técnica da apuração."
              }
              style={{
                ...styles.actionButton,
                ...(
                  salvandoEspelho || versaoVisualizada || modoConsulta
                    ? styles.actionDisabled
                    : {}
                ),
              }}
            >
              {salvandoEspelho ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              onClick={handleEditarAdministrativo}
              disabled={!!versaoVisualizada || modoConsulta}
              title={
                modoConsulta
                  ? "O Espelho foi aberto pelo Prontuário em modo de consulta."
                  : versaoVisualizada
                    ? "A versão histórica aberta é somente leitura."
                    : "Edita somente dados administrativos do Espelho. Valores tributários permanecem bloqueados."
              }
              style={{
                ...styles.actionButton,
                ...((versaoVisualizada || modoConsulta) ? styles.actionDisabled : {}),
              }}
            >
              Editar
            </button>

            <button
              type="button"
              onClick={() => carregarHistoricoEspelho({ abrir: true })}
              disabled={carregandoHistorico}
              title="Consulta as versões salvas deste Espelho."
              style={{
                ...styles.actionButton,
                ...(carregandoHistorico ? styles.actionDisabled : {}),
              }}
            >
              {carregandoHistorico ? "Carregando..." : "Histórico"}
            </button>

            {versaoVisualizada ? (
              <button
                type="button"
                onClick={handleVoltarVersaoAtual}
                title="Volta para o Espelho mais recente."
                style={{ ...styles.actionButton, ...styles.actionPdf }}
              >
                Voltar ao atual
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleImprimir}
              style={styles.actionButton}
            >
              Imprimir
            </button>

            <button
              type="button"
              onClick={handleExportarPdf}
              title="Abre a impressão do navegador para salvar em PDF."
              style={{ ...styles.actionButton, ...styles.actionPdf }}
            >
              Exportar PDF
            </button>

            <StatusBadge
              tone={
                (
                  versaoEmExibicao?.status ||
                  metadadosEmExibicao.status
                ) === "Transmitida"
                  ? "success"
                  : "warning"
              }
            >
              {versaoEmExibicao
                ? `${
                    versaoVisualizada
                      ? "Visualizando "
                      : ""
                  }Espelho v${versaoEmExibicao.versao} • ${
                    versaoEmExibicao.status || "Rascunho"
                  }`
                : "Espelho ainda não salvo"}
            </StatusBadge>

            <button
              type="button"
              onClick={handleVoltar}
              style={styles.secondaryButton}
            >
              ← Voltar
            </button>
          </div>
        </header>

        {versaoVisualizada ? (
          <section
            className="espelho-no-print"
            style={styles.historyViewBanner}
          >
            <div>
              <strong>
                Visualizando Espelho v{versaoVisualizada.versao}
              </strong>
              <span style={{ marginLeft: 6 }}>
                Esta versão está em somente leitura.
              </span>
            </div>

            <button
              type="button"
              onClick={handleVoltarVersaoAtual}
              style={styles.historyViewBack}
            >
              Voltar ao Espelho atual
            </button>
          </section>
        ) : null}

        <section style={styles.alertBox}>
          <strong>Regra do Espelho:</strong>{" "}
          os valores abaixo refletem o snapshot técnico salvo na competência.
          O objetivo é orientar a retificação do PGDAS-D com rastreabilidade
          entre o valor original, o valor conferido e a diferença identificada.
        </section>

        <section style={styles.adminStrip}>
          <div style={styles.adminItem}>
            <span style={styles.adminLabel}>Versão salva</span>
            <strong style={styles.adminValue}>
              {versaoEmExibicao ? `v${versaoEmExibicao.versao}` : "—"}
            </strong>
          </div>

          <div style={styles.adminItem}>
            <span style={styles.adminLabel}>Responsável</span>
            <strong style={styles.adminValue}>
              {metadadosEmExibicao.responsavel || "—"}
            </strong>
          </div>

          <div style={styles.adminItem}>
            <span style={styles.adminLabel}>Protocolo</span>
            <strong style={styles.adminValue}>
              {metadadosEmExibicao.protocolo || "—"}
            </strong>
          </div>

          <div style={styles.adminItem}>
            <span style={styles.adminLabel}>Status</span>
            <strong style={styles.adminValue}>
              {metadadosEmExibicao.status || "Rascunho"}
            </strong>
          </div>
        </section>

        <section className="espelho-print-section" style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionKicker}>IDENTIFICAÇÃO</div>
              <h2 style={styles.sectionTitle}>Empresa e competência</h2>
            </div>

            <StatusBadge tone="success">Espelho gerado</StatusBadge>
          </div>

          <div style={styles.grid4}>
            <InfoCard label="Empresa" value={dadosExibicao.empresa} />
            <InfoCard label="CNPJ" value={dadosExibicao.cnpj} />
            <InfoCard
              label="Competência"
              value={formatCompetencia(dadosExibicao.competencia)}
            />
            <InfoCard
              label="Data da apuração"
              value={formatDate(dadosExibicao.dataApuracao)}
            />
          </div>
        </section>

        <section className="espelho-print-section" style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionKicker}>DOCUMENTO DE ORIGEM</div>
              <h2 style={styles.sectionTitle}>Base documental da conferência</h2>
            </div>
          </div>

          <div style={styles.grid4}>
            <InfoCard
              label="PGDAS-D utilizado"
              value={dadosExibicao.pgdasIdentificacao}
            />
            <InfoCard label="Lote XML" value={dadosExibicao.loteXml} />
            <InfoCard label="RBT12" value={formatMoney(dadosExibicao.rbt12)} />
            <InfoCard
              label="Alíquota efetiva"
              value={
                dadosExibicao.aliquotaEfetiva !== undefined &&
                dadosExibicao.aliquotaEfetiva !== null &&
                dadosExibicao.aliquotaEfetiva !== ""
                  ? formatPercent(dadosExibicao.aliquotaEfetiva)
                  : "—"
              }
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <InfoCard
              label="Decisão adotada na conferência"
              value={dadosExibicao.decisaoAdotada}
              helper="A decisão é apenas exibida conforme foi salva na memória técnica."
            />
          </div>
        </section>

        <section className="espelho-print-section" style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionKicker}>RECEITA</div>
              <h2 style={styles.sectionTitle}>
                Receita original, considerada e segregada
              </h2>
            </div>
          </div>

          <div style={styles.grid4}>
            <InfoCard
              label="Receita declarada no PGDAS"
              value={formatMoney(dadosExibicao.receitaOriginal)}
              helper="Valor original declarado."
            />

            <InfoCard
              label="Receita documental"
              value={formatMoney(dadosExibicao.receitaDocumental)}
              helper="Valor identificado nos documentos fiscais."
            />

            <InfoCard
              label="Receita considerada"
              value={formatMoney(dadosExibicao.receitaConsiderada)}
              helper="Valor efetivamente adotado na apuração homologada."
            />

            <InfoCard
              label="Receita total preservada"
              value={formatMoney(dadosExibicao.receitaConsiderada)}
              helper="O espelho não reduz a receita total da competência."
            />
          </div>

          <div style={styles.segregacaoBox}>
            <div style={styles.segregacaoHeader}>
              <div>
                <div style={styles.sectionKicker}>SEGREGAÇÃO PARA RETIFICAÇÃO</div>
                <h3 style={styles.subsectionTitle}>
                  Como a receita deve ficar distribuída
                </h3>
              </div>

              <StatusBadge tone={segregacaoFecha ? "success" : "warning"}>
                {segregacaoFecha
                  ? "Segregação compatível com a receita considerada"
                  : "Conferir segregação salva"}
              </StatusBadge>
            </div>

            <div style={styles.grid3}>
              <InfoCard
                label="Receita tributada normalmente"
                value={formatMoney(dadosExibicao.receitaTributada)}
                helper="Parcela que permanece com tributação normal."
              />

              <InfoCard
                label="Tratamento específico PIS/COFINS"
                value={formatMoney(dadosExibicao.receitaTratamentoEspecifico)}
                helper="Parcela identificada para tratamento específico."
              />

              <InfoCard
                label="Total da segregação"
                value={formatMoney(totalSegregado)}
                helper="Somatório das parcelas acima."
              />
            </div>

            <div style={styles.guidanceBox}>
              <strong>Orientação operacional:</strong>{" "}
              a receita total da competência deve permanecer preservada. O que muda
              na retificação é a distribuição da receita entre a parcela tributada
              normalmente e a parcela com tratamento específico de PIS/COFINS,
              conforme os valores já consolidados na apuração.
            </div>
          </div>
        </section>

        <section className="espelho-print-section" style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionKicker}>COMPARAÇÃO TRIBUTÁRIA</div>
              <h2 style={styles.sectionTitle}>
                PGDAS original × apuração conferida
              </h2>
            </div>
          </div>

          <div className="espelho-print-table" style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thLeft}>Tributo</th>
                  <th style={styles.thRight}>Original PGDAS</th>
                  <th style={styles.thRight}>Conferido</th>
                  <th style={styles.thRight}>Diferença</th>
                  <th style={styles.thCenter}>Tratamento</th>
                </tr>
              </thead>

              <tbody>
                {dadosExibicao.tributos.map((tributo) => {
                  const isPisCofins =
                    tributo.codigo === "PIS" || tributo.codigo === "COFINS";

                  const isIcms = tributo.codigo === "ICMS";

                  return (
                    <tr key={tributo.codigo}>
                      <td style={styles.tdLeft}>
                        <strong>{tributo.codigo}</strong>
                      </td>

                      <td style={styles.tdRight}>
                        {formatMoney(tributo.original)}
                      </td>

                      <td style={styles.tdRight}>
                        {isIcms && tributo.preservado
                          ? formatMoney(tributo.original)
                          : formatMoney(tributo.conferido)}
                      </td>

                      <td style={styles.tdRight}>
                        {isIcms && tributo.preservado
                          ? "—"
                          : formatMoney(tributo.diferenca)}
                      </td>

                      <td style={styles.tdCenter}>
                        {tributo.preservado ? (
                          <StatusBadge tone="neutral">Preservado</StatusBadge>
                        ) : isPisCofins ? (
                          <StatusBadge tone="success">
                            Escopo PIS/COFINS
                          </StatusBadge>
                        ) : tributo.codigo === "DAS" ? (
                          <StatusBadge tone="neutral">Resultado global</StatusBadge>
                        ) : (
                          <StatusBadge tone="neutral">
                            Sem alteração automática
                          </StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={styles.tableNote}>
            Tributos fora do escopo da tese podem ser demonstrados para fins de
            conferência e rastreabilidade, mas não devem ser transformados
            automaticamente em alteração no PGDAS-D por esta tela.
          </p>
        </section>

        <section className="espelho-print-section" style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionKicker}>RESULTADO</div>
              <h2 style={styles.sectionTitle}>Valor identificado na competência</h2>
            </div>
          </div>

          <div style={styles.resultGrid}>
            <div style={styles.resultCard}>
              <div style={styles.resultLabel}>Crédito PIS</div>
              <div style={styles.resultValue}>
                {formatMoney(dadosExibicao.creditoPis)}
              </div>
            </div>

            <div style={styles.resultCard}>
              <div style={styles.resultLabel}>Crédito COFINS</div>
              <div style={styles.resultValue}>
                {formatMoney(dadosExibicao.creditoCofins)}
              </div>
            </div>

            <div style={styles.resultCardStrong}>
              <div style={styles.resultLabel}>Crédito total identificado</div>
              <div style={styles.resultValueStrong}>
                {formatMoney(dadosExibicao.creditoTotal)}
              </div>
            </div>
          </div>
        </section>

        <section className="espelho-print-section" style={styles.section}>
          <div style={styles.sectionHeading}>
            <div>
              <div style={styles.sectionKicker}>SITUAÇÃO OPERACIONAL</div>
              <h2 style={styles.sectionTitle}>Andamento da retificação</h2>
            </div>
          </div>

          <div style={styles.statusPanel}>
            <div>
              <div style={styles.statusTitle}>Espelho gerado</div>
              <div style={styles.statusText}>
                Retificação ainda não marcada como transmitida.
              </div>
            </div>

            <div style={styles.statusSteps}>
              <div style={styles.statusStepDone}>
                <span style={styles.stepDotDone}>1</span>
                Apuração concluída
              </div>

              <div style={styles.statusStepDone}>
                <span style={styles.stepDotDone}>2</span>
                Espelho gerado
              </div>

              <div style={styles.statusStepPending}>
                <span style={styles.stepDotPending}>3</span>
                Retificação pendente
              </div>

              <div style={styles.statusStepPending}>
                <span style={styles.stepDotPending}>4</span>
                Recuperação posterior
              </div>
            </div>
          </div>
        </section>

        {editandoAdministrativo && (
          <div className="espelho-no-print" style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.sectionKicker}>EDITAR ESPELHO</div>
                  <div style={styles.modalTitle}>Dados administrativos</div>
                  <div style={styles.modalSubtitle}>
                    Os valores tributários permanecem bloqueados e são sempre lidos da memória técnica.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditandoAdministrativo(false)}
                  style={styles.modalClose}
                >
                  ×
                </button>
              </div>

              <div style={styles.formGrid}>
                <label style={styles.fieldWrap}>
                  <span style={styles.fieldLabel}>Responsável</span>
                  <input
                    value={metadados.responsavel}
                    onChange={(e) =>
                      setMetadados((atual) => ({
                        ...atual,
                        responsavel: e.target.value,
                      }))
                    }
                    style={styles.input}
                    placeholder="Nome do responsável"
                  />
                </label>

                <label style={styles.fieldWrap}>
                  <span style={styles.fieldLabel}>Protocolo da retificação</span>
                  <input
                    value={metadados.protocolo}
                    onChange={(e) =>
                      setMetadados((atual) => ({
                        ...atual,
                        protocolo: e.target.value,
                      }))
                    }
                    style={styles.input}
                    placeholder="Protocolo, recibo ou referência"
                  />
                </label>

                <label style={styles.fieldWrap}>
                  <span style={styles.fieldLabel}>Data da retificação</span>
                  <input
                    type="date"
                    value={metadados.dataRetificacao}
                    onChange={(e) =>
                      setMetadados((atual) => ({
                        ...atual,
                        dataRetificacao: e.target.value,
                      }))
                    }
                    style={styles.input}
                  />
                </label>

                <label style={styles.fieldWrap}>
                  <span style={styles.fieldLabel}>Status</span>
                  <select
                    value={metadados.status}
                    onChange={(e) =>
                      setMetadados((atual) => ({
                        ...atual,
                        status: e.target.value,
                      }))
                    }
                    style={styles.input}
                  >
                    <option value="Rascunho">Rascunho</option>
                    <option value="Retificação pendente">Retificação pendente</option>
                    <option value="Transmitida">Transmitida</option>
                  </select>
                </label>

                <label style={{ ...styles.fieldWrap, gridColumn: "1 / -1" }}>
                  <span style={styles.fieldLabel}>Observações</span>
                  <textarea
                    value={metadados.observacoes}
                    onChange={(e) =>
                      setMetadados((atual) => ({
                        ...atual,
                        observacoes: e.target.value,
                      }))
                    }
                    style={{ ...styles.input, minHeight: 82, resize: "vertical" }}
                    placeholder="Observações administrativas sobre a retificação."
                  />
                </label>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setEditandoAdministrativo(false)}
                  style={styles.secondaryButton}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleAplicarEdicaoAdministrativa}
                  style={styles.primaryButton}
                >
                  Aplicar alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {historicoAberto && (
          <div className="espelho-no-print" style={styles.modalOverlay}>
            <div style={{ ...styles.modalCard, maxWidth: 860 }}>
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.sectionKicker}>HISTÓRICO</div>
                  <div style={styles.modalTitle}>
                    Versões do Espelho — {formatCompetencia(dadosExibicao.competencia)}
                  </div>
                  <div style={styles.modalSubtitle}>
                    Cada salvamento gera uma nova versão. Nenhuma versão altera a memória técnica da apuração.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHistoricoAberto(false)}
                  style={styles.modalClose}
                >
                  ×
                </button>
              </div>

              {historicoVersoes.length === 0 ? (
                <div style={styles.historyEmpty}>
                  Nenhuma versão do Espelho foi salva para esta competência.
                </div>
              ) : (
                <div style={styles.historyList}>
                  {historicoVersoes.map((item) => (
                    <div key={item.id} style={styles.historyRow}>
                      <div style={styles.historyVersion}>v{item.versao}</div>

                      <div style={styles.historyBody}>
                        <div style={styles.historyTop}>
                          <strong>{item.status || "Rascunho"}</strong>
                          <span>
                            {item.created_at ? formatDate(item.created_at) : "—"}
                          </span>
                        </div>

                        <div style={styles.historyMeta}>
                          Responsável: {item.responsavel || "—"} • Protocolo:{" "}
                          {item.protocolo || "—"}
                        </div>

                        {item.observacoes ? (
                          <div style={styles.historyNote}>{item.observacoes}</div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAbrirVersao(item)}
                        style={styles.historyOpenButton}
                      >
                        Abrir
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setHistoricoAberto(false)}
                  style={styles.primaryButton}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer style={styles.footer}>
          <div style={styles.footerNote}>
            <strong>Importante:</strong> este espelho é um guia operacional baseado
            na memória da apuração salva. Nesta versão, nenhuma informação é
            recalculada, alterada ou transmitida ao PGDAS-D.
          </div>

          <button
            className="espelho-no-print"
            type="button"
            onClick={handleVoltar}
            style={styles.primaryButton}
          >
            Voltar para Apuração
          </button>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
    color: "#1E293B",
    padding: "14px 14px 24px",
    boxSizing: "border-box",
    fontFamily: "Inter, Arial, sans-serif",
  },

  container: {
    width: "100%",
    maxWidth: 1320,
    margin: "0 auto",
  },

  header: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 11,
    padding: "14px 16px",
    marginBottom: 10,
    boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },

  headerMain: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 320,
    flex: 1,
  },

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: "#EFF6FF",
    border: "1px solid #DBEAFE",
    color: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.4,
    flex: "0 0 auto",
  },

  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },

  eyebrow: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: 800,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  title: {
    fontSize: 20,
    fontWeight: 750,
    color: "#0B1F4D",
    lineHeight: 1.15,
    margin: 0,
  },

  subtitle: {
    margin: "6px 0 0",
    maxWidth: 780,
    color: "#64748B",
    fontSize: 11,
    lineHeight: 1.5,
  },

  alertBox: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 11,
    padding: "9px 12px",
    marginBottom: 10,
    boxShadow: "0 3px 12px rgba(15,23,42,0.035)",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#64748B",
  },

  section: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 11,
    padding: "9px 12px",
    marginBottom: 10,
    boxShadow: "0 3px 12px rgba(15,23,42,0.035)",
  },

  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 7,
    flexWrap: "wrap",
  },

  sectionKicker: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    color: "#0B1F4D",
    lineHeight: 1.25,
  },

  subsectionTitle: {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    color: "#0B1F4D",
    lineHeight: 1.25,
  },

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 8,
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))",
    gap: 8,
  },

  infoCard: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 9,
    padding: "7px 10px",
    minHeight: 50,
    boxSizing: "border-box",
  },

  infoLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 2,
    lineHeight: 1.2,
  },

  infoValue: {
    color: "#1E293B",
    fontSize: 11,
    fontWeight: 600,
    lineHeight: 1.25,
    wordBreak: "break-word",
  },

  infoHelper: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 2,
    lineHeight: 1.35,
  },

  segregacaoBox: {
    marginTop: 8,
    border: "1px solid #E2E8F0",
    borderRadius: 9,
    padding: "8px 10px",
    background: "#F8FAFC",
  },

  segregacaoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 7,
    flexWrap: "wrap",
  },

  guidanceBox: {
    marginTop: 7,
    padding: "7px 9px",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 8,
    color: "#64748B",
    fontSize: 9,
    lineHeight: 1.4,
  },

  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #E2E8F0",
    borderRadius: 9,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 820,
    background: "#FFFFFF",
  },

  thLeft: {
    textAlign: "left",
    padding: "8px 10px",
    background: "#4B5563",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 700,
    borderBottom: "1px solid #E2E8F0",
  },

  thRight: {
    textAlign: "right",
    padding: "8px 10px",
    background: "#4B5563",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 700,
    borderBottom: "1px solid #E2E8F0",
  },

  thCenter: {
    textAlign: "center",
    padding: "8px 10px",
    background: "#4B5563",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: 700,
    borderBottom: "1px solid #E2E8F0",
  },

  tdLeft: {
    textAlign: "left",
    padding: "7px 10px",
    borderBottom: "1px solid #EEF2F7",
    fontSize: 10,
    fontWeight: 400,
    color: "#1E293B",
  },

  tdRight: {
    textAlign: "right",
    padding: "7px 10px",
    borderBottom: "1px solid #EEF2F7",
    fontSize: 10,
    fontWeight: 400,
    color: "#1E293B",
    whiteSpace: "nowrap",
  },

  tdCenter: {
    textAlign: "center",
    padding: "7px 10px",
    borderBottom: "1px solid #EEF2F7",
    fontSize: 10,
    fontWeight: 400,
  },

  tableNote: {
    margin: "6px 0 0",
    color: "#64748B",
    fontSize: 9,
    lineHeight: 1.35,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
  },

  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
  },

  resultCard: {
    border: "1px solid #E2E8F0",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#FFFFFF",
    minHeight: 58,
  },

  resultCardStrong: {
    border: "1px solid #BFDBFE",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#EFF6FF",
    minHeight: 58,
  },

  resultLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748B",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },

  resultValue: {
    fontSize: 18,
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#0B1F4D",
  },

  resultValueStrong: {
    fontSize: 18,
    lineHeight: 1.05,
    fontWeight: 800,
    color: "#2563EB",
  },

  statusPanel: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 9,
    padding: "8px 10px",
  },

  statusTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: "#0B1F4D",
  },

  statusText: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 2,
  },

  statusSteps: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  statusStepDone: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#1E293B",
    fontSize: 9,
    fontWeight: 600,
  },

  statusStepPending: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#64748B",
    fontSize: 9,
    fontWeight: 600,
  },

  stepDotDone: {
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#0B1F4D",
    color: "#FFFFFF",
    fontSize: 8.5,
    fontWeight: 700,
  },

  stepDotPending: {
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#E2E8F0",
    color: "#64748B",
    fontSize: 8.5,
    fontWeight: 700,
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingTop: 2,
    flexWrap: "wrap",
  },

  footerNote: {
    maxWidth: 900,
    color: "#64748B",
    fontSize: 9,
    lineHeight: 1.4,
  },

  actionButton: {
    appearance: "none",
    minHeight: 34,
    border: "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#1E293B",
    borderRadius: 7,
    padding: "0 12px",
    fontWeight: 600,
    fontSize: 10,
    cursor: "pointer",
  },

  actionPdf: {
    color: "#2563EB",
    border: "1px solid #BFDBFE",
  },

  actionDisabled: {
    color: "#94A3B8",
    background: "#F8FAFC",
    cursor: "not-allowed",
    opacity: 1,
  },

  primaryButton: {
    appearance: "none",
    border: "1px solid #0B1F4D",
    background: "#0B1F4D",
    color: "#FFFFFF",
    borderRadius: 7,
    padding: "8px 12px",
    fontWeight: 700,
    fontSize: 10,
    cursor: "pointer",
  },

  secondaryButton: {
    appearance: "none",
    minHeight: 34,
    border: "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#64748B",
    borderRadius: 7,
    padding: "0 12px",
    fontWeight: 600,
    fontSize: 10,
    cursor: "pointer",
  },

  adminStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 11,
    padding: "8px 10px",
    marginBottom: 10,
    boxShadow: "0 3px 12px rgba(15,23,42,0.035)",
  },

  adminItem: {
    minWidth: 0,
    padding: "2px 6px",
  },

  adminLabel: {
    display: "block",
    color: "#64748B",
    fontSize: 9,
    fontWeight: 600,
    marginBottom: 2,
  },

  adminValue: {
    display: "block",
    color: "#1E293B",
    fontSize: 10,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(15,23,42,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88vh",
    overflowY: "auto",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
    padding: 16,
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 14,
  },

  modalTitle: {
    color: "#0B1F4D",
    fontSize: 16,
    fontWeight: 750,
    lineHeight: 1.2,
  },

  modalSubtitle: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 1.4,
    marginTop: 4,
    maxWidth: 620,
  },

  modalClose: {
    appearance: "none",
    border: "1px solid #E2E8F0",
    background: "#FFFFFF",
    color: "#64748B",
    width: 30,
    height: 30,
    borderRadius: 8,
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  fieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  fieldLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 36,
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#1E293B",
    padding: "8px 10px",
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 11,
    outline: "none",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #E2E8F0",
  },

  historyEmpty: {
    border: "1px dashed #CBD5E1",
    borderRadius: 9,
    padding: "18px 14px",
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    background: "#F8FAFC",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  historyRow: {
    display: "grid",
    gridTemplateColumns: "50px 1fr auto",
    gap: 10,
    alignItems: "start",
    border: "1px solid #E2E8F0",
    borderRadius: 9,
    padding: 10,
    background: "#FFFFFF",
  },

  historyVersion: {
    width: 42,
    height: 28,
    borderRadius: 8,
    background: "#EFF6FF",
    border: "1px solid #DBEAFE",
    color: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
  },

  historyBody: {
    minWidth: 0,
  },

  historyTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    color: "#1E293B",
    fontSize: 10,
  },

  historyMeta: {
    color: "#64748B",
    fontSize: 9.5,
    marginTop: 4,
  },

  historyNote: {
    color: "#475569",
    fontSize: 9.5,
    lineHeight: 1.4,
    marginTop: 5,
  },

  emptyState: {
    maxWidth: 620,
    margin: "60px auto",
    textAlign: "center",
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 11,
    padding: "28px 24px",
    boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
  },

  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    margin: "0 auto 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#EFF6FF",
    border: "1px solid #DBEAFE",
    color: "#2563EB",
    fontWeight: 800,
    fontSize: 13,
  },

  emptyTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 750,
    color: "#0B1F4D",
  },

  emptyText: {
    margin: "9px 0 0",
    color: "#1E293B",
    fontSize: 11,
    fontWeight: 600,
  },

  emptySubtext: {
    margin: "5px auto 14px",
    color: "#64748B",
    fontSize: 10,
    lineHeight: 1.4,
    maxWidth: 500,
  },
  historyOpenButton: {
    appearance: "none",
    minHeight: 30,
    border: "1px solid #BFDBFE",
    background: "#FFFFFF",
    color: "#2563EB",
    borderRadius: 7,
    padding: "0 12px",
    fontWeight: 700,
    fontSize: 10,
    cursor: "pointer",
    alignSelf: "center",
  },

  historyViewBanner: {
    background: "#EFF6FF",
    border: "1px solid #BFDBFE",
    borderRadius: 9,
    padding: "8px 11px",
    marginBottom: 10,
    color: "#1E40AF",
    fontSize: 10,
    lineHeight: 1.4,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },

  historyViewBack: {
    appearance: "none",
    minHeight: 28,
    border: "1px solid #BFDBFE",
    background: "#FFFFFF",
    color: "#2563EB",
    borderRadius: 7,
    padding: "0 10px",
    fontWeight: 700,
    fontSize: 9.5,
    cursor: "pointer",
  },

};
