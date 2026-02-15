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
      analytics_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          properties?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      fortune_draws: {
        Row: {
          birth_date: string
          created_at: string | null
          draw_date: string
          fortune_content: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          birth_date: string
          created_at?: string | null
          draw_date: string
          fortune_content: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          birth_date?: string
          created_at?: string | null
          draw_date?: string
          fortune_content?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: []
      }
      inspirations: {
        Row: {
          content: string
          converted_to_resource_id: string | null
          created_at: string | null
          id: string
          location: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          converted_to_resource_id?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          converted_to_resource_id?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspirations_converted_to_resource_id_fkey"
            columns: ["converted_to_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      module_sections: {
        Row: {
          id: string
          module_id: string
          section_id: string
        }
        Insert: {
          id?: string
          module_id: string
          section_id: string
        }
        Update: {
          id?: string
          module_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_sections_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_sections_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          default_try_queue_folder_id: string | null
          id: string
          nickname: string | null
          storage_limit: number | null
          storage_used: number | null
          username: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          default_try_queue_folder_id?: string | null
          id: string
          nickname?: string | null
          storage_limit?: number | null
          storage_used?: number | null
          username: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          default_try_queue_folder_id?: string | null
          id?: string
          nickname?: string | null
          storage_limit?: number | null
          storage_used?: number | null
          username?: string
        }
        Relationships: []
      }
      learning_focus: {
        Row: {
          created_at: string | null
          id: string
          is_paused: boolean | null
          name: string
          synonyms: string[] | null
          updated_at: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_paused?: boolean | null
          name: string
          synonyms?: string[] | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_paused?: boolean | null
          name?: string
          synonyms?: string[] | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      try_queue_links: {
        Row: {
          archived_at: string | null
          complete_time: string | null
          converted_to_resource_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_priority_locked: boolean | null
          notes: string | null
          priority_level: string | null
          priority_score: number | null
          queue_position: number | null
          rating: number | null
          start_time: string | null
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          complete_time?: string | null
          converted_to_resource_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_priority_locked?: boolean | null
          notes?: string | null
          priority_level?: string | null
          priority_score?: number | null
          queue_position?: number | null
          rating?: number | null
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          complete_time?: string | null
          converted_to_resource_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_priority_locked?: boolean | null
          notes?: string | null
          priority_level?: string | null
          priority_score?: number | null
          queue_position?: number | null
          rating?: number | null
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "try_queue_links_converted_to_resource_id_fkey"
            columns: ["converted_to_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          content: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          module_id: string | null
          name: string
          notes: string | null
          parent_id: string | null
          section_id: string
          source_inspiration_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          module_id?: string | null
          name: string
          notes?: string | null
          parent_id?: string | null
          section_id: string
          source_inspiration_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          module_id?: string | null
          name?: string
          notes?: string | null
          parent_id?: string | null
          section_id?: string
          source_inspiration_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_source_inspiration_id_fkey"
            columns: ["source_inspiration_id"]
            isOneToOne: false
            referencedRelation: "inspirations"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string | null
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          keyword: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          type?: string
        }
        Relationships: []
      }
      tag_groups: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_deferred_links: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_url_exists: {
        Args: {
          p_url: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_username_exists: {
        Args: { username_input: string }
        Returns: boolean
      }
      delete_tag: {
        Args: { tag_name: string; user_uuid: string }
        Returns: number
      }
      get_folder_resource_count: {
        Args: { folder_uuid: string }
        Returns: number
      }
      get_user_tag_stats: {
        Args: { user_uuid: string }
        Returns: {
          tag: string
          usage_count: number
        }[]
      }
      rename_tag: {
        Args: { new_tag_name: string; old_tag_name: string; user_uuid: string }
        Returns: number
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
