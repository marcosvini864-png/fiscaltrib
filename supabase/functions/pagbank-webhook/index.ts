import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const BACKUP_EMAIL = "marcosvini864@gmail.com";

// Converte array de objetos para CSV
function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return "sem dados";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
      }).join(",")
    )
  ];
  return lines.join("\n");
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Tabelas para fazer backup
    const tabelas = [
      "clientes",
      "entradas",
      "assinaturas",
      "pagamentos",
      "recuperacoes",
      "acompanhamentos",
      "prazos_fiscais",
      "scores_fiscais",
    ];

    const resultados: { tabela: string; total: number; csv: string }[] = [];

    for (const tabela of tabelas) {
      try {
        const { data, error } = await supabase.from(tabela).select("*");
        if (error) {
          console.error(`Erro ao buscar ${tabela}:`, error.message);
          resultados.push({ tabela, total: 0, csv: `Erro: ${error.message}` });
        } else {
          resultados.push({ tabela, total: data?.length ?? 0, csv: toCSV(data ?? []) });
        }
      } catch (e) {
        resultados.push({ tabela, total: 0, csv: `Erro inesperado: ${e.message}` });
      }
    }

    const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const totalRegistros = resultados.reduce((acc, r) => acc + r.total, 0);

    // Monta o e-mail com resumo + CSV inline
    const tabelasHTML = resultados.map(r => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r.tabela}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${r.total}</td>
      </tr>
    `).join("");

    const csvsHTML = resultados.map(r => `
      <h3 style="color:#0f2d5e;margin-top:32px;">${r.tabela} (${r.total} registros)</h3>
      <pre style="background:#f4f7fb;padding:12px;border-radius:6px;font-size:11px;overflow-x:auto;white-space:pre-wrap;">${r.csv}</pre>
    `).join("");

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;background:#f4f7fb;padding:20px;">
        <div style="background:#0f2d5e;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">💾 e-FiscalTrib® — Backup Semanal</h1>
          <p style="color:#a0c4ff;margin:4px 0 0;">Exportação automática do banco de dados</p>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 8px 8px;">
          <p style="color:#444;">Backup gerado em: <strong>${agora}</strong></p>
          <p style="color:#444;">Total de registros exportados: <strong>${totalRegistros}</strong></p>

          <h2 style="color:#0f2d5e;">Resumo por tabela</h2>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#0f2d5e;color:white;">
                <th style="padding:8px 12px;text-align:left;">Tabela</th>
                <th style="padding:8px 12px;text-align:center;">Registros</th>
              </tr>
            </thead>
            <tbody>${tabelasHTML}</tbody>
          </table>

          <h2 style="color:#0f2d5e;margin-top:32px;">Dados exportados (CSV)</h2>
          ${csvsHTML}

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#aaa;font-size:12px;text-align:center;">© 2026 e-FiscalTrib® | contato@fiscaltrib.com.br</p>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FiscalTrib <noreply@fiscaltrib.com.br>",
        to: [BACKUP_EMAIL],
        subject: `FiscalTrib — Backup Semanal ${agora}`,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();
    console.log("Resposta Resend:", JSON.stringify(resendData));

    if (resendData.id) {
      return new Response(
        JSON.stringify({ success: true, tabelas: resultados.map(r => ({ tabela: r.tabela, total: r.total })) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Falha ao enviar e-mail", detalhes: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    console.error("Erro geral:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});