import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGBANK_TOKEN = Deno.env.get("PAGBANK_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    console.log("PagBank webhook recebido:", JSON.stringify(body));

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    const notificationType = body.notificationType || body.type;
    const notificationCode = body.notificationCode || body.id;

    if (!notificationType || !notificationCode) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Consulta o status da transação no PagBank
    const pagbankRes = await fetch(
      `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=worldmktdigitali@gmail.com&token=${PAGBANK_TOKEN}`,
      { headers: { "Content-Type": "application/xml;charset=ISO-8859-1" } }
    );

    const xmlText = await pagbankRes.text();
    console.log("Resposta PagBank:", xmlText);

    // Extrai status do XML
    const statusMatch = xmlText.match(/<status>(\d+)<\/status>/);
    const referenceMatch = xmlText.match(/<reference>(.*?)<\/reference>/);
    const grossAmountMatch = xmlText.match(/<grossAmount>(.*?)<\/grossAmount>/);

    const status = statusMatch ? parseInt(statusMatch[1]) : null;
    const reference = referenceMatch ? referenceMatch[1] : null;
    const grossAmount = grossAmountMatch ? parseFloat(grossAmountMatch[1]) : null;

    if (!reference || status === null) {
      return new Response(JSON.stringify({ error: "Referência ou status não encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Status PagBank: 3=Pago, 4=Disponível, 5=Em disputa, 6=Devolvido, 7=Cancelado
    let assinaturaStatus = "pendente";
    let ativo = false;

    if (status === 3 || status === 4) {
      assinaturaStatus = "pago";
      ativo = true;
    } else if (status === 6 || status === 7) {
      assinaturaStatus = "cancelado";
      ativo = false;
    } else if (status === 5) {
      assinaturaStatus = "disputa";
      ativo = true;
    }

    // Atualiza assinatura no Supabase
    const { error: updateError } = await supabase
      .from("assinaturas")
      .update({
        status: assinaturaStatus,
        ativo,
        ultimo_pagamento: new Date().toISOString(),
        valor_pago: grossAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("referencia", reference);

    if (updateError) {
      console.error("Erro ao atualizar assinatura:", updateError);
    }

    // Registra o pagamento no histórico
    await supabase.from("pagamentos").insert({
      referencia: reference,
      status: assinaturaStatus,
      valor: grossAmount,
      pagbank_status: status,
      notification_code: notificationCode,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, status: assinaturaStatus }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});