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

// ─── AI / Planner ─────────────────────────────────────────────────────────────

export interface UserGoal {
  id: string
  user_id: string
  title: string
  description: string | null
  target_date: string | null   // 'yyyy-MM-dd'
  hours_per_day: number
  subjects: string[]           // array of subject_ids (stored as jsonb)
  is_active: boolean
  created_at: string
}

export interface StudyPlan {
  id: string
  user_id: string
  goal_id: string | null
  title: string
  plan_type: 'daily' | 'weekly' | 'custom'
  start_date: string
  end_date: string | null
  status: 'active' | 'completed' | 'abandoned'
  ai_generated: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface PlanTask {
  id: string
  plan_id: string
  user_id: string
  subject_id: string | null
  subject_name: string | null
  title: string
  description: string | null
  scheduled_date: string          // 'yyyy-MM-dd'
  scheduled_start_time: string | null  // 'HH:mm'
  duration_minutes: number
  status: 'pending' | 'completed' | 'skipped' | 'in_progress'
  actual_duration_minutes: number | null
  priority: number                // 1=low 2=medium 3=high
  order_index: number
  completed_at: string | null
  created_at: string
}

export interface DailyReport {
  id: string
  user_id: string
  report_date: string
  planned_minutes: number
  actual_minutes: number
  adherence_score: number
  productivity_score: number
  focus_score: number
  tasks_planned: number
  tasks_completed: number
  insights: string[]
  created_at: string
}

export interface AIInsight {
  id: string
  user_id: string
  insight_type: 'recommendation' | 'warning' | 'achievement' | 'pattern'
  title: string
  content: string
  priority: number
  is_read: boolean
  metadata: Record<string, unknown>
  expires_at: string | null
  created_at: string
}

export interface SleepLog {
  id: string
  user_id: string
  log_date: string               // 'yyyy-MM-dd'
  wake_time: string | null       // ISO timestamptz — logged when user wakes up
  sleep_time: string | null      // ISO timestamptz — logged when user goes to sleep
  sleep_duration_minutes: number | null  // auto-calculated on sleep log
  notes: string | null
  created_at: string
}

// ─── UI ───────────────────────────────────────────────────────────────────────

export type Theme = 'light' | 'dark'

export interface NavItem {
  label: string
  path: string
  icon: string
}
