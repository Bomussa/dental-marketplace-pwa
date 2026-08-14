export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Timestamped = { created_at: string; updated_at: string };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
      profiles: Table<
        { id:string; display_name:string|null; phone:string|null; locale:string; created_at:string; updated_at:string },
        { id:string; display_name?:string|null; phone?:string|null; locale?:string; created_at?:string; updated_at?:string }
      >;
      clinics: Table<
        { id:string; legal_name:string; display_name:string; status:string } & Timestamped,
        { id?:string; legal_name:string; display_name:string; status?:string; created_at?:string; updated_at?:string }
      >;
      branches: Table<
        { id:string; clinic_id:string; name:string; address_line:string|null; area:string|null; location:unknown; timezone:string; status:string } & Timestamped,
        { id?:string; clinic_id:string; name:string; address_line?:string|null; area?:string|null; location?:unknown; timezone?:string; status?:string; created_at?:string; updated_at?:string }
      >;
      clinic_memberships: Table<
        { id:string; user_id:string; clinic_id:string; branch_id:string|null; role:string; status:string } & Timestamped,
        { id?:string; user_id:string; clinic_id:string; branch_id?:string|null; role:string; status?:string; created_at?:string; updated_at?:string }
      >;
      practitioners: Table<
        { id:string; clinic_id:string; display_name:string; license_ref:string|null; active:boolean } & Timestamped,
        { id?:string; clinic_id:string; display_name:string; license_ref?:string|null; active?:boolean; created_at?:string; updated_at?:string }
      >;
      verification_records: Table<
        { id:string; subject_type:string; subject_id:string; source:string; identifier:string|null; status:string; verified_at:string|null; expires_at:string|null; evidence:Json; created_by:string|null; created_at:string },
        { id?:string; subject_type:string; subject_id:string; source:string; identifier?:string|null; status:string; verified_at?:string|null; expires_at?:string|null; evidence?:Json; created_by?:string|null; created_at?:string }
      >;
      treatment_catalog: Table<
        { id:string; code:string; category:string; name_ar:string; name_en:string; comparison_version:number; active:boolean } & Timestamped,
        { id?:string; code:string; category:string; name_ar:string; name_en:string; comparison_version?:number; active?:boolean; created_at?:string; updated_at?:string }
      >;
      treatment_variants: Table<
        { id:string; catalog_id:string; variant_key:string; name_ar:string; name_en:string; attributes:Json; active:boolean } & Timestamped,
        { id?:string; catalog_id:string; variant_key:string; name_ar:string; name_en:string; attributes?:Json; active?:boolean; created_at?:string; updated_at?:string }
      >;
      branch_service_offers: Table<
        { id:string; branch_id:string; variant_id:string; price_type:string; min_minor:number|null; max_minor:number|null; currency:string; duration_minutes:number; consultation_included:boolean|null; xray_included:boolean|null; anesthesia_included:boolean|null; lab_included:boolean|null; included_items:Json; excluded_items:Json; materials:Json; visit_count:number|null; follow_up_terms:string|null; notes:string|null; effective_from:string; effective_to:string|null; clinic_attested_at:string|null; last_verified_at:string|null; verified_by:string|null; status:string } & Timestamped,
        { id?:string; branch_id:string; variant_id:string; price_type:string; min_minor?:number|null; max_minor?:number|null; currency?:string; duration_minutes?:number; consultation_included?:boolean|null; xray_included?:boolean|null; anesthesia_included?:boolean|null; lab_included?:boolean|null; included_items?:Json; excluded_items?:Json; materials?:Json; visit_count?:number|null; follow_up_terms?:string|null; notes?:string|null; effective_from?:string; effective_to?:string|null; clinic_attested_at?:string|null; last_verified_at?:string|null; verified_by?:string|null; status?:string; created_at?:string; updated_at?:string }
      >;
      branch_hours: Table<
        { id:string; branch_id:string; weekday:number; open_time:string|null; close_time:string|null; is_closed:boolean } & Timestamped,
        { id?:string; branch_id:string; weekday:number; open_time?:string|null; close_time?:string|null; is_closed?:boolean; created_at?:string; updated_at?:string }
      >;
      availability_slots: Table<
        { id:string; branch_id:string; variant_id:string; practitioner_id:string|null; resource_id:string|null; start_at:string; end_at:string; status:string; freshness_at:string; expires_at:string|null; created_by:string|null } & Timestamped,
        { id?:string; branch_id:string; variant_id:string; practitioner_id?:string|null; resource_id?:string|null; start_at:string; end_at:string; status?:string; freshness_at?:string; expires_at?:string|null; created_by?:string|null; created_at?:string; updated_at?:string }
      >;
      bookings: Table<
        { id:string; patient_id:string; clinic_id:string; branch_id:string; practitioner_id:string|null; resource_id:string|null; slot_id:string; offer_id:string; start_at:string; end_at:string; booking_period:unknown; status:string; offer_snapshot:Json; idempotency_key:string; booking_code:string } & Timestamped,
        { id?:string; patient_id:string; clinic_id:string; branch_id:string; practitioner_id?:string|null; resource_id?:string|null; slot_id:string; offer_id:string; start_at:string; end_at:string; booking_period?:unknown; status?:string; offer_snapshot:Json; idempotency_key:string; booking_code:string; created_at?:string; updated_at?:string }
      >;
      reviews: Table<
        { id:string; booking_id:string; patient_id:string; clinic_id:string; practitioner_id:string|null; rating:number; review_text:string|null; status:string } & Timestamped,
        { id?:string; booking_id:string; patient_id:string; clinic_id:string; practitioner_id?:string|null; rating:number; review_text?:string|null; status?:string; created_at?:string; updated_at?:string }
      >;
      price_disputes: Table<
        { id:string; booking_id:string|null; offer_id:string|null; branch_id:string; reporter_id:string; description:string; evidence:Json; status:string; resolution:string|null } & Timestamped,
        { id?:string; booking_id?:string|null; offer_id?:string|null; branch_id:string; reporter_id:string; description:string; evidence?:Json; status?:string; resolution?:string|null; created_at?:string; updated_at?:string }
      >;
      feature_flags: Table<
        { key:string; enabled:boolean; config:Json; updated_at:string },
        { key:string; enabled?:boolean; config?:Json; updated_at?:string }
      >;
    };
    Views: Record<never, never>;
    Functions: {
      book_slot: {
        Args: { p_idempotency_key:string; p_offer_id:string; p_slot_id:string };
        Returns: { booking_code:string; booking_id:string; booking_status:string }[];
      };
      create_branch_application: {
        Args: { p_clinic_id:string; p_name:string; p_area?:string|null; p_address_line?:string|null; p_lat?:number|null; p_lng?:number|null };
        Returns: string;
      };
      create_clinic_application: {
        Args: { p_display_name:string; p_legal_name:string };
        Returns: string;
      };
      search_dental_offers: {
        Args: { p_variant_id:string; p_lat?:number|null; p_lng?:number|null; p_radius_km?:number|null };
        Returns: {
          offer_id:string; clinic_id:string; clinic_name:string; branch_id:string; branch_name:string; area:string|null;
          variant_id:string; price_type:string; min_minor:number|null; max_minor:number|null; currency:string; duration_minutes:number;
          clinic_attested_at:string|null; last_verified_at:string|null; distance_km:number|null; open_now:boolean;
          earliest_slot_id:string|null; earliest_slot_at:string|null; rating_avg:number|null; review_count:number;
        }[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
