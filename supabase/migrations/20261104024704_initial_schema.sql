-- Esquema inicial: perfis, especialidades, modelos e anamneses.
-- Todas as tabelas têm RLS ligado e policies por dono (auth.uid() = user_id).

-- ---------------------------------------------------------------------------
-- Função utilitária: mantém updated_at em dia.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: um por usuário, criado automaticamente no cadastro.
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  institution text check (char_length(institution) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil quando um usuário se cadastra (nome vem do metadata do signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), '')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- templates: modelos de anamnese (schema em JSONB).
-- ---------------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  specialty_id uuid,
  schema jsonb not null default '{"sections": []}'::jsonb
    check (jsonb_typeof(schema) = 'object'),
  source_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Permite FKs compostas (id, user_id) que impedem apontar para dados de outra pessoa.
  unique (id, user_id)
);

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- specialties: lista editável de cada pessoa, com modelo padrão opcional.
-- ---------------------------------------------------------------------------
create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  default_template_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (default_template_id, user_id)
    references public.templates (id, user_id)
    on delete set null (default_template_id)
);

create unique index specialties_user_name_key
  on public.specialties (user_id, lower(trim(name)));

create trigger specialties_set_updated_at
  before update on public.specialties
  for each row execute function public.set_updated_at();

alter table public.templates
  add constraint templates_specialty_fkey
  foreign key (specialty_id, user_id)
  references public.specialties (id, user_id)
  on delete set null (specialty_id);

-- ---------------------------------------------------------------------------
-- anamneses: preenchidas a partir de um modelo, com snapshot do schema.
-- ---------------------------------------------------------------------------
create table public.anamneses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid,
  template_snapshot jsonb not null
    check (jsonb_typeof(template_snapshot) = 'object'),
  title text not null check (char_length(title) between 1 and 160),
  patient_label text check (char_length(patient_label) <= 40),
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (template_id, user_id)
    references public.templates (id, user_id)
    on delete set null (template_id)
);

create trigger anamneses_set_updated_at
  before update on public.anamneses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Índices (FKs e listagens por usuário).
-- ---------------------------------------------------------------------------
create index templates_user_updated_idx on public.templates (user_id, updated_at desc);
create index templates_specialty_idx on public.templates (specialty_id, user_id);
create index specialties_default_template_idx on public.specialties (default_template_id, user_id);
create index anamneses_user_updated_idx on public.anamneses (user_id, updated_at desc);
create index anamneses_template_idx on public.anamneses (template_id, user_id);

-- ---------------------------------------------------------------------------
-- RLS e policies: cada pessoa só vê e altera o que é seu.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.specialties enable row level security;
alter table public.templates enable row level security;
alter table public.anamneses enable row level security;

-- profiles (insert feito pelo trigger; exclusão pelo cascade da conta)
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- specialties, templates, anamneses: CRUD completo do dono
do $$
declare
  t text;
begin
  foreach t in array array['specialties', 'templates', 'anamneses'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- Permissões explícitas: só usuários autenticados acessam pela API.
revoke all on public.profiles, public.specialties, public.templates, public.anamneses from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.specialties, public.templates, public.anamneses to authenticated;
