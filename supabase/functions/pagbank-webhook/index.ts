import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    const body = await req.json();
    console.log("BODY:", JSON.stringify(body));

    const user = body.user || body.record || {};
    const email_data = body.email_data || body;
    const userEmail = user?.email || body?.email;
    const emailType = email_data?.email_action_type || body?.type;
    const confirmationUrl = email_data?.confirmation_url || email_data?.token_hash || body?.confirmation_url;

    console.log("userEmail:", userEmail);
    console.log("emailType:", emailType);
    console.log("confirmationUrl:", confirmationUrl);

    if (!userEmail) {
      console.error("E-mail não encontrado no payload");
      return new Response(JSON.stringify({ error: "E-mail do usuário não encontrado" }), { status: 200 });
    }

    let subject = "FiscalTrib — Notificação";
    let htmlBody = `<p>Tipo: ${emailType}</p><p>Link: <a href="${confirmationUrl}">${confirmationUrl}</a></p>`;

    if (emailType === "recovery") {
      subject = "FiscalTrib — Redefinição de senha";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7fb; padding: 20px;">
          <div style="background: #0f2d5e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔐 e-FiscalTrib®</h1>
            <p style="color: #a0c4ff; margin: 4px 0 0;">Inteligência Tributária</p>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #0f2d5e;">Redefinição de senha</h2>
            <p style="color: #444;">Clique no botão abaixo para criar uma nova senha:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${confirmationUrl}" style="background: #0f2d5e; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">
                🔑 Redefinir minha senha
              </a>
            </div>
            <p style="color: #888; font-size: 13px;">Este link expira em 1 hora.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #aaa; font-size: 12px; text-align: center;">© 2026 e-FiscalTrib® | contato@fiscaltrib.com.br</p>
          </div>
        </div>
      `;
    } else if (emailType === "signup") {
      subject = "FiscalTrib — Confirme seu cadastro";
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f4f7fb; padding: 20px;">
          <div style="background: #0f2d5e; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🔐 e-FiscalTrib®</h1>
          </div>
          <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #0f2d5e;">Bem-vindo ao FiscalTrib!</h2>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${confirmationUrl}" style="background: #0f2d5e; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">
                ✅ Confirmar meu e-mail
              </a>
            </div>
            <p style="color: #aaa; font-size: 12px; text-align: center;">© 2026 e-FiscalTrib® | contato@fiscaltrib.com.br</p>
          </div>
        </div>
      `;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FiscalTrib <noreply@fiscaltrib.com.br>",
        to: [userEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();
    console.log("Resposta Resend:", JSON.stringify(resendData));

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error("Erro:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
});