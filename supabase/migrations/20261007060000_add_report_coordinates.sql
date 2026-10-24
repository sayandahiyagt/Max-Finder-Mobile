alter table public.lost_pet_reports
  add column latitude double precision,
  add column longitude double precision;

alter table public.lost_pet_reports
  add constraint lost_pet_reports_latitude_range
  check (latitude is null or latitude between -90 and 90),
  add constraint lost_pet_reports_longitude_range
  check (longitude is null or longitude between -180 and 180);
