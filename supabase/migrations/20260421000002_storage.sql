-- ============================================================================
-- Storage buckets e policy
-- Bucket privati: accesso solo via signed URL lato server
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('documenti-atleti', 'documenti-atleti', false),
  ('certificati-allenatori', 'certificati-allenatori', false),
  ('foto-atleti', 'foto-atleti', false)
on conflict (id) do nothing;

-- Solo staff può caricare/aggiornare/eliminare; lettura dal server via service role
create policy "staff_upload_documenti_atleti"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documenti-atleti' and is_staff());

create policy "staff_update_documenti_atleti"
  on storage.objects for update to authenticated
  using (bucket_id = 'documenti-atleti' and is_staff());

create policy "staff_delete_documenti_atleti"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documenti-atleti' and is_staff());

create policy "staff_select_documenti_atleti"
  on storage.objects for select to authenticated
  using (bucket_id = 'documenti-atleti' and is_staff());

create policy "admin_all_certificati_allenatori"
  on storage.objects for all to authenticated
  using (bucket_id = 'certificati-allenatori' and is_superadmin())
  with check (bucket_id = 'certificati-allenatori' and is_superadmin());

create policy "staff_all_foto_atleti"
  on storage.objects for all to authenticated
  using (bucket_id = 'foto-atleti' and is_staff())
  with check (bucket_id = 'foto-atleti' and is_staff());
