export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_usernames: {
        Row: {
          created_at: string
          disabled_at: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      accounting_journal_lines: {
        Row: {
          account_code: string
          created_at: string
          credit_minor: number
          debit_minor: number
          id: string
          journal_id: string
          line_no: number
          memo: string | null
        }
        Insert: {
          account_code: string
          created_at?: string
          credit_minor?: number
          debit_minor?: number
          id?: string
          journal_id: string
          line_no: number
          memo?: string | null
        }
        Update: {
          account_code?: string
          created_at?: string
          credit_minor?: number
          debit_minor?: number
          id?: string
          journal_id?: string
          line_no?: number
          memo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_journals: {
        Row: {
          branch_id: string | null
          clinic_id: string
          created_at: string
          created_by: string
          currency: string
          description: string
          id: string
          journal_type: string
          metadata: Json
          occurred_at: string
          posted_at: string | null
          posted_by: string | null
          reversed_journal_id: string | null
          settlement_period_id: string | null
          source_id: string
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          created_by: string
          currency?: string
          description: string
          id?: string
          journal_type: string
          metadata?: Json
          occurred_at?: string
          posted_at?: string | null
          posted_by?: string | null
          reversed_journal_id?: string | null
          settlement_period_id?: string | null
          source_id: string
          source_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string
          id?: string
          journal_type?: string
          metadata?: Json
          occurred_at?: string
          posted_at?: string | null
          posted_by?: string | null
          reversed_journal_id?: string | null
          settlement_period_id?: string | null
          source_id?: string
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_reversed_journal_id_fkey"
            columns: ["reversed_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_settlement_period_id_fkey"
            columns: ["settlement_period_id"]
            isOneToOne: false
            referencedRelation: "settlement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          end_at: string
          expires_at: string | null
          freshness_at: string
          id: string
          practitioner_id: string | null
          resource_id: string | null
          start_at: string
          status: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          end_at: string
          expires_at?: string | null
          freshness_at?: string
          id?: string
          practitioner_id?: string | null
          resource_id?: string | null
          start_at: string
          status?: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          end_at?: string
          expires_at?: string | null
          freshness_at?: string
          id?: string
          practitioner_id?: string | null
          resource_id?: string | null
          start_at?: string
          status?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "treatment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_attendance_events: {
        Row: {
          booking_id: string
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          reason: string | null
          recorded_by: string
          sequence_no: number
          source_id: string | null
          source_type: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          reason?: string | null
          recorded_by: string
          sequence_no: number
          source_id?: string | null
          source_type?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          recorded_by?: string
          sequence_no?: number
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_attendance_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          from_status: string | null
          id: number
          reason: string | null
          to_status: string
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          from_status?: string | null
          id?: never
          reason?: string | null
          to_status: string
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          from_status?: string | null
          id?: never
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booked_by_user_id: string
          booking_code: string
          booking_period: unknown
          branch_id: string
          clinic_id: string
          created_at: string
          end_at: string
          id: string
          idempotency_key: string
          offer_id: string
          offer_snapshot: Json
          patient_id: string
          patient_profile_id: string
          practitioner_id: string | null
          resource_id: string | null
          slot_id: string
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          booked_by_user_id: string
          booking_code: string
          booking_period?: unknown
          branch_id: string
          clinic_id: string
          created_at?: string
          end_at: string
          id?: string
          idempotency_key: string
          offer_id: string
          offer_snapshot: Json
          patient_id: string
          patient_profile_id: string
          practitioner_id?: string | null
          resource_id?: string | null
          slot_id: string
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          booked_by_user_id?: string
          booking_code?: string
          booking_period?: unknown
          branch_id?: string
          clinic_id?: string
          created_at?: string
          end_at?: string
          id?: string
          idempotency_key?: string
          offer_id?: string
          offer_snapshot?: Json
          patient_id?: string
          patient_profile_id?: string
          practitioner_id?: string | null
          resource_id?: string | null
          slot_id?: string
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "branch_service_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_hour_exceptions: {
        Row: {
          branch_id: string
          close_time: string | null
          created_at: string
          id: string
          is_closed: boolean
          local_date: string
          open_time: string | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          close_time?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          local_date: string
          open_time?: string | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          close_time?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          local_date?: string
          open_time?: string | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_hour_exceptions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_hours: {
        Row: {
          branch_id: string
          close_time: string | null
          created_at: string
          id: string
          is_closed: boolean
          open_time: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          branch_id: string
          close_time?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          open_time?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          branch_id?: string
          close_time?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          open_time?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "branch_hours_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_service_offers: {
        Row: {
          anesthesia_included: boolean | null
          branch_id: string
          clinic_attested_at: string | null
          consultation_included: boolean | null
          created_at: string
          currency: string
          duration_minutes: number
          effective_from: string
          effective_to: string | null
          excluded_items: Json
          follow_up_terms: string | null
          id: string
          included_items: Json
          lab_included: boolean | null
          last_verified_at: string | null
          materials: Json
          max_minor: number | null
          min_minor: number | null
          notes: string | null
          price_scope: Json
          price_type: string
          scope_confirmed_at: string | null
          status: string
          updated_at: string
          variant_id: string
          verified_by: string | null
          visit_count: number | null
          xray_included: boolean | null
        }
        Insert: {
          anesthesia_included?: boolean | null
          branch_id: string
          clinic_attested_at?: string | null
          consultation_included?: boolean | null
          created_at?: string
          currency?: string
          duration_minutes?: number
          effective_from?: string
          effective_to?: string | null
          excluded_items?: Json
          follow_up_terms?: string | null
          id?: string
          included_items?: Json
          lab_included?: boolean | null
          last_verified_at?: string | null
          materials?: Json
          max_minor?: number | null
          min_minor?: number | null
          notes?: string | null
          price_scope?: Json
          price_type: string
          scope_confirmed_at?: string | null
          status?: string
          updated_at?: string
          variant_id: string
          verified_by?: string | null
          visit_count?: number | null
          xray_included?: boolean | null
        }
        Update: {
          anesthesia_included?: boolean | null
          branch_id?: string
          clinic_attested_at?: string | null
          consultation_included?: boolean | null
          created_at?: string
          currency?: string
          duration_minutes?: number
          effective_from?: string
          effective_to?: string | null
          excluded_items?: Json
          follow_up_terms?: string | null
          id?: string
          included_items?: Json
          lab_included?: boolean | null
          last_verified_at?: string | null
          materials?: Json
          max_minor?: number | null
          min_minor?: number | null
          notes?: string | null
          price_scope?: Json
          price_type?: string
          scope_confirmed_at?: string | null
          status?: string
          updated_at?: string
          variant_id?: string
          verified_by?: string | null
          visit_count?: number | null
          xray_included?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_service_offers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_service_offers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "treatment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address_line: string | null
          area: string | null
          clinic_id: string
          created_at: string
          id: string
          location: unknown
          name: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          area?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          location?: unknown
          name: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          area?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          location?: unknown
          name?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_fee_rules: {
        Row: {
          branch_id: string | null
          clinic_id: string
          created_at: string
          created_by: string
          currency: string
          effective_from: string
          effective_to: string | null
          fee_type: string
          fixed_minor: number | null
          id: string
          rate_bps: number | null
          status: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          created_by: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          fee_type: string
          fixed_minor?: number | null
          id?: string
          rate_bps?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          fee_type?: string
          fixed_minor?: number | null
          id?: string
          rate_bps?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_fee_rules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_fee_rules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_memberships: {
        Row: {
          branch_id: string | null
          clinic_id: string
          created_at: string
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_memberships_branch_id_clinic_id_fkey"
            columns: ["branch_id", "clinic_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id", "clinic_id"]
          },
          {
            foreignKeyName: "clinic_memberships_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_memberships_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_operator_account_events: {
        Row: {
          actor_user_id: string
          clinic_id: string
          created_at: string
          event_type: string
          id: string
          operator_account_id: string | null
          operator_user_id: string
        }
        Insert: {
          actor_user_id: string
          clinic_id: string
          created_at?: string
          event_type: string
          id?: string
          operator_account_id?: string | null
          operator_user_id: string
        }
        Update: {
          actor_user_id?: string
          clinic_id?: string
          created_at?: string
          event_type?: string
          id?: string
          operator_account_id?: string | null
          operator_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_operator_account_events_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_operator_account_events_operator_account_id_fkey"
            columns: ["operator_account_id"]
            isOneToOne: false
            referencedRelation: "clinic_operator_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_operator_accounts: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string
          id: string
          membership_id: string
          revoked_at: string | null
          slot_no: number
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by: string
          id?: string
          membership_id: string
          revoked_at?: string | null
          slot_no: number
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string
          id?: string
          membership_id?: string
          revoked_at?: string | null
          slot_no?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_operator_accounts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_operator_accounts_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "clinic_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_synthetic: boolean
          legal_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_synthetic?: boolean
          legal_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_synthetic?: boolean
          legal_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          action: string
          consent_type: string
          created_at: string
          id: string
          policy_hash: string
          policy_version: string
          user_id: string
        }
        Insert: {
          action: string
          consent_type: string
          created_at?: string
          id?: string
          policy_hash: string
          policy_version: string
          user_id: string
        }
        Update: {
          action?: string
          consent_type?: string
          created_at?: string
          id?: string
          policy_hash?: string
          policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_choice_events: {
        Row: {
          choice_value: Json
          created_at: string
          event_id: string
          event_name: string
          id: string
          offer_id: string | null
          page_path: string
          session_id: string
          slot_id: string | null
          treatment_id: string | null
          variant_id: string | null
        }
        Insert: {
          choice_value?: Json
          created_at?: string
          event_id: string
          event_name: string
          id?: string
          offer_id?: string | null
          page_path?: string
          session_id: string
          slot_id?: string | null
          treatment_id?: string | null
          variant_id?: string | null
        }
        Update: {
          choice_value?: Json
          created_at?: string
          event_id?: string
          event_name?: string
          id?: string
          offer_id?: string | null
          page_path?: string
          session_id?: string
          slot_id?: string | null
          treatment_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_choice_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "branch_service_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_choice_events_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_choice_events_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatment_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_choice_events_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "treatment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_installations: {
        Row: {
          account_id: string | null
          app_version: string | null
          browser: string | null
          created_at: string
          device_class: string | null
          device_label: string | null
          first_seen_at: string
          id: string
          installation_id: string
          last_seen_at: string
          platform: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          app_version?: string | null
          browser?: string | null
          created_at?: string
          device_class?: string | null
          device_label?: string | null
          first_seen_at?: string
          id?: string
          installation_id: string
          last_seen_at?: string
          platform?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          app_version?: string | null
          browser?: string | null
          created_at?: string
          device_class?: string | null
          device_label?: string | null
          first_seen_at?: string
          id?: string
          installation_id?: string
          last_seen_at?: string
          platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          config: Json
          enabled: boolean
          key: string
          updated_at: string
        }
        Insert: {
          config?: Json
          enabled?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          config?: Json
          enabled?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          request_hash: string | null
          response_ref: string | null
          scope: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          key: string
          request_hash?: string | null
          response_ref?: string | null
          scope: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          request_hash?: string | null
          response_ref?: string | null
          scope?: string
          user_id?: string | null
        }
        Relationships: []
      }
      instant_slots: {
        Row: {
          arrival_deadline: string
          created_at: string
          expires_at: string
          id: string
          offer_id: string
          publish_at: string
          slot_id: string
          status: string
          updated_at: string
        }
        Insert: {
          arrival_deadline: string
          created_at?: string
          expires_at: string
          id?: string
          offer_id: string
          publish_at?: string
          slot_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          arrival_deadline?: string
          created_at?: string
          expires_at?: string
          id?: string
          offer_id?: string
          publish_at?: string
          slot_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instant_slots_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "branch_service_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instant_slots_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_attempts: {
        Row: {
          attempt_no: number
          attempted_at: string
          delivered_at: string | null
          error_code: string | null
          error_detail: string | null
          id: string
          outbox_id: string
          provider: string
          provider_message_id: string | null
          status: string
        }
        Insert: {
          attempt_no: number
          attempted_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_detail?: string | null
          id?: string
          outbox_id: string
          provider: string
          provider_message_id?: string | null
          status: string
        }
        Update: {
          attempt_no?: number
          attempted_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_detail?: string | null
          id?: string
          outbox_id?: string
          provider?: string
          provider_message_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_attempts_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          created_by: string | null
          dedupe_key: string
          event_id: string
          event_type: string
          id: string
          last_error_at: string | null
          last_error_code: string | null
          locale: string
          next_attempt_at: string
          payload: Json
          provider: string | null
          provider_message_id: string | null
          recipient_user_id: string
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          created_by?: string | null
          dedupe_key: string
          event_id: string
          event_type: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          locale: string
          next_attempt_at?: string
          payload?: Json
          provider?: string | null
          provider_message_id?: string | null
          recipient_user_id: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          created_by?: string | null
          dedupe_key?: string
          event_id?: string
          event_type?: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          locale?: string
          next_attempt_at?: string
          payload?: Json
          provider?: string | null
          provider_message_id?: string | null
          recipient_user_id?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          consented_at: string | null
          created_at: string
          destination_ref: string | null
          enabled: boolean
          id: string
          purpose: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel: string
          consented_at?: string | null
          created_at?: string
          destination_ref?: string | null
          enabled?: boolean
          id?: string
          purpose: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          consented_at?: string | null
          created_at?: string
          destination_ref?: string | null
          enabled?: boolean
          id?: string
          purpose?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_subscriptions: {
        Row: {
          channel: string
          consented_at: string
          created_at: string
          endpoint: string
          id: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          channel: string
          consented_at?: string
          created_at?: string
          endpoint: string
          id?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          consented_at?: string
          created_at?: string
          endpoint?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          created_by: string
          id: string
          locale: string
          status: string
          subject: string | null
          template_key: string
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          created_by: string
          id?: string
          locale: string
          status?: string
          subject?: string | null
          template_key: string
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          locale?: string
          status?: string
          subject?: string | null
          template_key?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      offer_revisions: {
        Row: {
          created_at: string
          id: string
          offer_id: string
          previous_snapshot: Json
          proposed_snapshot: Json
          reason: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          revision_no: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          offer_id: string
          previous_snapshot?: Json
          proposed_snapshot?: Json
          reason: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_no: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          offer_id?: string
          previous_snapshot?: Json
          proposed_snapshot?: Json
          reason?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_no?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_revisions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "branch_service_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_phone_verification_challenges: {
        Row: {
          account_id: string
          attempt_count: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          patient_profile_id: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          attempt_count?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          patient_profile_id: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          attempt_count?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          patient_profile_id?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_phone_verification_challenges_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          account_id: string
          archived_at: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          gender: string | null
          id: string
          national_id: string | null
          nationality: string | null
          phone: string | null
          phone_verified_at: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          account_id: string
          archived_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          gender?: string | null
          id?: string
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          relationship?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          archived_at?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          gender?: string | null
          id?: string
          national_id?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          event_type: string
          id: number
          payment_intent_id: string | null
          provider_event_id: string
          raw_hash: string
          received_at: string
        }
        Insert: {
          event_type: string
          id?: never
          payment_intent_id?: string | null
          provider_event_id: string
          raw_hash: string
          received_at?: string
        }
        Update: {
          event_type?: string
          id?: never
          payment_intent_id?: string | null
          provider_event_id?: string
          raw_hash?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount_minor: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          provider: string
          provider_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          provider: string
          provider_ref?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      practitioners: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          display_name: string
          id: string
          license_ref: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          display_name: string
          id?: string
          license_ref?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          display_name?: string
          id?: string
          license_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practitioners_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      price_disputes: {
        Row: {
          booking_id: string | null
          branch_id: string
          created_at: string
          description: string
          evidence: Json
          id: string
          offer_id: string | null
          reporter_id: string
          resolution: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          branch_id: string
          created_at?: string
          description: string
          evidence?: Json
          id?: string
          offer_id?: string | null
          reporter_id: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          branch_id?: string
          created_at?: string
          description?: string
          evidence?: Json
          id?: string
          offer_id?: string | null
          reporter_id?: string
          resolution?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_disputes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_disputes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "branch_service_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          created_at: string
          expires_at: string
          request_count: number
          scope: string
          subject_key: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          request_count?: number
          scope: string
          subject_key: string
          updated_at?: string
          window_started_at: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          request_count?: number
          scope?: string
          subject_key?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      reconciliation_exceptions: {
        Row: {
          booking_id: string | null
          created_at: string
          exception_type: string
          id: string
          notes: string | null
          owner_id: string | null
          payment_intent_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          exception_type: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_intent_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          exception_type?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_intent_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_exceptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_exceptions_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          clinic_id: string | null
          content_hash: string | null
          created_at: string
          expires_at: string | null
          filters: Json
          format: string
          generated_at: string | null
          id: string
          report_kind: string
          requested_by: string
          settlement_period_id: string | null
          status: string
        }
        Insert: {
          clinic_id?: string | null
          content_hash?: string | null
          created_at?: string
          expires_at?: string | null
          filters?: Json
          format: string
          generated_at?: string | null
          id?: string
          report_kind: string
          requested_by: string
          settlement_period_id?: string | null
          status?: string
        }
        Update: {
          clinic_id?: string | null
          content_hash?: string | null
          created_at?: string
          expires_at?: string | null
          filters?: Json
          format?: string
          generated_at?: string | null
          id?: string
          report_kind?: string
          requested_by?: string
          settlement_period_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_settlement_period_id_fkey"
            columns: ["settlement_period_id"]
            isOneToOne: false
            referencedRelation: "settlement_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          active: boolean
          branch_id: string
          created_at: string
          id: string
          name: string
          resource_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id: string
          created_at?: string
          id?: string
          name: string
          resource_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string
          created_at?: string
          id?: string
          name?: string
          resource_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          clinic_id: string
          created_at: string
          id: string
          patient_id: string
          practitioner_id: string | null
          rating: number
          review_text: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          clinic_id: string
          created_at?: string
          id?: string
          patient_id: string
          practitioner_id?: string | null
          rating: number
          review_text?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          practitioner_id?: string | null
          rating?: number
          review_text?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_practitioner_id_fkey"
            columns: ["practitioner_id"]
            isOneToOne: false
            referencedRelation: "practitioners"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clinic_id: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          notes: string | null
          period_end: string
          period_kind: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clinic_id: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          notes?: string | null
          period_end: string
          period_kind: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clinic_id?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_kind?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_periods_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          closed_at: string | null
          created_at: string
          escalation_reason: string | null
          id: string
          locale: string
          safety_category: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          escalation_reason?: string | null
          id?: string
          locale: string
          safety_category?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          escalation_reason?: string | null
          id?: string
          locale?: string
          safety_category?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_knowledge_articles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience: string
          body_markdown: string
          category: string
          created_at: string
          created_by: string
          id: string
          locale: string
          slug: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          body_markdown: string
          category: string
          created_at?: string
          created_by: string
          id?: string
          locale: string
          slug: string
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience?: string
          body_markdown?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          locale?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          policy_version: string | null
          role: string
          safety_category: string | null
          sources: Json
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          policy_version?: string | null
          role: string
          safety_category?: string | null
          sources?: Json
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          policy_version?: string | null
          role?: string
          safety_category?: string | null
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      suspensions: {
        Row: {
          appeal_text: string | null
          created_at: string
          created_by: string | null
          id: string
          reason: string
          severity: string
          status: string
          subject_id: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          appeal_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          severity: string
          status?: string
          subject_id: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          appeal_text?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          severity?: string
          status?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      treatment_catalog: {
        Row: {
          active: boolean
          category: string
          code: string
          comparison_version: number
          created_at: string
          id: string
          name_ar: string
          name_en: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          comparison_version?: number
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          comparison_version?: number
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          updated_at?: string
        }
        Relationships: []
      }
      treatment_variants: {
        Row: {
          active: boolean
          attributes: Json
          catalog_id: string
          created_at: string
          id: string
          name_ar: string
          name_en: string
          updated_at: string
          variant_key: string
        }
        Insert: {
          active?: boolean
          attributes?: Json
          catalog_id: string
          created_at?: string
          id?: string
          name_ar: string
          name_en: string
          updated_at?: string
          variant_key: string
        }
        Update: {
          active?: boolean
          attributes?: Json
          catalog_id?: string
          created_at?: string
          id?: string
          name_ar?: string
          name_en?: string
          updated_at?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_variants_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "treatment_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_records: {
        Row: {
          created_at: string
          created_by: string | null
          evidence: Json
          expires_at: string | null
          id: string
          identifier: string | null
          source: string
          status: string
          subject_id: string
          subject_type: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          identifier?: string | null
          source: string
          status: string
          subject_id: string
          subject_type: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          identifier?: string | null
          source?: string
          status?: string
          subject_id?: string
          subject_type?: string
          verified_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_customer_choice_analytics: {
        Args: { p_days?: number }
        Returns: Json
      }
      audit_clinic_operator_password_reset: {
        Args: { p_operator_account_id: string }
        Returns: undefined
      }
      audit_clinic_operator_password_reset_server: {
        Args: { p_actor_id: string; p_operator_account_id: string }
        Returns: undefined
      }
      book_slot:
        | {
            Args: {
              p_idempotency_key: string
              p_offer_id: string
              p_slot_id: string
            }
            Returns: {
              booking_code: string
              booking_id: string
              booking_status: string
            }[]
          }
        | {
            Args: {
              p_idempotency_key: string
              p_offer_id: string
              p_patient_profile_id: string
              p_slot_id: string
            }
            Returns: {
              booking_code: string
              booking_id: string
              booking_status: string
            }[]
          }
      book_slot_server: {
        Args: {
          p_actor_id: string
          p_idempotency_key: string
          p_offer_id: string
          p_patient_profile_id: string
          p_slot_id: string
        }
        Returns: {
          booking_code: string
          booking_id: string
          booking_status: string
        }[]
      }
      cancel_booking_server: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: string
      }
      change_booking_status_server: {
        Args: { p_actor_id: string; p_booking_id: string; p_status: string }
        Returns: string
      }
      clinic_activity_report_server: {
        Args: {
          p_actor_id: string
          p_clinic_id: string
          p_end: string
          p_granularity?: string
          p_start: string
        }
        Returns: Json
      }
      clinic_booking_patient_details: {
        Args: { p_booking_ids?: string[] }
        Returns: {
          booking_id: string
          patient_date_of_birth: string
          patient_display_name: string
          patient_national_id: string
          patient_nationality: string
          patient_phone: string
          patient_relationship: string
        }[]
      }
      complete_patient_phone_verification_server: {
        Args: {
          p_actor_id: string
          p_challenge_id: string
          p_patient_profile_id: string
        }
        Returns: {
          profile_id: string
          verified_at: string
        }[]
      }
      consume_rate_limit_server: {
        Args: {
          p_limit: number
          p_scope: string
          p_subject_key: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_branch_application: {
        Args: {
          p_address_line?: string
          p_area?: string
          p_clinic_id: string
          p_lat?: number
          p_lng?: number
          p_name: string
        }
        Returns: string
      }
      create_clinic_application: {
        Args: { p_display_name: string; p_legal_name: string }
        Returns: string
      }
      create_settlement_period: {
        Args: {
          p_clinic_id: string
          p_notes?: string
          p_period_end: string
          p_period_kind: string
          p_period_start: string
        }
        Returns: string
      }
      create_settlement_period_server: {
        Args: {
          p_actor_id: string
          p_clinic_id: string
          p_notes?: string
          p_period_end: string
          p_period_kind: string
          p_period_start: string
        }
        Returns: string
      }
      financial_report_summary: {
        Args: { p_clinic_id: string; p_end: string; p_start: string }
        Returns: Json
      }
      financial_report_summary_server: {
        Args: {
          p_actor_id: string
          p_clinic_id: string
          p_end: string
          p_start: string
        }
        Returns: Json
      }
      is_price_scope_publishable: { Args: { p_scope: Json }; Returns: boolean }
      is_valid_price_scope: { Args: { p_scope: Json }; Returns: boolean }
      list_clinic_operator_accounts: {
        Args: { p_clinic_id: string }
        Returns: {
          created_at: string
          operator_account_id: string
          revoked_at: string
          slot_no: number
          status: string
          user_id: string
          username: string
        }[]
      }
      list_clinic_operator_accounts_server: {
        Args: { p_actor_id: string; p_clinic_id: string }
        Returns: {
          created_at: string
          operator_account_id: string
          revoked_at: string
          slot_no: number
          status: string
          user_id: string
          username: string
        }[]
      }
      platform_activity_report_server: {
        Args: {
          p_actor_id: string
          p_end: string
          p_granularity?: string
          p_start: string
        }
        Returns: Json
      }
      provision_clinic_operator_account: {
        Args: { p_clinic_id: string; p_user_id: string; p_username: string }
        Returns: string
      }
      provision_clinic_operator_account_server: {
        Args: {
          p_actor_id: string
          p_clinic_id: string
          p_user_id: string
          p_username: string
        }
        Returns: string
      }
      record_booking_check_in: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: string
      }
      record_booking_check_in_server: {
        Args: { p_actor_id: string; p_booking_id: string; p_reason?: string }
        Returns: string
      }
      register_device_installation_server: {
        Args: {
          p_account_id: string
          p_app_version: string
          p_browser: string
          p_device_class: string
          p_device_label: string
          p_installation_id: string
          p_platform: string
        }
        Returns: string
      }
      request_offer_revision: {
        Args: {
          p_duration_minutes: number
          p_max_minor: number
          p_min_minor: number
          p_offer_id: string
          p_price_type: string
          p_reason: string
        }
        Returns: string
      }
      request_offer_revision_server: {
        Args: {
          p_actor_id: string
          p_duration_minutes: number
          p_max_minor: number
          p_min_minor: number
          p_offer_id: string
          p_price_type: string
          p_reason: string
        }
        Returns: string
      }
      reverse_booking_attendance: {
        Args: { p_booking_id: string; p_reason: string }
        Returns: string
      }
      reverse_booking_attendance_server: {
        Args: { p_actor_id: string; p_booking_id: string; p_reason: string }
        Returns: string
      }
      review_offer_revision: {
        Args: { p_approve: boolean; p_reason?: string; p_revision_id: string }
        Returns: string
      }
      review_offer_revision_server: {
        Args: {
          p_actor_id: string
          p_approve: boolean
          p_reason?: string
          p_revision_id: string
        }
        Returns: string
      }
      revoke_clinic_operator_account: {
        Args: { p_operator_account_id: string }
        Returns: undefined
      }
      revoke_clinic_operator_account_server: {
        Args: { p_actor_id: string; p_operator_account_id: string }
        Returns: undefined
      }
      search_dental_offers: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_radius_km?: number
          p_variant_id: string
        }
        Returns: {
          area: string
          branch_id: string
          branch_latitude: number
          branch_longitude: number
          branch_name: string
          clinic_attested_at: string
          clinic_id: string
          clinic_name: string
          currency: string
          distance_km: number
          duration_minutes: number
          earliest_slot_at: string
          earliest_slot_id: string
          excluded_items: Json
          follow_up_terms: string
          included_items: Json
          last_verified_at: string
          materials: Json
          max_minor: number
          min_minor: number
          offer_id: string
          open_now: boolean
          price_scope: Json
          price_type: string
          rating_avg: number
          review_count: number
          scope_confirmed_at: string
          variant_id: string
          visit_count: number
        }[]
      }
      verify_and_activate_server: {
        Args: {
          p_actor_id: string
          p_identifier?: string
          p_source: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
