import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { system, messages } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens não informadas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Monta array de mensagens para o Groq
    const groqMessages = [
      {
        role: "system",
        content: system || "Você é um especialista tributário brasileiro do FiscalTrib. Responda sempre em português, de forma direta e prática.",
      },
      ...messages,
    ]

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1500,
        messages: groqMessages,
      }),
    });

    const data = await response.json();
    const resposta = data.choices?.[0]?.message?.content || "Sem resposta.";

    return new Response(
      JSON.stringify({ resposta }),
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