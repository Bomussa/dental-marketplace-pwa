# Applied Supabase migrations — qatar-dental-dev

Canonical project ref used by the current application: `bqvcukxfsnchvkgejolz`

The following migration ledger was retrieved from the connected Supabase management API and refreshed on 2026-08-16:

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
16. `20260814213531_customer_choice_event_ingestion_v1`
17. `20260814214421_customer_choice_event_fk_indexes_v1`
18. `20260814220327_admin_customer_choice_analytics_v1`
19. `20260814221217_customer_choice_analytics_hardening_v1`
20. `20260814221320_customer_choice_analytics_cohort_v1`
21. `20260814221926_consolidate_analytics_catalog_policies_v1`
22. `20260815050556_exclude_synthetic_dev_clinics_from_public_search`
23. `20260815051408_public_search_dev_guard_security_definer`
24. `20260815051730_public_search_dev_guard_view`
25. `20260815051855_public_search_dev_guard_private_helper`
26. `20260815051946_grant_private_schema_usage_for_public_search_helper`
27. `20260815052459_denormalize_synthetic_clinic_visibility`
28. `20260815052839_revoke_private_schema_usage_after_search_guard`
29. `20260815065426_operational_finance_core_v1`
30. `20260815065524_notification_support_core_v1`
31. `20260815065653_operational_service_rpcs_v1`
32. `20260815065937_operational_rpcs_server_only_v1`
33. `20260815071750_transactional_notification_outbox_triggers_v1`
34. `20260815073143_operational_performance_indexes_rls_v1`
35. `20260815080505_patient_profiles_and_device_installations_v1`
36. `20260815080906_new_account_self_patient_profile_v1`
37. `20260815081009_patient_booking_server_only_hardening_v1`
38. `20260815081707_rate_limit_buckets_server_only_v1`
39. `20260815082138_bookings_patient_profile_index_v1`
40. `20260815160747_booking_cancellation_server_only_v1`
41. `20260815192828_customer_choice_server_only_ingestion_v1`
42. `20260815194453_offer_verification_trigger_security_context_v1`
43. `20260815195113_admin_verify_activate_atomic_v1`
44. `20260815201835_device_installation_server_upsert_v1`
45. `20260816063608_private_rls_review_integrity_v1`
46. `20260816063824_clinic_application_wrapper_invoker_v1`

## Repository alignment status

- Migration files that exist in `supabase/migrations` from item 16 onward are named with the exact versions recorded by the remote ledger on this branch. SQL bodies were not changed by the filename alignment.
- Items 1–15 predate the materialized migration files currently available in this repository. Their exact historical SQL bodies are not exposed by the connected management API, so they must **not** be reconstructed from guesses.
- Until items 1–15 are materialized from a trusted schema/baseline export, the remote database remains the authoritative starting schema for a fresh environment.

## Required baseline recovery

When an authenticated Supabase CLI/database export channel is available, run a controlled schema pull/baseline export against this project, review it against the live schema, and commit a reproducible baseline without replaying destructive changes against the existing database. Do not edit the remote migration ledger merely to make local filenames look clean.
