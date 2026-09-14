alter table public.diagnostico_monofasico_itens
  add column if not exists chave_nfe_referenciada text,
  add column if not exists chaves_nfe_referenciadas jsonb not null default '[]'::jsonb;
