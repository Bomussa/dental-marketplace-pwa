-- Cover booking ownership and family-profile lookups without relying on an unindexed foreign key.
create index if not exists bookings_patient_profile_idx
  on public.bookings(patient_profile_id);
