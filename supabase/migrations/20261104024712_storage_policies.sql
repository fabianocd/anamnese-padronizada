-- Bucket privado "anamneses-docs": cada pessoa só acessa a própria pasta {user_id}/...
-- Limite de 20 MB e apenas PDF/imagens.

update storage.buckets
set
  public = false,
  file_size_limit = 20 * 1024 * 1024,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
where id = 'anamneses-docs';

create policy "anamneses_docs_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anamneses-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "anamneses_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anamneses-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "anamneses_docs_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'anamneses-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'anamneses-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "anamneses_docs_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anamneses-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
