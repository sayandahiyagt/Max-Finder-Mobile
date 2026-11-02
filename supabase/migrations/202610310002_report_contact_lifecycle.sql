alter table public.lost_pet_reports
  drop constraint if exists lost_pet_reports_contact_method_check,
  alter column contact_value drop not null,
  add column if not exists contact_instructions text;

alter table public.lost_pet_reports
  add constraint lost_pet_reports_contact_method_check
    check (contact_method in ('email', 'phone', 'in_app')),
  add constraint lost_pet_reports_contact_value_check
    check (
      (contact_method = 'in_app' and contact_value is null)
      or (contact_method in ('email', 'phone') and nullif(trim(contact_value), '') is not null)
    );
