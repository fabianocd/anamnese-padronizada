-- Fase 4: editor de modelo.
-- Restrições extras em templates e função para salvar modelo + padrão da
-- especialidade numa única transação (security invoker: RLS continua valendo).

alter table public.templates
  add constraint templates_schema_sections_check
    check (jsonb_typeof(schema -> 'sections') = 'array'),
  add constraint templates_schema_size_check
    check (pg_column_size(schema) <= 512000),
  -- O arquivo original só pode estar na pasta de envios do próprio dono.
  add constraint templates_source_file_path_check
    check (
      source_file_path is null
      or (
        char_length(source_file_path) <= 200
        and starts_with(source_file_path, user_id::text || '/sources/')
      )
    );

create or replace function public.save_template(
  p_id uuid,
  p_title text,
  p_specialty_id uuid,
  p_schema jsonb,
  p_source_file_path text,
  p_is_default boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_id is null then
    insert into public.templates (user_id, title, specialty_id, schema, source_file_path)
    values (v_user, p_title, p_specialty_id, p_schema, p_source_file_path)
    returning id into v_id;
  else
    -- O arquivo original não muda na edição.
    update public.templates
       set title = p_title, specialty_id = p_specialty_id, schema = p_schema
     where id = p_id and user_id = v_user
    returning id into v_id;

    if v_id is null then
      raise exception 'template not found' using errcode = 'P0002';
    end if;
  end if;

  -- Deixa de ser padrão das especialidades que não são (mais) a dele.
  update public.specialties
     set default_template_id = null
   where user_id = v_user
     and default_template_id = v_id
     and (not p_is_default or p_specialty_id is null or id <> p_specialty_id);

  if p_is_default and p_specialty_id is not null then
    update public.specialties
       set default_template_id = v_id
     where id = p_specialty_id and user_id = v_user;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_template(uuid, text, uuid, jsonb, text, boolean)
  from public, anon;
grant execute on function public.save_template(uuid, text, uuid, jsonb, text, boolean)
  to authenticated;
