// ── Tussen Ons — Library session engine ───────────────────────────────────────
// Implements the full selection hierarchy from the import specification:
//   dating_stage → sphere → duration → blueprint → content_type →
//   session_position → intensity → energy → topic → repeat_group → history
//
// Content governance: engine selects only; it NEVER generates or rewrites items.

import type { SfeerKey, Tijdsduur, Question } from './questions'
import {
  type LibraryItem, type ContentTypeCode, type SphereCode,
  EERSTE_ONTMOETING_ITEMS, EERSTE_ONTMOETING_CONFIG,
  SFEER_TO_SPHERE, CTYPE_TO_QTYPE,
} from './library'

// ── Storage keys ───────────────────────────────────────────────────────────────

const PAIR_SEEN_KEY = 'to2_em_pair_seen'
const USER_SEEN_KEY = 'to2_em_user_seen'
const SESS_KEY      = 'to2_em_session'    // sessionStorage — clears on tab close

// ── Session state (in-memory within a tab) ────────────────────────────────────

interface SessionState {
  seen_ids:           string[]
  seen_repeat_groups: string[]
  seen_topics:        string[]
  round:              number
}

function getSessionState(): SessionState {
  try {
    const raw = sessionStorage.getItem(SESS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { seen_ids: [], seen_repeat_groups: [], seen_topics: [], round: 0 }
}

function saveSessionState(s: SessionState) {
  try { sessionStorage.setItem(SESS_KEY, JSON.stringify(s)) } catch {}
}

export function resetSessionState() {
  try { sessionStorage.removeItem(SESS_KEY) } catch {}
}

// ── Pair / user history (persisted across sessions) ───────────────────────────

function getPairSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PAIR_SEEN_KEY) ?? '[]')) }
  catch { return new Set() }
}

function getUserSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(USER_SEEN_KEY) ?? '[]')) }
  catch { return new Set() }
}

function persistSeen(ids: string[]) {
  try {
    const pair = getPairSeen()
    const user = getUserSeen()
    ids.forEach(id => { pair.add(id); user.add(id) })
    localStorage.setItem(PAIR_SEEN_KEY, JSON.stringify([...pair]))
    localStorage.setItem(USER_SEEN_KEY, JSON.stringify([...user]))
  } catch {}
}

// ── Approved content pool ─────────────────────────────────────────────────────

function approved(): LibraryItem[] {
  return EERSTE_ONTMOETING_ITEMS.filter(i => i.quality_status === 'approved' && i.active)
}

export function hasApprovedContent(): boolean {
  return approved().length > 0
}

// ── Scoring (higher = better candidate) ──────────────────────────────────────

function score(
  item: LibraryItem,
  state: SessionState,
  pairSeen: Set<string>,
  userSeen: Set<string>,
): number {
  let s = 0
  if (!pairSeen.has(item.id))                          s += 40  // never seen by this pair
  if (!userSeen.has(item.id))                          s += 20  // never seen by this user
  if (!state.seen_repeat_groups.includes(item.repeat_group)) s += 15
  if (!state.seen_topics.includes(item.topic))         s += 10
  s += Math.random() * 4  // small jitter — prevents full determinism after filtering
  return s
}

// ── Single-slot picker ────────────────────────────────────────────────────────

function pickSlot(
  contentType: ContentTypeCode,
  primarySphere: SphereCode,
  exclude: Set<string>,
  usedRepeatGroupsThisRound: Set<string>,
  state: SessionState,
  pairSeen: Set<string>,
  userSeen: Set<string>,
): LibraryItem | null {
  const pool = approved().filter(i =>
    i.content_type === contentType &&
    !exclude.has(i.id) &&
    !usedRepeatGroupsThisRound.has(i.repeat_group),
  )

  if (pool.length === 0) return null

  // Selection hierarchy: primary sphere → compatible spheres → any matching type
  const primary    = pool.filter(i => i.sphere === primarySphere)
  const compatible = pool.filter(i => i.compatible_spheres?.includes(primarySphere))
  const candidates = primary.length > 0 ? primary : compatible.length > 0 ? compatible : pool

  return candidates.reduce((best, item) =>
    score(item, state, pairSeen, userSeen) > score(best, state, pairSeen, userSeen) ? item : best,
  )
}

// ── Blueprint runner ──────────────────────────────────────────────────────────

function runBlueprint(
  blueprint: ContentTypeCode[],
  sphere: SphereCode,
  state: SessionState,
): { items: LibraryItem[]; nextState: SessionState } {
  const pairSeen    = getPairSeen()
  const userSeen    = getUserSeen()
  const excludeIds  = new Set<string>(state.seen_ids)
  const roundGroups = new Set<string>()

  const items: LibraryItem[] = []

  for (const slot of blueprint) {
    const item = pickSlot(slot, sphere, excludeIds, roundGroups, state, pairSeen, userSeen)
    if (item) {
      items.push(item)
      excludeIds.add(item.id)
      if (item.repeat_group) roundGroups.add(item.repeat_group)
    }
  }

  const nextState: SessionState = {
    seen_ids:           [...state.seen_ids, ...items.map(i => i.id)],
    seen_repeat_groups: [
      ...state.seen_repeat_groups,
      ...items.map(i => i.repeat_group).filter(g => g && !state.seen_repeat_groups.includes(g)),
    ],
    seen_topics: [
      ...state.seen_topics,
      ...items.map(i => i.topic).filter(t => t && !state.seen_topics.includes(t)),
    ],
    round: state.round + 1,
  }

  return { items, nextState }
}

// ── LibraryItem → Question adapter ────────────────────────────────────────────

function toQuestion(item: LibraryItem): Question {
  return {
    id:       item.id,
    text:     item.text,
    type:     CTYPE_TO_QTYPE[item.content_type],
    sfeer:    ['lachen', 'kennen', 'flirten', 'dieper', 'verrassend'],
    minFase:  1,
    phase:    Math.min(item.intensity * 2, 6) as 1 | 2 | 3 | 4 | 5 | 6,
    choiceA:  item.choiceA,
    choiceB:  item.choiceB,
    followUp: item.follow_up,
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

function chooseBlueprint(blueprints: ContentTypeCode[][], round: number): ContentTypeCode[] {
  return blueprints[round % blueprints.length]
}

/**
 * Build the first session (or next round for unlimited).
 * Persists history and updates session state.
 */
export function buildLibrarySession(sfeer: SfeerKey, tijdsduur: Tijdsduur): Question[] {
  if (!hasApprovedContent()) return []

  const sphere  = SFEER_TO_SPHERE[sfeer]
  const config  = EERSTE_ONTMOETING_CONFIG
  const state   = getSessionState()

  let blueprint: ContentTypeCode[]
  if (tijdsduur === '5min') {
    blueprint = chooseBlueprint(config.blueprints['5_min'], state.round)
  } else if (tijdsduur === '15min') {
    blueprint = chooseBlueprint(config.blueprints['15_min'], state.round)
  } else if (tijdsduur === '30min') {
    blueprint = chooseBlueprint(config.blueprints['30_min'], state.round)
  } else {
    // unlimited: use the round-based rotating blueprints
    blueprint = chooseBlueprint(config.blueprints.unlimited_rounds, state.round)
  }

  const { items, nextState } = runBlueprint(blueprint, sphere, state)
  saveSessionState(nextState)
  persistSeen(items.map(i => i.id))
  return items.map(toQuestion)
}

/**
 * Build the next round for unlimited mode.
 * Called after the user taps "Volgende ronde".
 */
export function buildNextRound(sfeer: SfeerKey): Question[] {
  if (!hasApprovedContent()) return []

  const sphere  = SFEER_TO_SPHERE[sfeer]
  const state   = getSessionState()
  const config  = EERSTE_ONTMOETING_CONFIG
  const blueprint = chooseBlueprint(config.blueprints.unlimited_rounds, state.round)

  const { items, nextState } = runBlueprint(blueprint, sphere, state)
  saveSessionState(nextState)
  persistSeen(items.map(i => i.id))
  return items.map(toQuestion)
}

/** Round number within current tab session (0-based) */
export function currentRound(): number {
  return getSessionState().round
}
