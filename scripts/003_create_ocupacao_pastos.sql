-- Create table for pasture occupation by cattle lots
create table if not exists public.ocupacao_pastos (
  id uuid primary key default gen_random_uuid(),
  pasto_id uuid not null references public.pastos(id) on delete cascade,
  lote_id uuid references public.lotes(id) on delete set null,
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  quantidade_animais integer not null default 0,
  data_entrada date not null,
  data_saida date,
  periodo_descanso_dias integer default 0,
  status varchar(20) default 'ativo' check (status in ('ativo', 'finalizado', 'programado')),
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create table for pesticide/defensive applications
create table if not exists public.aplicacao_defensivos (
  id uuid primary key default gen_random_uuid(),
  pasto_id uuid not null references public.pastos(id) on delete cascade,
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  nome_produto varchar(255) not null,
  tipo_produto varchar(100) not null check (tipo_produto in ('herbicida', 'inseticida', 'fungicida', 'adubo', 'calcario', 'outro')),
  quantidade numeric(10,2),
  unidade varchar(20) default 'litros',
  data_aplicacao date not null,
  responsavel varchar(255),
  periodo_carencia_dias integer default 0,
  data_liberacao date,
  observacoes text,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.ocupacao_pastos enable row level security;
alter table public.aplicacao_defensivos enable row level security;

-- RLS policies for ocupacao_pastos
create policy "ocupacao_pastos_select_own" on public.ocupacao_pastos 
  for select using (auth.uid() = user_id);

create policy "ocupacao_pastos_insert_own" on public.ocupacao_pastos 
  for insert with check (auth.uid() = user_id);

create policy "ocupacao_pastos_update_own" on public.ocupacao_pastos 
  for update using (auth.uid() = user_id);

create policy "ocupacao_pastos_delete_own" on public.ocupacao_pastos 
  for delete using (auth.uid() = user_id);

-- RLS policies for aplicacao_defensivos
create policy "aplicacao_defensivos_select_own" on public.aplicacao_defensivos 
  for select using (auth.uid() = user_id);

create policy "aplicacao_defensivos_insert_own" on public.aplicacao_defensivos 
  for insert with check (auth.uid() = user_id);

create policy "aplicacao_defensivos_update_own" on public.aplicacao_defensivos 
  for update using (auth.uid() = user_id);

create policy "aplicacao_defensivos_delete_own" on public.aplicacao_defensivos 
  for delete using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists idx_ocupacao_pastos_pasto on public.ocupacao_pastos(pasto_id);
create index if not exists idx_ocupacao_pastos_fazenda on public.ocupacao_pastos(fazenda_id);
create index if not exists idx_ocupacao_pastos_status on public.ocupacao_pastos(status);
create index if not exists idx_aplicacao_defensivos_pasto on public.aplicacao_defensivos(pasto_id);
create index if not exists idx_aplicacao_defensivos_fazenda on public.aplicacao_defensivos(fazenda_id);
