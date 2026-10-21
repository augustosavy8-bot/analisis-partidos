-- Subir de plan es inmediato y no cobra la diferencia (se cobra en el próximo mes).
-- Si después de subir se cancela o se pausa, el comercio se quedaba con el plan
-- caro hasta el fin del período habiendo pagado el barato. Antes de cancelar o
-- pausar se vuelve al último plan pagado.

create or replace function public.volver_a_plan_pagado(p_suscripcion_id uuid, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_plan uuid;
begin
  select * into s from public.suscripciones where id = p_suscripcion_id for update;
  if not found or public.plan_actual_pagado(s.id) then
    return null;
  end if;
  -- El plan de antes del primer cambio inmediato posterior al último cobro.
  select h.de_plan_id into v_plan
    from public.historial_suscripcion h
   where h.suscripcion_id = s.id
     and h.motivo = 'Cambio de plan inmediato'
     and h.created_at > coalesce((select max(p.fecha_pago) from public.pagos_suscripcion p
                                   where p.suscripcion_id = s.id and p.fecha_pago is not null), '-infinity'::timestamptz)
   order by h.created_at, h.id
   limit 1;
  if v_plan is null or v_plan = s.plan_id then
    return null;
  end if;
  update public.suscripciones set plan_id = v_plan, plan_programado_id = null where id = s.id;
  insert into public.historial_suscripcion (suscripcion_id, de_estado, a_estado, de_plan_id, a_plan_id, motivo, origen, actor)
  values (s.id, s.estado, s.estado, s.plan_id, v_plan, 'Vuelve al último plan pagado antes de cancelar o pausar', 'panel', p_actor);
  perform public.ajustar_a_plan(s.comercio_id, v_plan);
  return v_plan;
end;
$$;

revoke execute on function public.volver_a_plan_pagado(uuid, uuid) from public, anon, authenticated;
grant execute on function public.volver_a_plan_pagado(uuid, uuid) to service_role;
