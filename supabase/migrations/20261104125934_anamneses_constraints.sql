-- Fase 5: limites no snapshot do modelo e nas respostas das anamneses.
alter table public.anamneses
  add constraint anamneses_snapshot_sections_check
    check (template_snapshot ? 'sections' and jsonb_typeof(template_snapshot -> 'sections') = 'array'),
  add constraint anamneses_snapshot_size_check
    check (pg_column_size(template_snapshot) <= 512000),
  add constraint anamneses_answers_size_check
    check (pg_column_size(answers) <= 1048576);
