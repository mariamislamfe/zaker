import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import {
  EducationFields, validateEducation, type EducationValue,
} from '../components/profile/EducationFields'
import { getEducation } from '../lib/education'

function educationFromProfile(profile: Parameters<typeof getEducation>[0]): EducationValue {
  const e = getEducation(profile)
  return { level: e.level, track: e.track, university: e.university ?? '', faculty: e.faculty }
}

export function SettingsPage() {
  const { profile, updateProfile } = useAuth()

  const [nickname, setNickname] = useState(profile?.nickname ?? '')
  const [education, setEducation] = useState<EducationValue>(() => educationFromProfile(profile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // The profile arrives asynchronously after sign-in.
  useEffect(() => {
    setNickname(profile?.nickname ?? '')
    setEducation(educationFromProfile(profile))
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const eduError = validateEducation(education)
    if (eduError) { setError(eduError); return }

    const isUni = education.level === 'university'
    setSaving(true)
    try {
      await updateProfile({
        nickname: nickname.trim() || null,
        education_level: education.level,
        hs_track: isUni ? null : education.track,
        university: isUni ? education.university.trim() : null,
        faculty: isUni ? education.faculty : null,
      })
      setSaved(true)
    } catch (err) {
      // Supabase errors are plain objects with a `message`, not Error instances.
      const msg = (err as { message?: string } | null)?.message
      setError(msg ? `Failed to save settings: ${msg}` : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Your nickname and your stage decide how you appear on the ranks and which features you get.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Display name</h2>
          <Input
            label="Nickname"
            value={nickname}
            onChange={e => { setNickname(e.target.value); setSaved(false) }}
            maxLength={24}
            placeholder={profile?.username ?? ''}
            hint="Shown on every leaderboard instead of your username. Leave empty to show your username."
          />
        </Card>

        <Card padding="lg">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Education</h2>
          <EducationFields
            value={education}
            onChange={v => { setEducation(v); setSaved(false) }}
          />
        </Card>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {saved && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
        )}

        <Button type="submit" loading={saving}>Save changes</Button>
      </form>
    </div>
  )
}
