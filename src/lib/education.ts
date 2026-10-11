// Education model: high school (national / STEM / american) or university (+ faculty).
// Everything that depends on the student's stage/track/faculty hangs off these values,
// so new tracks or faculties only need to be added here.

import type { Profile } from '../types'

export type EducationLevel = 'high_school' | 'university'
export type HsTrack = 'national' | 'stem' | 'american'
export type Faculty = 'medicine' | 'engineering'

export const EDUCATION_LEVELS: { value: EducationLevel; label: string; ar: string }[] = [
  { value: 'high_school', label: 'High School', ar: 'ثانوي' },
  { value: 'university',  label: 'University',  ar: 'جامعة' },
]

export const HS_TRACKS: { value: HsTrack; label: string; ar: string }[] = [
  { value: 'national', label: 'National',         ar: 'ثانوية عامة' },
  { value: 'stem',     label: 'STEM',             ar: 'ستيم' },
  { value: 'american', label: 'American Diploma', ar: 'أمريكان دبلوم' },
]

export const FACULTIES: { value: Faculty; label: string; ar: string }[] = [
  { value: 'medicine',    label: 'Medicine',    ar: 'طب' },
  { value: 'engineering', label: 'Engineering', ar: 'هندسة' },
]

export function trackLabel(track: string | null | undefined) {
  return HS_TRACKS.find(t => t.value === track)?.label ?? null
}

export function facultyLabel(faculty: string | null | undefined) {
  return FACULTIES.find(f => f.value === faculty)?.label ?? null
}

// ─── Reading a profile ───────────────────────────────────────────────────────
// Accounts created before this feature have no education data: they are all STEM.

export interface Education {
  level: EducationLevel
  track: HsTrack | null
  university: string | null
  faculty: Faculty | null
}

export function getEducation(profile: Profile | null | undefined): Education {
  const level = profile?.education_level
  if (level === 'university') {
    return {
      level,
      track: null,
      university: profile?.university ?? null,
      faculty: (profile?.faculty as Faculty | null) ?? null,
    }
  }
  return {
    level: 'high_school',
    track: (profile?.hs_track as HsTrack | null) ?? 'stem',
    university: null,
    faculty: null,
  }
}

export function isStem(profile: Profile | null | undefined) {
  const e = getEducation(profile)
  return e.level === 'high_school' && e.track === 'stem'
}

// Short description shown under a student's name on leaderboards.
export function educationSummary(e: {
  education_level: string | null
  hs_track: string | null
  university: string | null
  faculty: string | null
}) {
  if (e.education_level === 'university') {
    return [e.university, facultyLabel(e.faculty)].filter(Boolean).join(' · ')
  }
  return trackLabel(e.hs_track) ?? ''
}

// ─── Egyptian universities ───────────────────────────────────────────────────
// `en` is the value stored on the profile. Search matches both English and Arabic.
// The picker also accepts free text, so a missing university is never a blocker.

export interface University { en: string; ar: string }

export const EGYPT_UNIVERSITIES: University[] = [
  // Public
  { en: 'Cairo University',               ar: 'جامعة القاهرة' },
  { en: 'Ain Shams University',           ar: 'جامعة عين شمس' },
  { en: 'Alexandria University',          ar: 'جامعة الإسكندرية' },
  { en: 'Mansoura University',            ar: 'جامعة المنصورة' },
  { en: 'Assiut University',              ar: 'جامعة أسيوط' },
  { en: 'Tanta University',               ar: 'جامعة طنطا' },
  { en: 'Zagazig University',             ar: 'جامعة الزقازيق' },
  { en: 'Helwan University',              ar: 'جامعة حلوان' },
  { en: 'Menoufia University',            ar: 'جامعة المنوفية' },
  { en: 'Minia University',               ar: 'جامعة المنيا' },
  { en: 'Benha University',               ar: 'جامعة بنها' },
  { en: 'Suez Canal University',          ar: 'جامعة قناة السويس' },
  { en: 'South Valley University',        ar: 'جامعة جنوب الوادي' },
  { en: 'Beni-Suef University',           ar: 'جامعة بني سويف' },
  { en: 'Fayoum University',              ar: 'جامعة الفيوم' },
  { en: 'Sohag University',               ar: 'جامعة سوهاج' },
  { en: 'Kafrelsheikh University',        ar: 'جامعة كفر الشيخ' },
  { en: 'Damanhour University',           ar: 'جامعة دمنهور' },
  { en: 'Aswan University',               ar: 'جامعة أسوان' },
  { en: 'Port Said University',           ar: 'جامعة بورسعيد' },
  { en: 'Damietta University',            ar: 'جامعة دمياط' },
  { en: 'Arish University',               ar: 'جامعة العريش' },
  { en: 'Luxor University',               ar: 'جامعة الأقصر' },
  { en: 'Matrouh University',             ar: 'جامعة مطروح' },
  { en: 'New Valley University',          ar: 'جامعة الوادي الجديد' },
  { en: 'Sadat City University',          ar: 'جامعة مدينة السادات' },
  { en: 'Suez University',                ar: 'جامعة السويس' },
  { en: 'Al-Azhar University',            ar: 'جامعة الأزهر' },
  { en: 'Egypt University of Informatics', ar: 'الجامعة المصرية للمعلوماتية' },
  { en: 'Egypt-Japan University of Science and Technology (E-JUST)', ar: 'الجامعة المصرية اليابانية للعلوم والتكنولوجيا' },
  { en: 'Zewail City of Science and Technology', ar: 'مدينة زويل للعلوم والتكنولوجيا' },
  { en: 'Nile University',                ar: 'جامعة النيل' },
  { en: 'Arab Academy for Science, Technology & Maritime Transport (AASTMT)', ar: 'الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري' },

  // Private / international
  { en: 'American University in Cairo (AUC)',   ar: 'الجامعة الأمريكية بالقاهرة' },
  { en: 'German University in Cairo (GUC)',     ar: 'الجامعة الألمانية بالقاهرة' },
  { en: 'British University in Egypt (BUE)',    ar: 'الجامعة البريطانية في مصر' },
  { en: 'Future University in Egypt (FUE)',     ar: 'جامعة المستقبل في مصر' },
  { en: 'French University in Egypt',           ar: 'الجامعة الفرنسية في مصر' },
  { en: 'Russian University in Cairo',          ar: 'الجامعة الروسية بالقاهرة' },
  { en: 'Egyptian Russian University',          ar: 'الجامعة المصرية الروسية' },
  { en: 'Egyptian Chinese University',          ar: 'الجامعة المصرية الصينية' },
  { en: 'Misr International University (MIU)',  ar: 'جامعة مصر الدولية' },
  { en: 'Misr University for Science and Technology (MUST)', ar: 'جامعة مصر للعلوم والتكنولوجيا' },
  { en: 'October University for Modern Sciences and Arts (MSA)', ar: 'جامعة أكتوبر للعلوم الحديثة والآداب' },
  { en: 'October 6 University',                 ar: 'جامعة 6 أكتوبر' },
  { en: 'Modern University for Technology and Information (MTI)', ar: 'الجامعة الحديثة للتكنولوجيا والمعلومات' },
  { en: 'Ahram Canadian University',            ar: 'جامعة الأهرام الكندية' },
  { en: 'Canadian International College (CIC)', ar: 'الكلية الكندية الدولية' },
  { en: 'Badr University in Cairo (BUC)',       ar: 'جامعة بدر بالقاهرة' },
  { en: 'Heliopolis University',                ar: 'جامعة هليوبوليس' },
  { en: 'Sinai University',                     ar: 'جامعة سيناء' },
  { en: 'Pharos University in Alexandria',      ar: 'جامعة فاروس بالإسكندرية' },
  { en: 'Alamein International University',     ar: 'جامعة العلمين الدولية' },
  { en: 'Galala University',                    ar: 'جامعة الجلالة' },
  { en: 'King Salman International University', ar: 'جامعة الملك سلمان الدولية' },
  { en: 'New Giza University',                  ar: 'جامعة نيو جيزة' },
  { en: 'Nahda University (NUB)',               ar: 'جامعة النهضة' },
  { en: 'Delta University for Science and Technology', ar: 'جامعة الدلتا للعلوم والتكنولوجيا' },
  { en: 'Deraya University',                    ar: 'جامعة دراية' },
  { en: 'Horus University',                     ar: 'جامعة حورس' },
  { en: 'Al-Ryada University for Science and Technology', ar: 'جامعة الريادة للعلوم والتكنولوجيا' },
  { en: 'Sphinx University',                    ar: 'جامعة سفنكس' },
  { en: 'Egyptian E-Learning University',       ar: 'الجامعة المصرية للتعلم الإلكتروني الأهلية' },
]

// Normalise Arabic for forgiving search: strip diacritics, unify alef/ya/ta-marbuta.
function normalise(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim()
}

export function searchUniversities(query: string, limit = 8): University[] {
  const q = normalise(query)
  if (!q) return EGYPT_UNIVERSITIES.slice(0, limit)
  return EGYPT_UNIVERSITIES
    .filter(u => normalise(u.en).includes(q) || normalise(u.ar).includes(q))
    .slice(0, limit)
}
