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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      _backup_kanban_tasks: {
        Row: {
          archived_at: string | null
          assigned_to: string[] | null
          company_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          image_url: string | null
          is_archived: boolean | null
          order_position: number | null
          source: string | null
          status: string | null
          task_type: string | null
          team_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string[] | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          image_url?: string | null
          is_archived?: boolean | null
          order_position?: number | null
          source?: string | null
          status?: string | null
          task_type?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string[] | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          image_url?: string | null
          is_archived?: boolean | null
          order_position?: number | null
          source?: string | null
          status?: string | null
          task_type?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      _backup_tasks: {
        Row: {
          company_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      _backup_team_tasks: {
        Row: {
          archived: boolean | null
          assigned_to: string | null
          company_id: string | null
          completed: boolean | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string | null
          team_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          assigned_to?: string | null
          company_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          assigned_to?: string | null
          company_id?: string | null
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string | null
          team_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_user_id: string
          company_id: string | null
          created_at: string
          description: string
          details: Json | null
          id: string
          session_id: string | null
          success: boolean | null
          target_id: string | null
          target_type: string | null
          user_affected_id: string | null
          user_ip_address: unknown
        }
        Insert: {
          action_type: string
          admin_user_id: string
          company_id?: string | null
          created_at?: string
          description: string
          details?: Json | null
          id?: string
          session_id?: string | null
          success?: boolean | null
          target_id?: string | null
          target_type?: string | null
          user_affected_id?: string | null
          user_ip_address?: unknown
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          company_id?: string | null
          created_at?: string
          description?: string
          details?: Json | null
          id?: string
          session_id?: string | null
          success?: boolean | null
          target_id?: string | null
          target_type?: string | null
          user_affected_id?: string | null
          user_ip_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_business_context_cache: {
        Row: {
          access_roles: string[] | null
          company_id: string
          context_type: string
          created_at: string
          entity_id: string | null
          expires_at: string | null
          id: string
          summary_data: Json
          team_id: string | null
          updated_at: string
        }
        Insert: {
          access_roles?: string[] | null
          company_id: string
          context_type: string
          created_at?: string
          entity_id?: string | null
          expires_at?: string | null
          id?: string
          summary_data: Json
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          access_roles?: string[] | null
          company_id?: string
          context_type?: string
          created_at?: string
          entity_id?: string | null
          expires_at?: string | null
          id?: string
          summary_data?: Json
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_chat_sessions: {
        Row: {
          attached_files: Json | null
          company_id: string | null
          context_snapshot: string | null
          created_at: string
          folder_id: string | null
          id: string
          is_pinned: boolean | null
          messages: Json
          session_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attached_files?: Json | null
          company_id?: string | null
          context_snapshot?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_pinned?: boolean | null
          messages?: Json
          session_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attached_files?: Json | null
          company_id?: string | null
          context_snapshot?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          is_pinned?: boolean | null
          messages?: Json
          session_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_sessions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "chat_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_context: {
        Row: {
          company_id: string
          context_data: Json
          created_at: string
          id: string
          query_intent: string | null
          scoped_entities: Json | null
          session_id: string
          team_ids: string[] | null
          user_id: string
          user_role: string
        }
        Insert: {
          company_id: string
          context_data?: Json
          created_at?: string
          id?: string
          query_intent?: string | null
          scoped_entities?: Json | null
          session_id: string
          team_ids?: string[] | null
          user_id: string
          user_role: string
        }
        Update: {
          company_id?: string
          context_data?: Json
          created_at?: string
          id?: string
          query_intent?: string | null
          scoped_entities?: Json | null
          session_id?: string
          team_ids?: string[] | null
          user_id?: string
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_context_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_query_analytics: {
        Row: {
          company_id: string
          context_accuracy: boolean | null
          created_at: string
          detected_intent: string | null
          entities_referenced: Json | null
          id: string
          query_text: string
          response_quality_score: number | null
          response_time_ms: number | null
          session_id: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          context_accuracy?: boolean | null
          created_at?: string
          detected_intent?: string | null
          entities_referenced?: Json | null
          id?: string
          query_text: string
          response_quality_score?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          context_accuracy?: boolean | null
          created_at?: string
          detected_intent?: string | null
          entities_referenced?: Json | null
          id?: string
          query_text?: string
          response_quality_score?: number | null
          response_time_ms?: number | null
          session_id?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_analytics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_user_instructions: {
        Row: {
          created_at: string
          id: string
          instructions: string
          is_active: boolean
          template_variables: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          template_variables?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string
          is_active?: boolean
          template_variables?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_user_preferences: {
        Row: {
          communication_style: string | null
          company_id: string
          created_at: string
          detail_level: string | null
          id: string
          include_strategic_context: boolean | null
          learning_metadata: Json | null
          permissions_scope: Json | null
          preferred_teams: string[] | null
          risk_detection_enabled: boolean | null
          show_alignment_hints: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          communication_style?: string | null
          company_id: string
          created_at?: string
          detail_level?: string | null
          id?: string
          include_strategic_context?: boolean | null
          learning_metadata?: Json | null
          permissions_scope?: Json | null
          preferred_teams?: string[] | null
          risk_detection_enabled?: boolean | null
          show_alignment_hints?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          communication_style?: string | null
          company_id?: string
          created_at?: string
          detail_level?: string | null
          id?: string
          include_strategic_context?: boolean | null
          learning_metadata?: Json | null
          permissions_scope?: Json | null
          preferred_teams?: string[] | null
          risk_detection_enabled?: boolean | null
          show_alignment_hints?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_company_filters: {
        Row: {
          created_at: string | null
          excluded_company_ids: string[] | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          excluded_company_ids?: string[] | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          excluded_company_ids?: string[] | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          playbook_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          playbook_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          playbook_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          cover_image_url: string | null
          created_at: string | null
          id: string
          meta_description: string | null
          published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          id?: string
          meta_description?: string | null
          published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      business_processes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number | null
          id: string
          name: string
          owner: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name: string
          owner?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          name?: string
          owner?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_folders: {
        Row: {
          color: string | null
          company_id: string
          created_at: string | null
          id: string
          name: string
          position: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          name: string
          position?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          name?: string
          position?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_folders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clarity_break_entries: {
        Row: {
          break_id: string
          company_id: string | null
          created_at: string | null
          id: string
          prompt: string
          response: string | null
          user_id: string
        }
        Insert: {
          break_id: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          prompt: string
          response?: string | null
          user_id: string
        }
        Update: {
          break_id?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          prompt?: string
          response?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarity_break_entries_break_id_fkey"
            columns: ["break_id"]
            isOneToOne: false
            referencedRelation: "clarity_breaks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarity_break_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarity_break_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clarity_breaks: {
        Row: {
          company_id: string | null
          created_at: string | null
          current_elapsed_seconds: number | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          insights: string | null
          is_paused: boolean | null
          paused_at: string | null
          session_prompts: string[] | null
          started_at: string | null
          team_id: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          current_elapsed_seconds?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          insights?: string | null
          is_paused?: boolean | null
          paused_at?: string | null
          session_prompts?: string[] | null
          started_at?: string | null
          team_id?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          current_elapsed_seconds?: number | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          insights?: string | null
          is_paused?: boolean | null
          paused_at?: string | null
          session_prompts?: string[] | null
          started_at?: string | null
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarity_breaks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarity_breaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarity_breaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_meeting_transcription: boolean
          auto_create_overdue_issues: boolean
          created_at: string | null
          default_vote_limit: number | null
          id: string
          name: string
          require_task_before_solve: boolean
          slug: string
          status: string | null
          updated_at: string | null
          zentrix_support_access: boolean | null
        }
        Insert: {
          ai_meeting_transcription?: boolean
          auto_create_overdue_issues?: boolean
          created_at?: string | null
          default_vote_limit?: number | null
          id?: string
          name: string
          require_task_before_solve?: boolean
          slug: string
          status?: string | null
          updated_at?: string | null
          zentrix_support_access?: boolean | null
        }
        Update: {
          ai_meeting_transcription?: boolean
          auto_create_overdue_issues?: boolean
          created_at?: string | null
          default_vote_limit?: number | null
          id?: string
          name?: string
          require_task_before_solve?: boolean
          slug?: string
          status?: string | null
          updated_at?: string | null
          zentrix_support_access?: boolean | null
        }
        Relationships: []
      }
      company_annual_metrics: {
        Row: {
          company_id: string
          created_at: string | null
          current_value: number | null
          id: string
          metric_name: string
          period: string | null
          target_logic: string | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric_name: string
          period?: string | null
          target_logic?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          current_value?: number | null
          id?: string
          metric_name?: string
          period?: string | null
          target_logic?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_annual_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_api_keys: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[] | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[] | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "company_api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_assessments: {
        Row: {
          assessment_date: string
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          overall_score: number | null
          respondent_count: number | null
          status: string
          title: string
        }
        Insert: {
          assessment_date?: string
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          overall_score?: number | null
          respondent_count?: number | null
          status?: string
          title: string
        }
        Update: {
          assessment_date?: string
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          overall_score?: number | null
          respondent_count?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_health_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_health_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_health_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          is_submitted: boolean
          ratings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          is_submitted?: boolean
          ratings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          is_submitted?: boolean
          ratings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_health_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "company_health_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_health_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          accepted_at: string | null
          company_id: string
          email: string | null
          highlight_current_week: boolean | null
          id: string
          image_url: string | null
          invited_at: string | null
          invited_by: string | null
          joined_at: string
          last_reminder_sent_at: string | null
          permission_level: string
          reminder_count: number | null
          show_current_week: boolean | null
          status: string
          team_ids: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          email?: string | null
          highlight_current_week?: boolean | null
          id?: string
          image_url?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string
          last_reminder_sent_at?: string | null
          permission_level?: string
          reminder_count?: number | null
          show_current_week?: boolean | null
          status?: string
          team_ids?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          email?: string | null
          highlight_current_week?: boolean | null
          id?: string
          image_url?: string | null
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string
          last_reminder_sent_at?: string | null
          permission_level?: string
          reminder_count?: number | null
          show_current_week?: boolean | null
          status?: string
          team_ids?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_permission_level_fkey"
            columns: ["permission_level"]
            isOneToOne: false
            referencedRelation: "permission_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_state_reports: {
        Row: {
          action_items: Json | null
          company_id: string | null
          created_at: string | null
          executive_summary: string | null
          generated_at: string | null
          goal_progress: Json | null
          id: string
          metrics_health: Json | null
          recommendations: Json | null
          risks: Json | null
          team_performance: Json | null
          user_id: string | null
          week_start: string
          wins: Json | null
        }
        Insert: {
          action_items?: Json | null
          company_id?: string | null
          created_at?: string | null
          executive_summary?: string | null
          generated_at?: string | null
          goal_progress?: Json | null
          id?: string
          metrics_health?: Json | null
          recommendations?: Json | null
          risks?: Json | null
          team_performance?: Json | null
          user_id?: string | null
          week_start: string
          wins?: Json | null
        }
        Update: {
          action_items?: Json | null
          company_id?: string | null
          created_at?: string | null
          executive_summary?: string | null
          generated_at?: string | null
          goal_progress?: Json | null
          id?: string
          metrics_health?: Json | null
          recommendations?: Json | null
          risks?: Json | null
          team_performance?: Json | null
          user_id?: string | null
          week_start?: string
          wins?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_state_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          base_price_per_user: number | null
          billing_type: string | null
          company_id: string
          company_name: string | null
          created_at: string
          current_month_usage: number | null
          extended_trial_end: string | null
          id: string
          last_usage_update: string | null
          period_amount_charged: number | null
          primary_flow_type: string | null
          quantity: number | null
          stripe_current_period_end: string | null
          stripe_current_period_start: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_item_id: string | null
          subscribed: boolean
          subscribed_at: string | null
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          trial_expired_sent_at: string | null
          trial_expiring_sent_at: string | null
          updated_at: string
          user_count: number | null
        }
        Insert: {
          base_price_per_user?: number | null
          billing_type?: string | null
          company_id: string
          company_name?: string | null
          created_at?: string
          current_month_usage?: number | null
          extended_trial_end?: string | null
          id?: string
          last_usage_update?: string | null
          period_amount_charged?: number | null
          primary_flow_type?: string | null
          quantity?: number | null
          stripe_current_period_end?: string | null
          stripe_current_period_start?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          subscribed?: boolean
          subscribed_at?: string | null
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          trial_expired_sent_at?: string | null
          trial_expiring_sent_at?: string | null
          updated_at?: string
          user_count?: number | null
        }
        Update: {
          base_price_per_user?: number | null
          billing_type?: string | null
          company_id?: string
          company_name?: string | null
          created_at?: string
          current_month_usage?: number | null
          extended_trial_end?: string | null
          id?: string
          last_usage_update?: string | null
          period_amount_charged?: number | null
          primary_flow_type?: string | null
          quantity?: number | null
          stripe_current_period_end?: string | null
          stripe_current_period_start?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_item_id?: string | null
          subscribed?: boolean
          subscribed_at?: string | null
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          trial_expired_sent_at?: string | null
          trial_expiring_sent_at?: string | null
          updated_at?: string
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_usage_stats: {
        Row: {
          average_session_minutes: number | null
          company_id: string
          created_at: string
          id: string
          session_count: number
          stat_date: string
          total_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_session_minutes?: number | null
          company_id: string
          created_at?: string
          id?: string
          session_count?: number
          stat_date: string
          total_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_session_minutes?: number | null
          company_id?: string
          created_at?: string
          id?: string
          session_count?: number
          stat_date?: string
          total_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_usage_stats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_usage_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_flag_states: {
        Row: {
          company_id: string
          created_at: string
          crm_notified_added_at: string | null
          crm_notified_removed_at: string | null
          first_detected_at: string
          flag_active: boolean
          flag_type: string
          id: string
          last_detected_at: string
          removed_at: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm_notified_added_at?: string | null
          crm_notified_removed_at?: string | null
          first_detected_at?: string
          flag_active?: boolean
          flag_type: string
          id?: string
          last_detected_at?: string
          removed_at?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm_notified_added_at?: string | null
          crm_notified_removed_at?: string | null
          first_detected_at?: string
          flag_active?: boolean
          flag_type?: string
          id?: string
          last_detected_at?: string
          removed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_flag_states_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_success_tracking: {
        Row: {
          account_stage: string | null
          company_id: string
          created_at: string | null
          customer_health: string | null
          customer_migration: string | null
          customer_status_notes: string | null
          id: string
          onboarding_video: string | null
          subs_status: string | null
          updated_at: string | null
          whatsapp_group: string | null
        }
        Insert: {
          account_stage?: string | null
          company_id: string
          created_at?: string | null
          customer_health?: string | null
          customer_migration?: string | null
          customer_status_notes?: string | null
          id?: string
          onboarding_video?: string | null
          subs_status?: string | null
          updated_at?: string | null
          whatsapp_group?: string | null
        }
        Update: {
          account_stage?: string | null
          company_id?: string
          created_at?: string | null
          customer_health?: string | null
          customer_migration?: string | null
          customer_status_notes?: string | null
          id?: string
          onboarding_video?: string | null
          subs_status?: string | null
          updated_at?: string | null
          whatsapp_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_success_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_strategy_responses: {
        Row: {
          company_id: string
          created_at: string
          id: string
          question: string
          question_index: number
          response: string | null
          strategy_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          question: string
          question_index: number
          response?: string | null
          strategy_mode: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          question?: string
          question_index?: number
          response?: string | null
          strategy_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delegate_elevate_sessions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegate_elevate_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delegate_elevate_tasks: {
        Row: {
          assigned_to: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          quadrant: string
          session_id: string
          team_id: string | null
          time_per_week: number | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          quadrant: string
          session_id: string
          team_id?: string | null
          time_per_week?: number | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          quadrant?: string
          session_id?: string
          team_id?: string | null
          time_per_week?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegate_elevate_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_tasks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "delegate_elevate_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_tasks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delegate_elevate_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          session_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          session_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          session_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "delegate_elevate_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegate_elevate_versions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "delegate_elevate_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_feature_announcements: {
        Row: {
          announcement_href: string
          created_at: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_href: string
          created_at?: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_href?: string
          created_at?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      eos_life_ratings: {
        Row: {
          category: string
          created_at: string
          id: string
          rating: number
          session_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          rating: number
          session_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          rating?: number
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eos_life_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "eos_life_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      eos_life_sessions: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          notes: string | null
          overall_average: number | null
          session_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          overall_average?: number | null
          session_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          overall_average?: number | null
          session_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fast_tasks: {
        Row: {
          archived_at: string | null
          assigned_to: string[] | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          image_url: string | null
          is_archived: boolean | null
          is_deleted: boolean
          order_position: number | null
          source: string | null
          status: string
          task_type: string
          team_id: string | null
          team_name: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string[] | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean
          order_position?: number | null
          source?: string | null
          status?: string
          task_type?: string
          team_id?: string | null
          team_name?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string[] | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_archived?: boolean | null
          is_deleted?: boolean
          order_position?: number | null
          source?: string | null
          status?: string
          task_type?: string
          team_id?: string | null
          team_name?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fast_tasks_company_fk"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fast_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fast_tasks_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fast_tasks_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation_type: string
          session_info: Json | null
          task_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type: string
          session_info?: Json | null
          task_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type?: string
          session_info?: Json | null
          task_id?: string
        }
        Relationships: []
      }
      feature_announcements: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string
          href: string | null
          id: string
          image: string | null
          is_active: boolean
          summary: string
          target_audience: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by: string
          href?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          summary: string
          target_audience?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string
          href?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          summary?: string
          target_audience?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_milestones: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          due_date: string | null
          goal_id: string
          id: string
          progress: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          goal_id: string
          id?: string
          progress?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          goal_id?: string
          id?: string
          progress?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "team_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_status_snapshots: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          is_company_goal: boolean
          progress: number | null
          snapshot_date: string
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          is_company_goal?: boolean
          progress?: number | null
          snapshot_date: string
          status: string
          team_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          is_company_goal?: boolean
          progress?: number | null
          snapshot_date?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_status_snapshots_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "team_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_status_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_team_assignments: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          team_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_team_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "team_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      headlines: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          meeting_id: string | null
          target_meeting_type: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          meeting_id?: string | null
          target_meeting_type?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_id?: string | null
          target_meeting_type?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "headlines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          error_message: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          invitation_token: string | null
          invited_by: string
          role: string
          status: string
          team_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          error_message?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invitation_token?: string | null
          invited_by: string
          role: string
          status?: string
          team_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          error_message?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invitation_token?: string | null
          invited_by?: string
          role?: string
          status?: string
          team_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_ratings: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_ratings_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_votes: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          meeting_state_id: string | null
          team_id: string
          updated_at: string
          user_id: string
          vote_value: number
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          meeting_state_id?: string | null
          team_id: string
          updated_at?: string
          user_id: string
          vote_value: number
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          meeting_state_id?: string | null
          team_id?: string
          updated_at?: string
          user_id?: string
          vote_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "issue_votes_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_votes_meeting_state_id_fkey"
            columns: ["meeting_state_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_votes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_deleted: boolean
          is_public: boolean
          issue_type: Database["public"]["Enums"]["issue_type"] | null
          meeting_id: string | null
          owner_id: string | null
          sort_order: number | null
          status: string | null
          team_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          is_public?: boolean
          issue_type?: Database["public"]["Enums"]["issue_type"] | null
          meeting_id?: string | null
          owner_id?: string | null
          sort_order?: number | null
          status?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean
          is_public?: boolean
          issue_type?: Database["public"]["Enums"]["issue_type"] | null
          meeting_id?: string | null
          owner_id?: string | null
          sort_order?: number | null
          status?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      issues_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          id: string
          issue_id: string
          new_data: Json | null
          old_data: Json | null
          operation_type: string
          session_info: Json | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          issue_id: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type: string
          session_info?: Json | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          issue_id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type?: string
          session_info?: Json | null
        }
        Relationships: []
      }
      lead_profiling: {
        Row: {
          created_at: string | null
          eos_usage: string | null
          id: string
          investment_willingness: string | null
          is_disqualified: boolean | null
          is_mql: boolean | null
          updated_at: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          created_at?: string | null
          eos_usage?: string | null
          id?: string
          investment_willingness?: string | null
          is_disqualified?: boolean | null
          is_mql?: boolean | null
          updated_at?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          created_at?: string | null
          eos_usage?: string | null
          id?: string
          investment_willingness?: string | null
          is_disqualified?: boolean | null
          is_mql?: boolean | null
          updated_at?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      lesson_blocks: {
        Row: {
          block_type: Database["public"]["Enums"]["block_type"]
          content: Json
          created_at: string
          id: string
          is_required: boolean
          lesson_id: string
          order_position: number
          rich_content: Json | null
          updated_at: string
        }
        Insert: {
          block_type: Database["public"]["Enums"]["block_type"]
          content?: Json
          created_at?: string
          id?: string
          is_required?: boolean
          lesson_id: string
          order_position?: number
          rich_content?: Json | null
          updated_at?: string
        }
        Update: {
          block_type?: Database["public"]["Enums"]["block_type"]
          content?: Json
          created_at?: string
          id?: string
          is_required?: boolean
          lesson_id?: string
          order_position?: number
          rich_content?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_blocks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string
          department_tags: string[] | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          is_required: boolean
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          module_id: string
          order_position: number
          passing_score: number | null
          role_tags: string[] | null
          title: string
          topic_tags: string[] | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          department_tags?: string[] | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_required?: boolean
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id: string
          order_position?: number
          passing_score?: number | null
          role_tags?: string[] | null
          title: string
          topic_tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          department_tags?: string[] | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_required?: boolean
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          module_id?: string
          order_position?: number
          passing_score?: number | null
          role_tags?: string[] | null
          title?: string
          topic_tags?: string[] | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_meeting_ratings: {
        Row: {
          created_at: string
          id: string
          meeting_state_id: string
          rated_member_id: string
          rating: number
          submitted_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_state_id: string
          rated_member_id: string
          rating: number
          submitted_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_state_id?: string
          rated_member_id?: string
          rating?: number
          submitted_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_strategy_blocks: {
        Row: {
          block_data: Json
          block_id: string
          block_title: string
          company_id: string | null
          created_at: string | null
          focused: boolean
          id: string
          section_type: string
          session_id: string
          updated_at: string | null
          user_id: string
          visible: boolean
        }
        Insert: {
          block_data?: Json
          block_id: string
          block_title: string
          company_id?: string | null
          created_at?: string | null
          focused?: boolean
          id?: string
          section_type: string
          session_id: string
          updated_at?: string | null
          user_id: string
          visible?: boolean
        }
        Update: {
          block_data?: Json
          block_id?: string
          block_title?: string
          company_id?: string | null
          created_at?: string | null
          focused?: boolean
          id?: string
          section_type?: string
          session_id?: string
          updated_at?: string | null
          user_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "marketing_strategy_blocks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "marketing_strategy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_strategy_sessions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meeting_company_assessments: {
        Row: {
          created_at: string | null
          id: string
          is_submitted: boolean | null
          meeting_state_id: string
          ratings: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_submitted?: boolean | null
          meeting_state_id: string
          ratings?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_submitted?: boolean | null
          meeting_state_id?: string
          ratings?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_company_assessments_meeting_state_id_fkey"
            columns: ["meeting_state_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_company_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_results: {
        Row: {
          attendees: Json | null
          company_id: string | null
          created_at: string
          goals_created: Json | null
          headlines_created: Json | null
          id: string
          issues_resolved: Json | null
          meeting_id: string
          meeting_ratings: Json | null
          metrics_created: Json | null
          section_durations: Json | null
          tasks_created: Json | null
          team_id: string | null
          total_duration_seconds: number | null
          updated_at: string
        }
        Insert: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string
          goals_created?: Json | null
          headlines_created?: Json | null
          id?: string
          issues_resolved?: Json | null
          meeting_id: string
          meeting_ratings?: Json | null
          metrics_created?: Json | null
          section_durations?: Json | null
          tasks_created?: Json | null
          team_id?: string | null
          total_duration_seconds?: number | null
          updated_at?: string
        }
        Update: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string
          goals_created?: Json | null
          headlines_created?: Json | null
          id?: string
          issues_resolved?: Json | null
          meeting_id?: string
          meeting_ratings?: Json | null
          metrics_created?: Json | null
          section_durations?: Json | null
          tasks_created?: Json | null
          team_id?: string | null
          total_duration_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_results_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_section_state: {
        Row: {
          created_at: string
          current_section: number
          id: string
          live_section_duration: number
          meeting_state_id: string
          section_durations: Json
          section_start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_section?: number
          id?: string
          live_section_duration?: number
          meeting_state_id: string
          section_durations?: Json
          section_start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_section?: number
          id?: string
          live_section_duration?: number
          meeting_state_id?: string
          section_durations?: Json
          section_start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_section_state_meeting_state_id_fkey"
            columns: ["meeting_state_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          icon: string | null
          id: string
          meeting_title: string | null
          name: string
          owner_id: string
          sections: Json
          shared: boolean
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          meeting_title?: string | null
          name: string
          owner_id: string
          sections: Json
          shared?: boolean
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          meeting_title?: string | null
          name?: string
          owner_id?: string
          sections?: Json
          shared?: boolean
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_timer_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          meeting_state_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          meeting_state_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          meeting_state_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_timer_events_meeting_state_id_fkey"
            columns: ["meeting_state_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_timers: {
        Row: {
          allocated_minutes: number
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          meeting_state_id: string
          section_id: number
          section_name: string
          started_at: string | null
          updated_at: string
        }
        Insert: {
          allocated_minutes: number
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          meeting_state_id: string
          section_id: number
          section_name: string
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          allocated_minutes?: number
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          meeting_state_id?: string
          section_id?: number
          section_name?: string
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_timers_meeting_state_id_fkey"
            columns: ["meeting_state_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcripts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          meeting_id: string
          segment_index: number
          segment_text: string
          team_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          meeting_id: string
          segment_index?: number
          segment_text: string
          team_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          meeting_id?: string
          segment_index?: number
          segment_text?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcripts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_transcripts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings_state: {
        Row: {
          audience_type: string | null
          company_id: string | null
          created_at: string
          current_section: number | null
          custom_agenda: Json | null
          ended_at: string | null
          id: string
          is_paused: boolean
          last_pause_timestamp: string | null
          meeting_title: string | null
          meeting_type: string | null
          pause_history: Json | null
          pause_reason: string | null
          role_assignments: Json | null
          scriber_heartbeat_timeout: number | null
          scriber_id: string | null
          scriber_last_activity: string | null
          section_accumulated_times: Json
          section_durations: Json | null
          section_start_time: string | null
          selected_members: Json | null
          started_at: string
          started_by: string
          status: string
          team_id: string | null
          timer_presets: Json | null
          total_pause_duration: number
          updated_at: string
          vote_limit: number | null
        }
        Insert: {
          audience_type?: string | null
          company_id?: string | null
          created_at?: string
          current_section?: number | null
          custom_agenda?: Json | null
          ended_at?: string | null
          id?: string
          is_paused?: boolean
          last_pause_timestamp?: string | null
          meeting_title?: string | null
          meeting_type?: string | null
          pause_history?: Json | null
          pause_reason?: string | null
          role_assignments?: Json | null
          scriber_heartbeat_timeout?: number | null
          scriber_id?: string | null
          scriber_last_activity?: string | null
          section_accumulated_times?: Json
          section_durations?: Json | null
          section_start_time?: string | null
          selected_members?: Json | null
          started_at?: string
          started_by: string
          status?: string
          team_id?: string | null
          timer_presets?: Json | null
          total_pause_duration?: number
          updated_at?: string
          vote_limit?: number | null
        }
        Update: {
          audience_type?: string | null
          company_id?: string | null
          created_at?: string
          current_section?: number | null
          custom_agenda?: Json | null
          ended_at?: string | null
          id?: string
          is_paused?: boolean
          last_pause_timestamp?: string | null
          meeting_title?: string | null
          meeting_type?: string | null
          pause_history?: Json | null
          pause_reason?: string | null
          role_assignments?: Json | null
          scriber_heartbeat_timeout?: number | null
          scriber_id?: string | null
          scriber_last_activity?: string | null
          section_accumulated_times?: Json
          section_durations?: Json | null
          section_start_time?: string | null
          selected_members?: Json | null
          started_at?: string
          started_by?: string
          status?: string
          team_id?: string | null
          timer_presets?: Json | null
          total_pause_duration?: number
          updated_at?: string
          vote_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_state_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_ownership_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          details: Json | null
          id: string
          metric_id: string | null
          new_owner_id: string | null
          old_owner_id: string | null
          operation_type: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          details?: Json | null
          id?: string
          metric_id?: string | null
          new_owner_id?: string | null
          old_owner_id?: string | null
          operation_type?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          details?: Json | null
          id?: string
          metric_id?: string | null
          new_owner_id?: string | null
          old_owner_id?: string | null
          operation_type?: string | null
        }
        Relationships: []
      }
      metric_team_assignments: {
        Row: {
          created_at: string
          id: string
          metric_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_team_assignments_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          aggregation_type: string | null
          archived_at: string | null
          assistant_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number | null
          formula_components: Json | null
          id: string
          is_formula: boolean | null
          metric_name: string
          owner_id: string | null
          target_logic: string | null
          target_value: number | null
          team_id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aggregation_type?: string | null
          archived_at?: string | null
          assistant_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          formula_components?: Json | null
          id?: string
          is_formula?: boolean | null
          metric_name: string
          owner_id?: string | null
          target_logic?: string | null
          target_value?: number | null
          team_id: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aggregation_type?: string | null
          archived_at?: string | null
          assistant_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number | null
          formula_components?: Json | null
          id?: string
          is_formula?: boolean | null
          metric_name?: string
          owner_id?: string | null
          target_logic?: string | null
          target_value?: number | null
          team_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_required: boolean
          order_position: number
          playbook_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_required?: boolean
          order_position?: number
          playbook_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_required?: boolean
          order_position?: number
          playbook_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          dismissed_at: string | null
          id: string
          metadata: Json | null
          read_status: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          dismissed_at?: string | null
          id?: string
          metadata?: Json | null
          read_status?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          dismissed_at?: string | null
          id?: string
          metadata?: Json | null
          read_status?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offer_bonus_items: {
        Row: {
          company_id: string | null
          created_at: string | null
          delivery_format: string | null
          delivery_timing: string | null
          description: string | null
          display_order: number
          id: string
          justification: string | null
          name: string
          objection_handled: string | null
          session_id: string
          updated_at: string | null
          urgency_type: string | null
          user_id: string
          value_amount: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          delivery_format?: string | null
          delivery_timing?: string | null
          description?: string | null
          display_order?: number
          id?: string
          justification?: string | null
          name: string
          objection_handled?: string | null
          session_id: string
          updated_at?: string | null
          urgency_type?: string | null
          user_id: string
          value_amount?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          delivery_format?: string | null
          delivery_timing?: string | null
          description?: string | null
          display_order?: number
          id?: string
          justification?: string | null
          name?: string
          objection_handled?: string | null
          session_id?: string
          updated_at?: string | null
          urgency_type?: string | null
          user_id?: string
          value_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_bonus_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "offer_builder_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_builder_sections: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          section_data: Json
          section_type: string
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          section_data?: Json
          section_type: string
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          section_data?: Json
          section_type?: string
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_builder_sections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "offer_builder_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_builder_sessions: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          offer_name: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          offer_name?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          offer_name?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offer_objections: {
        Row: {
          company_id: string | null
          created_at: string | null
          display_order: number
          id: string
          is_resolved: boolean | null
          objection: string
          response_bonus: string | null
          sales_script: string | null
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_resolved?: boolean | null
          objection: string
          response_bonus?: string | null
          sales_script?: string | null
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_resolved?: boolean | null
          objection?: string
          response_bonus?: string | null
          sales_script?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_objections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "offer_builder_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chart_templates: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_global: boolean | null
          name: string
          template_data: Json
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          name: string
          template_data: Json
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_global?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      org_chart_versions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          snapshot_data: Json
          version_name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          snapshot_data: Json
          version_name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          snapshot_data?: Json
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_chart_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_chart_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_role_activity: {
        Row: {
          activity_type: string
          changed_by: string | null
          company_id: string
          created_at: string
          description: string
          id: string
          new_value: string | null
          old_value: string | null
          role_id: string
        }
        Insert: {
          activity_type: string
          changed_by?: string | null
          company_id: string
          created_at?: string
          description: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          role_id: string
        }
        Update: {
          activity_type?: string
          changed_by?: string | null
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_role_activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_role_activity_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_roles: {
        Row: {
          company_id: string
          created_at: string
          department_id: string | null
          id: string
          image_url: string | null
          personality_color: string | null
          position_x: number | null
          position_y: number | null
          reports_to_role_id: string | null
          responsibilities: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          image_url?: string | null
          personality_color?: string | null
          position_x?: number | null
          position_y?: number | null
          reports_to_role_id?: string | null
          responsibilities?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          image_url?: string | null
          personality_color?: string | null
          position_x?: number | null
          position_y?: number | null
          reports_to_role_id?: string | null
          responsibilities?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_roles_reports_to_role_id_fkey"
            columns: ["reports_to_role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_performance: {
        Row: {
          cls: number | null
          created_at: string
          fcp: number | null
          fid: number | null
          id: string
          lcp: number | null
          load_time: number
          page_path: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cls?: number | null
          created_at?: string
          fcp?: number | null
          fid?: number | null
          id?: string
          lcp?: number | null
          load_time: number
          page_path: string
          score: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cls?: number | null
          created_at?: string
          fcp?: number | null
          fid?: number | null
          id?: string
          lcp?: number | null
          load_time?: number
          page_path?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_speed_tests: {
        Row: {
          created_at: string | null
          dom_loaded_ms: number | null
          error_message: string | null
          fcp_time_ms: number | null
          id: string
          load_time_ms: number
          page_name: string
          page_route: string
          status: string | null
          test_run_id: string
          test_timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dom_loaded_ms?: number | null
          error_message?: string | null
          fcp_time_ms?: number | null
          id?: string
          load_time_ms: number
          page_name: string
          page_route: string
          status?: string | null
          test_run_id: string
          test_timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dom_loaded_ms?: number | null
          error_message?: string | null
          fcp_time_ms?: number | null
          id?: string
          load_time_ms?: number
          page_name?: string
          page_route?: string
          status?: string | null
          test_run_id?: string
          test_timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_speed_tests_test_run_id_fkey"
            columns: ["test_run_id"]
            isOneToOne: false
            referencedRelation: "speed_test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_logs: {
        Row: {
          email: string
          error_message: string | null
          id: string
          ip_address: unknown
          reset_completed_at: string | null
          reset_requested_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          reset_completed_at?: string | null
          reset_requested_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          reset_completed_at?: string | null
          reset_requested_at?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      people_analyzer_bars: {
        Row: {
          company_id: string
          core_value_name: string | null
          created_at: string | null
          id: string
          required_score: string
          score_type: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          core_value_name?: string | null
          created_at?: string | null
          id?: string
          required_score: string
          score_type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          core_value_name?: string | null
          created_at?: string | null
          id?: string
          required_score?: string
          score_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_analyzer_bars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      people_analyzer_scores: {
        Row: {
          company_id: string
          core_value_name: string | null
          created_at: string | null
          evaluated_by: string
          evaluation_date: string
          id: string
          score_type: string
          score_value: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          core_value_name?: string | null
          created_at?: string | null
          evaluated_by: string
          evaluation_date?: string
          id?: string
          score_type: string
          score_value: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          core_value_name?: string | null
          created_at?: string | null
          evaluated_by?: string
          evaluation_date?: string
          id?: string
          score_type?: string
          score_value?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_analyzer_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_analyzer_scores_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_analyzer_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_levels: {
        Row: {
          capabilities: string[]
          created_at: string
          description: string
          hierarchy_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          capabilities?: string[]
          created_at?: string
          description: string
          hierarchy_order: number
          id: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          capabilities?: string[]
          created_at?: string
          description?: string
          hierarchy_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_analytics_snapshots: {
        Row: {
          created_at: string
          id: string
          mrr: number
          onboarding_completion_percentage: number
          paid_companies: number
          potential_mrr: number
          snapshot_date: string
          total_companies: number
          total_goals: number
          total_metrics: number
          total_teams: number
          total_usage_hours: number
          total_users: number
        }
        Insert: {
          created_at?: string
          id?: string
          mrr?: number
          onboarding_completion_percentage?: number
          paid_companies: number
          potential_mrr?: number
          snapshot_date: string
          total_companies: number
          total_goals?: number
          total_metrics?: number
          total_teams?: number
          total_usage_hours?: number
          total_users?: number
        }
        Update: {
          created_at?: string
          id?: string
          mrr?: number
          onboarding_completion_percentage?: number
          paid_companies?: number
          potential_mrr?: number
          snapshot_date?: string
          total_companies?: number
          total_goals?: number
          total_metrics?: number
          total_teams?: number
          total_usage_hours?: number
          total_users?: number
        }
        Relationships: []
      }
      playbook_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string
          id: string
          plan_data: Json
          playbook_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by: string
          id?: string
          plan_data?: Json
          playbook_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          plan_data?: Json
          playbook_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "playbook_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbook_versions_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      playbooks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_template: boolean
          tags: string[] | null
          title: string
          updated_at: string
          updated_by: string | null
          version: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      process_major_steps: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          process_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          process_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          process_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_major_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "business_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_minor_steps: {
        Row: {
          created_at: string
          display_order: number | null
          hyperlink: string | null
          id: string
          major_step_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          hyperlink?: string | null
          id?: string
          major_step_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          hyperlink?: string | null
          id?: string
          major_step_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_minor_steps_major_step_id_fkey"
            columns: ["major_step_id"]
            isOneToOne: false
            referencedRelation: "process_major_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      process_page_completion: {
        Row: {
          completed_at: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_page_completion_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_page_completion_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_device_type: string | null
          full_name: string
          id: string
          last_login_at: string | null
          onboarding_completed_at: string | null
          onboarding_variant: string | null
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_device_type?: string | null
          full_name: string
          id: string
          last_login_at?: string | null
          onboarding_completed_at?: string | null
          onboarding_variant?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_device_type?: string | null
          full_name?: string
          id?: string
          last_login_at?: string | null
          onboarding_completed_at?: string | null
          onboarding_variant?: string | null
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_responses: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string
          user_progress_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_answer: string
          user_progress_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string
          user_progress_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_user_progress_id_fkey"
            columns: ["user_progress_id"]
            isOneToOne: false
            referencedRelation: "user_lesson_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      replacement_ladder_data: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_delegated: boolean
          level_id: number
          notes: string | null
          owner: string | null
          sop_link: string | null
          task_id: string
          task_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_delegated?: boolean
          level_id: number
          notes?: string | null
          owner?: string | null
          sop_link?: string | null
          task_id: string
          task_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_delegated?: boolean
          level_id?: number
          notes?: string | null
          owner?: string | null
          sop_link?: string | null
          task_id?: string
          task_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          role_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          role_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          role_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments_audit: {
        Row: {
          assignment_id: string | null
          call_stack: string | null
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          role_id: string | null
          session_info: Json | null
          trigger_source: string | null
          user_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          call_stack?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          role_id?: string | null
          session_info?: Json | null
          trigger_source?: string | null
          user_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          call_stack?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          role_id?: string | null
          session_info?: Json | null
          trigger_source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      role_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_comments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_company_filters: {
        Row: {
          created_at: string
          filter_data: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_data?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_data?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scriber_transfer_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          meeting_state_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          meeting_state_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          meeting_state_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scriber_transfer_log_meeting_state_id_fkey"
            columns: ["meeting_state_id"]
            isOneToOne: false
            referencedRelation: "meetings_state"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_blocks: {
        Row: {
          content: Json | null
          created_at: string | null
          id: string
          page_id: string
          position: number
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string | null
          id?: string
          page_id: string
          position: number
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string | null
          id?: string
          page_id?: string
          position?: number
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "sop_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "sop_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "sop_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_comments: {
        Row: {
          block_id: string | null
          content: string
          created_at: string | null
          id: string
          page_id: string
          parent_comment_id: string | null
          resolved: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          page_id: string
          parent_comment_id?: string | null
          resolved?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          page_id?: string
          parent_comment_id?: string | null
          resolved?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_comments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "sop_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "sop_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "sop_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_database_cells: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          record_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          record_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          record_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_database_cells_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "sop_database_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_database_cells_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "sop_database_records"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_database_properties: {
        Row: {
          created_at: string | null
          database_id: string
          id: string
          name: string
          options: Json | null
          position: number
          type: string
        }
        Insert: {
          created_at?: string | null
          database_id: string
          id?: string
          name: string
          options?: Json | null
          position: number
          type: string
        }
        Update: {
          created_at?: string | null
          database_id?: string
          id?: string
          name?: string
          options?: Json | null
          position?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_database_properties_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "sop_databases"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_database_records: {
        Row: {
          created_at: string | null
          created_by: string
          database_id: string
          display_order: number | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          database_id: string
          display_order?: number | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          database_id?: string
          display_order?: number | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_database_records_database_id_fkey"
            columns: ["database_id"]
            isOneToOne: false
            referencedRelation: "sop_databases"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_databases: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string
          icon: string | null
          id: string
          name: string
          page_id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by: string
          icon?: string | null
          id?: string
          name?: string
          page_id: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string
          icon?: string | null
          id?: string
          name?: string
          page_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_databases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_databases_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "sop_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_page_activity: {
        Row: {
          id: string
          last_seen_at: string | null
          page_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string | null
          page_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string | null
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sop_page_activity_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "sop_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_pages: {
        Row: {
          archived: boolean | null
          company_id: string
          cover_image: string | null
          created_at: string | null
          created_by: string
          display_order: number | null
          icon: string | null
          id: string
          is_template: boolean | null
          parent_page_id: string | null
          privacy_level: string | null
          space_id: string | null
          template_category_id: string | null
          template_description: string | null
          template_thumbnail: string | null
          template_use_count: number | null
          title: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          archived?: boolean | null
          company_id: string
          cover_image?: string | null
          created_at?: string | null
          created_by: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_template?: boolean | null
          parent_page_id?: string | null
          privacy_level?: string | null
          space_id?: string | null
          template_category_id?: string | null
          template_description?: string | null
          template_thumbnail?: string | null
          template_use_count?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          archived?: boolean | null
          company_id?: string
          cover_image?: string | null
          created_at?: string | null
          created_by?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_template?: boolean | null
          parent_page_id?: string | null
          privacy_level?: string | null
          space_id?: string | null
          template_category_id?: string | null
          template_description?: string | null
          template_thumbnail?: string | null
          template_use_count?: number | null
          title?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "sop_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_pages_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "sop_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sop_pages_template_category_id_fkey"
            columns: ["template_category_id"]
            isOneToOne: false
            referencedRelation: "sop_template_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_spaces: {
        Row: {
          archived: boolean | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sop_spaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sop_template_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      speed_test_runs: {
        Row: {
          average_load_time_ms: number
          completed_at: string | null
          completed_pages: number
          created_at: string | null
          fastest_page_route: string | null
          id: string
          slowest_page_route: string | null
          started_at: string | null
          test_duration_ms: number
          total_pages: number
          user_id: string | null
        }
        Insert: {
          average_load_time_ms: number
          completed_at?: string | null
          completed_pages: number
          created_at?: string | null
          fastest_page_route?: string | null
          id?: string
          slowest_page_route?: string | null
          started_at?: string | null
          test_duration_ms: number
          total_pages: number
          user_id?: string | null
        }
        Update: {
          average_load_time_ms?: number
          completed_at?: string | null
          completed_pages?: number
          created_at?: string | null
          fastest_page_route?: string | null
          id?: string
          slowest_page_route?: string | null
          started_at?: string | null
          test_duration_ms?: number
          total_pages?: number
          user_id?: string | null
        }
        Relationships: []
      }
      strategic_plan_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string
          id: string
          plan_data: Json
          strategic_plan_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by: string
          id?: string
          plan_data: Json
          strategic_plan_id: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string
          id?: string
          plan_data?: Json
          strategic_plan_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategic_plan_versions_strategic_plan_id_fkey"
            columns: ["strategic_plan_id"]
            isOneToOne: false
            referencedRelation: "strategic_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_plans: {
        Row: {
          company_id: string
          company_shared: boolean | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          plan_data: Json
          share_scope: string
          swot_data: Json | null
          team_id: string | null
          title: string | null
          updated_at: string
          updated_by: string
        }
        Insert: {
          company_id: string
          company_shared?: boolean | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          share_scope?: string
          swot_data?: Json | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by: string
        }
        Update: {
          company_id?: string
          company_shared?: boolean | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          plan_data?: Json
          share_scope?: string
          swot_data?: Json | null
          team_id?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategic_plans_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          extended_trial_end: string | null
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          extended_trial_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          extended_trial_end?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_read_at: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_read_at?: string | null
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_read_at?: string | null
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
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
      system_announcements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          system_version: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          system_version?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          system_version?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      system_tests: {
        Row: {
          created_at: string
          description: string | null
          duration_ms: number | null
          error_message: string | null
          executed_at: string | null
          id: string
          status: string
          test_category: string
          test_name: string
          test_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string
          test_category: string
          test_name: string
          test_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string
          test_category?: string
          test_name?: string
          test_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_goals: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          display_order: number
          id: string
          is_company_goal: boolean
          is_deleted: boolean
          owner_id: string | null
          progress: number | null
          status: string
          target_date: string | null
          team_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_company_goal?: boolean
          is_deleted?: boolean
          owner_id?: string | null
          progress?: number | null
          status?: string
          target_date?: string | null
          team_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_company_goal?: boolean
          is_deleted?: boolean
          owner_id?: string | null
          progress?: number | null
          status?: string
          target_date?: string | null
          team_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_team_goals_owner"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_goals_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_goals_audit: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string | null
          goal_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation_type: string
          session_info: Json | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          goal_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type: string
          session_info?: Json | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string | null
          goal_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type?: string
          session_info?: Json | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          auto_cleanup_at: string | null
          id: string
          is_temporary: boolean | null
          joined_at: string | null
          last_accessed_at: string | null
          team_id: string
          temp_meeting_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_cleanup_at?: string | null
          id?: string
          is_temporary?: boolean | null
          joined_at?: string | null
          last_accessed_at?: string | null
          team_id: string
          temp_meeting_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_cleanup_at?: string | null
          id?: string
          is_temporary?: boolean | null
          joined_at?: string | null
          last_accessed_at?: string | null
          team_id?: string
          temp_meeting_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          company_vote_limit: number | null
          created_at: string | null
          created_by: string
          description: string | null
          has_strategic_plan: boolean | null
          id: string
          is_leadership: boolean
          name: string
          updated_at: string | null
          vote_limit: number | null
        }
        Insert: {
          company_id: string
          company_vote_limit?: number | null
          created_at?: string | null
          created_by: string
          description?: string | null
          has_strategic_plan?: boolean | null
          id?: string
          is_leadership?: boolean
          name: string
          updated_at?: string | null
          vote_limit?: number | null
        }
        Update: {
          company_id?: string
          company_vote_limit?: number | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          has_strategic_plan?: boolean | null
          id?: string
          is_leadership?: boolean
          name?: string
          updated_at?: string | null
          vote_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_breakdown_snapshots: {
        Row: {
          active_companies: number
          company_breakdown: Json
          created_at: string
          created_by: string | null
          filters_applied: Json | null
          id: string
          snapshot_date: string
          snapshot_name: string | null
          total_hours: number
          total_users: number
        }
        Insert: {
          active_companies?: number
          company_breakdown?: Json
          created_at?: string
          created_by?: string | null
          filters_applied?: Json | null
          id?: string
          snapshot_date?: string
          snapshot_name?: string | null
          total_hours?: number
          total_users?: number
        }
        Update: {
          active_companies?: number
          company_breakdown?: Json
          created_at?: string
          created_by?: string | null
          filters_applied?: Json | null
          id?: string
          snapshot_date?: string
          snapshot_name?: string | null
          total_hours?: number
          total_users?: number
        }
        Relationships: []
      }
      user_activity_sessions: {
        Row: {
          access_mode: string | null
          company_id: string
          created_at: string
          device_type: string | null
          duration_minutes: number | null
          end_reason: string | null
          id: string
          last_heartbeat: string
          session_end: string | null
          session_start: string
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_mode?: string | null
          company_id: string
          created_at?: string
          device_type?: string | null
          duration_minutes?: number | null
          end_reason?: string | null
          id?: string
          last_heartbeat?: string
          session_end?: string | null
          session_start?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_mode?: string | null
          company_id?: string
          created_at?: string
          device_type?: string | null
          duration_minutes?: number | null
          end_reason?: string | null
          id?: string
          last_heartbeat?: string
          session_end?: string | null
          session_start?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_attributions: {
        Row: {
          created_at: string | null
          fbclid: string | null
          first_seen_at: string | null
          gclid: string | null
          id: string
          landing_page_url: string | null
          li_fat_id: string | null
          referral_source: string | null
          user_id: string
          utm_ad: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string | null
          fbclid?: string | null
          first_seen_at?: string | null
          gclid?: string | null
          id?: string
          landing_page_url?: string | null
          li_fat_id?: string | null
          referral_source?: string | null
          user_id: string
          utm_ad?: string | null
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string | null
          fbclid?: string | null
          first_seen_at?: string | null
          gclid?: string | null
          id?: string
          landing_page_url?: string | null
          li_fat_id?: string | null
          referral_source?: string | null
          user_id?: string
          utm_ad?: string | null
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      user_billing_events: {
        Row: {
          company_id: string
          created_at: string
          event_date: string
          event_type: string
          id: string
          notes: string | null
          previous_status: string | null
          triggered_by: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          event_date?: string
          event_type: string
          id?: string
          notes?: string | null
          previous_status?: string | null
          triggered_by?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          previous_status?: string | null
          triggered_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_billing_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_billing_usage: {
        Row: {
          billing_month: string
          company_id: string
          created_at: string
          days_active: number
          id: string
          prorated_amount: number
          total_days_in_month: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_month: string
          company_id: string
          created_at?: string
          days_active?: number
          id?: string
          prorated_amount?: number
          total_days_in_month: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_month?: string
          company_id?: string
          created_at?: string
          days_active?: number
          id?: string
          prorated_amount?: number
          total_days_in_month?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_billing_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_billing_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_access: {
        Row: {
          access_type: string
          company_id: string
          created_at: string
          id: string
          joined_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          company_id: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          company_id?: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lesson_progress: {
        Row: {
          assignment_id: string | null
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          quiz_score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["progress_status"]
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          quiz_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          quiz_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["progress_status"]
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          channel_email: boolean
          channel_in_app: boolean
          created_at: string
          goal_deadline_enabled: boolean
          id: string
          metric_stale_enabled: boolean
          mute_all: boolean
          quarter_halfway_enabled: boolean
          quiet_end: string | null
          quiet_start: string | null
          task_deadline_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          goal_deadline_enabled?: boolean
          id?: string
          metric_stale_enabled?: boolean
          mute_all?: boolean
          quarter_halfway_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          task_deadline_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          goal_deadline_enabled?: boolean
          id?: string
          metric_stale_enabled?: boolean
          mute_all?: boolean
          quarter_halfway_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          task_deadline_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          created_at: string
          id: string
          task_assigned_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_assigned_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_assigned_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          company_id: string
          created_at: string
          granted_at: string
          granted_by: string
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          granted_at?: string
          granted_by: string
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          granted_at?: string
          granted_by?: string
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_system_prompt: string | null
          created_at: string | null
          current_company_id: string | null
          dismissed_hints: Json | null
          goals_team_interactions: Json | null
          has_seen_desktop_hint: boolean | null
          has_seen_swipe_hint: boolean | null
          highlight_current_week: boolean | null
          id: string
          invert_org_chart_colors: boolean
          language_preference: string
          last_strategy_team_id: string | null
          metric_name_column_width: number | null
          mobile_goals_my_only: boolean | null
          mobile_issues_my_only: boolean | null
          mobile_tasks_my_only: boolean | null
          my_metrics_only: boolean | null
          onboarding_completed_companies: Json | null
          onboarding_completed_steps: Json | null
          onboarding_dismissed: boolean | null
          preferred_goals_team_id: string | null
          preferred_issues_team_id: string | null
          preferred_metrics_team_id: string | null
          preferred_tasks_team_id: string | null
          show_current_week: boolean | null
          theme_color: string | null
          theme_preference: string | null
          updated_at: string | null
          user_id: string | null
          vote_limit: number
          week_start_day: string | null
        }
        Insert: {
          ai_system_prompt?: string | null
          created_at?: string | null
          current_company_id?: string | null
          dismissed_hints?: Json | null
          goals_team_interactions?: Json | null
          has_seen_desktop_hint?: boolean | null
          has_seen_swipe_hint?: boolean | null
          highlight_current_week?: boolean | null
          id?: string
          invert_org_chart_colors?: boolean
          language_preference?: string
          last_strategy_team_id?: string | null
          metric_name_column_width?: number | null
          mobile_goals_my_only?: boolean | null
          mobile_issues_my_only?: boolean | null
          mobile_tasks_my_only?: boolean | null
          my_metrics_only?: boolean | null
          onboarding_completed_companies?: Json | null
          onboarding_completed_steps?: Json | null
          onboarding_dismissed?: boolean | null
          preferred_goals_team_id?: string | null
          preferred_issues_team_id?: string | null
          preferred_metrics_team_id?: string | null
          preferred_tasks_team_id?: string | null
          show_current_week?: boolean | null
          theme_color?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id?: string | null
          vote_limit?: number
          week_start_day?: string | null
        }
        Update: {
          ai_system_prompt?: string | null
          created_at?: string | null
          current_company_id?: string | null
          dismissed_hints?: Json | null
          goals_team_interactions?: Json | null
          has_seen_desktop_hint?: boolean | null
          has_seen_swipe_hint?: boolean | null
          highlight_current_week?: boolean | null
          id?: string
          invert_org_chart_colors?: boolean
          language_preference?: string
          last_strategy_team_id?: string | null
          metric_name_column_width?: number | null
          mobile_goals_my_only?: boolean | null
          mobile_issues_my_only?: boolean | null
          mobile_tasks_my_only?: boolean | null
          my_metrics_only?: boolean | null
          onboarding_completed_companies?: Json | null
          onboarding_completed_steps?: Json | null
          onboarding_dismissed?: boolean | null
          preferred_goals_team_id?: string | null
          preferred_issues_team_id?: string | null
          preferred_metrics_team_id?: string | null
          preferred_tasks_team_id?: string | null
          show_current_week?: boolean | null
          theme_color?: string | null
          theme_preference?: string | null
          updated_at?: string | null
          user_id?: string | null
          vote_limit?: number
          week_start_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_current_company_id_fkey"
            columns: ["current_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_preferred_metrics_team_id_fkey"
            columns: ["preferred_metrics_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_slug: string
          path_slug: string
          quiz_score: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_slug: string
          path_slug: string
          quiz_score?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_slug?: string
          path_slug?: string
          quiz_score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vto_leads: {
        Row: {
          company: string
          company_size: string
          completed_vto: boolean | null
          created_at: string
          email: string
          fbclid: string | null
          gclid: string | null
          id: string
          landing_page_url: string | null
          li_fat_id: string | null
          name: string
          referral_source: string | null
          role: string
          updated_at: string
          utm_ad: string | null
          utm_adset: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company: string
          company_size: string
          completed_vto?: boolean | null
          created_at?: string
          email: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_page_url?: string | null
          li_fat_id?: string | null
          name: string
          referral_source?: string | null
          role: string
          updated_at?: string
          utm_ad?: string | null
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company?: string
          company_size?: string
          completed_vto?: boolean | null
          created_at?: string
          email?: string
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_page_url?: string | null
          li_fat_id?: string | null
          name?: string
          referral_source?: string | null
          role?: string
          updated_at?: string
          utm_ad?: string | null
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      webhook_activity_logs: {
        Row: {
          company_id: string
          error_message: string | null
          event_type: string
          id: string
          request_payload: Json | null
          response_body: string | null
          sent_at: string
          status_code: number | null
        }
        Insert: {
          company_id: string
          error_message?: string | null
          event_type: string
          id?: string
          request_payload?: Json | null
          response_body?: string | null
          sent_at?: string
          status_code?: number | null
        }
        Update: {
          company_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          request_payload?: Json | null
          response_body?: string | null
          sent_at?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configurations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          flag_events_enabled: boolean | null
          id: string
          is_enabled: boolean
          last_test_at: string | null
          last_test_status: string | null
          task_assigned_enabled: boolean
          trial_expired_enabled: boolean
          trial_expiring_enabled: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          flag_events_enabled?: boolean | null
          id?: string
          is_enabled?: boolean
          last_test_at?: string | null
          last_test_status?: string | null
          task_assigned_enabled?: boolean
          trial_expired_enabled?: boolean
          trial_expiring_enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          flag_events_enabled?: boolean | null
          id?: string
          is_enabled?: boolean
          last_test_at?: string | null
          last_test_status?: string | null
          task_assigned_enabled?: boolean
          trial_expired_enabled?: boolean
          trial_expiring_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_metric_value_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metric_id: string
          note: string
          team_id: string
          updated_at: string
          updated_by: string | null
          week_start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          metric_id: string
          note?: string
          team_id: string
          updated_at?: string
          updated_by?: string | null
          week_start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metric_id?: string
          note?: string
          team_id?: string
          updated_at?: string
          updated_by?: string | null
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_metric_value_notes_metric_fk"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "active_weekly_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metric_value_notes_metric_fk"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "weekly_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metric_value_notes_team_fk"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_metrics: {
        Row: {
          aggregation_type: string | null
          assistant_id: string | null
          created_at: string | null
          custom_target_value: number | null
          deleted_at: string | null
          description: string | null
          formula_components: Json | null
          id: string
          is_formula: boolean | null
          metric_id: string
          metric_name: string
          metric_value: number | null
          owner_id: string | null
          target_logic: string | null
          target_note: string | null
          target_value: number | null
          team_id: string | null
          unit: string
          updated_at: string | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          aggregation_type?: string | null
          assistant_id?: string | null
          created_at?: string | null
          custom_target_value?: number | null
          deleted_at?: string | null
          description?: string | null
          formula_components?: Json | null
          id?: string
          is_formula?: boolean | null
          metric_id: string
          metric_name: string
          metric_value?: number | null
          owner_id?: string | null
          target_logic?: string | null
          target_note?: string | null
          target_value?: number | null
          team_id?: string | null
          unit: string
          updated_at?: string | null
          user_id: string
          week_start_date: string
        }
        Update: {
          aggregation_type?: string | null
          assistant_id?: string | null
          created_at?: string | null
          custom_target_value?: number | null
          deleted_at?: string | null
          description?: string | null
          formula_components?: Json | null
          id?: string
          is_formula?: boolean | null
          metric_id?: string
          metric_name?: string
          metric_value?: number | null
          owner_id?: string | null
          target_logic?: string | null
          target_note?: string | null
          target_value?: number | null
          team_id?: string | null
          unit?: string
          updated_at?: string | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_metrics_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metrics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_metrics_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          metric_id: string
          new_data: Json | null
          old_data: Json | null
          operation_type: string
          session_info: Json | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metric_id: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type: string
          session_info?: Json | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metric_id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation_type?: string
          session_info?: Json | null
        }
        Relationships: []
      }
      wiki_folders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_role_visibility: {
        Row: {
          id: string
          position_id: string | null
          role: string
          wiki_page_id: string
        }
        Insert: {
          id?: string
          position_id?: string | null
          role: string
          wiki_page_id: string
        }
        Update: {
          id?: string
          position_id?: string | null
          role?: string
          wiki_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_role_visibility_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "org_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_role_visibility_wiki_page_id_fkey"
            columns: ["wiki_page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_team_visibility: {
        Row: {
          id: string
          team_id: string
          wiki_page_id: string
        }
        Insert: {
          id?: string
          team_id: string
          wiki_page_id: string
        }
        Update: {
          id?: string
          team_id?: string
          wiki_page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_team_visibility_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_team_visibility_wiki_page_id_fkey"
            columns: ["wiki_page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_page_versions: {
        Row: {
          company_id: string
          content_blocks: Json
          created_at: string
          created_by: string | null
          id: string
          page_id: string | null
          version_number: number
        }
        Insert: {
          company_id: string
          content_blocks: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string | null
          version_number: number
        }
        Update: {
          company_id?: string
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "wiki_page_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_pages: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          category: string | null
          company_id: string
          content_blocks: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_order: number
          emoji: string | null
          folder_id: string | null
          id: string
          permissions: Json | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          visibility_type: string | null
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          category?: string | null
          company_id: string
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order: number
          emoji?: string | null
          folder_id?: string | null
          id?: string
          permissions?: Json | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          visibility_type?: string | null
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          category?: string | null
          company_id?: string
          content_blocks?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_order?: number
          emoji?: string | null
          folder_id?: string | null
          id?: string
          permissions?: Json | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          visibility_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "wiki_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_weekly_metrics: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string | null
          metric_name: string | null
          metric_value: number | null
          owner_id: string | null
          target_logic: string | null
          target_value: number | null
          team_id: string | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
          week_start_date: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          metric_name?: string | null
          metric_value?: number | null
          owner_id?: string | null
          target_logic?: string | null
          target_value?: number | null
          team_id?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string | null
          metric_name?: string | null
          metric_value?: number | null
          owner_id?: string | null
          target_logic?: string | null
          target_value?: number | null
          team_id?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_metrics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_metrics_summary: {
        Row: {
          avg_value: number | null
          earliest_week: string | null
          last_updated: string | null
          latest_week: string | null
          metric_name: string | null
          owner_id: string | null
          target_logic: string | null
          target_value: number | null
          team_id: string | null
          total_weeks: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_metrics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_metrics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_company_invitation: {
        Args: { p_company_id: string; p_email: string }
        Returns: Json
      }
      add_temporary_observer: {
        Args: { p_meeting_id: string; p_team_id: string; p_user_id: string }
        Returns: Json
      }
      admin_remove_team_member: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: Json
      }
      aggregate_usage_stats: {
        Args: { p_company_id?: string; p_date: string }
        Returns: Json
      }
      assign_playbook_to_user: {
        Args: {
          p_assigned_by: string
          p_due_date?: string
          p_notes?: string
          p_playbook_id: string
          p_user_id: string
        }
        Returns: string
      }
      auto_archive_completed_kanban_tasks: { Args: never; Returns: undefined }
      backfill_usage_stats: {
        Args: { p_end_date?: string; p_start_date: string }
        Returns: Json
      }
      bulk_delete_metrics: { Args: { metric_ids: string[] }; Returns: number }
      bulk_toggle_table_rls: {
        Args: { p_enable: boolean; p_table_names: string[] }
        Returns: Json
      }
      update_company_member_metrics_preferences: {
        Args: {
          p_company_id: string
          p_highlight_current_week?: boolean | null
          p_show_current_week?: boolean | null
        }
        Returns: {
          highlight_current_week: boolean
          show_current_week: boolean
        }[]
      }
      calculate_company_access: {
        Args: {
          p_extended_trial_end: string
          p_subscription_end: string
          p_subscription_tier: string
          p_trial_end: string
        }
        Returns: boolean
      }
      calculate_meeting_duration: {
        Args: { p_current_time?: string; p_meeting_state_id: string }
        Returns: Json
      }
      calculate_prorated_amount: {
        Args: {
          p_base_price?: number
          p_days_active: number
          p_total_days: number
        }
        Returns: number
      }
      calculate_user_active_days: {
        Args: {
          p_billing_month: string
          p_company_id: string
          p_user_id: string
        }
        Returns: number
      }
      can_leave_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      can_user_view_strategic_plans: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      cast_vote: {
        Args: {
          p_issue_id: string
          p_meeting_state_id: string
          p_team_id: string
          p_vote_value: number
        }
        Returns: Json
      }
      check_if_email_is_deleted_account: {
        Args: { p_email: string }
        Returns: boolean
      }
      check_impersonation_permission: {
        Args: { admin_user_id: string; target_user_id: string }
        Returns: boolean
      }
      check_org_management_permission: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      check_user_admin_permissions: { Args: never; Returns: boolean }
      cleanup_audit_tables_90_days: {
        Args: { p_dry_run?: boolean; p_retention_days?: number }
        Returns: Json
      }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      cleanup_temporary_observers: {
        Args: { p_meeting_id: string }
        Returns: Json
      }
      create_additional_company: {
        Args: { company_name: string; company_slug: string }
        Returns: Json
      }
      create_manual_strategic_plan_version: {
        Args: { p_change_summary?: string; p_strategic_plan_id: string }
        Returns: Json
      }
      create_user_account: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_email: string
          p_full_name: string
          p_password: string
          p_role: string
        }
        Returns: Json
      }
      create_user_first_company:
        | {
            Args: {
              company_name: string
              company_slug: string
              user_display_name?: string
            }
            Returns: Json
          }
        | {
            Args: { p_company_name: string; p_company_slug?: string }
            Returns: Json
          }
      custom_sql: {
        Args: { params?: string[]; query: string }
        Returns: {
          result: Json
        }[]
      }
      deactivate_user_account: { Args: { p_user_id: string }; Returns: Json }
      debug_meeting_auth: { Args: { p_team_id: string }; Returns: Json }
      debug_meeting_auth_enhanced: {
        Args: { p_team_id: string }
        Returns: Json
      }
      debug_password_reset_flow: { Args: { user_email: string }; Returns: Json }
      debug_user_current_company_detailed: { Args: never; Returns: Json }
      decline_company_invitation: {
        Args: { p_company_id: string; p_email: string }
        Returns: Json
      }
      delete_company_cascade: { Args: { p_company_id: string }; Returns: Json }
      delete_team_cascade: { Args: { p_team_id: string }; Returns: Json }
      enable_company_isolation_mode: { Args: never; Returns: Json }
      ensure_super_admin_team_access: { Args: never; Returns: undefined }
      fix_missing_company_memberships: { Args: never; Returns: Json }
      get_accessible_strategic_plans: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: {
          company_shared: boolean
          created_at: string
          id: string
          is_active: boolean
          team_id: string
          team_name: string
          title: string
          updated_at: string
        }[]
      }
      get_all_users_for_super_admin: {
        Args: never
        Returns: {
          avatar_url: string
          company_memberships: Json
          created_at: string
          email: string
          full_name: string
          id: string
          last_login_at: string
          primary_company_id: string
          primary_company_name: string
          role: string
          status: string
          team_memberships: Json
        }[]
      }
      get_capabilities_for_level: {
        Args: { permission_level: string }
        Returns: string[]
      }
      get_company_accessible_users: {
        Args: { include_inactive?: boolean; target_company_id: string }
        Returns: {
          access_type: string
          avatar_url: string
          capabilities: string[]
          company_memberships: Json
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          invited_at: string
          joined_at: string
          last_login_at: string
          last_reminder_sent_at: string
          permission_level: string
          primary_company_id: string
          reminder_count: number
          role: string
          status: string
          user_id: string
        }[]
      }
      get_company_accessible_users_v2: {
        Args: { target_company_id: string }
        Returns: {
          access_type: string
          avatar_url: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          permission_level: string
          role: string
        }[]
      }
      get_company_alignment_status: {
        Args: never
        Returns: {
          current_company_id: string
          current_company_name: string
          email: string
          full_name: string
          has_company_membership: boolean
          is_aligned: boolean
          profile_company_id: string
          profile_company_name: string
          user_id: string
        }[]
      }
      get_company_billable_user_count: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_company_onboarding_status: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_company_teams: {
        Args: { p_company_id: string }
        Returns: {
          created_at: string
          created_by: string
          team_description: string
          team_id: string
          team_name: string
        }[]
      }
      get_company_training_overview: {
        Args: { p_company_id: string }
        Returns: {
          assigned_at: string
          assignment_id: string
          due_date: string
          email: string
          full_name: string
          playbook_description: string
          playbook_id: string
          playbook_title: string
          progress_percentage: number
          role: string
          status: string
          user_id: string
        }[]
      }
      get_company_user_count: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_company_users_with_pending: {
        Args: { p_company_id: string }
        Returns: {
          avatar_url: string
          capabilities: string[]
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          invited_at: string
          joined_at: string
          permission_level: string
          role: string
          status: string
        }[]
      }
      get_company_users_with_permissions: {
        Args: { p_company_id: string }
        Returns: {
          avatar_url: string
          capabilities: string[]
          email: string
          email_confirmed_at: string
          full_name: string
          joined_at: string
          permission_level: string
          role: string
          user_id: string
        }[]
      }
      get_current_user_profile: { Args: never; Returns: string }
      get_dashboard_data: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: Json
      }
      get_days_in_month: { Args: { p_date: string }; Returns: number }
      get_direct_company_users: {
        Args: { target_company_id: string }
        Returns: {
          access_type: string
          avatar_url: string
          created_at: string
          email: string
          email_confirmed_at: string
          full_name: string
          id: string
          invitation_status: string
          role: string
        }[]
      }
      get_effective_vote_limit: {
        Args: {
          p_meeting_state_id?: string
          p_team_id: string
          p_user_id: string
        }
        Returns: number
      }
      get_enhanced_policies: {
        Args: never
        Returns: {
          cmd: string
          description: string
          is_enabled: boolean
          permissive: string
          policy_type: string
          policyname: string
          qual: string
          roles: string[]
          schemaname: string
          tablename: string
          with_check: string
        }[]
      }
      get_enhanced_table_info: {
        Args: never
        Returns: {
          company_isolated: boolean
          description: string
          has_data: boolean
          policy_count: number
          risk_level: string
          rls_enabled: boolean
          table_name: string
        }[]
      }
      get_impersonatable_users: {
        Args: { admin_user_id: string }
        Returns: {
          access_type: string
          avatar_url: string
          company_id: string
          company_name: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_issue_vote_count: { Args: { p_issue_id: string }; Returns: number }
      get_issue_vote_count_with_meeting: {
        Args: { p_issue_id: string; p_meeting_state_id?: string }
        Returns: number
      }
      get_issues_with_vote_counts:
        | {
            Args: { p_issue_type?: string; p_team_id: string }
            Returns: {
              archived: boolean
              created_at: string
              description: string
              id: string
              issue_type: string
              owner_id: string
              status: string
              team_id: string
              title: string
              updated_at: string
              vote_count: number
            }[]
          }
        | {
            Args: {
              p_issue_type?: string
              p_meeting_state_id?: string
              p_team_id: string
            }
            Returns: {
              archived: boolean
              created_at: string
              description: string
              id: string
              issue_type: string
              owner_id: string
              status: string
              team_id: string
              title: string
              updated_at: string
              vote_count: number
            }[]
          }
      get_next_metric_display_order: {
        Args: { p_owner_id: string; p_team_id: string }
        Returns: number
      }
      get_org_chart_visible_users: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: {
          user_id: string
        }[]
      }
      get_pending_invitations_for_email: {
        Args: { p_email: string }
        Returns: {
          company_id: string
          company_name: string
          invited_at: string
          invited_by: string
          inviter_name: string
          permission_level: string
        }[]
      }
      get_rls_policies: { Args: never; Returns: Json }
      get_rls_statistics: { Args: never; Returns: Json }
      get_stripe_mode: { Args: never; Returns: string }
      get_table_rls_status: { Args: never; Returns: Json }
      get_team_metrics_count: {
        Args: { p_team_id: string }
        Returns: {
          latest_week: string
          metric_count: number
          owner_count: number
        }[]
      }
      get_user_ai_business_context: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_assignments: {
        Args: { p_user_id: string }
        Returns: {
          assigned_at: string
          assignment_id: string
          due_date: string
          playbook_description: string
          playbook_id: string
          playbook_title: string
          progress_percentage: number
          status: string
        }[]
      }
      get_user_capabilities: {
        Args: {
          p_company_id: string
          p_permission_level: string
          p_role: string
          p_user_id: string
        }
        Returns: string[]
      }
      get_user_companies_via_company_members: {
        Args: { p_user_id: string }
        Returns: {
          company_id: string
          last_accessed_at: string
          permission_level: string
        }[]
      }
      get_user_companies_via_teams: {
        Args: { p_user_id: string }
        Returns: {
          company_id: string
          last_accessed_at: string
          permission_level: string
        }[]
      }
      get_user_company: {
        Args: { user_id_param: string }
        Returns: {
          id: string
          is_direct: boolean
          name: string
          slug: string
        }[]
      }
      get_user_company_access: {
        Args: { company_id_param: string; user_id_param: string }
        Returns: boolean
      }
      get_user_company_id: { Args: never; Returns: string }
      get_user_current_company: { Args: never; Returns: string }
      get_user_issue_votes: {
        Args: { p_issue_id: string; p_user_id: string }
        Returns: {
          vote_count: number
          vote_value: number
        }[]
      }
      get_user_most_likely_goals_team: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_user_ratings: {
        Args: { p_issue_type?: string; p_team_id: string; p_user_id: string }
        Returns: {
          issue_id: string
          rating: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role_type"][]
      }
      get_user_strategy_team_preference: { Args: never; Returns: string }
      get_user_tasks_data:
        | {
            Args: { p_company_id?: string; p_user_id: string }
            Returns: {
              count_type: string
              count_value: number
              task_assigned_to: string[]
              task_created_at: string
              task_description: string
              task_due_date: string
              task_id: string
              task_is_archived: boolean
              task_source: string
              task_status: string
              task_team_id: string
              task_title: string
              task_type: string
              task_updated_at: string
              task_user_id: string
              team_company_id: string
              team_description: string
              team_id: string
              team_name: string
              user_team_role: string
            }[]
          }
        | {
            Args: {
              p_company_id?: string
              p_show_archived?: boolean
              p_user_id: string
            }
            Returns: {
              count_type: string
              count_value: number
              task_assigned_to: string[]
              task_created_at: string
              task_description: string
              task_due_date: string
              task_id: string
              task_is_archived: boolean
              task_source: string
              task_status: string
              task_team_id: string
              task_title: string
              task_type: string
              task_updated_at: string
              task_user_id: string
              team_company_id: string
              team_description: string
              team_id: string
              team_name: string
              user_team_role: string
            }[]
          }
      get_user_team_permission: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: string
      }
      get_user_teams_for_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: {
          joined_at: string
          team_description: string
          team_id: string
          team_name: string
          user_role: string
        }[]
      }
      get_user_votes_used: {
        Args: {
          p_meeting_state_id: string
          p_team_id: string
          p_user_id: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role_type"]
          _user_id: string
        }
        Returns: boolean
      }
      has_team_manager_access: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      insert_user_attribution:
        | {
            Args: {
              p_fbclid?: string
              p_first_seen_at?: string
              p_gclid?: string
              p_landing_page_url?: string
              p_li_fat_id?: string
              p_referral_source?: string
              p_user_id: string
              p_utm_ad?: string
              p_utm_adset?: string
              p_utm_campaign?: string
              p_utm_medium?: string
              p_utm_source?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_fbclid?: string
              p_first_seen_at?: string
              p_gclid?: string
              p_landing_page_url?: string
              p_li_fat_id?: string
              p_referral_source?: string
              p_user_id: string
              p_utm_ad?: string
              p_utm_adset?: string
              p_utm_campaign?: string
              p_utm_content?: string
              p_utm_medium?: string
              p_utm_source?: string
              p_utm_term?: string
            }
            Returns: undefined
          }
      is_company_member: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_director_or_above: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_global_admin: { Args: { _user_id: string }; Returns: boolean }
      is_onboarding_completed: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_team_admin: {
        Args: { team_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { team_id_param: string; user_id_param: string }
        Returns: boolean
      }
      is_team_member_secure: {
        Args: { team_id_param: string; user_id_param?: string }
        Returns: boolean
      }
      jsonb_contains_user_id: {
        Args: { perm: Json; user_id: string }
        Returns: boolean
      }
      log_comprehensive_action: {
        Args: {
          p_action_type: string
          p_company_id?: string
          p_description: string
          p_details?: Json
          p_session_id?: string
          p_success?: boolean
          p_target_id?: string
          p_target_type?: string
          p_user_affected_id?: string
          p_user_ip_address?: unknown
        }
        Returns: undefined
      }
      propagate_leadership_dates: {
        Args: {
          p_company_id: string
          p_new_one_year_date: string
          p_new_quarterly_date: string
          p_old_one_year_date: string
          p_old_quarterly_date: string
        }
        Returns: Json
      }
      propagate_leadership_targets: {
        Args: {
          p_company_id: string
          p_new_profit_target: string
          p_new_revenue_target: string
          p_old_profit_target: string
          p_old_revenue_target: string
        }
        Returns: Json
      }
      rate_issue: {
        Args: { p_issue_id: string; p_rating: number; p_user_id: string }
        Returns: Json
      }
      refresh_weekly_metrics_summary: { Args: never; Returns: undefined }
      remove_user_from_company_teams: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: undefined
      }
      reorder_metrics: {
        Args: { p_display_orders: number[]; p_metric_ids: string[] }
        Returns: Json
      }
      reset_onboarding_completion: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Json
      }
      restore_fast_task: { Args: { p_audit_id: string }; Returns: Json }
      restore_issue: { Args: { p_audit_id: string }; Returns: Json }
      restore_team_goal: { Args: { p_audit_id: string }; Returns: Json }
      restore_weekly_metric: { Args: { p_audit_id: string }; Returns: Json }
      set_stripe_mode: { Args: { p_mode: string }; Returns: Json }
      soft_delete_metric: { Args: { metric_id: string }; Returns: boolean }
      start_company_trial: { Args: { p_company_id: string }; Returns: Json }
      toggle_individual_policy: {
        Args: { p_enable: boolean; p_policy_name: string; p_table_name: string }
        Returns: Json
      }
      toggle_table_rls: {
        Args: { p_enable: boolean; p_table_name: string }
        Returns: Json
      }
      unassign_member_from_team: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: Json
      }
      update_ai_user_preferences: {
        Args: { p_preferences: Json; p_user_id: string }
        Returns: undefined
      }
      update_company_last_accessed: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: undefined
      }
      update_goals_team_preference: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: undefined
      }
      update_marcio_to_super_admin: {
        Args: never
        Returns: {
          company_id: string
          new_permission_level: string
        }[]
      }
      update_monthly_usage: {
        Args: { p_billing_month?: string; p_company_id: string }
        Returns: Json
      }
      update_user_company_permission: {
        Args: {
          p_company_id: string
          p_permission_level: string
          p_updated_by: string
          p_user_id: string
        }
        Returns: Json
      }
      update_user_permission: {
        Args: {
          p_company_id: string
          p_field: string
          p_updated_by: string
          p_user_id: string
          p_value: string
        }
        Returns: Json
      }
      update_user_strategy_team_preference: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      upsert_user_onboarding_completion: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: Json
      }
      upsert_weekly_metric: {
        Args: {
          p_aggregation_type?: string
          p_formula_components?: Json
          p_is_formula?: boolean
          p_metric_name: string
          p_metric_value: number
          p_owner_id: string
          p_target_logic: string
          p_target_value: number
          p_team_id: string
          p_unit: string
          p_user_id: string
          p_week_start_date: string
        }
        Returns: string
      }
      upsert_weekly_metric_custom_target: {
        Args: {
          p_aggregation_type?: string
          p_custom_target_value: number
          p_formula_components?: Json
          p_is_formula?: boolean
          p_metric_name: string
          p_owner_id: string
          p_target_logic: string
          p_target_note: string
          p_target_value: number
          p_team_id: string
          p_unit: string
          p_user_id: string
          p_week_start_date: string
        }
        Returns: string
      }
      upsert_weekly_metric_custom_target_only: {
        Args: {
          p_aggregation_type?: string
          p_custom_target_value: number
          p_formula_components?: Json
          p_is_formula?: boolean
          p_metric_name: string
          p_owner_id: string
          p_target_logic: string
          p_target_value: number
          p_team_id: string
          p_unit: string
          p_user_id: string
          p_week_start_date: string
        }
        Returns: string
      }
      upsert_weekly_metric_note: {
        Args: {
          p_aggregation_type?: string
          p_formula_components?: Json
          p_is_formula?: boolean
          p_metric_name: string
          p_owner_id: string
          p_target_logic: string
          p_target_note: string
          p_target_value: number
          p_team_id: string
          p_unit: string
          p_user_id: string
          p_week_start_date: string
        }
        Returns: string
      }
      upsert_weekly_metric_value: {
        Args: {
          p_aggregation_type?: string
          p_formula_components?: Json
          p_is_formula?: boolean
          p_metric_name: string
          p_metric_value: number
          p_owner_id: string
          p_target_logic: string
          p_target_value: number
          p_team_id: string
          p_unit: string
          p_user_id: string
          p_week_start_date: string
        }
        Returns: string
      }
      user_can_access_kanban_task: {
        Args: { p_task_id: string; p_user_id: string }
        Returns: boolean
      }
      user_exists_for_invite: {
        Args: { p_invitation_token: string; p_user_email: string }
        Returns: {
          invitation_id: string
          token_valid: boolean
          user_exists: boolean
        }[]
      }
      user_has_role: { Args: { role_name: string }; Returns: boolean }
      user_has_team_access_to_goal: {
        Args: { goal_id_param: string; user_id_param: string }
        Returns: boolean
      }
      user_has_team_access_to_metric: {
        Args: { p_metric_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_team_company_access: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_company_membership_consistency: {
        Args: never
        Returns: {
          email: string
          full_name: string
          has_team_memberships: boolean
          team_companies: string[]
          user_id: string
        }[]
      }
    }
    Enums: {
      assignment_status: "assigned" | "in_progress" | "completed" | "overdue"
      block_type:
        | "text"
        | "video"
        | "file"
        | "checklist"
        | "quiz"
        | "acknowledgment"
        | "image"
      issue_type: "short_term" | "long_term"
      lesson_type: "content" | "quiz" | "acknowledgment" | "checklist"
      meeting_type: "weekly" | "quarterly" | "annual_day1" | "annual_day2"
      permission_level_enum:
        | "super_admin"
        | "director"
        | "manager"
        | "member"
        | "view-only"
        | "inactive"
      progress_status: "not_started" | "in_progress" | "completed" | "failed"
      user_role_type: "super_admin" | "super_admin_assistant" | "member"
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
    Enums: {
      assignment_status: ["assigned", "in_progress", "completed", "overdue"],
      block_type: [
        "text",
        "video",
        "file",
        "checklist",
        "quiz",
        "acknowledgment",
        "image",
      ],
      issue_type: ["short_term", "long_term"],
      lesson_type: ["content", "quiz", "acknowledgment", "checklist"],
      meeting_type: ["weekly", "quarterly", "annual_day1", "annual_day2"],
      permission_level_enum: [
        "super_admin",
        "director",
        "manager",
        "member",
        "view-only",
        "inactive",
      ],
      progress_status: ["not_started", "in_progress", "completed", "failed"],
      user_role_type: ["super_admin", "super_admin_assistant", "member"],
    },
  },
} as const
