import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Check, BookOpen, ChevronRight } from 'lucide-react'
import { useCurriculum } from '../hooks/useCurriculum'
import { useSubjects } from '../hooks/useSubjects'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { CurriculumItem, Subject } from '../types'

// ─── Shared progress button (works standalone or in a table cell) ───────────────

function ProgressBtn({
  checked,
  color,
  label,
  onChange,
}: {
  checked: boolean
  color: string
  label: string
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onChange(!checked) }}
      title={label}
      className={[
        'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
        checked ? 'text-white' : 'border-zinc-300 dark:border-zinc-600',
      ].join(' ')}
      style={checked ? { backgroundColor: color, borderColor: color } : { color }}
    >
      {checked && <Check size={12} />}
    </button>
  )
}

// Thin wrapper for use inside a <table>
function CheckCell({
  checked, color, label, onChange,
}: {
  checked: boolean; color: string; label: string; onChange: (v: boolean) => void
}) {
  return (
    <td className="py-2.5 px-2 text-center">
      <div className="flex justify-center">
        <ProgressBtn checked={checked} color={color} label={label} onChange={onChange} />
      </div>
    </td>
  )
}

// ─── LO Row ─────────────────────────────────────────────────────────────────────

function LORow({
  lo,
  lessons,
  expanded,
  onToggleExpand,
  onToggleProgress,
  onDeleteItem,
  onAddLesson,
}: {
  lo: CurriculumItem
  lessons: CurriculumItem[]
  expanded: boolean
  onToggleExpand: () => void
  onToggleProgress: (id: string, field: 'studied' | 'reviewed' | 'solved', v: boolean) => void
  onDeleteItem: (id: string) => void
  onAddLesson: (title: string) => void
}) {
  const [showAddLesson, setShowAddLesson] = useState(false)
  const [lessonTitle, setLessonTitle] = useState('')

  // LO's own progress — always calculated from the LO's checkboxes
  const loDone = (lo.studied ? 1 : 0) + (lo.reviewed ? 1 : 0) + (lo.solved ? 1 : 0)
  const loPct = Math.round((loDone / 3) * 100)

  function handleAddLesson() {
    const t = lessonTitle.trim()
    if (!t) return
    onAddLesson(t)
    setLessonTitle('')
    setShowAddLesson(false)
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      {/* ── LO header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-3 bg-white dark:bg-zinc-900">
        {/* Expand chevron — only this triggers expand */}
        <button
          onClick={onToggleExpand}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title={expanded ? 'Collapse' : 'Expand lessons'}
        >
          <ChevronRight
            size={15}
            className={`text-zinc-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Title */}
        <span className="flex-1 font-medium text-zinc-800 dark:text-zinc-200 text-sm">
          {lo.title}
        </span>

        {/* Lessons count badge */}
        {lessons.length > 0 && (
          <span className="text-xs text-zinc-400 mr-1">
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Checkboxes — always visible on the LO itself */}
        <div className="flex items-center gap-1.5">
          <ProgressBtn
            checked={lo.studied} color="#3b82f6" label="Studied"
            onChange={v => onToggleProgress(lo.id, 'studied', v)}
          />
          <ProgressBtn
            checked={lo.reviewed} color="#f59e0b" label="Reviewed"
            onChange={v => onToggleProgress(lo.id, 'reviewed', v)}
          />
          <ProgressBtn
            checked={lo.solved} color="#10b981" label="Solved"
            onChange={v => onToggleProgress(lo.id, 'solved', v)}
          />
        </div>

        {/* LO % pill */}
        <span
          className={[
            'text-xs font-semibold px-2 py-0.5 rounded-full ml-1 w-10 text-center',
            loPct === 100
              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
              : loPct > 0
              ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
          ].join(' ')}
        >
          {loPct}%
        </span>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDeleteItem(lo.id) }}
          className="p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* ── Expanded lessons panel ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {lessons.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
                    <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400 w-8">#</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-400">Lesson</th>
                    <th className="px-2 py-2 text-xs font-semibold text-blue-500">Studied</th>
                    <th className="px-2 py-2 text-xs font-semibold text-amber-500">Reviewed</th>
                    <th className="px-2 py-2 text-xs font-semibold text-emerald-500">Solved</th>
                    <th className="px-2 py-2 text-xs font-medium text-zinc-400">%</th>
                    <th className="px-2 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson, idx) => {
                    const done =
                      (lesson.studied ? 1 : 0) +
                      (lesson.reviewed ? 1 : 0) +
                      (lesson.solved ? 1 : 0)
                    return (
                      <tr
                        key={lesson.id}
                        className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-zinc-400 text-xs">{idx + 1}</td>
                        <td className="px-2 py-2.5 text-zinc-800 dark:text-zinc-200">
                          {lesson.title}
                        </td>
                        <CheckCell
                          checked={lesson.studied} color="#3b82f6" label="Studied"
                          onChange={v => onToggleProgress(lesson.id, 'studied', v)}
                        />
                        <CheckCell
                          checked={lesson.reviewed} color="#f59e0b" label="Reviewed"
                          onChange={v => onToggleProgress(lesson.id, 'reviewed', v)}
                        />
                        <CheckCell
                          checked={lesson.solved} color="#10b981" label="Solved"
                          onChange={v => onToggleProgress(lesson.id, 'solved', v)}
                        />
                        <td className="px-2 py-2.5 text-center">
                          <span className={[
                            'text-xs font-bold',
                            done === 3 ? 'text-emerald-600 dark:text-emerald-400'
                            : done > 0 ? 'text-amber-600 dark:text-amber-400'
                            : 'text-zinc-400',
                          ].join(' ')}>
                            {Math.round((done / 3) * 100)}%
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => onDeleteItem(lesson.id)}
                            className="p-1 rounded text-zinc-300 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add lesson */}
          <div className="px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/20">
            {showAddLesson ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddLesson()
                    if (e.key === 'Escape') setShowAddLesson(false)
                  }}
                  placeholder="Lesson title…"
                  className="flex-1 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button size="sm" onClick={handleAddLesson} disabled={!lessonTitle.trim()}>Add</Button>
                <Button size="sm" variant="secondary" onClick={() => setShowAddLesson(false)}>Cancel</Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddLesson(true)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <Plus size={14} />
                Add lesson
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Subject Panel ──────────────────────────────────────────────────────────────

function SubjectPanel({
  subject,
  items,
  lessonsByLO,
  onAddLO,
  onAddLesson,
  onToggleProgress,
  onDeleteItem,
}: {
  subject: Subject
  items: CurriculumItem[]
  lessonsByLO: Map<string, CurriculumItem[]>
  onAddLO: (subjectId: string, title: string) => Promise<CurriculumItem | null>
  onAddLesson: (parentId: string, title: string) => void
  onToggleProgress: (id: string, field: 'studied' | 'reviewed' | 'solved', v: boolean) => void
  onDeleteItem: (id: string) => void
}) {
  const [expandedLOs, setExpandedLOs] = useState<Set<string>>(new Set())
  const [showAddLO, setShowAddLO] = useState(false)
  const [newLOTitle, setNewLOTitle] = useState('')
  const [addingLO, setAddingLO] = useState(false)

  const los = useMemo(
    () => items.filter(i => i.subject_id === subject.id && i.parent_id === null),
    [items, subject.id],
  )

  // Overall progress: based on LO checkboxes (each LO has 3 tasks)
  const doneTasks = los.reduce(
    (n, lo) => n + (lo.studied ? 1 : 0) + (lo.reviewed ? 1 : 0) + (lo.solved ? 1 : 0),
    0,
  )
  const totalTasks = los.length * 3
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  function toggleLO(id: string) {
    setExpandedLOs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAddLO() {
    const t = newLOTitle.trim()
    if (!t) return
    setAddingLO(true)
    const newLO = await onAddLO(subject.id, t)
    if (newLO) setExpandedLOs(prev => new Set([...prev, newLO.id]))
    setNewLOTitle('')
    setShowAddLO(false)
    setAddingLO(false)
  }

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      {los.length > 0 && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{subject.icon}</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{subject.name}</span>
            </div>
            <span className="text-sm text-zinc-500">
              {los.length} LO{los.length !== 1 ? 's' : ''} · {overallPct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%`, backgroundColor: subject.color }}
            />
          </div>
          <div className="flex gap-4 mt-2.5 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Studied
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Reviewed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Solved
            </span>
          </div>
        </Card>
      )}

      {/* LO list */}
      <div className="space-y-2">
        {los.map(lo => (
          <LORow
            key={lo.id}
            lo={lo}
            lessons={lessonsByLO.get(lo.id) ?? []}
            expanded={expandedLOs.has(lo.id)}
            onToggleExpand={() => toggleLO(lo.id)}
            onToggleProgress={onToggleProgress}
            onDeleteItem={onDeleteItem}
            onAddLesson={title => onAddLesson(lo.id, title)}
          />
        ))}

        {los.length === 0 && (
          <div className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No LOs yet — add your first learning objective below.
          </div>
        )}
      </div>

      {/* Add LO */}
      {showAddLO ? (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={newLOTitle}
            onChange={e => setNewLOTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddLO()
              if (e.key === 'Escape') setShowAddLO(false)
            }}
            placeholder="LO title (e.g. Derivatives)"
            className="flex-1 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button onClick={handleAddLO} loading={addingLO} disabled={!newLOTitle.trim()}>
            Add LO
          </Button>
          <Button variant="secondary" onClick={() => setShowAddLO(false)}>Cancel</Button>
        </div>
      ) : (
        <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setShowAddLO(true)}>
          Add LO
        </Button>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function CurriculumPage() {
  const { subjects, loading: subjectsLoading } = useSubjects()
  const { items, loading: itemsLoading, addLO, addLesson, toggleProgress, deleteItem, lessonsByLO } = useCurriculum()
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null)

  const activeSubjects = subjects.filter(s => s.is_active)
  const currentSubjectId = activeSubjectId ?? activeSubjects[0]?.id ?? null
  const currentSubject = activeSubjects.find(s => s.id === currentSubjectId) ?? null
  const loading = subjectsLoading || itemsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Curriculum</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track LOs per subject — studied · reviewed · solved
        </p>
      </div>

      {/* No active subjects */}
      {!loading && activeSubjects.length === 0 && (
        <Card padding="lg">
          <div className="py-12 text-center">
            <BookOpen size={40} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No active subjects found</p>
            <p className="text-xs text-zinc-400 mt-1">
              Add subjects from the{' '}
              <Link to="/subjects" className="text-primary-600 dark:text-primary-400 hover:underline">
                Subjects page
              </Link>
            </p>
          </div>
        </Card>
      )}

      {/* Subject tabs — progress now based on LO checkboxes */}
      {activeSubjects.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {activeSubjects.map(subject => {
            const subjectLOs = items.filter(i => i.subject_id === subject.id && i.parent_id === null)
            const done = subjectLOs.reduce(
              (n, lo) => n + (lo.studied ? 1 : 0) + (lo.reviewed ? 1 : 0) + (lo.solved ? 1 : 0),
              0,
            )
            const total = subjectLOs.length * 3
            const pct = total > 0 ? Math.round((done / total) * 100) : null
            const isActive = currentSubjectId === subject.id

            return (
              <button
                key={subject.id}
                onClick={() => setActiveSubjectId(subject.id)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                  isActive
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500',
                ].join(' ')}
                style={isActive ? { backgroundColor: subject.color, borderColor: subject.color } : {}}
              >
                <span className="text-base leading-none">{subject.icon}</span>
                {subject.name}
                {pct !== null && (
                  <span className={[
                    'text-xs font-semibold px-1.5 py-0.5 rounded-full',
                    isActive ? 'bg-white/25 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
                  ].join(' ')}>
                    {pct}%
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Active subject panel */}
      {currentSubject && !loading && (
        <SubjectPanel
          key={currentSubject.id}
          subject={currentSubject}
          items={items}
          lessonsByLO={lessonsByLO}
          onAddLO={addLO}
          onAddLesson={addLesson}
          onToggleProgress={toggleProgress}
          onDeleteItem={deleteItem}
        />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
