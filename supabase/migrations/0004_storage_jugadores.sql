-- Bucket privado para fotos de jugadores (menores de edad: nunca público).
insert into storage.buckets (id, name, public)
values ('jugadores', 'jugadores', false)
on conflict (id) do nothing;

create policy "jugadores_storage_select_staff_admin" on storage.objects
  for select using (bucket_id = 'jugadores' and public.is_staff_or_admin());

create policy "jugadores_storage_insert_staff_admin" on storage.objects
  for insert with check (bucket_id = 'jugadores' and public.is_staff_or_admin());

create policy "jugadores_storage_update_staff_admin" on storage.objects
  for update using (bucket_id = 'jugadores' and public.is_staff_or_admin())
  with check (bucket_id = 'jugadores' and public.is_staff_or_admin());

create policy "jugadores_storage_delete_staff_admin" on storage.objects
  for delete using (bucket_id = 'jugadores' and public.is_staff_or_admin());
