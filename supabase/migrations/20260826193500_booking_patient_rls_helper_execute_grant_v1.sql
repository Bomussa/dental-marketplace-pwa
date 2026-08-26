-- The policy caller must retain EXECUTE on this private, non-exposed helper.
-- Public and anonymous roles remain revoked by the preceding migration.
grant execute on function private.has_active_self_patient_profile(uuid) to authenticated;
