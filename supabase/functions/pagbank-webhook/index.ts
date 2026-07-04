import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const payload = await req.json()

    // Log para depuração — aparece nos Logs da Edge Function
    console.log('Webhook PagBank recebido:', JSON.stringify(payload))

    // PagBank envia: { id, reference_id, charges: [{ status, ... }] }
    const referencia = payload.reference_id ?? ''
    const charges = payload.charges ?? []
    const status = charges[0]?.status ?? ''

    // referencia formato: FISCALTRIB-USERID12-TIMESTAMP
    // extrai o usuario_id (8 chars após FISCALTRIB-)
    const partes = referencia.split('-')
    // partes[0] = FISCALTRIB, partes[1] = userid8chars
    const usuario_id_parcial = partes[1] ?? ''

    if (!usuario_id_parcial) {
      console.log('Referência inválida, ignorando:', referencia)
      return new Response(JSON.stringify({ ok: true, msg: 'referencia invalida' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Pagamento confirmado
    if (status === 'PAID') {
      // Busca assinatura pela referencia
      const { data: ass, error: errBusca } = await supabase
        .from('assinaturas')
        .select('id, plano')
        .eq('referencia', referencia)
        .single()

      if (errBusca || !ass) {
        console.log('Assinatura não encontrada para referencia:', referencia)
        return new Response(JSON.stringify({ ok: true, msg: 'assinatura nao encontrada' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Ativa assinatura por 30 dias
      const dataInicio = new Date()
      const dataFim = new Date()
      dataFim.setDate(dataFim.getDate() + 30)

      const { error: errUpdate } = await supabase
        .from('assinaturas')
        .update({
          ativo: true,
          status: 'ativo',
          data_inicio: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ass.id)

      if (errUpdate) {
        console.log('Erro ao ativar assinatura:', errUpdate.message)
        throw new Error(errUpdate.message)
      }

      // Registra pagamento
      await supabase.from('pagamentos').insert({
        assinatura_id: ass.id,
        valor: charges[0]?.amount?.value ? charges[0].amount.value / 100 : null,
        status: 'pago',
        metodo: charges[0]?.payment_method?.type ?? 'desconhecido',
        pagbank_charge_id: charges[0]?.id ?? null,
        created_at: new Date().toISOString(),
      })

      console.log('Assinatura ativada com sucesso:', ass.id)
    }

    // Pagamento cancelado ou expirado
    if (status === 'CANCELED' || status === 'DECLINED') {
      await supabase
        .from('assinaturas')
        .update({ ativo: false, status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('referencia', referencia)

      console.log('Assinatura cancelada:', referencia)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    console.log('Erro no webhook:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})