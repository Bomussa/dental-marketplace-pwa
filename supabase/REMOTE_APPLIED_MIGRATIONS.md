# Applied Supabase migrations — qatar-dental-dev

Canonical DEV project ref: `bqvcukxfsnchvkgejolz`

Applied through the connected Supabase management API on 2026-08-14:

1. `20260814162411_core_schema_v1`
2. `20260814162736_rls_and_atomic_booking_v1`
3. `20260814162810_harden_privileged_rpcs_v1`
4. `20260814162834_performance_indexes_and_policy_cleanup_v1`
5. `20260814162911_treatment_taxonomy_v1`
6. `20260814163035_auth_profile_trigger_v1`
7. `20260814163115_slot_treatment_compatibility_v1`
8. `20260814163211_verification_activation_gates_v1`
9. `20260814163411_platform_admin_and_clinic_application_v1`
10. `20260814163533_offer_duration_and_open_now_v1`
11. `20260814164341_authorization_workflow_hardening_v1`
12. `20260814164609_search_trust_signals_v1`
13. `20260814164708_consolidate_permissive_policies_v1`
14. `20260814164955_booking_slot_lifecycle_sync_v1`
15. `20260814165149_branch_application_rpc_v1`

> The remote DEV project is the current schema source of truth. The management connector exposes apply/list operations but not exact migration-body download. Run `supabase db pull` once the CLI/package registry is reachable, review the diff, and commit the materialized migration SQL before any production promotion.
