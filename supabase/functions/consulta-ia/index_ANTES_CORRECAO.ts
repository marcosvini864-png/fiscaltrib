import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { system, messages, model } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens não informadas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ROTA GEMINI ──────────────────────────────────────────────
    if (model && model.startsWith("gemini")) {
      const geminiModel = model || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

      // Converte mensagens no formato Gemini
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: Array.isArray(m.content)
          ? m.content.map((part: any) => {
              if (part.type === "text") return { text: part.text };
              if (part.type === "inline_data") return { inline_data: part.inline_data };
              return { text: String(part) };
            })
          : [{ text: m.content }],
      }));

      const geminiBody: any = { contents };

      if (system) {
        geminiBody.system_instruction = { parts: [{ text: system }] };
      }

      geminiBody.generationConfig = {
        temperature: 0.1,
        maxOutputTokens: 8192,
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error?.message || `Gemini HTTP ${resp.status}`);
      }

      const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";

      return new Response(
        JSON.stringify({ resposta }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ROTA GROQ (padrão) ───────────────────────────────────────
    const groqMessages = [
      {
        role: "system",
        content: system || "Você é um especialista tributário brasileiro do FiscalTrib. Responda sempre em português, de forma direta e prática.",
      },
      ...messages,
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 4000,
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