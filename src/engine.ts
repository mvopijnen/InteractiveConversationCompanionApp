import {
  QUESTIONS, TIJDSDUUR_COUNTS, FASE_LEVELS, phaseDistribution,
  type Question, type DateFaseKey, type SfeerKey, type Tijdsduur, type Phase,
} from './questions'

const USED_KEY = 'to2_used'
const FAV_KEY  = 'to2_fav'

export function getUsedIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(USED_KEY) ?? '[]')) }
  catch { return new Set() }
}

function markUsed(ids: string[]) {
  try {
    const s = getUsedIds()
    ids.forEach(id => s.add(id))
    localStorage.setItem(USED_KEY, JSON.stringify([...s]))
  } catch {}
}

export function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]') }
  catch { return [] }
}

export function toggleFavorite(id: string): boolean {
  try {
    const favs = getFavorites()
    const idx = favs.indexOf(id)
    const next = idx >= 0 ? favs.filter(f => f !== id) : [...favs, id]
    localStorage.setItem(FAV_KEY, JSON.stringify(next))
    return idx < 0
  } catch { return false }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildSession(
  fase: DateFaseKey,
  sfeer: SfeerKey,
  tijdsduur: Tijdsduur,
): Question[] {
  const total = TIJDSDUUR_COUNTS[tijdsduur]
  const dist = phaseDistribution(total)
  const used = getUsedIds()
  const faseLevel = FASE_LEVELS[fase]

  function eligible(q: Question) {
    return q.sfeer.includes(sfeer) && q.minFase <= faseLevel
  }

  function pickPhase(phase: Phase, count: number): Question[] {
    if (count === 0) return []
    const pool = QUESTIONS.filter(q => eligible(q) && q.phase === phase)
    const fresh = pool.filter(q => !used.has(q.id))
    const src = fresh.length >= count ? fresh : pool
    return shuffle(src).slice(0, count)
  }

  const session: Question[] = []
  for (let p = 1; p <= 6; p++) {
    session.push(...pickPhase(p as Phase, dist[p - 1]))
  }

  if (session.length === 0) {
    // Fallback: sfeer-agnostic selection
    const fallback = shuffle(QUESTIONS.filter(q => q.minFase <= faseLevel)).slice(0, total)
    markUsed(fallback.map(q => q.id))
    return fallback
  }

  markUsed(session.map(q => q.id))
  return session
}
