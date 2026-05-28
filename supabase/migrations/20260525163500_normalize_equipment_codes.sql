update public.equipments
set equipment_code = regexp_replace(equipment_code, '(^| / )[0-9]+\.', '\1', 'g')
where equipment_code ~ '(^| / )[0-9]+\.';
