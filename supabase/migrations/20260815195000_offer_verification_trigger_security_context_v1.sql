-- The offer verification guard is a trigger function. It calls a helper in the
-- private schema, while authenticated clinic staff intentionally have no USAGE
-- on that schema. Run the guard with the function owner's privileges instead
-- of broadening private-schema access to browser roles.

alter function private.guard_offer_verification_fields() security definer;
alter function private.guard_offer_verification_fields() set search_path = '';

revoke all on function private.guard_offer_verification_fields() from public, anon, authenticated;

comment on function private.guard_offer_verification_fields() is
  'Trigger-only guard for admin-controlled offer verification fields. SECURITY DEFINER avoids granting private-schema USAGE to clinic browser roles.';
