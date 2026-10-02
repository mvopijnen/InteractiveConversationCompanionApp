// ── Tussen Ons — Eerste Ontmoeting 2.0 data model ────────────────────────────
//
// Content governance: AI NEVER generates, rewrites, or supplements content.
// This file defines types that mirror the approved JSON exactly.
// All transformations happen in code (adapters below), not in the content data.

import type { SfeerKey, QType } from './questions'

// ── Vocabulary (exact JSON field values) ──────────────────────────────────────

export type QualityStatus = 'draft' | 'reviewed' | 'approved' | 'disabled'

export type PrimarySphere =
  | 'laughing_light'
  | 'learning_wonder'
  | 'flirting_tension'
  | 'deeper_connection'
  | 'unexpected_surprising'

export type ItemType = 'question' | 'dilemma' | 'interactive' | 'perspective' | 'closing'

export type Subtype =
  | 'light_opener'
  | 'scenario'
  | 'dilemma'
  | 'personal_safe'
  | 'interactive_task'
  | 'perspective_taking'
  | 'closing'

export type Intensity = 'light' | 'light_medium' | 'medium'

export type SessionPosition = 'opening' | 'early' | 'middle' | 'late' | 'closing'

export type DurationKey = '5' | '15' | '30' | 'unlimited'

// ── LibraryItem — exact mirror of the approved JSON schema ───────────────────

export interface LibraryItem {
  id: string
  content_version: number
  quality_status: QualityStatus
  dating_stage: 'first_meeting'
  primary_sphere: PrimarySphere
  compatible_spheres: string[]
  type: ItemType
  subtype: Subtype
  text: string
  psychological_goal: string
  secondary_goal: string
  intensity: Intensity
  energy: string
  topic: string
  repeat_group: string
  session_position: SessionPosition[]
  duration_fit: DurationKey[]
  estimated_seconds: number
  response_mode: string
  follow_up_allowed: boolean
  follow_up: string | null
  avoid_after_topics: string[]
  active: boolean
  options?: string[]
}

// ── Adapters (code transforms — never touch the content) ──────────────────────

/** primary_sphere string → existing SfeerKey used by UI */
export const PRIMARY_SPHERE_TO_SFEER: Record<PrimarySphere, SfeerKey> = {
  laughing_light:        'lachen',
  learning_wonder:       'kennen',
  flirting_tension:      'flirten',
  deeper_connection:     'dieper',
  unexpected_surprising: 'verrassend',
}

/** SfeerKey → primary_sphere for filtering */
export const SFEER_TO_PRIMARY_SPHERE: Record<SfeerKey, PrimarySphere> = {
  lachen:     'laughing_light',
  kennen:     'learning_wonder',
  flirten:    'flirting_tension',
  dieper:     'deeper_connection',
  verrassend: 'unexpected_surprising',
}

/** subtype → QType used by existing card components */
export const SUBTYPE_TO_QTYPE: Record<Subtype, QType> = {
  light_opener:       'opener',
  scenario:           'scenario',
  dilemma:            'dilemma',
  personal_safe:      'persoonlijk',
  interactive_task:   'interactief',
  perspective_taking: 'perspective',
  closing:            'afsluiter',
}

/** Intensity → numeric phase (1–6) used by existing Question type */
export const INTENSITY_TO_PHASE = {
  light:        1 as const,
  light_medium: 3 as const,
  medium:       5 as const,
}

// ── Blueprint slot definitions ────────────────────────────────────────────────
//
// A blueprint slot specifies which subtypes are eligible for that position,
// and which session_position values are a strong match.
// session_position is used as a scoring factor, not a hard filter.

export interface SlotCriteria {
  subtypes:           Subtype[]
  idealPositions:     SessionPosition[]
}

export type ContentTypeCode = 'OPEN' | 'DIL' | 'SCEN' | 'INT' | 'SAFE' | 'PERS' | 'CLOSE'

// Legacy alias — kept for any import that still references CTYPE_TO_QTYPE
export const CTYPE_TO_QTYPE = SUBTYPE_TO_QTYPE

export const SLOT_CRITERIA: Record<ContentTypeCode, SlotCriteria> = {
  OPEN:  { subtypes: ['light_opener'],       idealPositions: ['opening', 'early'] },
  DIL:   { subtypes: ['dilemma'],            idealPositions: ['early', 'middle', 'late'] },
  SCEN:  { subtypes: ['scenario'],           idealPositions: ['early', 'middle'] },
  INT:   { subtypes: ['interactive_task'],    idealPositions: ['middle', 'late'] },
  SAFE:  { subtypes: ['personal_safe'],      idealPositions: ['middle', 'late'] },
  PERS:  { subtypes: ['perspective_taking'], idealPositions: ['middle', 'late'] },
  CLOSE: { subtypes: ['closing'],            idealPositions: ['closing'] },
}

// ── Blueprint sequences ───────────────────────────────────────────────────────

export type Blueprint = ContentTypeCode[]

export interface LibraryConfig {
  blueprints: {
    '5_min':          Blueprint[]
    '15_min':         Blueprint[]
    '30_min':         Blueprint[]
    unlimited_rounds: Blueprint[]
  }
  duration_rules: {
    '5':       { target_cards: number; duration_key: DurationKey }
    '15':      { target_cards: number; duration_key: DurationKey }
    '30':      { target_cards: number; duration_key: DurationKey }
    unlimited: { round_size: number; duration_key: DurationKey; natural_stop_between_rounds: true }
  }
}

export const EERSTE_ONTMOETING_CONFIG: LibraryConfig = {
  blueprints: {
    '5_min': [
      ['OPEN', 'DIL',  'SCEN', 'INT',  'CLOSE'],
      ['DIL',  'OPEN', 'PERS', 'INT',  'CLOSE'],
      ['OPEN', 'SCEN', 'DIL',  'OPEN', 'CLOSE'],
    ],
    '15_min': [
      ['OPEN', 'DIL',  'SCEN', 'INT',  'SAFE', 'OPEN', 'DIL',  'PERS', 'CLOSE'],
      ['DIL',  'OPEN', 'SCEN', 'PERS', 'INT',  'SAFE', 'DIL',  'OPEN', 'CLOSE'],
      ['OPEN', 'SCEN', 'DIL',  'INT',  'OPEN', 'PERS', 'SAFE', 'DIL',  'CLOSE'],
    ],
    '30_min': [
      ['OPEN', 'DIL',  'SCEN', 'INT',  'SAFE', 'OPEN', 'DIL', 'PERS', 'SCEN', 'INT',  'OPEN', 'DIL', 'PERS', 'CLOSE'],
      ['DIL',  'OPEN', 'SCEN', 'PERS', 'INT',  'SAFE', 'OPEN','DIL',  'INT',  'SCEN', 'PERS', 'DIL', 'OPEN', 'CLOSE'],
    ],
    unlimited_rounds: [
      ['OPEN', 'DIL',  'SCEN', 'INT',  'CLOSE'],
      ['DIL',  'OPEN', 'PERS', 'SAFE', 'CLOSE'],
      ['SCEN', 'DIL',  'INT',  'OPEN', 'CLOSE'],
      ['OPEN', 'PERS', 'DIL',  'SCEN', 'CLOSE'],
      ['INT',  'OPEN', 'DIL',  'SAFE', 'CLOSE'],
    ],
  },
  duration_rules: {
    '5':       { target_cards: 5,  duration_key: '5' },
    '15':      { target_cards: 9,  duration_key: '15' },
    '30':      { target_cards: 14, duration_key: '30' },
    unlimited: { round_size: 5, duration_key: 'unlimited', natural_stop_between_rounds: true },
  },
}

// ── Data placeholder ──────────────────────────────────────────────────────────
// Replace this array with the items from the approved JSON.
// No field renaming or value changes needed — the schema matches exactly.

export const EERSTE_ONTMOETING_ITEMS: LibraryItem[] = []
