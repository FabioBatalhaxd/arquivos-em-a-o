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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brand_accounts: {
        Row: {
          brand: string | null
          brands: string[]
          created_at: string
          permissions: Json
          user_id: string
          username: string
        }
        Insert: {
          brand?: string | null
          brands?: string[]
          created_at?: string
          permissions?: Json
          user_id: string
          username: string
        }
        Update: {
          brand?: string | null
          brands?: string[]
          created_at?: string
          permissions?: Json
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      collection_imports: {
        Row: {
          created_at: string
          filename: string
          id: string
          imported_by: string
          source_rows: number
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          imported_by: string
          source_rows?: number
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          imported_by?: string
          source_rows?: number
        }
        Relationships: []
      }
      collection_records: {
        Row: {
          brand: string
          carrier: string
          confirmed: boolean
          id: number
          order_date: string
          origin: string
          quantity: number
          store: string
          uf: string
        }
        Insert: {
          brand: string
          carrier?: string
          confirmed: boolean
          id?: number
          order_date: string
          origin?: string
          quantity?: number
          store: string
          uf?: string
        }
        Update: {
          brand?: string
          carrier?: string
          confirmed?: boolean
          id?: number
          order_date?: string
          origin?: string
          quantity?: number
          store?: string
          uf?: string
        }
        Relationships: []
      }
      dashboard_imports: {
        Row: {
          created_at: string
          filename: string
          id: string
          imported_by: string
          row_count: number
          source_rows: number
          status: string
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          imported_by: string
          row_count?: number
          source_rows?: number
          status?: string
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          imported_by?: string
          row_count?: number
          source_rows?: number
          status?: string
        }
        Relationships: []
      }
      dashboard_records: {
        Row: {
          brand: string
          id: number
          import_id: string
          payload: Json
        }
        Insert: {
          brand: string
          id?: never
          import_id: string
          payload: Json
        }
        Update: {
          brand?: string
          id?: never
          import_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_records_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "dashboard_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_setup_attempts: {
        Row: {
          attempts: number
          key: string
          started_at: string
        }
        Insert: {
          attempts?: number
          key: string
          started_at?: string
        }
        Update: {
          attempts?: number
          key?: string
          started_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["dashboard_role"]
          user_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["dashboard_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["dashboard_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_dashboard_records: {
        Args: { _import_id: string; _records: Json }
        Returns: undefined
      }
      begin_dashboard_import: {
        Args: { _filename: string; _source_rows: number }
        Returns: string
      }
      cancel_dashboard_import: {
        Args: { _import_id: string }
        Returns: undefined
      }
      claim_first_master: {
        Args: { _user_id: string; _username: string }
        Returns: undefined
      }
      dashboard_brand_names: { Args: never; Returns: string[] }
      dashboard_is_master: { Args: never; Returns: boolean }
      dashboard_setup_allowed: { Args: { _key: string }; Returns: boolean }
      finish_dashboard_import: {
        Args: { _import_id: string }
        Returns: undefined
      }
      replace_collection_records: {
        Args: { _filename: string; _records: Json; _source_rows: number }
        Returns: undefined
      }
      replace_dashboard_records: {
        Args: { _filename: string; _records: Json }
        Returns: string
      }
    }
    Enums: {
      dashboard_role: "master" | "owner"
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
      dashboard_role: ["master", "owner"],
    },
  },
} as const
