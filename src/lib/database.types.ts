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
          subject_name: string
          chapter: string | null
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
          subject_name: string
          chapter?: string | null
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
          subject_name?: string
          chapter?: string | null
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
