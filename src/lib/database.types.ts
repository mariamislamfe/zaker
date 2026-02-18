// Auto-generated Supabase types — regenerate with:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
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
  }
}
