import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nome, email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-mail não informado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const primeiroNome = nome?.split(' ')[0] || 'Bem-vindo';

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0B1F4D 0%,#163B8C 100%);padding:40px;text-align:center;">
              <div style="font-size:13px;color:#7CC4FF;font-weight:700;letter-spacing:2px;margin-bottom:12px;">SISTEMA DE RECUPERAÇÃO TRIBUTÁRIA</div>
              <div style="font-size:32px;font-weight:900;color:#ffffff;margin-bottom:8px;">⚖️ FiscalTrib</div>
              <div style="font-size:15px;color:#93c5fd;">Inteligência Tributária para Contadores e Advogados</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="font-size:22px;font-weight:700;color:#0B1F4D;margin:0 0 16px;">Olá, ${primeiroNome}! 👋</p>
              <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
                Seja muito bem-vindo ao <strong>FiscalTrib</strong> — o sistema mais completo de diagnóstico tributário e recuperação de créditos fiscais do Brasil.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#f0f9ff;border-left:4px solid #0B1F4D;border-radius:6px;padding:16px 20px;">
                    <div style="font-size:13px;font-weight:700;color:#0B1F4D;margin-bottom:4px;">💼 Diagnóstico Tributário Completo</div>
                    <div style="font-size:13px;color:#64748b;line-height:1.6;">Identifique créditos pagos a maior, base de cálculo incorreta e oportunidades de recuperação.</div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:6px;padding:16px 20px;">
                    <div style="font-size:13px;font-weight:700;color:#16a34a;margin-bottom:4px;">🤖 IA Tributária Integrada</div>
                    <div style="font-size:13px;color:#64748b;line-height:1.6;">Converse com nossa IA especializada usando os dados reais dos seus clientes.</div>
                  </td>
                </tr>
                <tr><td style="height:10px;"></td></tr>
                <tr>
                  <td style="background:#fffbeb;border-left:4px solid #b48c3c;border-radius:6px;padding:16px 20px;">
                    <div style="font-size:13px;font-weight:700;color:#b48c3c;margin-bottom:4px;">📊 Relatórios PDF Profissionais</div>
                    <div style="font-size:13px;color:#64748b;line-height:1.6;">Gere relatórios completos com potencial de recuperação detalhado para seus clientes.</div>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://fiscaltrib.com.br" style="display:inline-block;background:linear-gradient(135deg,#0B1F4D,#163B8C);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:8px;">
                      Acessar o FiscalTrib →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 8px;">
                Após a confirmação do pagamento da taxa de implantação, seu acesso será liberado em até <strong>2 horas</strong>.
              </p>
              <p style="font-size:14px;color:#0B1F4D;font-weight:700;margin:8px 0 0;">
                📱 WhatsApp: (11) 99957-9822
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">FiscalTrib — Sistema de Diagnóstico e Recuperação Tributária</p>
              <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">contato@fiscaltrib.com.br | (11) 99957-9822</p>
              <p style="font-size:11px;color:#cbd5e1;margin:0;">© 2026 FiscalTrib. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "FiscalTrib <contato@fiscaltrib.com.br>",
        to: [email],
        subject: "Bem-vindo ao FiscalTrib — Seu acesso está quase pronto! ⚖️",
        html,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erro:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});