import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  EDUCATION_LEVELS, HS_TRACKS, FACULTIES, searchUniversities,
  type EducationLevel, type HsTrack, type Faculty,
} from '../../lib/education'

export interface EducationValue {
  level: EducationLevel | null
  track: HsTrack | null
  university: string
  faculty: Faculty | null
}

export const EMPTY_EDUCATION: EducationValue = {
  level: null, track: null, university: '', faculty: null,
}

// Returns an error message, or null when the selection is complete.
export function validateEducation(v: EducationValue): string | null {
  if (!v.level) return 'Choose High School or University.'
  if (v.level === 'high_school' && !v.track) return 'Choose your high school track.'
  if (v.level === 'university') {
    if (!v.university.trim()) return 'Choose your university.'
    if (!v.faculty) return 'Choose your faculty.'
  }
  return null
}

const LABEL = 'text-sm font-medium text-zinc-700 dark:text-zinc-300'

function OptionGrid<T extends string>({
  options, value, onChange, cols,
}: {
  options: { value: T; label: string; ar: string }[]
  value: T | null
  onChange: (v: T) => void
  cols: string
}) {
  return (
    <div className={`grid gap-2 ${cols}`}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            'px-3 py-2 rounded-lg border text-sm text-left transition-colors',
            value === o.value
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400',
          ].join(' ')}
        >
          <span className="font-medium">{o.label}</span>
          <span className="block text-xs text-zinc-400" dir="rtl">{o.ar}</span>
        </button>
      ))}
    </div>
  )
}

// Type a few letters, pick from the list. Free text is accepted too.
function UniversityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const results = searchUniversities(query)
  const typed = query.trim()
  const exact = results.some(u => u.en.toLowerCase() === typed.toLowerCase())

  function pick(v: string) {
    onChange(v)
    setQuery(v)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Start typing… e.g. Cairo, عين شمس"
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 pl-3 pr-9 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />

      {open && (results.length > 0 || typed) && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1">
          {results.map(u => (
            <li key={u.en}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(u.en)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-zinc-800 dark:text-zinc-100">{u.en}</span>
                  <span className="block text-xs text-zinc-400" dir="rtl">{u.ar}</span>
                </span>
                {value === u.en && <Check size={14} className="text-primary-500 shrink-0" />}
              </button>
            </li>
          ))}
          {typed && !exact && (
            <li>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => pick(typed)}
                className="w-full px-3 py-2 text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Use “{typed}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function EducationFields({
  value, onChange,
}: {
  value: EducationValue
  onChange: (v: EducationValue) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className={LABEL}>Stage</span>
        <OptionGrid
          options={EDUCATION_LEVELS}
          value={value.level}
          cols="grid-cols-2"
          onChange={level => onChange({ ...value, level })}
        />
      </div>

      {value.level === 'high_school' && (
        <div className="space-y-1.5">
          <span className={LABEL}>Track</span>
          <OptionGrid
            options={HS_TRACKS}
            value={value.track}
            cols="grid-cols-1 sm:grid-cols-3"
            onChange={track => onChange({ ...value, track })}
          />
        </div>
      )}

      {value.level === 'university' && (
        <>
          <div className="space-y-1.5">
            <span className={LABEL}>University</span>
            <UniversityPicker
              value={value.university}
              onChange={university => onChange({ ...value, university })}
            />
          </div>
          <div className="space-y-1.5">
            <span className={LABEL}>Faculty</span>
            <OptionGrid
              options={FACULTIES}
              value={value.faculty}
              cols="grid-cols-2"
              onChange={faculty => onChange({ ...value, faculty })}
            />
          </div>
        </>
      )}
    </div>
  )
}
