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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          is_pro_member: boolean
          phone: string | null
          pos_pin_hash: string | null
          role: string
          sms_consent_at: string | null
          sms_opt_in: boolean
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          is_pro_member?: boolean
          phone?: string | null
          pos_pin_hash?: string | null
          role?: string
          sms_consent_at?: string | null
          sms_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_pro_member?: boolean
          phone?: string | null
          pos_pin_hash?: string | null
          role?: string
          sms_consent_at?: string | null
          sms_opt_in?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      audience_segments: {
        Row: {
          created_at: string
          description: string | null
          filter: Json
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filter?: Json
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filter?: Json
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      calculator_events: {
        Row: {
          created_at: string
          data: Json
          event_type: string
          id: string
          session_id: string | null
          source_page: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          event_type: string
          id?: string
          session_id?: string | null
          source_page?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          event_type?: string
          id?: string
          session_id?: string | null
          source_page?: string | null
        }
        Relationships: []
      }
      call_order_links: {
        Row: {
          call_id: string
          id: string
          linked_at: string
          linked_by: string | null
          order_id: string
        }
        Insert: {
          call_id: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          order_id: string
        }
        Update: {
          call_id?: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_order_links_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_order_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      call_records: {
        Row: {
          ai_action_items: string[] | null
          ai_fetched_at: string | null
          ai_sentiment: string | null
          ai_summary: string | null
          ai_transcript: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          customer_id: string | null
          customer_match_type: string | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          extension_id: string | null
          extension_name: string | null
          follow_up_resolved: boolean | null
          follow_up_resolved_at: string | null
          follow_up_resolved_by: string | null
          from_name: string | null
          from_number: string
          id: string
          rc_call_id: string | null
          rc_recording_id: string | null
          rc_session_id: string | null
          requires_follow_up: boolean | null
          staff_notes: string | null
          started_at: string
          status: string
          to_number: string
          updated_at: string
        }
        Insert: {
          ai_action_items?: string[] | null
          ai_fetched_at?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_transcript?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          customer_id?: string | null
          customer_match_type?: string | null
          direction: string
          duration_seconds?: number | null
          ended_at?: string | null
          extension_id?: string | null
          extension_name?: string | null
          follow_up_resolved?: boolean | null
          follow_up_resolved_at?: string | null
          follow_up_resolved_by?: string | null
          from_name?: string | null
          from_number: string
          id?: string
          rc_call_id?: string | null
          rc_recording_id?: string | null
          rc_session_id?: string | null
          requires_follow_up?: boolean | null
          staff_notes?: string | null
          started_at?: string
          status?: string
          to_number: string
          updated_at?: string
        }
        Update: {
          ai_action_items?: string[] | null
          ai_fetched_at?: string | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_transcript?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          customer_id?: string | null
          customer_match_type?: string | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          extension_id?: string | null
          extension_name?: string | null
          follow_up_resolved?: boolean | null
          follow_up_resolved_at?: string | null
          follow_up_resolved_by?: string | null
          from_name?: string | null
          from_number?: string
          id?: string
          rc_call_id?: string | null
          rc_recording_id?: string | null
          rc_session_id?: string | null
          requires_follow_up?: boolean | null
          staff_notes?: string | null
          started_at?: string
          status?: string
          to_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          campaign_id: string
          channel: string
          clicked_at: string | null
          created_at: string
          customer_id: string
          email: string | null
          email_id: string | null
          error_message: string | null
          id: string
          link_clicked: boolean
          phone: string | null
          sent_at: string | null
          sms_sid: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          channel: string
          clicked_at?: string | null
          created_at?: string
          customer_id: string
          email?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          link_clicked?: boolean
          phone?: string | null
          sent_at?: string | null
          sms_sid?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          channel?: string
          clicked_at?: string | null
          created_at?: string
          customer_id?: string
          email?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          link_clicked?: boolean
          phone?: string | null
          sent_at?: string | null
          sms_sid?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audience_filter: Json
          channel: string
          completed_at: string | null
          created_at: string
          description: string | null
          email_body_html: string | null
          email_subject: string | null
          id: string
          name: string
          requires_approval: boolean
          scheduled_at: string | null
          slug: string
          sms_body: string | null
          started_at: string | null
          status: string
          target_url: string | null
          total_clicked: number
          total_delivered: number
          total_failed: number
          total_opted_out: number
          total_recipients: number
          total_sent: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audience_filter?: Json
          channel: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          email_body_html?: string | null
          email_subject?: string | null
          id?: string
          name: string
          requires_approval?: boolean
          scheduled_at?: string | null
          slug: string
          sms_body?: string | null
          started_at?: string | null
          status?: string
          target_url?: string | null
          total_clicked?: number
          total_delivered?: number
          total_failed?: number
          total_opted_out?: number
          total_recipients?: number
          total_sent?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audience_filter?: Json
          channel?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          email_body_html?: string | null
          email_subject?: string | null
          id?: string
          name?: string
          requires_approval?: boolean
          scheduled_at?: string | null
          slug?: string
          sms_body?: string | null
          started_at?: string | null
          status?: string
          target_url?: string | null
          total_clicked?: number
          total_delivered?: number
          total_failed?: number
          total_opted_out?: number
          total_recipients?: number
          total_sent?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contractors: {
        Row: {
          avg_response_minutes: number | null
          company_name: string | null
          created_at: string
          current_active_leads: number | null
          customer_id: string | null
          email: string | null
          email_notifications: boolean | null
          id: string
          is_active: boolean
          max_active_leads: number | null
          name: string
          notes: string | null
          phone: string
          preferred_contact: string | null
          service_types: string[]
          sms_notifications: boolean | null
          total_leads_assigned: number | null
          total_leads_won: number | null
          win_rate: number | null
        }
        Insert: {
          avg_response_minutes?: number | null
          company_name?: string | null
          created_at?: string
          current_active_leads?: number | null
          customer_id?: string | null
          email?: string | null
          email_notifications?: boolean | null
          id?: string
          is_active?: boolean
          max_active_leads?: number | null
          name: string
          notes?: string | null
          phone: string
          preferred_contact?: string | null
          service_types?: string[]
          sms_notifications?: boolean | null
          total_leads_assigned?: number | null
          total_leads_won?: number | null
          win_rate?: number | null
        }
        Update: {
          avg_response_minutes?: number | null
          company_name?: string | null
          created_at?: string
          current_active_leads?: number | null
          customer_id?: string | null
          email?: string | null
          email_notifications?: boolean | null
          id?: string
          is_active?: boolean
          max_active_leads?: number | null
          name?: string
          notes?: string | null
          phone?: string
          preferred_contact?: string | null
          service_types?: string[]
          sms_notifications?: boolean | null
          total_leads_assigned?: number | null
          total_leads_won?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      counter_checkins: {
        Row: {
          checked_in: boolean
          checked_in_at: string
          extension_id: string
          id: string
          staff_name: string | null
        }
        Insert: {
          checked_in: boolean
          checked_in_at?: string
          extension_id: string
          id?: string
          staff_name?: string | null
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string
          extension_id?: string
          id?: string
          staff_name?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          created_by: string
          customer_id: string
          id: string
          note: string | null
          order_id: string | null
          stripe_payment_intent_id: string | null
          type: string
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          created_by?: string
          customer_id: string
          id?: string
          note?: string | null
          order_id?: string | null
          stripe_payment_intent_id?: string | null
          type: string
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          note?: string | null
          order_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          billing_address: string | null
          billing_email: string | null
          charge_account_name: string | null
          city: string | null
          company_name: string | null
          contractor_discount: boolean
          created_at: string
          credit_balance_cents: number
          credit_limit_cents: number | null
          current_balance_cents: number
          customer_type: string
          email: string | null
          first_name: string | null
          first_order_at: string | null
          id: string
          is_charge_account: boolean
          is_scammer: boolean
          last_name: string | null
          last_order_at: string | null
          last_statement_date: string | null
          notes: string | null
          opted_in_email: boolean
          opted_in_sms: boolean
          payment_terms: string | null
          phone: string | null
          scammer_note: string | null
          source: string
          state: string | null
          tags: string[]
          tax_exempt: boolean
          tax_exempt_certificate: string | null
          total_orders: number
          total_spent_cents: number
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          billing_address?: string | null
          billing_email?: string | null
          charge_account_name?: string | null
          city?: string | null
          company_name?: string | null
          contractor_discount?: boolean
          created_at?: string
          credit_balance_cents?: number
          credit_limit_cents?: number | null
          current_balance_cents?: number
          customer_type?: string
          email?: string | null
          first_name?: string | null
          first_order_at?: string | null
          id?: string
          is_charge_account?: boolean
          is_scammer?: boolean
          last_name?: string | null
          last_order_at?: string | null
          last_statement_date?: string | null
          notes?: string | null
          opted_in_email?: boolean
          opted_in_sms?: boolean
          payment_terms?: string | null
          phone?: string | null
          scammer_note?: string | null
          source?: string
          state?: string | null
          tags?: string[]
          tax_exempt?: boolean
          tax_exempt_certificate?: string | null
          total_orders?: number
          total_spent_cents?: number
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          billing_address?: string | null
          billing_email?: string | null
          charge_account_name?: string | null
          city?: string | null
          company_name?: string | null
          contractor_discount?: boolean
          created_at?: string
          credit_balance_cents?: number
          credit_limit_cents?: number | null
          current_balance_cents?: number
          customer_type?: string
          email?: string | null
          first_name?: string | null
          first_order_at?: string | null
          id?: string
          is_charge_account?: boolean
          is_scammer?: boolean
          last_name?: string | null
          last_order_at?: string | null
          last_statement_date?: string | null
          notes?: string | null
          opted_in_email?: boolean
          opted_in_sms?: boolean
          payment_terms?: string | null
          phone?: string | null
          scammer_note?: string | null
          source?: string
          state?: string | null
          tags?: string[]
          tax_exempt?: boolean
          tax_exempt_certificate?: string | null
          total_orders?: number
          total_spent_cents?: number
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      delivery_assignments: {
        Row: {
          access_constraints: Json
          access_notes: string | null
          actual_arrival: string | null
          actual_completion: string | null
          actual_departure: string | null
          assigned_by: string | null
          auto_scheduled: boolean
          backhaul_material: string | null
          backhaul_supplier_id: string | null
          backhaul_yards: number | null
          created_at: string
          delivery_date: string
          destination_address: string
          destination_town: string | null
          dispatch_notes: string | null
          distance_miles: number | null
          drive_minutes: number | null
          driver_name: string | null
          driver_notes: string | null
          driver_phone: string | null
          estimated_arrival: string | null
          estimated_departure: string | null
          has_spreading: boolean
          id: string
          load_number: number
          material_summary: string
          optimization_notes: string | null
          order_id: string
          spreading_yards: number | null
          status: string
          suggested_route_order: number | null
          time_slot: string | null
          total_yards: number | null
          truck_id: string | null
          truck_type: string
          updated_at: string
        }
        Insert: {
          access_constraints?: Json
          access_notes?: string | null
          actual_arrival?: string | null
          actual_completion?: string | null
          actual_departure?: string | null
          assigned_by?: string | null
          auto_scheduled?: boolean
          backhaul_material?: string | null
          backhaul_supplier_id?: string | null
          backhaul_yards?: number | null
          created_at?: string
          delivery_date: string
          destination_address: string
          destination_town?: string | null
          dispatch_notes?: string | null
          distance_miles?: number | null
          drive_minutes?: number | null
          driver_name?: string | null
          driver_notes?: string | null
          driver_phone?: string | null
          estimated_arrival?: string | null
          estimated_departure?: string | null
          has_spreading?: boolean
          id?: string
          load_number?: number
          material_summary: string
          optimization_notes?: string | null
          order_id: string
          spreading_yards?: number | null
          status?: string
          suggested_route_order?: number | null
          time_slot?: string | null
          total_yards?: number | null
          truck_id?: string | null
          truck_type: string
          updated_at?: string
        }
        Update: {
          access_constraints?: Json
          access_notes?: string | null
          actual_arrival?: string | null
          actual_completion?: string | null
          actual_departure?: string | null
          assigned_by?: string | null
          auto_scheduled?: boolean
          backhaul_material?: string | null
          backhaul_supplier_id?: string | null
          backhaul_yards?: number | null
          created_at?: string
          delivery_date?: string
          destination_address?: string
          destination_town?: string | null
          dispatch_notes?: string | null
          distance_miles?: number | null
          drive_minutes?: number | null
          driver_name?: string | null
          driver_notes?: string | null
          driver_phone?: string | null
          estimated_arrival?: string | null
          estimated_departure?: string | null
          has_spreading?: boolean
          id?: string
          load_number?: number
          material_summary?: string
          optimization_notes?: string | null
          order_id?: string
          spreading_yards?: number | null
          status?: string
          suggested_route_order?: number | null
          time_slot?: string | null
          total_yards?: number | null
          truck_id?: string | null
          truck_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_backhaul_supplier_id_fkey"
            columns: ["backhaul_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_fee_cache: {
        Row: {
          additional_load_fee_cents: number
          address: string
          address_hash: string
          created_at: string
          distance_meters: number
          duration_seconds: number
          expires_at: string
          first_load_fee_cents: number
          id: number
          is_local: boolean
          is_out_of_range: boolean
          one_way_miles: number
        }
        Insert: {
          additional_load_fee_cents: number
          address: string
          address_hash: string
          created_at?: string
          distance_meters: number
          duration_seconds: number
          expires_at?: string
          first_load_fee_cents: number
          id?: never
          is_local?: boolean
          is_out_of_range?: boolean
          one_way_miles: number
        }
        Update: {
          additional_load_fee_cents?: number
          address?: string
          address_hash?: string
          created_at?: string
          distance_meters?: number
          duration_seconds?: number
          expires_at?: string
          first_load_fee_cents?: number
          id?: never
          is_local?: boolean
          is_out_of_range?: boolean
          one_way_miles?: number
        }
        Relationships: []
      }
      follow_up_templates: {
        Row: {
          channel: string
          cooldown_days: number
          created_at: string
          delay_minutes: number
          email_body_html: string | null
          email_subject: string | null
          id: string
          is_active: boolean
          max_sends_per_customer: number
          name: string
          send_window_end: number
          send_window_start: number
          slug: string
          sms_body: string | null
          sort_order: number
          trigger_event: string
          updated_at: string
        }
        Insert: {
          channel: string
          cooldown_days?: number
          created_at?: string
          delay_minutes?: number
          email_body_html?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean
          max_sends_per_customer?: number
          name: string
          send_window_end?: number
          send_window_start?: number
          slug: string
          sms_body?: string | null
          sort_order?: number
          trigger_event?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          cooldown_days?: number
          created_at?: string
          delay_minutes?: number
          email_body_html?: string | null
          email_subject?: string | null
          id?: string
          is_active?: boolean
          max_sends_per_customer?: number
          name?: string
          send_window_end?: number
          send_window_start?: number
          slug?: string
          sms_body?: string | null
          sort_order?: number
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          channel: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          email: string | null
          email_id: string | null
          error_message: string | null
          id: string
          link_clicked: boolean
          metadata: Json
          order_id: string | null
          phone: string | null
          review_submitted: boolean
          scheduled_at: string
          sent_at: string | null
          sms_sid: string | null
          status: string
          template_slug: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          email?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          link_clicked?: boolean
          metadata?: Json
          order_id?: string | null
          phone?: string | null
          review_submitted?: boolean
          scheduled_at: string
          sent_at?: string | null
          sms_sid?: string | null
          status?: string
          template_slug: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          email?: string | null
          email_id?: string | null
          error_message?: string | null
          id?: string
          link_clicked?: boolean
          metadata?: Json
          order_id?: string | null
          phone?: string | null
          review_submitted?: boolean
          scheduled_at?: string
          sent_at?: string | null
          sms_sid?: string | null
          status?: string
          template_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_projects: {
        Row: {
          before_after: boolean
          created_at: string
          description: string
          id: string
          images: string[]
          is_featured: boolean
          service_type: string
          title: string
          town_tags: string[]
          updated_at: string
        }
        Insert: {
          before_after?: boolean
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_featured?: boolean
          service_type: string
          title: string
          town_tags?: string[]
          updated_at?: string
        }
        Update: {
          before_after?: boolean
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          is_featured?: boolean
          service_type?: string
          title?: string
          town_tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      google_reviews_cache: {
        Row: {
          fetched_at: string
          id: number
          overall_rating: number | null
          place_id: string
          reviews: Json
          total_reviews: number | null
        }
        Insert: {
          fetched_at?: string
          id?: number
          overall_rating?: number | null
          place_id: string
          reviews?: Json
          total_reviews?: number | null
        }
        Update: {
          fetched_at?: string
          id?: number
          overall_rating?: number | null
          place_id?: string
          reviews?: Json
          total_reviews?: number | null
        }
        Relationships: []
      }
      held_orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_fee_cents: number | null
          delivery_method: string
          id: string
          items: Json
          notes: string | null
          staff_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee_cents?: number | null
          delivery_method?: string
          id?: string
          items?: Json
          notes?: string | null
          staff_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_fee_cents?: number | null
          delivery_method?: string
          id?: string
          items?: Json
          notes?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "held_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "held_orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      incoming_calls: {
        Row: {
          caller_digits: string | null
          caller_phone: string
          created_at: string
          customer_data: Json | null
          customer_id: string | null
          dismissed: boolean
          id: string
          session_id: string | null
        }
        Insert: {
          caller_digits?: string | null
          caller_phone: string
          created_at?: string
          customer_data?: Json | null
          customer_id?: string | null
          dismissed?: boolean
          id?: string
          session_id?: string | null
        }
        Update: {
          caller_digits?: string | null
          caller_phone?: string
          created_at?: string
          customer_data?: Json | null
          customer_id?: string | null
          dismissed?: boolean
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incoming_calls_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          adjustment_qty: number
          created_at: string
          id: string
          new_qty: number
          notes: string | null
          product_id: string
          reason: string
          reference_id: string | null
          staff_id: string | null
        }
        Insert: {
          adjustment_qty: number
          created_at?: string
          id?: string
          new_qty: number
          notes?: string | null
          product_id: string
          reason: string
          reference_id?: string | null
          staff_id?: string | null
        }
        Update: {
          adjustment_qty?: number
          created_at?: string
          id?: string
          new_qty?: number
          notes?: string | null
          product_id?: string
          reason?: string
          reference_id?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "service_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          created_at: string
          customer_id: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_notes: string | null
          delivery_zip: string | null
          id: string
          items: Json
          order_date: string
          order_total_cents: number | null
          payment_method: string | null
          raw_notes: string | null
          status: string | null
          wc_order_id: number
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_notes?: string | null
          delivery_zip?: string | null
          id?: string
          items?: Json
          order_date: string
          order_total_cents?: number | null
          payment_method?: string | null
          raw_notes?: string | null
          status?: string | null
          wc_order_id: number
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_notes?: string | null
          delivery_zip?: string | null
          id?: string
          items?: Json
          order_date?: string
          order_total_cents?: number | null
          payment_method?: string | null
          raw_notes?: string | null
          status?: string | null
          wc_order_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          delivery_day: number | null
          delivery_type: string | null
          half_yard_adder_cents: number | null
          id: string
          line_subtotal_cents: number
          load_number: number | null
          material_class: string | null
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string | null
          quantity: number
          unit: string
          unit_price_cents: number
        }
        Insert: {
          created_at?: string
          delivery_day?: number | null
          delivery_type?: string | null
          half_yard_adder_cents?: number | null
          id?: string
          line_subtotal_cents: number
          load_number?: number | null
          material_class?: string | null
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug?: string | null
          quantity: number
          unit: string
          unit_price_cents: number
        }
        Update: {
          created_at?: string
          delivery_day?: number | null
          delivery_type?: string | null
          half_yard_adder_cents?: number | null
          id?: string
          line_subtotal_cents?: number
          load_number?: number | null
          material_class?: string | null
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string | null
          quantity?: number
          unit?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          access_constraints: Json
          account_id: string | null
          additional_load_fee_cents: number | null
          cc_surcharge_cents: number
          combine_loads: boolean
          created_at: string
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_discount_pct: number | null
          delivery_method: string
          delivery_notes: string | null
          delivery_schedule: Json
          delivery_time_window: string | null
          delivery_total_cents: number
          delivery_zip: string | null
          discount_amount_cents: number
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          distance_meters: number | null
          duration_seconds: number | null
          first_load_fee_cents: number | null
          grand_total_cents: number
          id: string
          license_photo_url: string | null
          linked_order_id: string | null
          materials_subtotal_cents: number
          metadata: Json
          order_source: string | null
          payment_method: string | null
          payments: Json | null
          placed_at: string
          pos_register_id: string | null
          pos_staff_id: string | null
          quote_id: string | null
          refunds: Json | null
          sms_consent_at: string | null
          sms_opt_in: boolean
          source: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_method_id: string | null
          tax_cents: number
          tax_exempt: boolean
          tax_exempt_certificate: string | null
          total_delivery_days: number
          total_loads: number
          updated_at: string
        }
        Insert: {
          access_constraints?: Json
          account_id?: string | null
          additional_load_fee_cents?: number | null
          cc_surcharge_cents: number
          combine_loads?: boolean
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_discount_pct?: number | null
          delivery_method: string
          delivery_notes?: string | null
          delivery_schedule?: Json
          delivery_time_window?: string | null
          delivery_total_cents: number
          delivery_zip?: string | null
          discount_amount_cents?: number
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          first_load_fee_cents?: number | null
          grand_total_cents: number
          id?: string
          license_photo_url?: string | null
          linked_order_id?: string | null
          materials_subtotal_cents: number
          metadata?: Json
          order_source?: string | null
          payment_method?: string | null
          payments?: Json | null
          placed_at?: string
          pos_register_id?: string | null
          pos_staff_id?: string | null
          quote_id?: string | null
          refunds?: Json | null
          sms_consent_at?: string | null
          sms_opt_in?: boolean
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_method_id?: string | null
          tax_cents: number
          tax_exempt?: boolean
          tax_exempt_certificate?: string | null
          total_delivery_days?: number
          total_loads?: number
          updated_at?: string
        }
        Update: {
          access_constraints?: Json
          account_id?: string | null
          additional_load_fee_cents?: number | null
          cc_surcharge_cents?: number
          combine_loads?: boolean
          created_at?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_discount_pct?: number | null
          delivery_method?: string
          delivery_notes?: string | null
          delivery_schedule?: Json
          delivery_time_window?: string | null
          delivery_total_cents?: number
          delivery_zip?: string | null
          discount_amount_cents?: number
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          distance_meters?: number | null
          duration_seconds?: number | null
          first_load_fee_cents?: number | null
          grand_total_cents?: number
          id?: string
          license_photo_url?: string | null
          linked_order_id?: string | null
          materials_subtotal_cents?: number
          metadata?: Json
          order_source?: string | null
          payment_method?: string | null
          payments?: Json | null
          placed_at?: string
          pos_register_id?: string | null
          pos_staff_id?: string | null
          quote_id?: string | null
          refunds?: Json | null
          sms_consent_at?: string | null
          sms_opt_in?: boolean
          source?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_method_id?: string | null
          tax_cents?: number
          tax_exempt?: boolean
          tax_exempt_certificate?: string | null
          total_delivery_days?: number
          total_loads?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pos_staff_id_fkey"
            columns: ["pos_staff_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_daily_reports: {
        Row: {
          card_count: number
          card_total_cents: number
          cash_count: number
          cash_total_cents: number
          closed_at: string | null
          closed_by: string | null
          counted_cash_cents: number | null
          created_at: string
          delivery_count: number
          expected_cash_cents: number
          id: string
          notes: string | null
          pickup_count: number
          refund_count: number
          refund_total_cents: number
          register_id: string | null
          report_date: string
          total_sales_cents: number
          total_transactions: number
          variance_cents: number | null
          void_count: number
        }
        Insert: {
          card_count?: number
          card_total_cents?: number
          cash_count?: number
          cash_total_cents?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash_cents?: number | null
          created_at?: string
          delivery_count?: number
          expected_cash_cents?: number
          id?: string
          notes?: string | null
          pickup_count?: number
          refund_count?: number
          refund_total_cents?: number
          register_id?: string | null
          report_date: string
          total_sales_cents?: number
          total_transactions?: number
          variance_cents?: number | null
          void_count?: number
        }
        Update: {
          card_count?: number
          card_total_cents?: number
          cash_count?: number
          cash_total_cents?: number
          closed_at?: string | null
          closed_by?: string | null
          counted_cash_cents?: number | null
          created_at?: string
          delivery_count?: number
          expected_cash_cents?: number
          id?: string
          notes?: string | null
          pickup_count?: number
          refund_count?: number
          refund_total_cents?: number
          register_id?: string | null
          report_date?: string
          total_sales_cents?: number
          total_transactions?: number
          variance_cents?: number | null
          void_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_daily_reports_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          id: string
          label: string
          price_delta_cents: number
          product_id: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          price_delta_cents?: number
          product_id: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          price_delta_cents?: number
          product_id?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_town_pages: {
        Row: {
          calculator_type: string | null
          common_uses: string[]
          created_at: string
          faqs: Json
          featured_product_slugs: string[]
          h1: string
          id: string
          intro_paragraph: string
          is_active: boolean
          local_context: string | null
          meta_description: string
          product_group: string
          project_tips: string | null
          related_service_slug: string | null
          schema_type: string
          slug: string
          title: string
          town_slug: string
          updated_at: string
        }
        Insert: {
          calculator_type?: string | null
          common_uses?: string[]
          created_at?: string
          faqs?: Json
          featured_product_slugs?: string[]
          h1: string
          id?: string
          intro_paragraph: string
          is_active?: boolean
          local_context?: string | null
          meta_description: string
          product_group: string
          project_tips?: string | null
          related_service_slug?: string | null
          schema_type?: string
          slug: string
          title: string
          town_slug: string
          updated_at?: string
        }
        Update: {
          calculator_type?: string | null
          common_uses?: string[]
          created_at?: string
          faqs?: Json
          featured_product_slugs?: string[]
          h1?: string
          id?: string
          intro_paragraph?: string
          is_active?: boolean
          local_context?: string | null
          meta_description?: string
          product_group?: string
          project_tips?: string | null
          related_service_slug?: string | null
          schema_type?: string
          slug?: string
          title?: string
          town_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_town_pages_town_slug_fkey"
            columns: ["town_slug"]
            isOneToOne: false
            referencedRelation: "town_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      products: {
        Row: {
          application_quick_selects: Json | null
          barcode: string | null
          category_id: string
          category_tag: string | null
          ceiling_price_cents: number | null
          created_at: string
          crushed_upgrade: Json | null
          default_depth_inches: number | null
          delivery_type: string
          depth_helper_text: string | null
          description: string
          floor_price_cents: number | null
          floor_qty: number | null
          half_yard_adder_cents: number | null
          half_yard_enabled: boolean | null
          id: string
          images: string[]
          is_active: boolean
          is_bulk_app_enabled: boolean | null
          is_taxable: boolean
          local_badge: string | null
          low_stock_message: string | null
          low_stock_threshold: number | null
          material_class: string
          max_qty: number
          min_qty: number
          name: string
          origin_story: string | null
          pair_position: string | null
          pair_slug: string | null
          pairs_well_with: string[]
          pallet_price_cents: number | null
          pallet_qty: number | null
          pos_sort_order: number | null
          premium_upgrade: Json | null
          price_note: string
          price_per_unit_cents: number
          recommended_uses: string[]
          row_order: number | null
          sku: string | null
          slug: string
          sort_order: number
          step_qty: number
          stock_level: string | null
          stock_qty: number | null
          stock_unit: string | null
          track_inventory: boolean
          unit: string
          unit_display: string
          updated_at: string
          visible_pos: boolean
          visible_web: boolean
          wc_id: number | null
          web_price_per_unit_cents: number | null
        }
        Insert: {
          application_quick_selects?: Json | null
          barcode?: string | null
          category_id: string
          category_tag?: string | null
          ceiling_price_cents?: number | null
          created_at?: string
          crushed_upgrade?: Json | null
          default_depth_inches?: number | null
          delivery_type: string
          depth_helper_text?: string | null
          description?: string
          floor_price_cents?: number | null
          floor_qty?: number | null
          half_yard_adder_cents?: number | null
          half_yard_enabled?: boolean | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_bulk_app_enabled?: boolean | null
          is_taxable?: boolean
          local_badge?: string | null
          low_stock_message?: string | null
          low_stock_threshold?: number | null
          material_class: string
          max_qty: number
          min_qty: number
          name: string
          origin_story?: string | null
          pair_position?: string | null
          pair_slug?: string | null
          pairs_well_with?: string[]
          pallet_price_cents?: number | null
          pallet_qty?: number | null
          pos_sort_order?: number | null
          premium_upgrade?: Json | null
          price_note?: string
          price_per_unit_cents: number
          recommended_uses?: string[]
          row_order?: number | null
          sku?: string | null
          slug: string
          sort_order?: number
          step_qty: number
          stock_level?: string | null
          stock_qty?: number | null
          stock_unit?: string | null
          track_inventory?: boolean
          unit: string
          unit_display: string
          updated_at?: string
          visible_pos?: boolean
          visible_web?: boolean
          wc_id?: number | null
          web_price_per_unit_cents?: number | null
        }
        Update: {
          application_quick_selects?: Json | null
          barcode?: string | null
          category_id?: string
          category_tag?: string | null
          ceiling_price_cents?: number | null
          created_at?: string
          crushed_upgrade?: Json | null
          default_depth_inches?: number | null
          delivery_type?: string
          depth_helper_text?: string | null
          description?: string
          floor_price_cents?: number | null
          floor_qty?: number | null
          half_yard_adder_cents?: number | null
          half_yard_enabled?: boolean | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_bulk_app_enabled?: boolean | null
          is_taxable?: boolean
          local_badge?: string | null
          low_stock_message?: string | null
          low_stock_threshold?: number | null
          material_class?: string
          max_qty?: number
          min_qty?: number
          name?: string
          origin_story?: string | null
          pair_position?: string | null
          pair_slug?: string | null
          pairs_well_with?: string[]
          pallet_price_cents?: number | null
          pallet_qty?: number | null
          pos_sort_order?: number | null
          premium_upgrade?: Json | null
          price_note?: string
          price_per_unit_cents?: number
          recommended_uses?: string[]
          row_order?: number | null
          sku?: string | null
          slug?: string
          sort_order?: number
          step_qty?: number
          stock_level?: string | null
          stock_qty?: number | null
          stock_unit?: string | null
          track_inventory?: boolean
          unit?: string
          unit_display?: string
          updated_at?: string
          visible_pos?: boolean
          visible_web?: boolean
          wc_id?: number | null
          web_price_per_unit_cents?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_activity: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          metadata: Json | null
          project_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          metadata?: Json | null
          project_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          address: string | null
          assigned_crew: string[] | null
          balance_due_cents: number | null
          created_at: string
          created_by: string | null
          crew_notes: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_assignment_ids: string[] | null
          deposit_cents: number | null
          description: string | null
          documents: Json
          estimated_days: number | null
          estimated_end: string | null
          estimated_start: string | null
          id: string
          invoice_ids: string[] | null
          invoiced_cents: number | null
          notes: string | null
          order_id: string | null
          paid_cents: number | null
          priority: string | null
          project_number: string | null
          project_type: string
          quote_id: string | null
          quote_total_cents: number | null
          scheduled_date: string | null
          service_type: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          address?: string | null
          assigned_crew?: string[] | null
          balance_due_cents?: number | null
          created_at?: string
          created_by?: string | null
          crew_notes?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_assignment_ids?: string[] | null
          deposit_cents?: number | null
          description?: string | null
          documents?: Json
          estimated_days?: number | null
          estimated_end?: string | null
          estimated_start?: string | null
          id?: string
          invoice_ids?: string[] | null
          invoiced_cents?: number | null
          notes?: string | null
          order_id?: string | null
          paid_cents?: number | null
          priority?: string | null
          project_number?: string | null
          project_type?: string
          quote_id?: string | null
          quote_total_cents?: number | null
          scheduled_date?: string | null
          service_type?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          address?: string | null
          assigned_crew?: string[] | null
          balance_due_cents?: number | null
          created_at?: string
          created_by?: string | null
          crew_notes?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_assignment_ids?: string[] | null
          deposit_cents?: number | null
          description?: string | null
          documents?: Json
          estimated_days?: number | null
          estimated_end?: string | null
          estimated_start?: string | null
          id?: string
          invoice_ids?: string[] | null
          invoiced_cents?: number | null
          notes?: string | null
          order_id?: string | null
          paid_cents?: number | null
          priority?: string | null
          project_number?: string | null
          project_type?: string
          quote_id?: string | null
          quote_total_cents?: number | null
          scheduled_date?: string | null
          service_type?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          acceptance_metadata: Json | null
          accepted_at: string | null
          access_constraints: Json | null
          ai_generated: boolean
          ai_prompt: string | null
          cc_surcharge_cents: number | null
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_signature_url: string | null
          decline_reason: string | null
          declined_at: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_fee_cents: number | null
          delivery_loads: Json | null
          delivery_notes: string | null
          delivery_time_window: string | null
          deposit_paid_at: string | null
          deposit_paid_cents: number
          deposit_required_cents: number
          deposit_stripe_payment_id: string | null
          description: string | null
          disable_reason: string | null
          disabled_at: string | null
          disabled_by: string | null
          estimated_timeline: string | null
          id: string
          internal_notes: string | null
          lead_id: string | null
          line_items: Json
          photo_urls: string[] | null
          public_token: string
          quote_number: string
          route_info: Json | null
          sent_at: string | null
          sent_via: string[] | null
          service_interest: string | null
          short_code: string | null
          source: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          terms: string | null
          title: string
          total_cents: number
          type: string | null
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          acceptance_metadata?: Json | null
          accepted_at?: string | null
          access_constraints?: Json | null
          ai_generated?: boolean
          ai_prompt?: string | null
          cc_surcharge_cents?: number | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_signature_url?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_fee_cents?: number | null
          delivery_loads?: Json | null
          delivery_notes?: string | null
          delivery_time_window?: string | null
          deposit_paid_at?: string | null
          deposit_paid_cents?: number
          deposit_required_cents?: number
          deposit_stripe_payment_id?: string | null
          description?: string | null
          disable_reason?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          estimated_timeline?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          line_items?: Json
          photo_urls?: string[] | null
          public_token?: string
          quote_number: string
          route_info?: Json | null
          sent_at?: string | null
          sent_via?: string[] | null
          service_interest?: string | null
          short_code?: string | null
          source?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          terms?: string | null
          title: string
          total_cents?: number
          type?: string | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          acceptance_metadata?: Json | null
          accepted_at?: string | null
          access_constraints?: Json | null
          ai_generated?: boolean
          ai_prompt?: string | null
          cc_surcharge_cents?: number | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_signature_url?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_fee_cents?: number | null
          delivery_loads?: Json | null
          delivery_notes?: string | null
          delivery_time_window?: string | null
          deposit_paid_at?: string | null
          deposit_paid_cents?: number
          deposit_required_cents?: number
          deposit_stripe_payment_id?: string | null
          description?: string | null
          disable_reason?: string | null
          disabled_at?: string | null
          disabled_by?: string | null
          estimated_timeline?: string | null
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          line_items?: Json
          photo_urls?: string[] | null
          public_token?: string
          quote_number?: string
          route_info?: Json | null
          sent_at?: string | null
          sent_via?: string[] | null
          service_interest?: string | null
          short_code?: string | null
          source?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          terms?: string | null
          title?: string
          total_cents?: number
          type?: string | null
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "service_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_carts: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_address: string | null
          delivery_method: string | null
          expires_at: string
          followup_sent_at: string | null
          id: string
          items: Json
          source: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          expires_at?: string
          followup_sent_at?: string | null
          id?: string
          items?: Json
          source?: string | null
          status?: string
          token?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_method?: string | null
          expires_at?: string
          followup_sent_at?: string | null
          id?: string
          items?: Json
          source?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      service_leads: {
        Row: {
          address: string | null
          assigned_at: string | null
          assigned_contractors: string[] | null
          assigned_to: string | null
          conversion_date: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          email: string | null
          estimated_value_cents: number | null
          follow_up_count: number | null
          id: string
          internal_notes: string | null
          last_contacted_at: string | null
          lead_number: string | null
          lead_type: string | null
          lost_competitor: string | null
          lost_reason: string | null
          metadata: Json
          name: string
          next_follow_up: string | null
          phone: string
          photo_urls: string[]
          priority: string | null
          project_id: string | null
          property_type: string | null
          quote_id: string | null
          quoted_amount_cents: number | null
          referral_source: string | null
          service_type: string
          site_photos: string[] | null
          site_visit_date: string | null
          site_visit_notes: string | null
          source: string | null
          source_detail: string | null
          status: string
          timeline: string | null
          town: string | null
          updated_at: string
          value_tier: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          assigned_at?: string | null
          assigned_contractors?: string[] | null
          assigned_to?: string | null
          conversion_date?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value_cents?: number | null
          follow_up_count?: number | null
          id?: string
          internal_notes?: string | null
          last_contacted_at?: string | null
          lead_number?: string | null
          lead_type?: string | null
          lost_competitor?: string | null
          lost_reason?: string | null
          metadata?: Json
          name: string
          next_follow_up?: string | null
          phone: string
          photo_urls?: string[]
          priority?: string | null
          project_id?: string | null
          property_type?: string | null
          quote_id?: string | null
          quoted_amount_cents?: number | null
          referral_source?: string | null
          service_type: string
          site_photos?: string[] | null
          site_visit_date?: string | null
          site_visit_notes?: string | null
          source?: string | null
          source_detail?: string | null
          status?: string
          timeline?: string | null
          town?: string | null
          updated_at?: string
          value_tier?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          assigned_at?: string | null
          assigned_contractors?: string[] | null
          assigned_to?: string | null
          conversion_date?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value_cents?: number | null
          follow_up_count?: number | null
          id?: string
          internal_notes?: string | null
          last_contacted_at?: string | null
          lead_number?: string | null
          lead_type?: string | null
          lost_competitor?: string | null
          lost_reason?: string | null
          metadata?: Json
          name?: string
          next_follow_up?: string | null
          phone?: string
          photo_urls?: string[]
          priority?: string | null
          project_id?: string | null
          property_type?: string | null
          quote_id?: string | null
          quoted_amount_cents?: number | null
          referral_source?: string | null
          service_type?: string
          site_photos?: string[] | null
          site_visit_date?: string | null
          site_visit_notes?: string | null
          source?: string | null
          source_detail?: string | null
          status?: string
          timeline?: string | null
          town?: string | null
          updated_at?: string
          value_tier?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_leads_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_town_pages: {
        Row: {
          created_at: string
          faqs: Json
          h1: string
          id: string
          intro_paragraph: string
          is_active: boolean
          local_context: string | null
          meta_description: string
          related_product_slugs: string[]
          schema_type: string
          service_type: string
          services_included: string[]
          slug: string
          title: string
          town_slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          faqs?: Json
          h1: string
          id?: string
          intro_paragraph: string
          is_active?: boolean
          local_context?: string | null
          meta_description: string
          related_product_slugs?: string[]
          schema_type?: string
          service_type: string
          services_included?: string[]
          slug: string
          title: string
          town_slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          faqs?: Json
          h1?: string
          id?: string
          intro_paragraph?: string
          is_active?: boolean
          local_context?: string | null
          meta_description?: string
          related_product_slugs?: string[]
          schema_type?: string
          service_type?: string
          services_included?: string[]
          slug?: string
          title?: string
          town_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_town_pages_town_slug_fkey"
            columns: ["town_slug"]
            isOneToOne: false
            referencedRelation: "town_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      site_settings: {
        Row: {
          additional_load_discount: number
          blackout_dates: string[]
          cc_surcharge_rate: number
          created_at: string
          dump_time_buffer_minutes: number
          follow_up_enabled: boolean
          follow_up_timezone: string
          fuel_price_per_gallon: number
          google_review_url: string | null
          hourly_labor_rate: number
          id: number
          local_radius_miles: number
          manual_review_threshold_cents: number | null
          marketing_approval_required: boolean
          marketing_enabled: boolean
          max_campaigns_per_month: number
          max_emails_per_day: number
          max_loads_per_day_per_address: number
          max_service_radius_miles: number
          max_sms_per_day: number
          miles_per_gallon: number
          minimum_delivery_fee_cents: number
          minimum_order_cents: number
          operating_days: string[]
          origin_address: string
          pos_quick_product_slugs: string[]
          pro_discount_pickup_only: boolean
          pro_discount_rate: number
          profit_multiplier: number
          round_to_nearest: number
          same_day_cutoff_hour: number
          second_delivery_discount_pct: number | null
          sms_quiet_hours_end: number
          sms_quiet_hours_start: number
          tax_rate: number
          timezone: string
          twilio_enabled: boolean
          updated_at: string
        }
        Insert: {
          additional_load_discount?: number
          blackout_dates?: string[]
          cc_surcharge_rate?: number
          created_at?: string
          dump_time_buffer_minutes?: number
          follow_up_enabled?: boolean
          follow_up_timezone?: string
          fuel_price_per_gallon?: number
          google_review_url?: string | null
          hourly_labor_rate?: number
          id?: number
          local_radius_miles?: number
          manual_review_threshold_cents?: number | null
          marketing_approval_required?: boolean
          marketing_enabled?: boolean
          max_campaigns_per_month?: number
          max_emails_per_day?: number
          max_loads_per_day_per_address?: number
          max_service_radius_miles?: number
          max_sms_per_day?: number
          miles_per_gallon?: number
          minimum_delivery_fee_cents?: number
          minimum_order_cents?: number
          operating_days?: string[]
          origin_address: string
          pos_quick_product_slugs?: string[]
          pro_discount_pickup_only?: boolean
          pro_discount_rate?: number
          profit_multiplier?: number
          round_to_nearest?: number
          same_day_cutoff_hour?: number
          second_delivery_discount_pct?: number | null
          sms_quiet_hours_end?: number
          sms_quiet_hours_start?: number
          tax_rate?: number
          timezone?: string
          twilio_enabled?: boolean
          updated_at?: string
        }
        Update: {
          additional_load_discount?: number
          blackout_dates?: string[]
          cc_surcharge_rate?: number
          created_at?: string
          dump_time_buffer_minutes?: number
          follow_up_enabled?: boolean
          follow_up_timezone?: string
          fuel_price_per_gallon?: number
          google_review_url?: string | null
          hourly_labor_rate?: number
          id?: number
          local_radius_miles?: number
          manual_review_threshold_cents?: number | null
          marketing_approval_required?: boolean
          marketing_enabled?: boolean
          max_campaigns_per_month?: number
          max_emails_per_day?: number
          max_loads_per_day_per_address?: number
          max_service_radius_miles?: number
          max_sms_per_day?: number
          miles_per_gallon?: number
          minimum_delivery_fee_cents?: number
          minimum_order_cents?: number
          operating_days?: string[]
          origin_address?: string
          pos_quick_product_slugs?: string[]
          pro_discount_pickup_only?: boolean
          pro_discount_rate?: number
          profit_multiplier?: number
          round_to_nearest?: number
          same_day_cutoff_hour?: number
          second_delivery_discount_pct?: number | null
          sms_quiet_hours_end?: number
          sms_quiet_hours_start?: number
          tax_rate?: number
          timezone?: string
          twilio_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sms_consent_log: {
        Row: {
          consent_given: boolean
          consent_source: string
          consent_text: string
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          name: string | null
          phone: string
          user_agent: string | null
        }
        Insert: {
          consent_given: boolean
          consent_source: string
          consent_text: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          name?: string | null
          phone: string
          user_agent?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_source?: string
          consent_text?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          name?: string | null
          phone?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string | null
          business_number: string
          created_at: string
          customer_id: string | null
          customer_name: string | null
          direction: string
          from_number: string
          id: string
          media_urls: string[] | null
          rc_conversation_id: string | null
          rc_message_id: string | null
          read_at: string | null
          read_by: string | null
          staff_sender: string | null
          status: string
          to_number: string
        }
        Insert: {
          body?: string | null
          business_number: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          direction: string
          from_number: string
          id?: string
          media_urls?: string[] | null
          rc_conversation_id?: string | null
          rc_message_id?: string | null
          read_at?: string | null
          read_by?: string | null
          staff_sender?: string | null
          status?: string
          to_number: string
        }
        Update: {
          body?: string | null
          business_number?: string
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          direction?: string
          from_number?: string
          id?: string
          media_urls?: string[] | null
          rc_conversation_id?: string | null
          rc_message_id?: string | null
          read_at?: string | null
          read_by?: string | null
          staff_sender?: string | null
          status?: string
          to_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      statements: {
        Row: {
          adjustments_cents: number
          amount_paid_cents: number
          balance_due_cents: number
          charges_cents: number
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string
          id: string
          notes: string | null
          order_ids: string[]
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_stripe_id: string | null
          payments_cents: number
          period_end: string
          period_start: string
          previous_balance_cents: number
          public_token: string
          sent_at: string | null
          sent_via: string[] | null
          statement_number: string
          status: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          adjustments_cents?: number
          amount_paid_cents?: number
          balance_due_cents?: number
          charges_cents?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_stripe_id?: string | null
          payments_cents?: number
          period_end: string
          period_start: string
          previous_balance_cents?: number
          public_token?: string
          sent_at?: string | null
          sent_via?: string[] | null
          statement_number: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          adjustments_cents?: number
          amount_paid_cents?: number
          balance_due_cents?: number
          charges_cents?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string
          id?: string
          notes?: string | null
          order_ids?: string[]
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_stripe_id?: string | null
          payments_cents?: number
          period_end?: string
          period_start?: string
          previous_balance_cents?: number
          public_token?: string
          sent_at?: string | null
          sent_via?: string[] | null
          statement_number?: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_invoices: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          document_type: string | null
          extracted_at: string | null
          file_urls: string[]
          id: string
          invoice_date: string | null
          invoice_number: string | null
          is_paid: boolean
          line_items: Json
          notes: string | null
          ocr_status: string
          paid_at: string | null
          raw_extraction: string | null
          supplier_id: string | null
          total_amount_cents: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          document_type?: string | null
          extracted_at?: string | null
          file_urls?: string[]
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_paid?: boolean
          line_items?: Json
          notes?: string | null
          ocr_status?: string
          paid_at?: string | null
          raw_extraction?: string | null
          supplier_id?: string | null
          total_amount_cents?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          document_type?: string | null
          extracted_at?: string | null
          file_urls?: string[]
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          is_paid?: boolean
          line_items?: Json
          notes?: string | null
          ocr_status?: string
          paid_at?: string | null
          raw_extraction?: string | null
          supplier_id?: string | null
          total_amount_cents?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_history: {
        Row: {
          changed_at: string
          id: string
          new_cost_cents: number
          old_cost_cents: number
          source: string | null
          supplier_product_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_cost_cents: number
          old_cost_cents: number
          source?: string | null
          supplier_product_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_cost_cents?: number
          old_cost_cents?: number
          source?: string | null
          supplier_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          cost_per_unit_cents: number
          created_at: string
          id: string
          is_available: boolean
          last_price_update: string
          lead_time_days: number | null
          minimum_order_qty: number | null
          notes: string | null
          our_price_per_unit_cents: number | null
          product_id: string | null
          supplier_id: string
          supplier_product_name: string
          supplier_sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit_cents: number
          created_at?: string
          id?: string
          is_available?: boolean
          last_price_update?: string
          lead_time_days?: number | null
          minimum_order_qty?: number | null
          notes?: string | null
          our_price_per_unit_cents?: number | null
          product_id?: string | null
          supplier_id: string
          supplier_product_name: string
          supplier_sku?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          cost_per_unit_cents?: number
          created_at?: string
          id?: string
          is_available?: boolean
          last_price_update?: string
          lead_time_days?: number | null
          minimum_order_qty?: number | null
          notes?: string | null
          our_price_per_unit_cents?: number | null
          product_id?: string | null
          supplier_id?: string
          supplier_product_name?: string
          supplier_sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_number: string | null
          address: string
          city: string | null
          contact_name: string | null
          created_at: string
          days_closed: string[]
          delivery_fee_notes: string | null
          email: string | null
          fulfillment_type: string
          hours: Json
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          minimum_order_notes: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          pricelist_documents: Json | null
          pricelist_effective_date: string | null
          slug: string
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          account_number?: string | null
          address: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          days_closed?: string[]
          delivery_fee_notes?: string | null
          email?: string | null
          fulfillment_type?: string
          hours?: Json
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          minimum_order_notes?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pricelist_documents?: Json | null
          pricelist_effective_date?: string | null
          slug: string
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string
          city?: string | null
          contact_name?: string | null
          created_at?: string
          days_closed?: string[]
          delivery_fee_notes?: string | null
          email?: string | null
          fulfillment_type?: string
          hours?: Json
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          minimum_order_notes?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          pricelist_documents?: Json | null
          pricelist_effective_date?: string | null
          slug?: string
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      town_pages: {
        Row: {
          created_at: string
          delivery_fee_cents: number
          distance_miles: number
          drive_minutes: number
          estimated_delivery_minutes: number
          faqs: Json
          featured_product_slugs: string[]
          featured_project_ids: string[]
          id: string
          is_active: boolean
          local_description: string
          local_description_extended: string | null
          name: string
          route_destination: string
          route_origin: string
          slug: string
          sort_order: number
          state: string
          testimonial_author: string | null
          testimonial_quote: string | null
          tier: string
          updated_at: string
          zip_codes: string[]
        }
        Insert: {
          created_at?: string
          delivery_fee_cents: number
          distance_miles: number
          drive_minutes: number
          estimated_delivery_minutes: number
          faqs?: Json
          featured_product_slugs?: string[]
          featured_project_ids?: string[]
          id?: string
          is_active?: boolean
          local_description: string
          local_description_extended?: string | null
          name: string
          route_destination: string
          route_origin?: string
          slug: string
          sort_order?: number
          state?: string
          testimonial_author?: string | null
          testimonial_quote?: string | null
          tier: string
          updated_at?: string
          zip_codes?: string[]
        }
        Update: {
          created_at?: string
          delivery_fee_cents?: number
          distance_miles?: number
          drive_minutes?: number
          estimated_delivery_minutes?: number
          faqs?: Json
          featured_product_slugs?: string[]
          featured_project_ids?: string[]
          id?: string
          is_active?: boolean
          local_description?: string
          local_description_extended?: string | null
          name?: string
          route_destination?: string
          route_origin?: string
          slug?: string
          sort_order?: number
          state?: string
          testimonial_author?: string | null
          testimonial_quote?: string | null
          tier?: string
          updated_at?: string
          zip_codes?: string[]
        }
        Relationships: []
      }
      truck_types: {
        Row: {
          capacity_default: number
          capacity_mulch: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          capacity_default: number
          capacity_mulch: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          capacity_default?: number
          capacity_mulch?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      trucks: {
        Row: {
          created_at: string
          default_driver_name: string | null
          default_driver_phone: string | null
          id: string
          is_active: boolean
          license_plate: string | null
          name: string
          notes: string | null
          truck_type: string
        }
        Insert: {
          created_at?: string
          default_driver_name?: string | null
          default_driver_phone?: string | null
          id: string
          is_active?: boolean
          license_plate?: string | null
          name: string
          notes?: string | null
          truck_type: string
        }
        Update: {
          created_at?: string
          default_driver_name?: string | null
          default_driver_phone?: string | null
          id?: string
          is_active?: boolean
          license_plate?: string | null
          name?: string
          notes?: string | null
          truck_type?: string
        }
        Relationships: []
      }
      upsells: {
        Row: {
          created_at: string
          description: string
          flat_price_cents: number | null
          icon: string | null
          id: string
          is_active: boolean
          is_taxable: boolean
          linked_product_slugs: string[]
          name: string
          per_yard_price_cents: number | null
          pricing_type: string
          short_description: string
          slug: string
          sort_order: number
          tiered_pricing: Json | null
          trigger_calculator_types: string[]
          trigger_categories: string[]
          trigger_contexts: string[]
          trigger_material_classes: string[]
          trigger_product_types: string[]
          updated_at: string
          upsell_type: string
        }
        Insert: {
          created_at?: string
          description: string
          flat_price_cents?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_taxable?: boolean
          linked_product_slugs?: string[]
          name: string
          per_yard_price_cents?: number | null
          pricing_type: string
          short_description: string
          slug: string
          sort_order?: number
          tiered_pricing?: Json | null
          trigger_calculator_types?: string[]
          trigger_categories?: string[]
          trigger_contexts?: string[]
          trigger_material_classes?: string[]
          trigger_product_types?: string[]
          updated_at?: string
          upsell_type?: string
        }
        Update: {
          created_at?: string
          description?: string
          flat_price_cents?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_taxable?: boolean
          linked_product_slugs?: string[]
          name?: string
          per_yard_price_cents?: number | null
          pricing_type?: string
          short_description?: string
          slug?: string
          sort_order?: number
          tiered_pricing?: Json | null
          trigger_calculator_types?: string[]
          trigger_categories?: string[]
          trigger_contexts?: string[]
          trigger_material_classes?: string[]
          trigger_product_types?: string[]
          updated_at?: string
          upsell_type?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_quote_number: { Args: never; Returns: string }
      get_revenue_by_period: {
        Args: { p_date_from: string; p_date_trunc: string }
        Returns: {
          order_count: number
          payment_method: string
          period_date: string
          total_cents: number
        }[]
      }
      get_sms_conversations: {
        Args: {
          p_business_number?: string
          p_limit?: number
          p_search?: string
        }
        Returns: {
          business_number: string
          customer_id: string
          customer_name: string
          customer_phone: string
          last_direction: string
          last_message_at: string
          last_message_body: string
          message_count: number
          unread: boolean
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      post_credit: {
        Args: {
          p_amount_cents: number
          p_created_by?: string
          p_customer_id: string
          p_note?: string
          p_order_id?: string
          p_stripe_payment_intent_id?: string
          p_type: string
        }
        Returns: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          created_by: string
          customer_id: string
          id: string
          note: string | null
          order_id: string | null
          stripe_payment_intent_id: string | null
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_ledger"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sum_credit_balances: { Args: never; Returns: number }
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
