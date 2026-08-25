alter table public.apuracoes_simples
  add column if not exists memoria_calculo jsonb;
