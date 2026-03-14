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
          is_pro_member: boolean
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_pro_member?: boolean
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_pro_member?: boolean
          phone?: string | null
          role?: string
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
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          first_order_at: string | null
          id: string
          last_name: string | null
          last_order_at: string | null
          notes: string | null
          opted_in_email: boolean
          opted_in_sms: boolean
          phone: string | null
          source: string
          state: string | null
          tags: string[]
          total_orders: number
          total_spent_cents: number
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          first_order_at?: string | null
          id?: string
          last_name?: string | null
          last_order_at?: string | null
          notes?: string | null
          opted_in_email?: boolean
          opted_in_sms?: boolean
          phone?: string | null
          source?: string
          state?: string | null
          tags?: string[]
          total_orders?: number
          total_spent_cents?: number
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          first_order_at?: string | null
          id?: string
          last_name?: string | null
          last_order_at?: string | null
          notes?: string | null
          opted_in_email?: boolean
          opted_in_sms?: boolean
          phone?: string | null
          source?: string
          state?: string | null
          tags?: string[]
          total_orders?: number
          total_spent_cents?: number
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
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
      orders: {
        Row: {
          access_constraints: Json
          account_id: string | null
          additional_load_fee_cents: number | null
          cc_surcharge_cents: number
          combine_loads: boolean
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivery_address: string | null
          delivery_method: string
          delivery_schedule: Json
          delivery_total_cents: number
          delivery_zip: string | null
          distance_meters: number | null
          duration_seconds: number | null
          first_load_fee_cents: number | null
          grand_total_cents: number
          id: string
          materials_subtotal_cents: number
          metadata: Json
          placed_at: string
          status: string
          stripe_checkout_session_id: string | null
          tax_cents: number
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
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_method: string
          delivery_schedule?: Json
          delivery_total_cents: number
          delivery_zip?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          first_load_fee_cents?: number | null
          grand_total_cents: number
          id?: string
          materials_subtotal_cents: number
          metadata?: Json
          placed_at?: string
          status?: string
          stripe_checkout_session_id?: string | null
          tax_cents: number
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
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_address?: string | null
          delivery_method?: string
          delivery_schedule?: Json
          delivery_total_cents?: number
          delivery_zip?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          first_load_fee_cents?: number | null
          grand_total_cents?: number
          id?: string
          materials_subtotal_cents?: number
          metadata?: Json
          placed_at?: string
          status?: string
          stripe_checkout_session_id?: string | null
          tax_cents?: number
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
          category_id: string
          created_at: string
          delivery_type: string
          description: string
          id: string
          images: string[]
          is_active: boolean
          is_taxable: boolean
          material_class: string
          max_qty: number
          min_qty: number
          name: string
          pairs_well_with: string[]
          price_note: string
          price_per_unit_cents: number
          recommended_uses: string[]
          slug: string
          sort_order: number
          step_qty: number
          unit: string
          unit_display: string
          updated_at: string
          visible_pos: boolean
          visible_web: boolean
          wc_id: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          delivery_type: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          is_taxable?: boolean
          material_class: string
          max_qty: number
          min_qty: number
          name: string
          pairs_well_with?: string[]
          price_note?: string
          price_per_unit_cents: number
          recommended_uses?: string[]
          slug: string
          sort_order?: number
          step_qty: number
          unit: string
          unit_display: string
          updated_at?: string
          visible_pos?: boolean
          visible_web?: boolean
          wc_id?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          delivery_type?: string
          description?: string
          id?: string
          images?: string[]
          is_active?: boolean
          is_taxable?: boolean
          material_class?: string
          max_qty?: number
          min_qty?: number
          name?: string
          pairs_well_with?: string[]
          price_note?: string
          price_per_unit_cents?: number
          recommended_uses?: string[]
          slug?: string
          sort_order?: number
          step_qty?: number
          unit?: string
          unit_display?: string
          updated_at?: string
          visible_pos?: boolean
          visible_web?: boolean
          wc_id?: number | null
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
      service_leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          description: string | null
          email: string | null
          id: string
          internal_notes: string | null
          metadata: Json
          name: string
          phone: string
          photo_urls: string[]
          quoted_amount_cents: number | null
          referral_source: string | null
          service_type: string
          status: string
          timeline: string | null
          town: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json
          name: string
          phone: string
          photo_urls?: string[]
          quoted_amount_cents?: number | null
          referral_source?: string | null
          service_type: string
          status?: string
          timeline?: string | null
          town?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json
          name?: string
          phone?: string
          photo_urls?: string[]
          quoted_amount_cents?: number | null
          referral_source?: string | null
          service_type?: string
          status?: string
          timeline?: string | null
          town?: string | null
          updated_at?: string
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
          fuel_price_per_gallon: number
          hourly_labor_rate: number
          id: number
          local_radius_miles: number
          max_loads_per_day_per_address: number
          max_service_radius_miles: number
          miles_per_gallon: number
          minimum_delivery_fee_cents: number
          minimum_order_cents: number
          operating_days: string[]
          origin_address: string
          pro_discount_pickup_only: boolean
          pro_discount_rate: number
          profit_multiplier: number
          round_to_nearest: number
          same_day_cutoff_hour: number
          tax_rate: number
          timezone: string
          updated_at: string
        }
        Insert: {
          additional_load_discount?: number
          blackout_dates?: string[]
          cc_surcharge_rate?: number
          created_at?: string
          dump_time_buffer_minutes?: number
          fuel_price_per_gallon?: number
          hourly_labor_rate?: number
          id?: number
          local_radius_miles?: number
          max_loads_per_day_per_address?: number
          max_service_radius_miles?: number
          miles_per_gallon?: number
          minimum_delivery_fee_cents?: number
          minimum_order_cents?: number
          operating_days?: string[]
          origin_address: string
          pro_discount_pickup_only?: boolean
          pro_discount_rate?: number
          profit_multiplier?: number
          round_to_nearest?: number
          same_day_cutoff_hour?: number
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          additional_load_discount?: number
          blackout_dates?: string[]
          cc_surcharge_rate?: number
          created_at?: string
          dump_time_buffer_minutes?: number
          fuel_price_per_gallon?: number
          hourly_labor_rate?: number
          id?: number
          local_radius_miles?: number
          max_loads_per_day_per_address?: number
          max_service_radius_miles?: number
          miles_per_gallon?: number
          minimum_delivery_fee_cents?: number
          minimum_order_cents?: number
          operating_days?: string[]
          origin_address?: string
          pro_discount_pickup_only?: boolean
          pro_discount_rate?: number
          profit_multiplier?: number
          round_to_nearest?: number
          same_day_cutoff_hour?: number
          tax_rate?: number
          timezone?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
