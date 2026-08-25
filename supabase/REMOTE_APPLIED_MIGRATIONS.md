# Applied Supabase migrations — qatar-dental-dev

Canonical project ref used by the current application: `bqvcukxfsnchvkgejolz`.

> هذا سجل تدقيقي مستخرج من واجهة إدارة Supabase المتصلة بتاريخ 2026-08-19. يمثل رقم `version` وقت تسجيل الترحيل في الإنتاج؛ لذلك قد يختلف عن بادئة اسم ملف SQL المحفوظ في المستودع عند تطبيق الترحيل عبر واجهة الإدارة.

| # | الإصدار البعيد | الاسم المسجل في الإنتاج |
|---:|---|---|
| 1 | `20260814162411` | `core_schema_v1` |
| 2 | `20260814162736` | `rls_and_atomic_booking_v1` |
| 3 | `20260814162810` | `harden_privileged_rpcs_v1` |
| 4 | `20260814162834` | `performance_indexes_and_policy_cleanup_v1` |
| 5 | `20260814162911` | `treatment_taxonomy_v1` |
| 6 | `20260814163035` | `auth_profile_trigger_v1` |
| 7 | `20260814163115` | `slot_treatment_compatibility_v1` |
| 8 | `20260814163211` | `verification_activation_gates_v1` |
| 9 | `20260814163411` | `platform_admin_and_clinic_application_v1` |
| 10 | `20260814163533` | `offer_duration_and_open_now_v1` |
| 11 | `20260814164341` | `authorization_workflow_hardening_v1` |
| 12 | `20260814164609` | `search_trust_signals_v1` |
| 13 | `20260814164708` | `consolidate_permissive_policies_v1` |
| 14 | `20260814164955` | `booking_slot_lifecycle_sync_v1` |
| 15 | `20260814165149` | `branch_application_rpc_v1` |
| 16 | `20260814213531` | `customer_choice_event_ingestion_v1` |
| 17 | `20260814214421` | `customer_choice_event_fk_indexes_v1` |
| 18 | `20260814220327` | `admin_customer_choice_analytics_v1` |
| 19 | `20260814221217` | `customer_choice_analytics_hardening_v1` |
| 20 | `20260814221320` | `customer_choice_analytics_cohort_v1` |
| 21 | `20260814221926` | `consolidate_analytics_catalog_policies_v1` |
| 22 | `20260815050556` | `exclude_synthetic_dev_clinics_from_public_search` |
| 23 | `20260815051408` | `public_search_dev_guard_security_definer` |
| 24 | `20260815051730` | `public_search_dev_guard_view` |
| 25 | `20260815051855` | `public_search_dev_guard_private_helper` |
| 26 | `20260815051946` | `grant_private_schema_usage_for_public_search_helper` |
| 27 | `20260815052459` | `denormalize_synthetic_clinic_visibility` |
| 28 | `20260815052839` | `revoke_private_schema_usage_after_search_guard` |
| 29 | `20260815065426` | `operational_finance_core_v1` |
| 30 | `20260815065524` | `notification_support_core_v1` |
| 31 | `20260815065653` | `operational_service_rpcs_v1` |
| 32 | `20260815065937` | `operational_rpcs_server_only_v1` |
| 33 | `20260815071750` | `transactional_notification_outbox_triggers_v1` |
| 34 | `20260815073143` | `operational_performance_indexes_rls_v1` |
| 35 | `20260815080505` | `patient_profiles_and_device_installations_v1` |
| 36 | `20260815080906` | `new_account_self_patient_profile_v1` |
| 37 | `20260815081009` | `patient_booking_server_only_hardening_v1` |
| 38 | `20260815081707` | `rate_limit_buckets_server_only_v1` |
| 39 | `20260815082138` | `bookings_patient_profile_index_v1` |
| 40 | `20260815160747` | `booking_cancellation_server_only_v1` |
| 41 | `20260815192828` | `customer_choice_server_only_ingestion_v1` |
| 42 | `20260815194453` | `offer_verification_trigger_security_context_v1` |
| 43 | `20260815195113` | `admin_verify_activate_atomic_v1` |
| 44 | `20260815201835` | `device_installation_server_upsert_v1` |
| 45 | `20260816063608` | `private_rls_review_integrity_v1` |
| 46 | `20260816063824` | `clinic_application_wrapper_invoker_v1` |
| 47 | `20260816064530` | `clinic_booking_status_server_v1` |
| 48 | `20260816065017` | `support_admin_and_template_privileges_v1` |
| 49 | `20260816180742` | `support_knowledge_policy_dedup_v1` |
| 50 | `20260816181409` | `review_pending_edit_guard_v1` |
| 51 | `20260816181434` | `offer_revision_price_invariants_v1` |
| 52 | `20260816182205` | `booking_completion_attendance_guard_v1` |
| 53 | `20260816182801` | `clinic_booking_transition_matrix_v1` |
| 54 | `20260816183333` | `attendance_event_cycle_v1` |
| 55 | `20260816183532` | `attendance_sequence_order_v1` |
| 56 | `20260817184125` | `secure_patient_booking_realtime_v1` |
| 57 | `20260817184247` | `patient_details_rls_hardening_v1` |
| 58 | `20260817185542` | `clinic_mutation_role_hardening_v1` |
| 59 | `20260817190404` | `admin_catalog_display_governance_v1` |
| 60 | `20260817191351` | `realtime_surface_completion_v1` |
| 61 | `20260818044007` | `localize_clinic_booking_notifications_v1` |
| 62 | `20260818052247` | `localize_recent_choice_events_v1` |
| 63 | `20260818194705` | `treatment_catalog_and_price_scope_transparency` |
| 64 | `20260818225246` | `username_password_and_clinic_operator_accounts` |
| 65 | `20260819032137` | `public_search_branch_coordinates_for_directions` |
| 66 | `20260819051052` | `lock_down_clinic_operator_security_definer_rpcs` |
| 67 | `20260819051616` | `add_service_only_clinic_operator_rpcs` |
| 68 | `20260819051756` | `revoke_legacy_clinic_operator_rpcs` |
| 69 | `20260819052626` | `explicitly_deny_operator_account_table_access` |
| 70 | `20260819070151` | `scale_critical_search_and_operator_indexes` |
| 71 | `20260819095142` | `activity_report_rpc` |
| 72 | `20260819133741` | `server_only_critical_mutation_policies` |
| 73 | `20260819171711` | `hide_synthetic_clinics_from_direct_public_reads` |
| 74 | `20260819173555` | `hide_synthetic_clinic_entities_from_public_reads` |
| 75 | `20260820004925` | `remove_duplicate_feature_flags_admin_update_policy` |
| 76 | `20260820010207` | `atomic_phone_verification_finalize` |
| 77 | `20260820011431` | `revoke_redundant_client_write_grants` |
| 78 | `20260820011608` | `fail_closed_default_client_privileges` |
| 79 | `20260821044927` | `optimize_financial_report_time_ranges` |
| 80 | `20260821090031` | `consolidate_rls_policy_execution_paths` |

## Repository alignment status

تطابقت أسماء الترحيلات المحلية من 16 إلى 80 مع الأسماء المسجلة في الإنتاج في تدقيق قراءة فقط بتاريخ 21 أغسطس 2026. قد يختلف رقم `version` البعيد عن بادئة اسم الملف إذا سُجل الترحيل عبر واجهة الإدارة، كما هو موضح أعلاه. عناصر المخطط الأساسية من 1 إلى 15 تسبق ملفات الهجرة المادية المتاحة في هذا المستودع؛ لذلك يبقى مخطط الإنتاج المرجع الأساس لإنشاء baseline موثوق بدل إعادة بناء SQL تاريخي بالافتراض.

## ترحيلات التطوير بعد آخر تدقيق إنتاجي

> **الحالة:** طُبّقت الترحيلات التالية في مشروع التطوير/المرجع `bqvcukxfsnchvkgejolz` بتاريخ 24 أغسطس 2026. لم يثبت هذا السجل تطبيقها في بيئة الإنتاج أو ربط نشر Vercel بها؛ يجب التحقق من بيئة الإنتاج الفعلية قبل أي DDL أو إنشاء حسابات حقيقية.

| ملف المستودع | الاسم المسجل في بيئة التطوير | الغرض | نتيجة تحقق القراءة فقط |
|---|---|---|---|
| `20260824231500_super_admin_operational_client_v1.sql` | `super_admin_operational_client_v1` | claim-check للمدير الأعلى وتهيئة عميل حجوزات مقيد بفرع مع تدقيق. | الإجراء موجود ولا يملك `anon` تنفيذ التهيئة. |
| `20260824232500_super_admin_operational_client_management_v1.sql` | `super_admin_operational_client_management_v1` | عرض العملاء التشغيليين وإيقافهم مع حفظ السجل. | الإجراءان موجودان ولا يملك `authenticated` تنفيذ العرض مباشرة. |

لا ينشئ أي من الترحيلين كلمة مرور أو يضع بيانات اعتماد في SQL؛ تبقى كلمة المرور حصرًا داخل Supabase Auth وبمسار خادمي محمي.


## إصدار Production — 25 أغسطس 2026: حصر تنفيذ RPC

> **الحالة:** طُبّق التسلسل التالي في مشروع Production `bqvcukxfsnchvkgejolz` بعد مراجعة المصدر واختبار Staging. لا يتضمن DML أو نقل بيانات أو حسابات/حجوزات/مواعيد اختبار. رقم `version` هو وقت التسجيل الفعلي لدى Supabase، ولذلك يختلف عن بادئة ملف المصدر.

| # | ملف المصدر | الإصدار البعيد | الاسم المسجل | الغرض |
|---:|---|---|---|---|
| 81 | `20260825191000_harden_public_function_execute.sql` | `20260825201107` | `harden_public_function_execute` | سحب grants العامة وحصر دوال `_server` في `service_role`. |
| 82 | `20260825192500_revoke_anon_server_rpc_execute.sql` | `20260825201142` | `revoke_anon_server_rpc_execute` | إزالة منح `anon` الموروثة ثم إعادة بحث الزوار فقط. |
| 83 | `20260825193500_limit_authenticated_security_definer_rpc.sql` | `20260825201217` | `limit_authenticated_security_definer_rpc` | منح authenticated لدوال الواجهة المحددة ومساعدات validation فقط. |
| 84 | `20260825194500_allow_public_search_validation_helper.sql` | `20260825201253` | `allow_public_search_validation_helper` | منح مساعد نطاق السعر غير الخادمي للبحث العام فقط. |
| 85 | `20260825195000_allow_authenticated_search_rpc.sql` | `20260825201329` | `allow_authenticated_search_rpc` | إبقاء بحث القراءة فقط متاحًا للمستخدم المسجل. |

**Postconditions المقروءة بعد التطبيق:** `anon_server_execute=0`، و`authenticated_server_execute=0`، و`service_server_execute=23`. بقي `search_dental_offers` ومساعد نطاق السعر اللازم متاحين للأدوار المقصودة فقط. أعاد مستشار الأمان تحذيرًا واحدًا لا يتعلق بـRPC: `auth_leaked_password_protection`؛ لم تُفعّل خطة مدفوعة أو إعداد إضافي تلقائي.
