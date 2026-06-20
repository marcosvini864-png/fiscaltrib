import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EMAIL_DESTINO  = 'marcosvini864@gmail.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return 'Sem dados\n'
  const headers = Object.keys(rows[0])
  const lines   = rows.map(r => headers.map(h => {
    const val = r[h] === null || r[h] === undefined ? '' : String(r[h])
    return `"${val.replace(/"/g, '""')}"`
  }).join(','))
  return [headers.join(','), ...lines].join('\n')
}

serve(async (req) => {
  // Responder preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const hoje     = new Date().toLocaleDateString('pt-BR')
    const tabelas  = ['clientes','entradas','recuperacoes','assinaturas','usuarios','acompanhamentos','prazos_fiscais']

    const resumo: string[] = []
    const csvBlocks: string[] = []

    for (const tabela of tabelas) {
      const { data, error } = await supabase.from(tabela).select('*')
      const total = data?.length || 0
      resumo.push(`• ${tabela}: ${total} registro(s)${error ? ' ⚠️ ERRO' : ''}`)
      csvBlocks.push(`\n===== ${tabela.toUpperCase()} =====\n${toCSV(data || [])}`)
    }

    const corpo = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0B1F4D;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">📦 FiscalTrib — Backup Semanal</h1>
          <p style="color:#7CC4FF;margin:8px 0 0;font-size:13px">Gerado em ${hoje}</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
          <h2 style="color:#0B1F4D;font-size:16px;margin:0 0 16px">📊 Resumo do banco de dados</h2>
          <div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #e2e8f0;font-family:monospace;font-size:13px;line-height:1.8">
            ${resumo.join('<br>')}
          </div>
          <p style="color:#64748b;font-size:12px;margin:16px 0 0">
            ⚠️ Este e-mail é gerado automaticamente toda semana pelo sistema FiscalTrib.
          </p>
        </div>
      </div>
    `

    const csvCompleto  = csvBlocks.join('\n\n')
    const corpoFinal   = corpo + `\n\n<pre style="font-size:11px;color:#374151;background:#f1f5f9;padding:16px;border-radius:8px;overflow:auto">${csvCompleto.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'FiscalTrib Backup <onboarding@resend.dev>',
        to:      [EMAIL_DESTINO],
        subject: `📦 FiscalTrib — Backup Semanal — ${hoje}`,
        html:    corpoFinal,
      }),
    })

    const result = await res.json()

    return new Response(JSON.stringify({
      ok:      res.ok,
      status:  res.status,
      tabelas: resumo,
      resend:  result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ erro: String(err) }), {
      status:  500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})