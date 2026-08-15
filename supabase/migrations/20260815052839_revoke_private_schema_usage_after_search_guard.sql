-- Public search no longer resolves objects in the private schema.
-- Remove the temporary schema visibility that was required by the superseded helper approach.
revoke usage on schema private from anon, authenticated;
