-- Studio Liz — Schema completo

-- Clientes
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  nascimento date,
  instagram text,
  como_conheceu text,
  obs text,
  anamnese text,
  ativa boolean default true,
  created_at timestamptz default now()
);

-- Procedimentos
create table if not exists procedimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  duracao_min integer default 60,
  valor_padrao numeric(10,2) default 0,
  descricao text,
  created_at timestamptz default now()
);

-- Agendamentos
create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  procedimento_id uuid references procedimentos(id),
  data_hora timestamptz not null,
  duracao_min integer default 60,
  valor numeric(10,2) default 0,
  pagamento text default 'pix',
  status text default 'agendado', -- agendado, confirmado, concluido, faltou, cancelado
  obs text,
  created_at timestamptz default now()
);

-- Atendimentos
create table if not exists atendimentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  procedimento_id uuid references procedimentos(id),
  agendamento_id uuid references agendamentos(id),
  data_hora timestamptz not null,
  valor numeric(10,2) default 0,
  pagamento text default 'pix',
  sessao_numero integer default 1,
  sessao_total integer default 1,
  sessao_id uuid,
  obs text,
  created_at timestamptz default now()
);

-- Sessões (pacotes de tratamento)
create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  procedimento_id uuid references procedimentos(id),
  total_sessoes integer not null default 1,
  sessoes_feitas integer default 0,
  intervalo_dias integer default 30,
  data_inicio date,
  data_ultima date,
  data_proxima date,
  obs text,
  status text default 'ativa', -- ativa, concluida, pausada
  created_at timestamptz default now()
);

-- Fotos clientes
create table if not exists fotos_clientes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  atendimento_id uuid references atendimentos(id) on delete set null,
  url text not null,
  area_corporal text,
  legenda text,
  created_at timestamptz default now()
);

-- Estoque
create table if not exists estoque (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text,
  embalagem_nome text,
  embalagem_qtd_atual numeric(10,2) default 0,
  embalagem_minimo numeric(10,2) default 1,
  custo_por_embalagem numeric(10,2) default 0,
  unidades_por_embalagem numeric(10,2) default 1,
  unidade_nome text default 'un',
  fornecedor text,
  created_at timestamptz default now()
);

-- Categorias de gasto
create table if not exists categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz default now()
);

-- Gastos
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(10,2) not null,
  categoria_id uuid references categorias_gasto(id) on delete set null,
  data date not null default current_date,
  obs text,
  created_at timestamptz default now()
);

-- Procedimento insumos (para precificação)
create table if not exists procedimento_insumos (
  id uuid primary key default gen_random_uuid(),
  procedimento_id uuid references procedimentos(id) on delete cascade,
  estoque_id uuid references estoque(id) on delete set null,
  nome text,
  qtd_usada numeric(10,4) default 1,
  custo_calculado numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Configurações
create table if not exists config (
  id uuid primary key default gen_random_uuid(),
  chave text unique not null,
  valor text,
  created_at timestamptz default now()
);

-- Inserir configs padrão
insert into config (chave, valor) values
  ('aluguel', '250'),
  ('atend_dia', '4'),
  ('dias_mes', '20'),
  ('valor_hora', '80'),
  ('meta_faturamento', '5000'),
  ('meta_atendimentos_semana', '20')
on conflict (chave) do nothing;

-- Templates de marketing
create table if not exists templates_marketing (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  mensagem text not null,
  tipo text default 'geral',
  created_at timestamptz default now()
);

-- Storage bucket (executar via dashboard Supabase)
-- create bucket fotos-clientes (público)

-- Disable RLS (projeto pessoal)
alter table clientes disable row level security;
alter table procedimentos disable row level security;
alter table agendamentos disable row level security;
alter table atendimentos disable row level security;
alter table sessoes disable row level security;
alter table fotos_clientes disable row level security;
alter table estoque disable row level security;
alter table categorias_gasto disable row level security;
alter table gastos disable row level security;
alter table procedimento_insumos disable row level security;
alter table config disable row level security;
alter table templates_marketing disable row level security;
