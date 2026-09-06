-- La migración 0032 creaba esta política pero, por lo que sea (probablemente
-- al aplicarla a mano desde el SQL Editor), nunca llegó a existir en
-- producción: etiquetas_partido se quedó con RLS activado y CERO políticas,
-- lo que bloquea (403) cualquier insert/update/delete desde la app —
-- confirmado en producción, con tagueos reales atascados en la cola de
-- sincronización desde que existe la función. Esta migración es idempotente:
-- si la política ya existe (por ejemplo en un entorno donde sí se aplicó
-- bien) no falla.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'etiquetas_partido'
      and policyname = 'etiquetas_partido_staff_admin_all'
  ) then
    create policy "etiquetas_partido_staff_admin_all" on public.etiquetas_partido
      for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
  end if;
end $$;
