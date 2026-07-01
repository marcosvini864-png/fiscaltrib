import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

    if (!cnpj) {
      return new Response(JSON.stringify({ erro: "CNPJ não informado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");

    if (cnpjLimpo.length !== 14) {
      return new Response(JSON.stringify({ erro: "CNPJ inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== RECEITA FEDERAL (BrasilAPI) =====
    let receita = null;
    try {
      const receitaRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (receitaRes.ok) {
        const d = await receitaRes.json();
        receita = {
          cnpj: cnpjLimpo,
          razao_social: d.razao_social || null,
          nome_fantasia: d.nome_fantasia || null,
          situacao_cadastral: d.descricao_situacao_cadastral || null,
          data_abertura: d.data_inicio_atividade || null,
          natureza_juridica: d.natureza_juridica || null,
          porte: d.porte || null,
          cnae_principal: d.cnae_fiscal?.toString() || null,
          cnae_descricao: d.cnae_fiscal_descricao || null,
          endereco_logradouro: d.logradouro || null,
          endereco_numero: d.numero || null,
          endereco_complemento: d.complemento || null,
          endereco_bairro: d.bairro || null,
          endereco_municipio: d.municipio || null,
          endereco_uf: d.uf || null,
          endereco_cep: d.cep || null,
          socios: d.qsa?.map((s: any) => ({
            nome: s.nome_socio,
            qualificacao: s.qualificacao_socio,
            cpf_parcial: s.cpf_representante_legal || null,
          })) || [],
        };
      }
    } catch (e) {
      receita = { erro: "Falha ao consultar Receita Federal" };
    }

    // ===== PGFN (Portal da Transparência) =====
    let pgfn = null;
    try {
      const apiKey = Deno.env.get("TRANSPARENCIA_API_KEY") || "";
      const pgfnRes = await fetch(
        `https://api.portaldatransparencia.gov.br/api-de-dados/lista-de-devedores?cnpjCpf=${cnpjLimpo}&pagina=1`,
        {
          headers: {
            "chave-api-dados": apiKey,
            "Accept": "application/json",
          },
        }
      );
      if (pgfnRes.ok) {
        const p = await pgfnRes.json();
        pgfn = {
          tem_divida: p.length > 0,
          qtd_inscricoes: p.length,
          valor_total: p.reduce((acc: number, item: any) => acc + (item.valorConsolidado || 0), 0),
          inscricoes: p.map((item: any) => ({
            numero: item.numeroCDA || null,
            situacao: item.situacaoInscricao || null,
            tipo_credito: item.tipoCredito || null,
            valor: item.valorConsolidado || null,
            data_inscricao: item.dataInscricao || null,
          })),
          raw: p,
        };
      } else {
        pgfn = { erro: "PGFN retornou status " + pgfnRes.status, raw: await pgfnRes.text() };
      }
    } catch (e) {
      pgfn = { erro: "Falha ao consultar PGFN: " + e.message };
    }

    return new Response(JSON.stringify({ receita, pgfn }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ erro: "Erro interno: " + error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});