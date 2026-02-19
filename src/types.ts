// ─── Auth & Profiles ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  hidden_from_leaderboard?: boolean
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export interface Subject {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  is_active: boolean
  created_at: string
}

export interface SubjectFormData {
  name: string
  color: string
  icon: string
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'paused' | 'completed'

export interface Session {
  id: string
  user_id: string
  subject_id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  status: SessionStatus
  subject?: Subject
}

// ─── Breaks ───────────────────────────────────────────────────────────────────

export type BreakType = 'prayer' | 'meal' | 'rest'

export interface Break {
  id: string
  session_id: string
  user_id: string
  break_type: BreakType
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

// ─── Timer State ──────────────────────────────────────────────────────────────

export interface TimerState {
  sessionId: string | null
  subjectId: string | null
  startedAt: string | null       // ISO string
  status: 'idle' | 'running' | 'on_break'
  pausedAt: string | null        // ISO when paused
  totalBreakSeconds: number      // accumulated break time
  activeBreakId: string | null
  activeBreakType: BreakType | null
  breakStartedAt: string | null
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsRange = 'day' | 'week' | 'month'

export interface SubjectStats {
  subject_id: string
  subject_name: string
  subject_color: string
  total_seconds: number
  session_count: number
}

export interface DailyStats {
  date: string
  subjects: SubjectStats[]
  total_seconds: number
}

export interface TimelineBlock {
  session_id: string
  subject_id: string
  subject_name: string
  subject_color: string
  start_minutes: number   // minutes from midnight
  duration_minutes: number
}

// ─── Social ───────────────────────────────────────────────────────────────────

export interface Group {
  id: string
  name: string
  description: string | null
  created_by: string
  invite_code: string
  is_public: boolean
  created_at: string
  member_count?: number
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  profile?: Profile
  total_study_seconds?: number
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  total_seconds: number
  rank: number
}

// ─── Practice / URT ───────────────────────────────────────────────────────────

export type PracticeMode = 'stopwatch' | 'timer'

export interface PracticeSession {
  id: string
  user_id: string
  mode: PracticeMode
  subject: string | null
  target_seconds: number
  actual_seconds: number
  passage_count: number
  average_grade: number | null
  created_at: string
}

// ─── Daily Log ─────────────────────────────────────────────────────────────────

export interface DailyLog {
  id: string
  user_id: string
  date: string       // 'yyyy-MM-dd'
  wake_time: string  // 'HH:MM:SS' from Postgres time
  sleep_time: string
  created_at: string
}

// ─── Curriculum ────────────────────────────────────────────────────────────────

export interface CurriculumItem {
  id: string
  user_id: string
  subject_id: string
  parent_id: string | null   // null = LO, set = Lesson under an LO
  title: string
  studied: boolean
  reviewed: boolean
  solved: boolean
  order_index: number
  created_at: string
}

export interface URTSubject {
  id: string
  user_id: string
  name: string
  color: string
  order_index: number
  created_at: string
}

export interface PracticePassage {
  id: string
  practice_session_id: string
  position: number
  grade: number
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark'

export interface NavItem {
  label: string
  path: string
  icon: string
}
