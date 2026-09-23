export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          store_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          store_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          store_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      catalog_attributes: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          code: string;
          display_type: Database["public"]["Enums"]["catalog_attribute_display_type"];
          is_filterable: boolean;
          is_variant_axis: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          name: string;
          code: string;
          display_type?: Database["public"]["Enums"]["catalog_attribute_display_type"];
          is_filterable?: boolean;
          is_variant_axis?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          code?: string;
          display_type?: Database["public"]["Enums"]["catalog_attribute_display_type"];
          is_filterable?: boolean;
          is_variant_axis?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      catalog_attribute_values: {
        Row: {
          id: string;
          store_id: string;
          attribute_id: string;
          value: string;
          label: string;
          swatch_value: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          attribute_id: string;
          value: string;
          label: string;
          swatch_value?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          attribute_id?: string;
          value?: string;
          label?: string;
          swatch_value?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_attribute_values: {
        Row: { product_id: string; attribute_value_id: string; store_id: string };
        Insert: { product_id: string; attribute_value_id: string; store_id: string };
        Update: { product_id?: string; attribute_value_id?: string; store_id?: string };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          sku: string | null;
          price: number;
          compare_at_price: number | null;
          is_active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          sku?: string | null;
          price: number;
          compare_at_price?: number | null;
          is_active?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          sku?: string | null;
          price?: number;
          compare_at_price?: number | null;
          is_active?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      variant_attribute_values: {
        Row: {
          variant_id: string;
          attribute_value_id: string;
          store_id: string;
          attribute_id: string;
        };
        Insert: {
          variant_id: string;
          attribute_value_id: string;
          store_id: string;
          attribute_id: string;
        };
        Update: {
          variant_id?: string;
          attribute_value_id?: string;
          store_id?: string;
          attribute_id?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          url: string;
          alt_text: string | null;
          position: number;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          product_id: string;
          url: string;
          alt_text?: string | null;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          product_id?: string;
          url?: string;
          alt_text?: string | null;
          position?: number;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          category_id: string | null;
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          slug: string;
          store_id: string;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          slug: string;
          store_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          slug?: string;
          store_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_same_store";
            columns: ["category_id", "store_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "store_id"];
          },
          {
            foreignKeyName: "products_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      store_settings: {
        Row: {
          accent_color: string | null;
          address: Json;
          background_color: string | null;
          business_hours: Json;
          contact_email: string | null;
          created_at: string;
          display_name: string | null;
          favicon_url: string | null;
          institutional_text: string | null;
          logo_url: string | null;
          phone: string | null;
          primary_color: string | null;
          privacy_policy: string | null;
          return_policy: string | null;
          secondary_color: string | null;
          short_description: string | null;
          social_links: Json;
          store_id: string;
          terms_of_use: string | null;
          text_color: string | null;
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          accent_color?: string | null;
          address?: Json;
          background_color?: string | null;
          business_hours?: Json;
          contact_email?: string | null;
          created_at?: string;
          display_name?: string | null;
          favicon_url?: string | null;
          institutional_text?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          primary_color?: string | null;
          privacy_policy?: string | null;
          return_policy?: string | null;
          secondary_color?: string | null;
          short_description?: string | null;
          social_links?: Json;
          store_id: string;
          terms_of_use?: string | null;
          text_color?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          accent_color?: string | null;
          address?: Json;
          background_color?: string | null;
          business_hours?: Json;
          contact_email?: string | null;
          created_at?: string;
          display_name?: string | null;
          favicon_url?: string | null;
          institutional_text?: string | null;
          logo_url?: string | null;
          phone?: string | null;
          primary_color?: string | null;
          privacy_policy?: string | null;
          return_policy?: string | null;
          secondary_color?: string | null;
          short_description?: string | null;
          social_links?: Json;
          store_id?: string;
          terms_of_use?: string | null;
          text_color?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "store_settings_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: true;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
      stores: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["store_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["store_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["store_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          store_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          store_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          store_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_store_id_fkey";
            columns: ["store_id"];
            isOneToOne: false;
            referencedRelation: "stores";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_store_access: { Args: { _store_id: string }; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      app_role: "super_admin" | "store_admin";
      catalog_attribute_display_type: "text" | "swatch";
      store_status: "active" | "inactive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "store_admin"],
      catalog_attribute_display_type: ["text", "swatch"],
      store_status: ["active", "inactive"],
    },
  },
} as const;
