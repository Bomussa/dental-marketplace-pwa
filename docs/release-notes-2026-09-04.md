# Release verification — 2026-09-04

- Restored the last known-good production commit after rejecting an authorization change that referenced a non-existent database table.
- Admin authorization remains server-side and uses the existing Supabase Auth platform-admin claims already provisioned for the Super Admin account.
- No password or secret is stored in source control.
- No application data or production records are modified by this release note.
