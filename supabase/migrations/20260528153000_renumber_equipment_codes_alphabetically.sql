with ranked as (
  select
    e.id,
    lpad(row_number() over (
      partition by e.category_id
      order by
        lower(translate(
          coalesce(e.nome, ''),
          'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
          'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn'
        )),
        lower(coalesce(e.nome, '')),
        e.id
    )::text, 3, '0') as equipment_code,
    row_number() over (
      partition by e.category_id
      order by
        lower(translate(
          coalesce(e.nome, ''),
          'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
          'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn'
        )),
        lower(coalesce(e.nome, '')),
        e.id
    ) as sort_order
  from public.equipments e
  where e.status = 'active'
)
update public.equipments e
set
  equipment_code = ranked.equipment_code,
  sort_order = ranked.sort_order,
  updated_at = now()
from ranked
where e.id = ranked.id
  and (
    e.equipment_code is distinct from ranked.equipment_code
    or e.sort_order is distinct from ranked.sort_order
  );
