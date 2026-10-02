// ── Tussen Ons — Library session engine ───────────────────────────────────────
//
// Selection order (per spec):
//   dating_stage → sphere → duration_fit → blueprint slot → subtype →
//   session_position → intensity → energy → topic → repeat_group → history
//
// Seen-marking: cards are only marked seen when actually SHOWN to the user.
// buildLibrarySession / buildNextRound do NOT mark anything as seen.
// Call markCardSeen(id) from the UI layer when a card is displayed.
//
// Content governance: this engine NEVER generates or rewrites content.

import type { SfeerKey, Tijdsduur, Question, DateFaseKey } from './questions'
import {
  type LibraryItem, type ContentTypeCode, type DurationKey,
  type PrimarySphere, type Intensity, type SessionPosition,
  EERSTE_ONTMOETING_ITEMS, EEN_PAAR_DATES_ITEMS, EERSTE_ONTMOETING_CONFIG,
  SFEER_TO_PRIMARY_SPHERE, SUBTYPE_TO_QTYPE, INTENSITY_TO_PHASE,
  SLOT_CRITERIA,
} from './library'

// ── Storage keys ───────────────────────────────────────────────────────────────

const PAIR_SEEN_KEY  = 'to2_em_pair_seen'     // localStorage — persists across sessions
const USER_SEEN_KEY  = 'to2_em_user_seen'     // localStorage — per device
const SESS_STATE_KEY = 'to2_em_session'       // sessionStorage — clears on tab close

// ── Session state ─────────────────────────────────────────────────────────────
// Tracks what has been selected (not necessarily shown) within the current tab session.
// Used to prevent repeat_groups and topics from repeating within a session.

interface SessionState {
  selected_ids:         string[]      // all IDs selected this session (shown or not)
  seen_repeat_groups:   string[]      // repeat_groups selected this session
  seen_topics:          string[]      // topics selected this session
  last_energy:          string        // energy of last selected item (for spread)
  intensity_history:    Intensity[]   // ordered intensity of selected items
  round:                number        // current round index (for unlimited rotation)
  fase:                 DateFaseKey   // stored so buildNextRound uses the correct library
}

function emptySessionState(): SessionState {
  return {
    selected_ids:       [],
    seen_repeat_groups: [],
    seen_topics:        [],
    last_energy:        '',
    intensity_history:  [],
    round:              0,
    fase:               'eerste',
  }
}

function getSessionState(): SessionState {
  try {
    const raw = sessionStorage.getItem(SESS_STATE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return emptySessionState()
}

function saveSessionState(s: SessionState) {
  try { sessionStorage.setItem(SESS_STATE_KEY, JSON.stringify(s)) } catch {}
}

export function resetSessionState() {
  try { sessionStorage.removeItem(SESS_STATE_KEY) } catch {}
}

// ── Pair / user seen history (persisted, updated only on actual display) ───────

function getPairSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PAIR_SEEN_KEY) ?? '[]')) }
  catch { return new Set() }
}

function getUserSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(USER_SEEN_KEY) ?? '[]')) }
  catch { return new Set() }
}

/**
 * Mark a single card as seen by this pair and user.
 * Call this from the UI when a card is first displayed — not at session build time.
 */
export function markCardSeen(id: string) {
  try {
    const pair = getPairSeen()
    const user = getUserSeen()
    pair.add(id)
    user.add(id)
    localStorage.setItem(PAIR_SEEN_KEY, JSON.stringify([...pair]))
    localStorage.setItem(USER_SEEN_KEY, JSON.stringify([...user]))
  } catch {}
}

// ── Approved content pool — per datefase ──────────────────────────────────────

function itemsForFase(fase: DateFaseKey): LibraryItem[] {
  if (fase === 'paar_dates') return EEN_PAAR_DATES_ITEMS
  return EERSTE_ONTMOETING_ITEMS   // 'eerste' and any other future fase using this engine
}

function approved(fase: DateFaseKey): LibraryItem[] {
  return itemsForFase(fase).filter(i => i.quality_status === 'approved' && i.active)
}

export function hasApprovedContent(fase: DateFaseKey = 'eerste'): boolean {
  return approved(fase).length > 0
}

// ── Duration key helper ───────────────────────────────────────────────────────

function toDurationKey(tijdsduur: Tijdsduur): DurationKey {
  const map: Record<Tijdsduur, DurationKey> = {
    '5min':      '5',
    '15min':     '15',
    '30min':     '30',
    'onbeperkt': 'unlimited',
  }
  return map[tijdsduur]
}

// ── Intensity flow guard ──────────────────────────────────────────────────────
// Returns a penalty score when placing an item would violate the light → medium arc.

const INTENSITY_ORDER: Record<Intensity, number> = { light: 0, light_medium: 1, medium: 2 }

function intensityPenalty(
  candidateIntensity: Intensity,
  intensityHistory: Intensity[],
): number {
  if (intensityHistory.length === 0) {
    // First item — strongly prefer light
    return candidateIntensity === 'light' ? 0 : candidateIntensity === 'light_medium' ? -6 : -14
  }

  const lastTwo = intensityHistory.slice(-2)
  const lastIntensityOrder = INTENSITY_ORDER[lastTwo[lastTwo.length - 1]]
  const candidateOrder     = INTENSITY_ORDER[candidateIntensity]

  // Penalise large backward steps
  if (candidateOrder < lastIntensityOrder - 1) return -4

  // Penalise two consecutive 'medium' items
  if (candidateIntensity === 'medium' && lastTwo.every(i => i === 'medium')) return -10

  return 0
}

// ── Scoring ───────────────────────────────────────────────────────────────────
// Score is calculated ONCE per item per slot; no repeated random calls.

interface ScoredItem {
  item:  LibraryItem
  score: number
}

function calculateScore(
  item: LibraryItem,
  slotCode: ContentTypeCode,
  chosenSphere: PrimarySphere,
  state: SessionState,
  pairSeen: Set<string>,
  userSeen: Set<string>,
  slotIndex: number,
  totalSlots: number,
): number {
  let s = 0

  // History freshness
  if (!pairSeen.has(item.id)) s += 40
  if (!userSeen.has(item.id)) s += 20
  if (!state.seen_repeat_groups.includes(item.repeat_group)) s += 15
  if (!state.seen_topics.includes(item.topic)) s += 10

  // Sphere match
  if (item.primary_sphere === chosenSphere) s += 8

  // session_position match: does item declare it fits this slot's ideal positions?
  const idealPositions = SLOT_CRITERIA[slotCode].idealPositions
  const matchCount = idealPositions.filter(p => item.session_position.includes(p)).length
  s += matchCount * 5

  // Energy spread: mild penalty for repeating the same energy back-to-back
  if (item.energy && item.energy === state.last_energy) s -= 5

  // Intensity flow
  s += intensityPenalty(item.intensity, state.intensity_history)

  // No avoid_after_topics penalty
  const lastTopic = state.seen_topics[state.seen_topics.length - 1] ?? ''
  if (item.avoid_after_topics.includes(lastTopic)) s -= 8

  return s
}

// ── Controlled random from top candidates ─────────────────────────────────────

function pickFromTopN<T>(scored: ScoredItem[], n: number): LibraryItem | null {
  if (scored.length === 0) return null
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const top = sorted.slice(0, Math.min(n, sorted.length))
  return top[Math.floor(Math.random() * top.length)].item
}

// ── Single-slot picker ────────────────────────────────────────────────────────

function pickSlot(
  slotCode: ContentTypeCode,
  durationKey: DurationKey,
  chosenSphere: PrimarySphere,
  excludeIds: Set<string>,
  excludeRepeatGroups: Set<string>,
  state: SessionState,
  pairSeen: Set<string>,
  userSeen: Set<string>,
  slotIndex: number,
  totalSlots: number,
  fase: DateFaseKey,
): LibraryItem | null {
  const { subtypes } = SLOT_CRITERIA[slotCode]

  // Step 1: hard filters — duration_fit, subtype, not-already-used
  // approved() scopes to the correct dating_stage library for this fase
  const base = approved(fase).filter(i =>
    i.duration_fit.includes(durationKey) &&
    subtypes.includes(i.subtype) &&
    !excludeIds.has(i.id) &&
    !excludeRepeatGroups.has(i.repeat_group),
  )

  if (base.length === 0) return null

  // Step 2: sphere preference — primary first, then compatible
  const primary    = base.filter(i => i.primary_sphere === chosenSphere)
  const compatible = base.filter(i => i.compatible_spheres.includes(chosenSphere as string))
  const candidates = primary.length > 0 ? primary : compatible.length > 0 ? compatible : base

  // Step 3: score each candidate ONCE
  const scored: ScoredItem[] = candidates.map(item => ({
    item,
    score: calculateScore(item, slotCode, chosenSphere, state, pairSeen, userSeen, slotIndex, totalSlots),
  }))

  // Step 4: pick from top 3 (controlled randomisation)
  return pickFromTopN(scored, 3)
}

// ── LibraryItem → Question adapter ───────────────────────────────────────────

function toQuestion(item: LibraryItem): Question {
  return {
    id:       item.id,
    text:     item.text,
    type:     SUBTYPE_TO_QTYPE[item.subtype],
    sfeer:    ['lachen', 'kennen', 'flirten', 'dieper', 'verrassend'],
    minFase:  1,
    phase:    INTENSITY_TO_PHASE[item.intensity],
    // options[0]/[1] → choiceA/B for dilemma and perspective cards
    choiceA:  item.options?.[0],
    choiceB:  item.options?.[1],
    followUp: item.follow_up ?? undefined,
  }
}

// ── Blueprint runner ──────────────────────────────────────────────────────────

function runBlueprint(
  blueprint: ContentTypeCode[],
  durationKey: DurationKey,
  sphere: PrimarySphere,
  state: SessionState,
  fase: DateFaseKey,
): { questions: Question[]; nextState: SessionState } {
  const pairSeen      = getPairSeen()
  const userSeen      = getUserSeen()
  const excludeIds    = new Set<string>(state.selected_ids)
  const roundGroups   = new Set<string>()   // repeat_groups used THIS round
  const totalSlots    = blueprint.length

  const picked: LibraryItem[] = []

  for (let i = 0; i < blueprint.length; i++) {
    const slotCode = blueprint[i]
    const item = pickSlot(
      slotCode, durationKey, sphere,
      excludeIds, roundGroups,
      state, pairSeen, userSeen,
      i, totalSlots, fase,
    )

    if (item) {
      picked.push(item)
      excludeIds.add(item.id)
      if (item.repeat_group) roundGroups.add(item.repeat_group)
    }
  }

  // Update session state (selected, not yet seen)
  const nextState: SessionState = {
    selected_ids: [
      ...state.selected_ids,
      ...picked.map(i => i.id),
    ],
    seen_repeat_groups: [
      ...state.seen_repeat_groups,
      ...picked
        .map(i => i.repeat_group)
        .filter(g => g && !state.seen_repeat_groups.includes(g)),
    ],
    seen_topics: [
      ...state.seen_topics,
      ...picked
        .map(i => i.topic)
        .filter(t => t && !state.seen_topics.includes(t)),
    ],
    last_energy:       picked.at(-1)?.energy ?? state.last_energy,
    intensity_history: [
      ...state.intensity_history,
      ...picked.map(i => i.intensity),
    ],
    round: state.round + 1,
    fase,
  }

  return { questions: picked.map(toQuestion), nextState }
}

// ── Blueprint chooser ─────────────────────────────────────────────────────────

function chooseBlueprint(blueprints: ContentTypeCode[][], round: number): ContentTypeCode[] {
  return blueprints[round % blueprints.length]
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the session for the chosen fase, sfeer and tijdsduur.
 * Does NOT mark any items as seen — call markCardSeen(id) from the UI.
 */
export function buildLibrarySession(fase: DateFaseKey, sfeer: SfeerKey, tijdsduur: Tijdsduur): Question[] {
  if (!hasApprovedContent(fase)) return []

  const sphere      = SFEER_TO_PRIMARY_SPHERE[sfeer]
  const durationKey = toDurationKey(tijdsduur)
  const config      = EERSTE_ONTMOETING_CONFIG
  const state       = getSessionState()

  let blueprint: ContentTypeCode[]
  if (tijdsduur === '5min') {
    blueprint = chooseBlueprint(config.blueprints['5_min'], state.round)
  } else if (tijdsduur === '15min') {
    blueprint = chooseBlueprint(config.blueprints['15_min'], state.round)
  } else if (tijdsduur === '30min') {
    blueprint = chooseBlueprint(config.blueprints['30_min'], state.round)
  } else {
    blueprint = chooseBlueprint(config.blueprints.unlimited_rounds, state.round)
  }

  const { questions, nextState } = runBlueprint(blueprint, durationKey, sphere, state, fase)
  saveSessionState(nextState)
  return questions
}

/**
 * Build the next unlimited round after a natural stop point.
 * Uses the fase stored in session state to guarantee the same library is used.
 * Does NOT mark any items as seen — call markCardSeen(id) from the UI.
 */
export function buildNextRound(sfeer: SfeerKey): Question[] {
  const state = getSessionState()
  const fase  = state.fase

  if (!hasApprovedContent(fase)) return []

  const sphere    = SFEER_TO_PRIMARY_SPHERE[sfeer]
  const config    = EERSTE_ONTMOETING_CONFIG
  const blueprint = chooseBlueprint(config.blueprints.unlimited_rounds, state.round)

  const { questions, nextState } = runBlueprint(blueprint, 'unlimited', sphere, state, fase)
  saveSessionState(nextState)
  return questions
}

/** Current round index (0-based) within this tab session */
export function currentRound(): number {
  return getSessionState().round
}
