import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { usuario_id, email } = await req.json()

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Deleta dados relacionados
    const tabelas = [
      'acompanhamentos', 'analises', 'assinaturas', 'base_juridica',
      'cdas', 'cdas_competencias', 'checklist', 'clientes',
      'clientes_dados_complementares', 'diagnosticos_exclusao_icms',
      'diagnosticos_icms_st', 'diagnosticos_icms_tema69',
      'diagnosticos_monofasicos', 'diagnosticos_pgdas',
      'diagnosticos_retencoes', 'diagnosticos_salvos',
      'divida_ativa', 'entradas', 'entradas_nfe',
      'extensao_permissoes', 'grupos_empresas', 'itens_fiscais',
      'kanban_colunas', 'modulos_permissoes', 'perfil_escritorio',
      'prazos_fiscais', 'relatorios_importacao', 'sessoes_ativas',
    ]

    for (const tabela of tabelas) {
      await admin.from(tabela).delete().eq('usuario_id', usuario_id)
    }

    // Deleta da tabela usuarios
    await admin.from('usuarios').delete().eq('email', email)

    // Deleta do Auth
    const { error } = await admin.auth.admin.deleteUser(usuario_id)
    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})