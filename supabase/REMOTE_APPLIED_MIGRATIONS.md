# Applied Supabase migrations — qatar-dental-dev

Canonical DEV project ref: `bqvcukxfsnchvkgejolz`

The following migration ledger was retrieved from the connected Supabase management API on 2026-08-15:

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

> The remote DEV project remains the current schema source of truth. The management connector exposes apply/list operations but not exact migration-body download. Run `supabase db pull` when the CLI/package registry is available, review the diff, and commit the materialized migration SQL before any production promotion.
