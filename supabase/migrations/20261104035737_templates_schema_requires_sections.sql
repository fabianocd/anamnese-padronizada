-- A check de tipo de "sections" passa quando a chave falta (NULL); exige a chave.
alter table public.templates
  add constraint templates_schema_has_sections_check check (schema ? 'sections');
