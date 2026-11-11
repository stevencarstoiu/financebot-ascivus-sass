export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          actor_user_id: string | null;
          description: string;
          id: string;
          occurred_at: string;
          offer_id: string;
          organization_id: string;
          provider_event_id: string | null;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          actor_user_id?: string | null;
          description: string;
          id?: string;
          occurred_at?: string;
          offer_id: string;
          organization_id: string;
          provider_event_id?: string | null;
          type: string;
        };
        Update: {
          actor_user_id?: string | null;
          description?: string;
          id?: string;
          occurred_at?: string;
          offer_id?: string;
          organization_id?: string;
          provider_event_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_offer_id_organization_id_fkey";
            columns: ["offer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "offer_records";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "activities_offer_id_organization_id_fkey";
            columns: ["offer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_user_id: string | null;
          changed_fields: string[];
          entity_id: string;
          entity_type: string;
          id: string;
          occurred_at: string;
          organization_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_user_id?: string | null;
          changed_fields?: string[];
          entity_id: string;
          entity_type: string;
          id?: string;
          occurred_at?: string;
          organization_id: string;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          changed_fields?: string[];
          entity_id?: string;
          entity_type?: string;
          id?: string;
          occurred_at?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          archived_at: string | null;
          created_at: string;
          customer_id: string;
          email: string | null;
          full_name: string;
          id: string;
          organization_id: string;
          phone: string | null;
          position: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          customer_id: string;
          email?: string | null;
          full_name: string;
          id?: string;
          organization_id: string;
          phone?: string | null;
          position?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          customer_id?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          organization_id?: string;
          phone?: string | null;
          position?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_customer_id_organization_id_fkey";
            columns: ["customer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          archived_at: string | null;
          created_at: string;
          customer_type: string;
          display_name: string;
          external_reference: string | null;
          id: string;
          normalized_name: string | null;
          notes: string | null;
          organization_id: string;
          updated_at: string;
          website: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          customer_type?: string;
          display_name: string;
          external_reference?: string | null;
          id?: string;
          normalized_name?: never;
          notes?: string | null;
          organization_id: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          customer_type?: string;
          display_name?: string;
          external_reference?: string | null;
          id?: string;
          normalized_name?: never;
          notes?: string | null;
          organization_id?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      import_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          duplicate_count: number;
          expires_at: string;
          file_name: string;
          fingerprint: string;
          id: string;
          initiated_by: string;
          mapping_fingerprint: string;
          mapping_version: number;
          organization_id: string;
          result: Json | null;
          row_count: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          duplicate_count?: number;
          expires_at?: string;
          file_name: string;
          fingerprint: string;
          id?: string;
          initiated_by?: string;
          mapping_fingerprint: string;
          mapping_version?: number;
          organization_id: string;
          result?: Json | null;
          row_count: number;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          duplicate_count?: number;
          expires_at?: string;
          file_name?: string;
          fingerprint?: string;
          id?: string;
          initiated_by?: string;
          mapping_fingerprint?: string;
          mapping_version?: number;
          organization_id?: string;
          result?: Json | null;
          row_count?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "import_jobs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      import_rows: {
        Row: {
          data: NonNullable<Json>;
          job_id: string;
          organization_id: string;
          row_number: number;
        };
        ComputedFields: never;
        Insert: {
          data: NonNullable<Json>;
          job_id: string;
          organization_id: string;
          row_number: number;
        };
        Update: {
          data?: NonNullable<Json>;
          job_id?: string;
          organization_id?: string;
          row_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "import_rows_job_id_organization_id_fkey";
            columns: ["job_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "import_jobs";
            referencedColumns: ["id", "organization_id"];
          },
        ];
      };
      offers: {
        Row: {
          amount: number;
          archived_at: string | null;
          closed_at: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          external_reference: string | null;
          first_response_at: string | null;
          id: string;
          last_activity_at: string | null;
          notes: string | null;
          organization_id: string;
          primary_contact_id: string | null;
          sent_at: string | null;
          source: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          archived_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          currency: string;
          customer_id: string;
          external_reference?: string | null;
          first_response_at?: string | null;
          id?: string;
          last_activity_at?: string | null;
          notes?: string | null;
          organization_id: string;
          primary_contact_id?: string | null;
          sent_at?: string | null;
          source?: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          archived_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          external_reference?: string | null;
          first_response_at?: string | null;
          id?: string;
          last_activity_at?: string | null;
          notes?: string | null;
          organization_id?: string;
          primary_contact_id?: string | null;
          sent_at?: string | null;
          source?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_customer_id_organization_id_fkey";
            columns: ["customer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "offers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_primary_contact_id_organization_id_customer_id_fkey";
            columns: ["primary_contact_id", "organization_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id", "organization_id", "customer_id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          default_currency: string;
          followup_after_days: number;
          id: string;
          name: string;
          normalized_slug: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_currency?: string;
          followup_after_days?: number;
          id?: string;
          name: string;
          normalized_slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_currency?: string;
          followup_after_days?: number;
          id?: string;
          name?: string;
          normalized_slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      offer_records: {
        Row: {
          amount: number;
          archived_at: string | null;
          closed_at: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          exact_amount: string | null;
          external_reference: string | null;
          first_response_at: string | null;
          id: string;
          last_activity_at: string | null;
          notes: string | null;
          organization_id: string;
          primary_contact_id: string | null;
          sent_at: string | null;
          source: string;
          status: string;
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount?: number | null;
          archived_at?: string | null;
          closed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          customer_id?: string | null;
          exact_amount?: never;
          external_reference?: string | null;
          first_response_at?: string | null;
          id?: string | null;
          last_activity_at?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          primary_contact_id?: string | null;
          sent_at?: string | null;
          source?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number | null;
          archived_at?: string | null;
          closed_at?: string | null;
          created_at?: string | null;
          currency?: string | null;
          customer_id?: string | null;
          exact_amount?: never;
          external_reference?: string | null;
          first_response_at?: string | null;
          id?: string | null;
          last_activity_at?: string | null;
          notes?: string | null;
          organization_id?: string | null;
          primary_contact_id?: string | null;
          sent_at?: string | null;
          source?: string | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "offers_customer_id_organization_id_fkey";
            columns: ["customer_id", "organization_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "organization_id"];
          },
          {
            foreignKeyName: "offers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_primary_contact_id_organization_id_customer_id_fkey";
            columns: ["primary_contact_id", "organization_id", "customer_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id", "organization_id", "customer_id"];
          },
        ];
      };
    };
    Functions: {
      commit_import: {
        Args: { p_conflict: string; p_job: string };
        Returns: Json;
      };
      create_organization: {
        Args: { p_currency: string; p_name: string; p_request: string };
        Returns: string;
      };
      dashboard_metrics: {
        Args: {
          p_currency?: string;
          p_customer?: string;
          p_from?: string;
          p_org: string;
          p_status?: string;
          p_to?: string;
        };
        Returns: Json;
      };
      stage_import: {
        Args: {
          p_fingerprint: string;
          p_mapping: string;
          p_name: string;
          p_org: string;
          p_rows: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
    Enums: {},
  },
} as const;
