// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          hidden_from_leaderboard: boolean
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          hidden_from_leaderboard?: boolean
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          hidden_from_leaderboard?: boolean
        }
        Relationships: []
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          icon?: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          icon?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          started_at: string
          ended_at: string | null
          duration_seconds: number
          status: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number
          status?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number
          status?: string
        }
        Relationships: []
      }
      breaks: {
        Row: {
          id: string
          session_id: string
          user_id: string
          break_type: string
          started_at: string
          ended_at: string | null
          duration_seconds: number
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          break_type: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          break_type?: string
          started_at?: string
          ended_at?: string | null
          duration_seconds?: number
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          invite_code: string
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          invite_code?: string
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          invite_code?: string
          is_public?: boolean
          created_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          id: string
          user_id: string
          mode: 'stopwatch' | 'timer'
          subject: string | null
          target_seconds: number
          actual_seconds: number
          passage_count: number
          average_grade: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mode: string
          subject?: string | null
          target_seconds: number
          actual_seconds: number
          passage_count?: number
          average_grade?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mode?: string
          subject?: string | null
          target_seconds?: number
          actual_seconds?: number
          passage_count?: number
          average_grade?: number | null
          created_at?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          wake_time: string
          sleep_time: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          wake_time: string
          sleep_time: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          wake_time?: string
          sleep_time?: string
          created_at?: string
        }
        Relationships: []
      }
      curriculum_items: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          parent_id: string | null
          title: string
          studied: boolean
          reviewed: boolean
          solved: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id: string
          parent_id?: string | null
          title: string
          studied?: boolean
          reviewed?: boolean
          solved?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_id?: string
          parent_id?: string | null
          title?: string
          studied?: boolean
          reviewed?: boolean
          solved?: boolean
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      practice_passages: {
        Row: {
          id: string
          practice_session_id: string
          position: number
          grade: number
        }
        Insert: {
          id?: string
          practice_session_id: string
          position: number
          grade: number
        }
        Update: {
          id?: string
          practice_session_id?: string
          position?: number
          grade?: number
        }
        Relationships: []
      }
      urt_subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          id: string; user_id: string; title: string; description: string | null
          target_date: string | null; hours_per_day: number; subjects: Json
          is_active: boolean; created_at: string
        }
        Insert: {
          id?: string; user_id: string; title: string; description?: string | null
          target_date?: string | null; hours_per_day?: number; subjects?: Json
          is_active?: boolean; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; title?: string; description?: string | null
          target_date?: string | null; hours_per_day?: number; subjects?: Json
          is_active?: boolean; created_at?: string
        }
        Relationships: []
      }
      study_plans: {
        Row: {
          id: string; user_id: string; goal_id: string | null; title: string
          plan_type: string; start_date: string; end_date: string | null
          status: string; ai_generated: boolean; metadata: Json; created_at: string
        }
        Insert: {
          id?: string; user_id: string; goal_id?: string | null; title: string
          plan_type?: string; start_date: string; end_date?: string | null
          status?: string; ai_generated?: boolean; metadata?: Json; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; goal_id?: string | null; title?: string
          plan_type?: string; start_date?: string; end_date?: string | null
          status?: string; ai_generated?: boolean; metadata?: Json; created_at?: string
        }
        Relationships: []
      }
      plan_tasks: {
        Row: {
          id: string; plan_id: string; user_id: string; subject_id: string | null
          subject_name: string | null; title: string; description: string | null
          scheduled_date: string; scheduled_start_time: string | null
          duration_minutes: number; status: string; actual_duration_minutes: number | null
          priority: number; order_index: number; completed_at: string | null; created_at: string
        }
        Insert: {
          id?: string; plan_id: string; user_id: string; subject_id?: string | null
          subject_name?: string | null; title: string; description?: string | null
          scheduled_date: string; scheduled_start_time?: string | null
          duration_minutes?: number; status?: string; actual_duration_minutes?: number | null
          priority?: number; order_index?: number; completed_at?: string | null; created_at?: string
        }
        Update: {
          id?: string; plan_id?: string; user_id?: string; subject_id?: string | null
          subject_name?: string | null; title?: string; description?: string | null
          scheduled_date?: string; scheduled_start_time?: string | null
          duration_minutes?: number; status?: string; actual_duration_minutes?: number | null
          priority?: number; order_index?: number; completed_at?: string | null; created_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          id: string; user_id: string; report_date: string; planned_minutes: number
          actual_minutes: number; adherence_score: number; productivity_score: number
          focus_score: number; tasks_planned: number; tasks_completed: number
          insights: Json; created_at: string
        }
        Insert: {
          id?: string; user_id: string; report_date: string; planned_minutes?: number
          actual_minutes?: number; adherence_score?: number; productivity_score?: number
          focus_score?: number; tasks_planned?: number; tasks_completed?: number
          insights?: Json; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; report_date?: string; planned_minutes?: number
          actual_minutes?: number; adherence_score?: number; productivity_score?: number
          focus_score?: number; tasks_planned?: number; tasks_completed?: number
          insights?: Json; created_at?: string
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          id: string; user_id: string; insight_type: string; title: string
          content: string; priority: number; is_read: boolean; metadata: Json
          expires_at: string | null; created_at: string
        }
        Insert: {
          id?: string; user_id: string; insight_type: string; title: string
          content: string; priority?: number; is_read?: boolean; metadata?: Json
          expires_at?: string | null; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; insight_type?: string; title?: string
          content?: string; priority?: number; is_read?: boolean; metadata?: Json
          expires_at?: string | null; created_at?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          id: string; user_id: string; log_date: string
          wake_time: string | null; sleep_time: string | null
          sleep_duration_minutes: number | null; notes: string | null
          created_at: string
        }
        Insert: {
          id?: string; user_id: string; log_date: string
          wake_time?: string | null; sleep_time?: string | null
          sleep_duration_minutes?: number | null; notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string; user_id?: string; log_date?: string
          wake_time?: string | null; sleep_time?: string | null
          sleep_duration_minutes?: number | null; notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          id: string; created_at: string; title: string; content: string
          target_user_id: string | null; is_active: boolean; created_by: string | null
        }
        Insert: {
          id?: string; created_at?: string; title: string; content: string
          target_user_id?: string | null; is_active?: boolean; created_by?: string | null
        }
        Update: {
          id?: string; created_at?: string; title?: string; content?: string
          target_user_id?: string | null; is_active?: boolean; created_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_leaderboard: {
        Args: { days_back?: number }
        Returns: {
          user_id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          total_seconds: number
        }[]
      }
      get_group_leaderboard: {
        Args: { p_group_id: string; days_back?: number }
        Returns: {
          user_id: string
          username: string
          full_name: string | null
          total_seconds: number
        }[]
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
