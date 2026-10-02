import { useState, useEffect } from 'react'
import { buildSession, getFavorites, toggleFavorite } from './engine'
import { buildLibrarySession, buildNextRound, hasApprovedContent, resetSessionState, markCardSeen } from './library-engine'
import {
  type DateFaseKey, type SfeerKey, type Tijdsduur, type Question, type QType,
} from './questions'

// ── Design tokens ──────────────────────────────────────────────────────────────
const B   = '#9E3568'                        // berry primary
const BS  = 'rgba(158,53,104,0.09)'
const BBo = 'rgba(158,53,104,0.22)'
const TP  = '#1A1210'
const TS  = '#7A6A60'
const TM  = '#B0A098'
const BDR = 'rgba(26,18,16,0.09)'

// ── Card surface tokens ────────────────────────────────────────────────────────
const CARD_BG  = '#FFFDF9'                   // barely-warm white (lifts off ivory bg)
const CARD_BDR = '1px solid rgba(158,53,104,0.11)'
const CARD_SHA = '0 8px 48px rgba(26,18,16,0.08), 0 2px 8px rgba(26,18,16,0.04)'

// ── Sfeer ambient glow ─────────────────────────────────────────────────────────
const SFEER_GLOW: Record<SfeerKey, number> = {
  lachen: 0.04, kennen: 0.05, flirten: 0.10, dieper: 0.035, verrassend: 0.06,
}
const SFEER_LABELS: Record<SfeerKey, string> = {
  lachen: 'Lachen & Luchtig', kennen: 'Leren Kennen', flirten: 'Flirten & Spanning',
  dieper: 'Echt Dieper Gaan', verrassend: 'Onverwacht & Verrassend',
}
const FASE_LABELS: Record<DateFaseKey, string> = {
  eerste: 'Eerste ontmoeting', paar_dates: 'Een paar dates', al_even: 'We daten al even',
  serieuzer: 'Het wordt serieuzer', flirty: 'Flirty avond',
}

// ── Screen state ───────────────────────────────────────────────────────────────
type Screen = 'landing' | 'fase' | 'sfeer' | 'tijd' | 'sessie' | 'einde'

// ── Config ─────────────────────────────────────────────────────────────────────
interface FaseOption { key: DateFaseKey; label: string; sub: string }
const FASE_OPTIONS: FaseOption[] = [
  { key: 'eerste',     label: 'Eerste ontmoeting', sub: 'We kennen elkaar nauwelijks. Aftasten en eerste indrukken.' },
  { key: 'paar_dates', label: 'Een paar dates',    sub: 'We zijn elkaar aan het ontdekken en ontspannen.' },
  { key: 'al_even',    label: 'We daten al even',  sub: 'Er is al vertrouwen, speelsheid en openheid.' },
  { key: 'serieuzer',  label: 'Het wordt serieuzer', sub: 'Toekomst, waarden en diepere connectie.' },
  { key: 'flirty',     label: 'Flirty avond',      sub: 'Chemie, aantrekkingskracht en speelse spanning.' },
]

interface SfeerOption { key: SfeerKey; label: string; sub: string }
const SFEER_OPTIONS: SfeerOption[] = [
  { key: 'lachen',     label: 'Lachen & Luchtig',            sub: 'Gêne laten vallen, blunders en herkenbare situaties.' },
  { key: 'kennen',     label: 'Leren Kennen & Verwondering',  sub: 'Gewoontes, verborgen talenten en dromen.' },
  { key: 'flirten',    label: 'Flirten & Spanning',           sub: 'Lichaamstaal, chemie, complimenten en subtiele stiltes.' },
  { key: 'dieper',     label: 'Echt Dieper Gaan',             sub: 'Waarden, kwetsbaarheid en wat je zelden deelt.' },
  { key: 'verrassend', label: 'Onverwacht & Verrassend',      sub: "Secret picks, sociale challenges en snelle dilemma's." },
]

const TIJD_OPTIONS: { key: Tijdsduur; label: string; sub: string; popular?: boolean }[] = [
  { key: '5min',      label: '5 Minuten',        sub: 'Snelle ijsbreker bij het eerste drankje. ± 5 kaarten.' },
  { key: '15min',     label: '15 Minuten',       sub: 'De perfecte balans voor een fijne dynamiek. ± 9 kaarten.', popular: true },
  { key: '30min',     label: '30 Minuten',       sub: 'Uitgebreid natafelen en rustig doorpraten. ± 14 kaarten.' },
  { key: 'onbeperkt', label: 'Geen tijdslimiet', sub: 'Speel door zolang het gesprek vanzelf blijft stromen.' },
]

const TYPE_LABELS: Partial<Record<QType, string>> = {
  dilemma:     'Dilemma',
  interactief: 'Opdracht',
  perspective: 'Raden',
  afsluiter:   'Afsluiting',
  scenario:    'Scenario',
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function useMounted() {
  const [m, setM] = useState(false)
  useEffect(() => { setM(true) }, [])
  return m
}

// ── Shared onboarding atoms ────────────────────────────────────────────────────
function Logo({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 28 : 22, dot = size === 'md' ? 7 : 5, fs = size === 'md' ? 13 : 11
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-full flex items-center justify-center"
        style={{ width: sz, height: sz, border: `1.5px solid ${BBo}`, background: BS }}>
        <div className="rounded-full" style={{ width: dot, height: dot, background: B }} />
      </div>
      <span className="font-medium tracking-widest uppercase"
        style={{ color: B, letterSpacing: '0.2em', fontSize: fs }}>Tussen Ons</span>
    </div>
  )
}

function BackBtn({ onBack }: { onBack: () => void }) {
  return (
    <button onClick={onBack} className="flex items-center gap-1.5" style={{ color: TM }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className="text-sm">Terug</span>
    </button>
  )
}

function SelectionCard({ label, sub, delay, mounted, onPress }: {
  label: string; sub: string; delay: number; mounted: boolean; onPress: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onPress} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`text-left w-full px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${mounted ? `anim-fade-up d${delay}` : 'opacity-0'}`}
      style={{ background: hover ? BS : '#FFFFFF', border: `1px solid ${hover ? BBo : BDR}` }}>
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold" style={{ color: TP }}>{label}</p>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={TM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
      <p className="text-xs mt-1 pr-6 leading-relaxed" style={{ color: TS }}>{sub}</p>
    </button>
  )
}

// ── Onboarding screens ────────────────────────────────────────────────────────
function LandingScreen({ onBegin }: { onBegin: () => void }) {
  const m = useMounted()
  return (
    <div className="page-wash flex flex-col min-h-screen px-7">
      <div className={`pt-14 ${m ? 'anim-fade-in d0' : 'opacity-0'}`}><Logo size="md" /></div>
      <div className="flex-1 flex flex-col justify-center pb-4">
        <p className={`text-xs font-medium tracking-widest uppercase mb-5 ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: B, letterSpacing: '0.2em' }}>Date editie</p>
        <h1 className={`font-serif leading-tight mb-5 ${m ? 'anim-fade-up d2' : 'opacity-0'}`}
          style={{ fontSize: 'clamp(2rem, 8vw, 2.6rem)', color: TP, fontWeight: 500 }}>
          Minder smalltalk. Meer van dat moment.
        </h1>
        <p className={`text-base leading-relaxed ${m ? 'anim-fade-up d3' : 'opacity-0'}`}
          style={{ color: TS, maxWidth: '30ch' }}>
          Maak dit date een gesprek dat jullie bijblijft.
        </p>
      </div>
      <div className={`pb-12 ${m ? 'anim-fade-up d4' : 'opacity-0'}`}>
        <button onClick={onBegin}
          className="w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]"
          style={{ background: B, color: '#FFFFFF' }}>
          Begin
        </button>
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={TM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="text-xs" style={{ color: TM }}>100% privé tussen jullie</span>
        </div>
      </div>
    </div>
  )
}

function FaseScreen({ onSelect, onBack }: { onSelect: (f: DateFaseKey) => void; onBack: () => void }) {
  const m = useMounted()
  return (
    <div className="page-wash flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-6 pt-12 pb-2">
        <BackBtn onBack={onBack} /><Logo /><div className="w-12" />
      </div>
      <div className="px-6 pt-6 pb-5">
        <p className={`text-xs font-medium tracking-widest uppercase mb-3 ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: B, letterSpacing: '0.18em' }}>Stap 1 van 3</p>
        <h2 className={`font-serif text-2xl leading-snug ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: TP, fontWeight: 500 }}>Hoe goed kennen jullie elkaar?</h2>
      </div>
      <div className="px-4 flex flex-col gap-2.5 pb-10">
        {FASE_OPTIONS.map((opt, i) => (
          <SelectionCard key={opt.key} label={opt.label} sub={opt.sub}
            delay={i + 2} mounted={m} onPress={() => onSelect(opt.key)} />
        ))}
      </div>
    </div>
  )
}

function SfeerScreen({ onSelect, onBack }: { onSelect: (s: SfeerKey) => void; onBack: () => void }) {
  const m = useMounted()
  return (
    <div className="page-wash flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-6 pt-12 pb-2">
        <BackBtn onBack={onBack} /><Logo /><div className="w-12" />
      </div>
      <div className="px-6 pt-6 pb-3">
        <p className={`text-xs font-medium tracking-widest uppercase mb-3 ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: B, letterSpacing: '0.18em' }}>Stap 2 van 3</p>
        <h2 className={`font-serif text-2xl leading-snug mb-1 ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: TP, fontWeight: 500 }}>Waar hebben jullie zin in?</h2>
        <p className={`text-sm ${m ? 'anim-fade-up d2' : 'opacity-0'}`} style={{ color: TS }}>
          Kies de energie die past bij dit moment.
        </p>
      </div>
      <div className="px-4 flex flex-col gap-2.5 pb-10 pt-4">
        {SFEER_OPTIONS.map((opt, i) => (
          <SelectionCard key={opt.key} label={opt.label} sub={opt.sub}
            delay={i + 3} mounted={m} onPress={() => onSelect(opt.key)} />
        ))}
      </div>
    </div>
  )
}

function TijdScreen({ onSelect, onBack }: { onSelect: (t: Tijdsduur) => void; onBack: () => void }) {
  const m = useMounted()
  return (
    <div className="page-wash flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-6 pt-12 pb-2">
        <BackBtn onBack={onBack} /><Logo /><div className="w-12" />
      </div>
      <div className="px-6 pt-6 pb-4">
        <p className={`text-xs font-medium tracking-widest uppercase mb-3 ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: B, letterSpacing: '0.18em' }}>Stap 3 van 3</p>
        <h2 className={`font-serif text-2xl leading-snug mb-1 ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
          style={{ color: TP, fontWeight: 500 }}>Hoe lang hebben jullie?</h2>
        <p className={`text-sm ${m ? 'anim-fade-up d2' : 'opacity-0'}`} style={{ color: TS }}>
          Geen zorgen. Jullie kunnen altijd pauzeren of stoppen.
        </p>
      </div>
      <div className="px-4 flex flex-col gap-2.5 pb-10">
        {TIJD_OPTIONS.map((opt, i) => (
          <button key={opt.key} onClick={() => onSelect(opt.key)}
            className={`text-left w-full px-5 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98] relative ${m ? `anim-fade-up d${i + 3}` : 'opacity-0'}`}
            style={{ background: opt.popular ? BS : '#FFFFFF', border: `1px solid ${opt.popular ? BBo : BDR}` }}>
            {opt.popular && (
              <span className="absolute top-3.5 right-4 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: BS, color: B }}>Populair</span>
            )}
            <p className="text-base font-semibold mb-0.5" style={{ color: TP }}>{opt.label}</p>
            <p className="text-xs leading-relaxed pr-16" style={{ color: TS }}>{opt.sub}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Session card building blocks ────────────────────────────────────────────────

interface CardProps {
  q: Question
  typeLabel?: string
  onNext: () => void
  onSkip: () => void
  onEnd: () => void
}

// Shared card shell style
const CARD_SHELL: React.CSSProperties = {
  borderRadius: 28,
  background: CARD_BG,
  border: CARD_BDR,
  boxShadow: CARD_SHA,
  padding: '26px 28px 32px',
  width: '100%',
}

// Small brand mark at the top of every card
function BrandMark() {
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: BBo }} />
}

// Primary layout: mark → space → label → statement → instruction → [children]
function CardLayout({
  label, statement, statementSize = 'lg', instruction, followUp, children, closing,
}: {
  label: string
  statement: string
  statementSize?: 'md' | 'lg' | 'xl'
  instruction?: string
  followUp?: string
  children?: React.ReactNode
  closing?: boolean
}) {
  const fs = {
    md: 'clamp(1.25rem, 4.5vw, 1.55rem)',
    lg: 'clamp(1.45rem, 5.5vw, 1.9rem)',
    xl: 'clamp(1.6rem, 6.2vw, 2.1rem)',
  }[statementSize]

  return (
    <div style={{ ...CARD_SHELL, background: closing ? 'linear-gradient(160deg, #FFFDF9 0%, #FDF8F3 100%)' : CARD_BG }}>
      {/* 1. Brand mark */}
      <BrandMark />
      {/* 2. Breathing room */}
      <div style={{ height: 38 }} />
      {/* 3. Context label */}
      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: B, lineHeight: 1 }}>
        {label}
      </p>
      {/* 4. Large editorial statement */}
      <h2 className="font-serif" style={{ fontSize: fs, color: TP, fontWeight: 500, lineHeight: 1.42, marginTop: 14, marginBottom: 0 }}>
        {statement}
      </h2>
      {/* 5. Small instruction */}
      {instruction && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: TS, marginTop: 14 }}>{instruction}</p>
      )}
      {/* Follow-up inset block */}
      {followUp && (
        <div style={{ marginTop: 20, borderRadius: 16, padding: '14px 16px', background: BS, borderLeft: `2px solid ${BBo}` }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: B, marginBottom: 6, letterSpacing: '0.06em' }}>Vervolg</p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: TS }}>{followUp}</p>
        </div>
      )}
      {/* 6. Interactive children (tiles, etc.) */}
      {children && <div style={{ marginTop: 20 }}>{children}</div>}
    </div>
  )
}

// Handoff card — centered lock screen, phone-pass moment
function HandoffCard({ heading, sub }: { heading: string; sub: string }) {
  return (
    <div style={{ ...CARD_SHELL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 260, padding: '48px 28px' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: BS, border: `1.5px solid ${BBo}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={B} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 500, color: TP, marginBottom: 8 }}>{heading}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: TS, maxWidth: '22ch' }}>{sub}</p>
    </div>
  )
}

// Reveal card — brand mark → small question context → reveal pair → match badge
function RevealCard({
  question, leftLabel, leftText, rightLabel, rightText, same, followUp, fallback,
}: {
  question: string; leftLabel: string; leftText: string
  rightLabel: string; rightText: string; same: boolean; followUp?: string; fallback?: string
}) {
  return (
    <div style={CARD_SHELL}>
      <BrandMark />
      <div style={{ height: 20 }} />
      <p style={{ fontSize: 12, color: TM, lineHeight: 1.5, marginBottom: 20 }}>{question}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[{ label: leftLabel, text: leftText, cls: 'd0' }, { label: rightLabel, text: rightText, cls: 'd2' }].map(({ label, text, cls }) => (
          <div key={label} className={`anim-fade-up ${cls}`}
            style={{ borderRadius: 16, padding: '16px', background: BS, border: `1.5px solid ${BBo}` }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: TM, marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: TP, lineHeight: 1.35 }}>{text}</p>
          </div>
        ))}
      </div>
      <div className="anim-fade-up d4"
        style={{ borderRadius: 16, padding: '14px 16px', marginTop: 12, background: same ? BS : 'rgba(26,18,16,0.04)', border: `1.5px solid ${same ? BBo : 'rgba(26,18,16,0.08)'}` }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: same ? B : TP, marginBottom: 4 }}>
          {same ? 'Jullie dachten hetzelfde.' : 'Oké, hier zitten jullie dus anders in.'}
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: TS }}>
          {followUp ?? fallback ?? (same ? 'Toevallig of niet?' : 'Vertel allebei waarom.')}
        </p>
      </div>
    </div>
  )
}

// Choice tile
function ChoiceTile({ text, onClick }: { text: string; onClick: () => void }) {
  const [press, setPress] = useState(false)
  return (
    <button onClick={onClick}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      onMouseLeave={() => setPress(false)} onTouchStart={() => setPress(true)} onTouchEnd={() => setPress(false)}
      style={{
        width: '100%', textAlign: 'left', borderRadius: 16, padding: '18px 20px',
        background: press ? BS : 'rgba(255,253,249,0.9)',
        border: `1.5px solid ${press ? B : 'rgba(26,18,16,0.10)'}`,
        boxShadow: press ? `0 0 0 4px ${BS}` : 'none',
        transition: 'all 150ms', transform: press ? 'scale(0.97)' : 'none',
      }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: TP, lineHeight: 1.35 }}>{text}</p>
    </button>
  )
}

// Primary CTA
function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        flex: 2, padding: '16px 20px', borderRadius: 16, fontSize: 14, fontWeight: 600,
        background: disabled ? 'rgba(158,53,104,0.22)' : B,
        color: disabled ? 'rgba(255,255,255,0.5)' : '#FFF',
      }}>
      {children}
    </button>
  )
}

// Ghost secondary button
function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ flex: 1, padding: '16px 20px', borderRadius: 16, fontSize: 14, fontWeight: 500, background: 'rgba(26,18,16,0.06)', color: TS }}>
      {children}
    </button>
  )
}

// Action row — always at bottom of screen
function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flexShrink: 0, padding: '12px 16px 40px', display: 'flex', gap: 10, background: 'linear-gradient(to top, #FAF8F4 78%, transparent)' }}>
      {children}
    </div>
  )
}

// ── Card variants ──────────────────────────────────────────────────────────────

// 1. Regular question / scenario / opener
function QuestionCard({ q, typeLabel, onNext, onSkip }: CardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label={typeLabel ?? 'Vraag'} statement={q.text} statementSize="xl" followUp={q.followUp} />
      </div>
      <ActionRow>
        <GhostBtn onClick={onSkip}>Overslaan</GhostBtn>
        <PrimaryBtn onClick={onNext}>Volgende →</PrimaryBtn>
      </ActionRow>
    </div>
  )
}

// 2. Dilemma — 4 states
type DilemmaPhase = 'p1' | 'handoff' | 'p2' | 'reveal'

function DilemmaCard({ q, onNext, onSkip }: CardProps) {
  const [phase, setPhase] = useState<DilemmaPhase>('p1')
  const [p1, setP1] = useState<'A' | 'B' | null>(null)
  const [p2, setP2] = useState<'A' | 'B' | null>(null)
  const p1text = p1 === 'A' ? q.choiceA! : q.choiceB!
  const p2text = p2 === 'A' ? q.choiceA! : q.choiceB!
  const same   = p1 !== null && p2 !== null && p1 === p2

  if (phase === 'p1') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Dilemma" statement={q.text} statementSize="md"
          instruction="Persoon 1 kiest eerst. Je keuze blijft nog even geheim.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ChoiceTile text={q.choiceA!} onClick={() => { setP1('A'); setPhase('handoff') }} />
            <ChoiceTile text={q.choiceB!} onClick={() => { setP1('B'); setPhase('handoff') }} />
          </div>
        </CardLayout>
      </div>
    </div>
  )

  if (phase === 'handoff') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <HandoffCard heading="Keuze opgeslagen." sub="Geef de telefoon door. Je keuze blijft geheim." />
      </div>
      <ActionRow>
        <PrimaryBtn onClick={() => setPhase('p2')}>Klaar voor persoon 2</PrimaryBtn>
      </ActionRow>
    </div>
  )

  if (phase === 'p2') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Dilemma" statement={q.text} statementSize="md"
          instruction="Nu jij. Kies zonder te weten wat de ander koos.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ChoiceTile text={q.choiceA!} onClick={() => { setP2('A'); setPhase('reveal') }} />
            <ChoiceTile text={q.choiceB!} onClick={() => { setP2('B'); setPhase('reveal') }} />
          </div>
        </CardLayout>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <RevealCard question={q.text} leftLabel="Persoon 1" leftText={p1text} rightLabel="Persoon 2" rightText={p2text} same={same} followUp={q.followUp} />
      </div>
      <ActionRow>
        <GhostBtn onClick={onSkip}>Overslaan</GhostBtn>
        <PrimaryBtn onClick={onNext}>Volgende →</PrimaryBtn>
      </ActionRow>
    </div>
  )
}

// 3. Raden — open antwoord (3 states)
type GuessOpenPhase = 'predictor' | 'answer' | 'compare'

function GuessOpenCard({ q, onNext, onSkip }: CardProps) {
  const [phase, setPhase] = useState<GuessOpenPhase>('predictor')

  if (phase === 'predictor') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Raden" statement={q.text} statementSize="lg" instruction="Jij eerst. Zeg hardop wat je denkt." />
      </div>
      <ActionRow>
        <PrimaryBtn onClick={() => setPhase('answer')}>Ik heb mijn voorspelling</PrimaryBtn>
      </ActionRow>
    </div>
  )

  if (phase === 'answer') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Raden" statement="Nu jij." statementSize="xl" instruction="Vertel je echte antwoord en waarom." />
      </div>
      <ActionRow>
        <PrimaryBtn onClick={() => setPhase('compare')}>Verteld</PrimaryBtn>
      </ActionRow>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Raden" statement="Zat je in de buurt?"
          statementSize="xl" instruction={q.followUp ?? 'Wat had de ander verrassend goed aangevoeld?'} />
      </div>
      <ActionRow>
        <GhostBtn onClick={onSkip}>Overslaan</GhostBtn>
        <PrimaryBtn onClick={onNext}>Volgende →</PrimaryBtn>
      </ActionRow>
    </div>
  )
}

// 4. Raden — vaste keuzes (4 states)
type GuessChoicePhase = 'predict' | 'handoff' | 'actual' | 'reveal'

function GuessChoiceCard({ q, onNext, onSkip }: CardProps) {
  const [phase, setPhase] = useState<GuessChoicePhase>('predict')
  const [guess, setGuess] = useState<'A' | 'B' | null>(null)
  const [actual, setActual] = useState<'A' | 'B' | null>(null)
  const guessText  = guess === 'A' ? q.choiceA! : q.choiceB!
  const actualText = actual === 'A' ? q.choiceA! : q.choiceB!
  const correct    = guess !== null && actual !== null && guess === actual

  if (phase === 'predict') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Raden" statement={q.text} statementSize="md"
          instruction="Wat denk jij dat de ander kiest? Jouw voorspelling blijft geheim.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ChoiceTile text={q.choiceA!} onClick={() => { setGuess('A'); setPhase('handoff') }} />
            <ChoiceTile text={q.choiceB!} onClick={() => { setGuess('B'); setPhase('handoff') }} />
          </div>
        </CardLayout>
      </div>
    </div>
  )

  if (phase === 'handoff') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <HandoffCard heading="Voorspelling verzegeld." sub="Geef de telefoon door. Nu kiest de ander écht." />
      </div>
      <ActionRow>
        <PrimaryBtn onClick={() => setPhase('actual')}>Klaar voor persoon 2</PrimaryBtn>
      </ActionRow>
    </div>
  )

  if (phase === 'actual') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Raden" statement={q.text} statementSize="md"
          instruction="Jouw echte keuze. Zonder te weten wat de ander voorspelde.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ChoiceTile text={q.choiceA!} onClick={() => { setActual('A'); setPhase('reveal') }} />
            <ChoiceTile text={q.choiceB!} onClick={() => { setActual('B'); setPhase('reveal') }} />
          </div>
        </CardLayout>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <RevealCard question={q.text} leftLabel="Voorspeld" leftText={guessText} rightLabel="Werkelijk" rightText={actualText}
          same={correct} followUp={q.followUp}
          fallback={correct ? 'Ken jij de ander al goed, of was het een lucky guess?' : 'Wat verraadt dat over jullie?'} />
      </div>
      <ActionRow>
        <GhostBtn onClick={onSkip}>Overslaan</GhostBtn>
        <PrimaryBtn onClick={onNext}>Volgende →</PrimaryBtn>
      </ActionRow>
    </div>
  )
}

// 5. Interactieve opdracht (2 states)
type InteractivePhase = 'task' | 'done'

function InteractiveCard({ q, onNext, onSkip }: CardProps) {
  const [phase, setPhase] = useState<InteractivePhase>('task')

  if (phase === 'task') return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Opdracht" statement={q.text} statementSize="lg" instruction="Voer de opdracht samen uit. Neem er de tijd voor." />
      </div>
      <ActionRow>
        <PrimaryBtn onClick={() => setPhase('done')}>Gedaan</PrimaryBtn>
      </ActionRow>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Opdracht" statement="Hoe was dat?"
          statementSize="xl" instruction={q.followUp ?? 'Vertel elkaar je eerste reactie.'} />
      </div>
      <ActionRow>
        <GhostBtn onClick={onSkip}>Overslaan</GhostBtn>
        <PrimaryBtn onClick={onNext}>Volgende →</PrimaryBtn>
      </ActionRow>
    </div>
  )
}

// 6. Afsluiting
function ClosingCard({ q, onNext, onEnd }: CardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ flex: 1, padding: '12px 16px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <CardLayout label="Afsluiting" statement={q.text} statementSize="xl" instruction="Neem de tijd. Geen haast." closing />
      </div>
      <ActionRow>
        <GhostBtn onClick={onNext}>Nog eentje</GhostBtn>
        <PrimaryBtn onClick={onEnd}>Sessie afronden</PrimaryBtn>
      </ActionRow>
    </div>
  )
}

// ── Card controller ────────────────────────────────────────────────────────────
function CardController(props: CardProps) {
  const { q } = props
  if (q.type === 'afsluiter')  return <ClosingCard {...props} />
  if (q.type === 'dilemma' && q.choiceA) return <DilemmaCard {...props} />
  if (q.type === 'perspective') {
    if (q.choiceA) return <GuessChoiceCard {...props} />
    return <GuessOpenCard {...props} />
  }
  if (q.type === 'interactief') return <InteractiveCard {...props} />
  return <QuestionCard {...props} />
}

// ── Round-complete screen (unlimited mode) ─────────────────────────────────────
function RoundCompleteScreen({ roundNumber, sfeer, onVolgendeRonde, onStoppen }: {
  roundNumber: number
  sfeer: SfeerKey
  onVolgendeRonde: () => void
  onStoppen: () => void
}) {
  const glowOp = SFEER_GLOW[sfeer]
  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh', background: '#FAF8F4', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: '-5%', right: '-10%', width: '75%', height: '55%', background: `radial-gradient(ellipse at 75% 15%, rgba(158,53,104,${glowOp}) 0%, transparent 68%)`, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: BBo, marginBottom: 40 }} />
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: B, marginBottom: 14 }}>
          Ronde {roundNumber} voltooid
        </p>
        <h2 className="font-serif" style={{ fontSize: 'clamp(1.6rem, 6vw, 2.1rem)', color: TP, fontWeight: 500, textAlign: 'center', lineHeight: 1.4, marginBottom: 12 }}>
          Hoe voelt het gesprek?
        </h2>
        <p style={{ fontSize: 14, color: TS, textAlign: 'center', lineHeight: 1.65, maxWidth: '28ch', marginBottom: 48 }}>
          Neem even een moment. Jullie kunnen stoppen of nog een ronde doen.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
          <button onClick={onVolgendeRonde}
            style={{ padding: '18px 24px', borderRadius: 16, fontSize: 15, fontWeight: 600, background: B, color: '#FFF' }}>
            Nog een ronde
          </button>
          <button onClick={onStoppen}
            style={{ padding: '18px 24px', borderRadius: 16, fontSize: 15, fontWeight: 500, background: 'rgba(26,18,16,0.06)', color: TS }}>
            Sessie afronden
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session screen ─────────────────────────────────────────────────────────────
function SessionScreen({
  questions: initialQuestions, fase, sfeer, tijdsduur, onEinde,
}: {
  questions: Question[]
  fase: DateFaseKey
  sfeer: SfeerKey
  tijdsduur: Tijdsduur
  onEinde: () => void
}) {
  const isUnlimited = tijdsduur === 'onbeperkt' && fase === 'eerste'

  const [questions, setQuestions] = useState(initialQuestions)
  const [roundNumber, setRoundNumber] = useState(1)
  const [showRoundComplete, setShowRoundComplete] = useState(false)
  const [index, setIndex]   = useState(0)
  const [fading, setFading] = useState(false)
  const [cardKey, setCardKey] = useState(0)
  const [favIds, setFavIds]   = useState<Set<string>>(() => new Set(getFavorites()))

  const q = questions[index]

  // Mark card as seen by pair/user when it is actually displayed (library engine only)
  useEffect(() => {
    if (fase === 'eerste' && q) markCardSeen(q.id)
  }, [q?.id, fase])
  const progress  = (index + 1) / questions.length
  const typeLabel = TYPE_LABELS[q.type]
  const isFav     = favIds.has(q.id)
  const glowOp    = SFEER_GLOW[sfeer]

  function advance() {
    setFading(true)
    setTimeout(() => {
      if (index < questions.length - 1) {
        setIndex(i => i + 1)
        setCardKey(k => k + 1)
      } else if (isUnlimited) {
        setShowRoundComplete(true)
      } else {
        onEinde()
      }
      setFading(false)
    }, 300)
  }

  function handleVolgendeRonde() {
    const next = buildNextRound(sfeer)
    if (next.length === 0) { onEinde(); return }
    setQuestions(next)
    setIndex(0)
    setCardKey(k => k + 1)
    setRoundNumber(r => r + 1)
    setShowRoundComplete(false)
  }

  if (showRoundComplete) {
    return (
      <RoundCompleteScreen
        roundNumber={roundNumber}
        sfeer={sfeer}
        onVolgendeRonde={handleVolgendeRonde}
        onStoppen={onEinde}
      />
    )
  }

  function handleFav() {
    const nowFav = toggleFavorite(q.id)
    setFavIds(prev => {
      const next = new Set(prev)
      if (nowFav) { next.add(q.id) } else { next.delete(q.id) }
      return next
    })
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100dvh', background: '#FAF8F4', display: 'flex', flexDirection: 'column' }}>
      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', top: '-5%', right: '-10%', width: '75%', height: '55%',
        background: `radial-gradient(ellipse at 75% 15%, rgba(158,53,104,${glowOp}) 0%, transparent 68%)`,
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '-15%', width: '65%', height: '50%',
        background: 'radial-gradient(ellipse at 20% 85%, rgba(253,248,243,0.85) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Thin berry progress bar at top */}
        <div style={{ height: 1, background: 'rgba(26,18,16,0.06)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: B, transition: 'width 500ms ease' }} />
        </div>

        {/* Top bar: close | session context | fav */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2" style={{ flexShrink: 0 }}>
          <button onClick={onEinde}
            className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ color: TM }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Session context — sfeer + count */}
          <div className="flex-1 text-center px-3">
            <p className="text-xs font-medium tracking-widest uppercase leading-none"
              style={{ color: TM, letterSpacing: '0.13em' }}>
              {SFEER_LABELS[sfeer]}
            </p>
          </div>

          <button onClick={handleFav}
            className="w-8 h-8 flex items-center justify-center transition-transform active:scale-75">
            {isFav
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill={B} stroke={B} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TM} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
            }
          </button>
        </div>

        {/* Card count line — below top bar */}
        <div className="flex items-center justify-center pb-2" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-1.5">
            {questions.map((_, i) => (
              <div key={i} style={{
                width: i === index ? 18 : 5,
                height: 4,
                borderRadius: 2,
                background: i === index ? B : i < index ? 'rgba(158,53,104,0.35)' : 'rgba(26,18,16,0.12)',
                transition: 'all 400ms ease',
              }} />
            ))}
          </div>
        </div>

        {/* Card area — fades on transition */}
        <div
          key={cardKey}
          className="flex-1 flex flex-col"
          style={{ opacity: fading ? 0 : 1, transform: fading ? 'translateY(-8px)' : 'none', transition: 'all 300ms ease' }}>
          <CardController
            q={q}
            typeLabel={typeLabel}
            onNext={advance}
            onSkip={advance}
            onEnd={onEinde}
          />
        </div>
      </div>
    </div>
  )
}

// ── Einde ──────────────────────────────────────────────────────────────────────
function EindeScreen({ onOpnieuw }: { onOpnieuw: () => void }) {
  const m = useMounted()
  const favCount = getFavorites().length
  return (
    <div className="page-wash flex flex-col min-h-screen items-center justify-center px-8 text-center">
      <div className={`mb-8 ${m ? 'anim-fade-in d0' : 'opacity-0'}`}>
        <div className="w-14 h-14 rounded-full mx-auto mb-8 flex items-center justify-center"
          style={{ border: `1.5px solid ${BBo}`, background: BS }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={B} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <Logo size="md" />
      </div>
      <h2 className={`font-serif text-2xl mb-3 leading-snug ${m ? 'anim-fade-up d1' : 'opacity-0'}`}
        style={{ color: TP, fontWeight: 500 }}>Mooi gesprek gehad?</h2>
      <p className={`text-sm leading-relaxed ${m ? 'anim-fade-up d2' : 'opacity-0'}`}
        style={{ color: TS, maxWidth: '28ch' }}>
        Wat er vanavond besproken is, blijft tussen jullie.
      </p>
      {favCount > 0 && (
        <p className={`text-xs mt-2 ${m ? 'anim-fade-up d2' : 'opacity-0'}`} style={{ color: B }}>
          {favCount} {favCount === 1 ? 'kaart' : 'kaarten'} als favoriet bewaard.
        </p>
      )}
      <div className={`w-full flex flex-col gap-3 mt-10 ${m ? 'anim-fade-up d3' : 'opacity-0'}`}>
        <button onClick={onOpnieuw}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{ background: B, color: '#FFFFFF' }}>
          Nieuwe sessie starten
        </button>
        <button onClick={onOpnieuw}
          className="w-full py-4 rounded-2xl text-sm font-medium"
          style={{ background: 'rgba(26,18,16,0.05)', color: TS }}>
          Terug naar begin
        </button>
      </div>
    </div>
  )
}

// ── App root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,    setScreen]    = useState<Screen>('landing')
  const [fase,      setFase]      = useState<DateFaseKey | null>(null)
  const [sfeer,     setSfeer]     = useState<SfeerKey | null>(null)
  const [tijdsduur, setTijdsduur] = useState<Tijdsduur>('15min')
  const [session,   setSession]   = useState<Question[]>([])

  function startSessie(f: DateFaseKey, s: SfeerKey, t: Tijdsduur) {
    resetSessionState()
    // Eerste ontmoeting fase uses the curated library engine when content is available
    const qs = (f === 'eerste' && hasApprovedContent())
      ? buildLibrarySession(s, t)
      : buildSession(f, s, t)
    setSession(qs)
    setTijdsduur(t)
    setScreen('sessie')
  }

  function reset() {
    setFase(null); setSfeer(null); setSession([])
    setScreen('landing')
  }

  return (
    <div style={{ background: '#FAF8F4', minHeight: '100dvh' }}>
      {screen === 'landing' && <LandingScreen onBegin={() => setScreen('fase')} />}
      {screen === 'fase' && (
        <FaseScreen onSelect={f => { setFase(f); setScreen('sfeer') }} onBack={() => setScreen('landing')} />
      )}
      {screen === 'sfeer' && (
        <SfeerScreen onSelect={s => { setSfeer(s); setScreen('tijd') }} onBack={() => setScreen('fase')} />
      )}
      {screen === 'tijd' && fase && (
        <TijdScreen onSelect={t => startSessie(fase, sfeer!, t)} onBack={() => setScreen('sfeer')} />
      )}
      {screen === 'sessie' && session.length > 0 && fase && sfeer && (
        <SessionScreen questions={session} fase={fase} sfeer={sfeer} tijdsduur={tijdsduur} onEinde={() => setScreen('einde')} />
      )}
      {screen === 'einde' && <EindeScreen onOpnieuw={reset} />}
    </div>
  )
}
