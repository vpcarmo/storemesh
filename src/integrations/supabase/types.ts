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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      catalog_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          label: string
          position: number
          store_id: string
          swatch_value: string | null
          updated_at: string
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          label: string
          position?: number
          store_id: string
          swatch_value?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          store_id?: string
          swatch_value?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_attribute_values_attribute_same_store"
            columns: ["attribute_id", "store_id"]
            isOneToOne: false
            referencedRelation: "catalog_attributes"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "catalog_attribute_values_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_attributes: {
        Row: {
          code: string
          created_at: string
          display_type: Database["public"]["Enums"]["catalog_attribute_display_type"]
          id: string
          is_filterable: boolean
          is_variant_axis: boolean
          name: string
          position: number
          store_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_type?: Database["public"]["Enums"]["catalog_attribute_display_type"]
          id?: string
          is_filterable?: boolean
          is_variant_axis?: boolean
          name: string
          position?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_type?: Database["public"]["Enums"]["catalog_attribute_display_type"]
          id?: string
          is_filterable?: boolean
          is_variant_axis?: boolean
          name?: string
          position?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_attributes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt: string | null
          created_at: string
          external_url: string | null
          filename: string
          height: number | null
          id: string
          mime_type: string | null
          size: number | null
          source_type: string
          storage_path: string | null
          store_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          external_url?: string | null
          filename: string
          height?: number | null
          id?: string
          mime_type?: string | null
          size?: number | null
          source_type: string
          storage_path?: string | null
          store_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          external_url?: string | null
          filename?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          size?: number | null
          source_type?: string
          storage_path?: string | null
          store_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          created_at: string
          external_url: string | null
          id: string
          is_active: boolean
          label: string
          page_id: string | null
          position: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_url?: string | null
          id?: string
          is_active?: boolean
          label: string
          page_id?: string | null
          position?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_url?: string | null
          id?: string
          is_active?: boolean
          label?: string
          page_id?: string | null
          position?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_page_same_store"
            columns: ["page_id", "store_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "navigation_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          id: string
          sections: Json
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["page_status"]
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          sections?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["page_status"]
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          sections?: Json
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["page_status"]
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      platform_store_deletion_operations: {
        Row: {
          cleanup_not_before: string | null
          created_at: string
          id: string
          phase: string
          requested_by: string
          storage_cleaned_at: string | null
          store_id: string
          store_slug: string
        }
        Insert: {
          cleanup_not_before?: string | null
          created_at?: string
          id?: string
          phase: string
          requested_by: string
          storage_cleaned_at?: string | null
          store_id: string
          store_slug: string
        }
        Update: {
          cleanup_not_before?: string | null
          created_at?: string
          id?: string
          phase?: string
          requested_by?: string
          storage_cleaned_at?: string | null
          store_id?: string
          store_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_store_deletion_operations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_value_id: string
          product_id: string
          store_id: string
        }
        Insert: {
          attribute_value_id: string
          product_id: string
          store_id: string
        }
        Update: {
          attribute_value_id?: string
          product_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_product_same_store"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_attribute_values_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_value_same_store"
            columns: ["attribute_value_id", "store_id"]
            isOneToOne: false
            referencedRelation: "catalog_attribute_values"
            referencedColumns: ["id", "store_id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          media_asset_id: string | null
          position: number
          product_id: string
          store_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          media_asset_id?: string | null
          position?: number
          product_id: string
          store_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          media_asset_id?: string | null
          position?: number
          product_id?: string
          store_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_media_asset_same_store"
            columns: ["media_asset_id", "store_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_images_product_same_store"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_images_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string
          id: string
          is_active: boolean
          position: number
          price: number
          product_id: string
          sku: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          price: number
          product_id: string
          sku?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          price?: number
          product_id?: string
          sku?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_same_store"
            columns: ["product_id", "store_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "product_variants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          price: number
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_same_store"
            columns: ["category_id", "store_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          accent_color: string | null
          address: Json
          background_color: string | null
          business_hours: Json
          contact_email: string | null
          created_at: string
          design_settings: Json | null
          display_name: string | null
          favicon_url: string | null
          institutional_text: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          privacy_policy: string | null
          return_policy: string | null
          secondary_color: string | null
          short_description: string | null
          social_links: Json
          store_id: string
          terms_of_use: string | null
          text_color: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: Json
          background_color?: string | null
          business_hours?: Json
          contact_email?: string | null
          created_at?: string
          design_settings?: Json | null
          display_name?: string | null
          favicon_url?: string | null
          institutional_text?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          privacy_policy?: string | null
          return_policy?: string | null
          secondary_color?: string | null
          short_description?: string | null
          social_links?: Json
          store_id: string
          terms_of_use?: string | null
          text_color?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: Json
          background_color?: string | null
          business_hours?: Json
          contact_email?: string | null
          created_at?: string
          design_settings?: Json | null
          display_name?: string | null
          favicon_url?: string | null
          institutional_text?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          privacy_policy?: string | null
          return_policy?: string | null
          secondary_color?: string | null
          short_description?: string | null
          social_links?: Json
          store_id?: string
          terms_of_use?: string | null
          text_color?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_permission_profiles: {
        Row: {
          created_at: string
          permission_profile_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          permission_profile_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          permission_profile_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_profiles_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_attribute_values: {
        Row: {
          attribute_id: string
          attribute_value_id: string
          store_id: string
          variant_id: string
        }
        Insert: {
          attribute_id: string
          attribute_value_id: string
          store_id: string
          variant_id: string
        }
        Update: {
          attribute_id?: string
          attribute_value_id?: string
          store_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_attribute_values_value_attribute"
            columns: ["attribute_value_id", "attribute_id"]
            isOneToOne: false
            referencedRelation: "catalog_attribute_values"
            referencedColumns: ["id", "attribute_id"]
          },
          {
            foreignKeyName: "variant_attribute_values_value_same_store"
            columns: ["attribute_value_id", "store_id"]
            isOneToOne: false
            referencedRelation: "catalog_attribute_values"
            referencedColumns: ["id", "store_id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_same_store"
            columns: ["variant_id", "store_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "store_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_platform_store_deletion: {
        Args: { p_confirmation_slug: string; p_store_id: string }
        Returns: {
          cleanup_not_before: string
          operation_id: string
          phase: string
        }[]
      }
      check_store_permission: {
        Args: { _permission: string; _store_id: string }
        Returns: boolean
      }
      current_permissions: { Args: never; Returns: string[] }
      delete_platform_store: {
        Args: { p_operation_id: string }
        Returns: string
      }
      has_store_access: { Args: { _store_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_platform_store_deletions: {
        Args: never
        Returns: {
          cleanup_not_before: string
          phase: string
          store_id: string
        }[]
      }
      list_platform_store_users: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      manage_platform_user_access: {
        Args: {
          p_full_name: string
          p_is_super_admin: boolean
          p_revoke_access: boolean
          p_store_ids: string[]
          p_update_profile: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      mark_platform_store_storage_cleaned: {
        Args: {
          p_operation_id: string
          p_store_id: string
          p_store_slug: string
        }
        Returns: undefined
      }
      save_platform_store: {
        Args: {
          p_name: string
          p_slug: string
          p_status: Database["public"]["Enums"]["store_status"]
          p_store_admin_user_ids: string[]
          p_store_id: string
        }
        Returns: string
      }
      save_product_variant_with_attribute_values: {
        Args: {
          p_compare_at_price: number
          p_is_active: boolean
          p_position: number
          p_price: number
          p_product_id: string
          p_sku: string
          p_store_id: string
          p_values: Json
          p_variant_id: string
        }
        Returns: {
          compare_at_price: number | null
          created_at: string
          id: string
          is_active: boolean
          position: number
          price: number
          product_id: string
          sku: string | null
          store_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "product_variants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      schedule_platform_store_storage_cleanup: {
        Args: {
          p_max_upload_url_age_seconds: number
          p_operation_id: string
          p_store_id: string
          p_store_slug: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "store_admin"
      catalog_attribute_display_type: "text" | "swatch"
      page_status: "draft" | "published" | "archived"
      store_status: "active" | "inactive"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "store_admin"],
      catalog_attribute_display_type: ["text", "swatch"],
      page_status: ["draft", "published", "archived"],
      store_status: ["active", "inactive"],
    },
  },
} as const
