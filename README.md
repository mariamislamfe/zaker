# Zaker — Study Tracker

A production-ready study tracking app for students. Track study time per subject, manage breaks (prayer, meal, rest), view analytics, and compete with friends on leaderboards.

---

## Features

- **Timer System** — Per-subject timers with pause/resume. Break types: Prayer, Meal, Rest.
- **Subject Management** — Color-coded subjects with custom icons. Activate/deactivate anytime.
- **Analytics** — Daily timeline, weekly/monthly stacked bar charts, pie charts. Top subject highlights.
- **Social** — Create/join groups with invite codes. Group + global leaderboards (last 7 days).
- **Auth** — Supabase Auth (email/password). Auto-creates user profile on signup.
- **Dark/Light mode** — Syncs with OS preference, persisted in localStorage.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Styling | TailwindCSS v3 |
| Routing | React Router v6 |
| Backend | Supabase (Auth + PostgreSQL + Realtime) |
| Charts | Recharts v2 |
| Icons | Lucide React |
| Build | Vite 5 |
| Date utils | date-fns v3 |

---

## Project Structure

```
zaker/
├── src/
│   ├── components/
│   │   ├── analytics/       # TimelineView, StudyChart
│   │   ├── layout/          # Layout, Sidebar
│   │   ├── subjects/        # SubjectForm
│   │   ├── timer/           # TimerDisplay, TimerControls, BreakModal
│   │   └── ui/              # Button, Input, Modal, Card, Badge
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   ├── useTimer.ts      # Timer state machine with Supabase sync
│   │   ├── useSubjects.ts
│   │   ├── useAnalytics.ts  # Aggregated stats + timeline + daily breakdown
│   │   └── useSocial.ts     # Groups + leaderboards
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── database.types.ts
│   ├── pages/
│   │   ├── AuthPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── SubjectsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── SocialPage.tsx
│   ├── types/index.ts
│   └── utils/time.ts
├── supabase/
│   └── schema.sql           # Full DB schema + RLS + functions
└── .env.example
```

---

## Quick Start

### 1. Clone & install dependencies

```bash
git clone <your-repo>
cd zaker
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → **Run**
3. Go to **Settings → API** → copy your Project URL and anon key

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Supabase Setup Details

### Tables created by schema.sql

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` with username and display name |
| `subjects` | Study subjects per user (color, icon, active flag) |
| `sessions` | Individual study sessions (start, end, duration, status) |
| `breaks` | Breaks within sessions (prayer/meal/rest with timestamps) |
| `groups` | Study groups with auto-generated invite codes |
| `group_members` | Group membership (admin/member roles) |

### Database functions

- `get_leaderboard(days_back)` — Global top 100 users by study time
- `get_group_leaderboard(group_id, days_back)` — Per-group rankings

### Row Level Security

All tables use RLS:
- Users can only access their own data
- Group members can read each other's sessions
- Profiles are publicly readable (for leaderboards)

### Enable Realtime (optional)

The schema already runs `ALTER PUBLICATION supabase_realtime ADD TABLE ...`. Ensure Realtime is enabled for `sessions` and `group_members` in your Supabase Dashboard → Database → Replication.

---

## Deployment

### Frontend — Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Frontend — Netlify

```bash
npm run build
# Deploy the `dist/` folder
```

Add environment variables in Netlify → Site settings → Environment variables.

### Frontend — Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## Regenerate Supabase TypeScript types

```bash
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  --schema public \
  > src/lib/database.types.ts
```

---

## Development Notes

### Timer persistence
The active timer state is saved to `localStorage` (key: `zaker-timer-state`) so it survives page refreshes. On app load, the timer resumes automatically.

### Analytics
Analytics are fetched fresh on each page visit. For production scale, consider adding a materialized view or caching layer for the daily aggregations.

### Break tracking
Each break creates a `breaks` row linked to the active session. Total break time is accumulated client-side and subtracted from gross elapsed time to produce net study time.

---

## License

MIT
