import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const PAGBANK_TOKEN = Deno.env.get('PAGBANK_TOKEN') ?? ''
const PAGBANK_API = 'https://api.pagseguro.com'

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
    const { plano_id, plano_nome, valor, referencia, email_comprador } = await req.json()

    const body = {
      reference_id: referencia,
      customer: {
        email: email_comprador,
      },
      items: [
        {
          reference_id: plano_id,
          name: `FiscalTrib - Plano ${plano_nome}`,
          quantity: 1,
          unit_amount: Math.round(valor * 100),
        },
      ],
      payment_methods: [
        { type: 'CREDIT_CARD' },
        { type: 'DEBIT_CARD' },
        { type: 'BOLETO' },
        { type: 'PIX' },
      ],
      redirect_url: 'https://fiscaltrib.com.br',
      notification_urls: [
        'https://ikodyhxukvclgzydvztu.supabase.co/functions/v1/pagbank-webhook',
      ],
    }

    const response = await fetch(`${PAGBANK_API}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAGBANK_TOKEN}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(JSON.stringify(data))
    }

    const link = data.links?.find((l: any) => l.rel === 'PAY')?.href ?? null

    return new Response(JSON.stringify({ link, order_id: data.id, debug: data }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})