import { useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react'
import { useSubjects } from '../hooks/useSubjects'
import { SubjectForm } from '../components/subjects/SubjectForm'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import type { Subject, SubjectFormData } from '../types'

export function SubjectsPage() {
  const { subjects, loading, addSubject, updateSubject, deleteSubject, toggleActive } = useSubjects()
  const [formOpen,     setFormOpen]     = useState(false)
  const [editTarget,   setEditTarget]   = useState<Subject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  const active   = subjects.filter(s => s.is_active)
  const inactive = subjects.filter(s => !s.is_active)

  async function handleSave(data: SubjectFormData) {
    if (editTarget) await updateSubject(editTarget.id, data)
    else            await addSubject(data)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteSubject(deleteTarget.id); setDeleteTarget(null) }
    finally { setDeleting(false) }
  }

  function openEdit(subject: Subject) { setEditTarget(subject); setFormOpen(true) }
  function openAdd()                  { setEditTarget(null);    setFormOpen(true) }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Subjects</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} total · {active.length} active
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Add Subject
        </Button>
      </div>

      {subjects.length === 0 && (
        <Card padding="lg">
          <div className="py-12 text-center">
            <span className="text-5xl">📚</span>
            <p className="mt-4 text-base font-semibold text-zinc-700 dark:text-zinc-300">No subjects yet</p>
            <p className="mt-1 text-sm text-zinc-400">Add your first subject to start tracking study time.</p>
            <Button className="mt-5" onClick={openAdd} icon={<Plus size={16} />}>Add Subject</Button>
          </div>
        </Card>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Active</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map(subject => (
              <SubjectCard key={subject.id} subject={subject} onEdit={() => openEdit(subject)} onDelete={() => setDeleteTarget(subject)} onToggle={() => toggleActive(subject.id, false)} />
            ))}
          </div>
        </section>
      )}

      {inactive.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Inactive</h2>
          <div className="grid gap-3 sm:grid-cols-2 opacity-60">
            {inactive.map(subject => (
              <SubjectCard key={subject.id} subject={subject} onEdit={() => openEdit(subject)} onDelete={() => setDeleteTarget(subject)} onToggle={() => toggleActive(subject.id, true)} inactive />
            ))}
          </div>
        </section>
      )}

      <SubjectForm open={formOpen} onClose={() => { setFormOpen(false); setEditTarget(null) }} onSave={handleSave} subject={editTarget} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Subject" maxWidth="sm">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950 mb-5">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="font-semibold">This will permanently delete "{deleteTarget?.name}"</p>
            <p className="mt-1 text-red-600 dark:text-red-400">All associated sessions and analytics data will be removed. This cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete} className="flex-1">Delete Subject</Button>
        </div>
      </Modal>
    </div>
  )
}

function SubjectCard({ subject, onEdit, onDelete, onToggle, inactive = false }: {
  subject: Subject; onEdit: () => void; onDelete: () => void; onToggle: () => void; inactive?: boolean
}) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{subject.icon}</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{subject.name}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">{subject.color}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} title={inactive ? 'Activate' : 'Deactivate'} className="p-2 rounded-lg text-zinc-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950 transition-colors">
            {inactive ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <Pencil size={16} />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}
