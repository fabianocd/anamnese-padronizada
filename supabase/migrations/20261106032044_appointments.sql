-- Calendário: atendimentos programados pela pessoa (plantões, ambulatórios etc.).
-- Repetição semanal cria um registro por dia com o mesmo series_id.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  title text not null check (char_length(title) between 1 and 120),
  location text not null default '' check (char_length(location) <= 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_end_after_start
    check (end_time is null or (start_time is not null and end_time > start_time))
);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create index appointments_user_date_idx on public.appointments (user_id, date);
create index appointments_user_series_idx on public.appointments (user_id, series_id, date)
  where series_id is not null;

alter table public.appointments enable row level security;

create policy "appointments_select_own" on public.appointments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "appointments_insert_own" on public.appointments
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "appointments_update_own" on public.appointments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "appointments_delete_own" on public.appointments
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.appointments from anon;
grant select, insert, update, delete on public.appointments to authenticated;

-- Calendário busca as anamneses do mês pela data de criação.
create index anamneses_user_created_idx on public.anamneses (user_id, created_at);
