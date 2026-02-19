import React, { useState, useMemo } from 'react'
import { Plus, Trash2, Check, BookOpen } from 'lucide-react'
import { useCurriculum } from '../hooks/useCurriculum'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { CurriculumItem } from '../types'

// ─── Checkbox cell ─────────────────────────────────────────────────────────────

function CheckCell({
  checked,
  label,
  color,
  onChange,
}: {
  checked: boolean
  label: string
  color: string
  onChange: (v: boolean) => void
}) {
  return (
    <td className="py-2.5 px-2 text-center">
      <button
        onClick={() => onChange(!checked)}
        title={label}
        className={[
          'w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all',
          checked
            ? `border-transparent text-white`
            : 'border-zinc-300 dark:border-zinc-600 hover:border-current',
        ].join(' ')}
        style={checked ? { backgroundColor: color, borderColor: color } : { color }}
      >
        {checked && <Check size={12} />}
      </button>
    </td>
  )
}

// ─── Chapter table ──────────────────────────────────────────────────────────────

function ChapterTable({
  chapter,
  items,
  onToggle,
  onDelete,
}: {
  chapter: string
  items: CurriculumItem[]
  onToggle: (id: string, field: 'studied' | 'reviewed' | 'solved', v: boolean) => void
  onDelete: (id: string) => void
}) {
  const done = items.reduce(
    (n, i) => n + (i.studied ? 1 : 0) + (i.reviewed ? 1 : 0) + (i.solved ? 1 : 0),
    0,
  )
  const total = items.length * 3
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Card padding="lg">
      {/* Chapter header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {chapter || 'General'}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {done}/{total} ({pct}%)
          </span>
          <div className="w-20 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-left py-2 pr-3 text-xs font-medium text-zinc-400 w-6">#</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-400">Title / LO</th>
              <th className="py-2 px-2 text-xs font-medium text-zinc-400 whitespace-nowrap">
                <span className="text-blue-500">Studied</span>
              </th>
              <th className="py-2 px-2 text-xs font-medium text-zinc-400 whitespace-nowrap">
                <span className="text-amber-500">Reviewed</span>
              </th>
              <th className="py-2 px-2 text-xs font-medium text-zinc-400 whitespace-nowrap">
                <span className="text-emerald-500">Solved</span>
              </th>
              <th className="py-2 px-2 text-xs font-medium text-zinc-400">%</th>
              <th className="py-2 pl-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const itemDone =
                (item.studied ? 1 : 0) + (item.reviewed ? 1 : 0) + (item.solved ? 1 : 0)
              const itemPct = Math.round((itemDone / 3) * 100)
              return (
                <tr
                  key={item.id}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-2.5 pr-3 text-zinc-400 text-xs">{idx + 1}</td>
                  <td className="py-2.5 pr-4 font-medium text-zinc-800 dark:text-zinc-200">
                    {item.title}
                  </td>
                  <CheckCell
                    checked={item.studied}
                    label="Studied"
                    color="#3b82f6"
                    onChange={v => onToggle(item.id, 'studied', v)}
                  />
                  <CheckCell
                    checked={item.reviewed}
                    label="Reviewed"
                    color="#f59e0b"
                    onChange={v => onToggle(item.id, 'reviewed', v)}
                  />
                  <CheckCell
                    checked={item.solved}
                    label="Solved"
                    color="#10b981"
                    onChange={v => onToggle(item.id, 'solved', v)}
                  />
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={[
                        'text-xs font-bold',
                        itemPct === 100
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : itemPct > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-zinc-400',
                      ].join(' ')}
                    >
                      {itemPct}%
                    </span>
                  </td>
                  <td className="py-2.5 pl-2">
                    <button
                      onClick={() => onDelete(item.id)}
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
    </Card>
  )
}

// ─── Add Item Form ──────────────────────────────────────────────────────────────

function AddItemForm({
  defaultSubject,
  subjectNames,
  onAdd,
  onCancel,
}: {
  defaultSubject: string
  subjectNames: string[]
  onAdd: (subject: string, chapter: string | null, title: string) => Promise<void>
  onCancel: () => void
}) {
  const [subject, setSubject] = useState(defaultSubject)
  const [chapter, setChapter] = useState('')
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const canAdd = subject.trim().length > 0 && title.trim().length > 0

  async function handleAdd() {
    if (!canAdd) return
    setAdding(true)
    await onAdd(subject.trim(), chapter.trim() || null, title.trim())
    setTitle('')
    setChapter('')
    setAdding(false)
  }

  return (
    <Card padding="lg">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
        Add Curriculum Item
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Math"
            list="curr-subject-suggestions"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <datalist id="curr-subject-suggestions">
            {subjectNames.map(n => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            Chapter <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            value={chapter}
            onChange={e => setChapter(e.target.value)}
            placeholder="e.g. Chapter 3"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1 block">
            Title / LO <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Newton's 2nd Law"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={handleAdd} loading={adding} disabled={!canAdd}>
          Add
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function CurriculumPage() {
  const { items, loading, addItem, toggleProgress, deleteItem, subjectNames } = useCurriculum()
  const [activeSubject, setActiveSubject] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Default to first available subject
  const currentSubject = activeSubject ?? subjectNames[0] ?? null

  // Items for the active subject
  const subjectItems = items.filter(i => i.subject_name === currentSubject)

  // Group by chapter (null → '')
  const chapters = useMemo(() => {
    const map = new Map<string, CurriculumItem[]>()
    for (const item of subjectItems) {
      const key = item.chapter ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [subjectItems])

  // Overall progress for current subject
  const totalTasks = subjectItems.length * 3
  const doneTasks = subjectItems.reduce(
    (n, i) => n + (i.studied ? 1 : 0) + (i.reviewed ? 1 : 0) + (i.solved ? 1 : 0),
    0,
  )
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  async function handleAdd(subject: string, chapter: string | null, title: string) {
    const newItem = await addItem({ subject_name: subject, chapter, title })
    if (newItem && subject !== currentSubject) {
      setActiveSubject(subject)
    }
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Curriculum</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Track your LOs and chapters with studied · reviewed · solved
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowAddForm(v => !v)}>
          Add Item
        </Button>
      </div>

      {/* Subject Tabs */}
      {subjectNames.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {subjectNames.map(name => {
            const sItems = items.filter(i => i.subject_name === name)
            const sDone = sItems.reduce(
              (n, i) => n + (i.studied ? 1 : 0) + (i.reviewed ? 1 : 0) + (i.solved ? 1 : 0),
              0,
            )
            const sTotal = sItems.length * 3
            const sPct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0
            const isActive = currentSubject === name
            return (
              <button
                key={name}
                onClick={() => setActiveSubject(name)}
                className={[
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all',
                  isActive
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-primary-400 dark:hover:border-primary-600',
                ].join(' ')}
              >
                {name}
                <span
                  className={[
                    'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    isActive
                      ? 'bg-primary-500 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
                  ].join(' ')}
                >
                  {sPct}%
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <AddItemForm
          defaultSubject={currentSubject ?? ''}
          subjectNames={subjectNames}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Empty state */}
      {!loading && subjectNames.length === 0 && !showAddForm && (
        <Card padding="lg">
          <div className="py-12 text-center">
            <BookOpen size={40} className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              No curriculum items yet
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Add subjects and chapters to track your study progress
            </p>
            <Button
              className="mt-4"
              icon={<Plus size={16} />}
              onClick={() => setShowAddForm(true)}
            >
              Add First Item
            </Button>
          </div>
        </Card>
      )}

      {/* Subject content */}
      {currentSubject && subjectItems.length > 0 && (
        <div className="space-y-4">
          {/* Overall progress bar */}
          <Card padding="lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{currentSubject}</h2>
              <span className="text-sm text-zinc-500">
                {doneTasks}/{totalTasks} tasks · {overallPct}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-zinc-500">
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

          {/* Chapter tables */}
          {[...chapters.entries()].map(([chapter, chItems]) => (
            <ChapterTable
              key={chapter}
              chapter={chapter}
              items={chItems}
              onToggle={toggleProgress}
              onDelete={deleteItem}
            />
          ))}
        </div>
      )}

      {/* Subject exists but empty (all items deleted) */}
      {currentSubject && subjectItems.length === 0 && !loading && subjectNames.length > 0 && !showAddForm && (
        <Card padding="lg">
          <div className="py-8 text-center">
            <p className="text-sm text-zinc-400">No items in {currentSubject} yet.</p>
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              icon={<Plus size={14} />}
              onClick={() => setShowAddForm(true)}
            >
              Add Item
            </Button>
          </div>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-40 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
