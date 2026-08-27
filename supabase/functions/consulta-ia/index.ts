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
        model: "openai/gpt-oss-120b",
        max_completion_tokens: 2000,
        temperature: 0,
        messages: groqMessages,
      }),
    });

    const data = await response.json();

    console.log("STATUS GROQ:", response.status);
    console.log("RESPOSTA GROQ:", JSON.stringify(data));

    if (!response.ok) {
      const detalheErro = data?.error?.message || data?.error || `Erro HTTP ${response.status}`;
      throw new Error(`Groq respondeu com erro ${response.status}: ${detalheErro}`);
    }

    const resposta = data?.choices?.[0]?.message?.content;

    if (!resposta) {
      throw new Error(`Groq respondeu sem conteúdo. Resposta completa: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({ resposta }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const mensagemErro = err instanceof Error ? err.message : String(err);
    console.error("ERRO CONSULTA-IA:", mensagemErro);
    return new Response(
      JSON.stringify({ error: mensagemErro }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});