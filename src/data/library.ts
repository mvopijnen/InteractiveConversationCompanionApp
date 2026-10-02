// ── Tussen Ons — Eerste Ontmoeting 2.0 library types ──────────────────────────
// Content governance: NO AI-generated content. All items come from the
// approved JSON export. Replace EERSTE_ONTMOETING_ITEMS with that data.

import type { SfeerKey, QType, DateFaseKey } from './questions'

// ── Vocabulary ─────────────────────────────────────────────────────────────────

export type SphereCode = 'LL' | 'LV' | 'FS' | 'ED' | 'OV'
export type ContentTypeCode = 'OPEN' | 'DIL' | 'SCEN' | 'INT' | 'SAFE' | 'PERS' | 'CLOSE'
export type QualityStatus = 'approved' | 'pending' | 'rejected'
export type DurationFit = '5' | '15' | '30' | 'unlimited' | 'all'
export type IntensityLevel = 1 | 2 | 3
export type EnergyType = string   // e.g. 'active' | 'reflective' | 'playful' | 'intimate'

// ── Library item ───────────────────────────────────────────────────────────────

export interface LibraryItem {
  id: string
  dating_stage: DateFaseKey | 'first_meeting'
  quality_status: QualityStatus
  active: boolean
  content_type: ContentTypeCode
  sphere: SphereCode
  compatible_spheres?: SphereCode[]
  duration_fit: DurationFit[]
  session_position: number        // preferred blueprint slot index (1-based)
  intensity: IntensityLevel
  energy: EnergyType
  topic: string
  repeat_group: string
  text: string
  choiceA?: string
  choiceB?: string
  follow_up?: string
}

// ── Mappings ───────────────────────────────────────────────────────────────────

export const SPHERE_TO_SFEER: Record<SphereCode, SfeerKey> = {
  LL: 'lachen',
  LV: 'kennen',
  FS: 'flirten',
  ED: 'dieper',
  OV: 'verrassend',
}

export const SFEER_TO_SPHERE: Record<SfeerKey, SphereCode> = {
  lachen:     'LL',
  kennen:     'LV',
  flirten:    'FS',
  dieper:     'ED',
  verrassend: 'OV',
}

export const CTYPE_TO_QTYPE: Record<ContentTypeCode, QType> = {
  OPEN:  'opener',
  DIL:   'dilemma',
  SCEN:  'scenario',
  INT:   'interactief',
  SAFE:  'opener',
  PERS:  'perspective',
  CLOSE: 'afsluiter',
}

// ── Blueprint config ───────────────────────────────────────────────────────────

export type Blueprint = ContentTypeCode[]

export interface LibraryConfig {
  blueprints: {
    '5_min': Blueprint[]
    '15_min': Blueprint[]
    '30_min': Blueprint[]
    unlimited_rounds: Blueprint[]
  }
  duration_rules: {
    '5':        { target_cards: number }
    '15':       { target_cards: number }
    '30':       { target_cards: number }
    unlimited:  { round_size: number; natural_stop_between_rounds: true }
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
      ['OPEN', 'DIL', 'SCEN', 'INT', 'SAFE', 'OPEN', 'DIL',  'PERS', 'SCEN', 'INT',  'OPEN', 'DIL', 'PERS', 'CLOSE'],
      ['DIL',  'OPEN','SCEN', 'PERS','INT',  'SAFE', 'OPEN',  'DIL',  'INT',  'SCEN', 'PERS', 'DIL', 'OPEN', 'CLOSE'],
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
    '5':       { target_cards: 5 },
    '15':      { target_cards: 9 },
    '30':      { target_cards: 14 },
    unlimited: { round_size: 5, natural_stop_between_rounds: true },
  },
}

// ── Data placeholder ───────────────────────────────────────────────────────────
// Replace this empty array with the contents of
// tussen_ons_eerste_ontmoeting_2_0_200_approved.json → library.items
// filtered to quality_status === 'approved' && active === true.

export const EERSTE_ONTMOETING_ITEMS: LibraryItem[] = []
