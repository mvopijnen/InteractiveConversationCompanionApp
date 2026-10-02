// ── Types ──────────────────────────────────────────────────────────────────────
export type DateFaseKey = 'eerste' | 'paar_dates' | 'al_even' | 'serieuzer' | 'flirty'
export type SfeerKey = 'lachen' | 'kennen' | 'flirten' | 'dieper' | 'verrassend'
export type Tijdsduur = '5min' | '15min' | '30min' | 'onbeperkt'
export type QType = 'opener' | 'scenario' | 'dilemma' | 'persoonlijk' | 'interactief' | 'perspective' | 'afsluiter'
export type Phase = 1 | 2 | 3 | 4 | 5 | 6

export interface Question {
  id: string
  text: string
  type: QType
  sfeer: SfeerKey[]
  minFase: number      // 1–5; only shown when fase level >= minFase
  phase: Phase
  choiceA?: string
  choiceB?: string
  followUp?: string    // optional prompt after reveal
}

// ── Fase depth levels ────────────────────────────────────────────────────────
export const FASE_LEVELS: Record<DateFaseKey, number> = {
  eerste:     1,
  paar_dates: 2,
  al_even:    3,
  serieuzer:  4,
  flirty:     3,
}

// ── Tijdsduur → kaart aantal ─────────────────────────────────────────────────
export const TIJDSDUUR_COUNTS: Record<Tijdsduur, number> = {
  '5min':      5,
  '15min':     9,
  '30min':    14,
  'onbeperkt': 20,
}

// Phase distribution per total (phases 1–6)
export function phaseDistribution(n: number): [number, number, number, number, number, number] {
  if (n <= 5)  return [1, 1, 1, 0, 1, 1]
  if (n <= 9)  return [2, 1, 2, 1, 2, 1]
  if (n <= 14) return [2, 2, 3, 2, 3, 2]
  return             [3, 3, 4, 3, 4, 3]
}

// ── Content library (placeholder — gemarkeerd als P) ────────────────────────
// ALLE CONTENT HIERONDER IS PLACEHOLDER TER VERVANGING DOOR GOEDGEKEURDE CONTENTBIBLIOTHEEK
export const QUESTIONS: Question[] = [

  // ══ LACHEN & LUCHTIG ═════════════════════════════════════════════════════

  { id: 'LL-O1', text: 'Als je een dier was dat perfect past bij jouw persoonlijkheid. Welk dier is dat en waarom?', type: 'opener', sfeer: ['lachen'], minFase: 1, phase: 1 },
  { id: 'LL-O2', text: 'Wat was de meest onhandige manier waarop je ooit indruk probeerde te maken?', type: 'opener', sfeer: ['lachen'], minFase: 1, phase: 1 },
  { id: 'LL-O3', text: 'Welke app op je telefoon vertelt het meest over wie je echt bent?', type: 'opener', sfeer: ['lachen'], minFase: 1, phase: 1 },

  { id: 'LL-S1', text: 'Als je leven een realityshow was, welk genre past het best?', type: 'scenario', sfeer: ['lachen'], minFase: 1, phase: 2 },
  { id: 'LL-S2', text: 'Wat is jouw meest embarrassing karaoke-nummer. En zou je het zingen?', type: 'scenario', sfeer: ['lachen'], minFase: 1, phase: 2 },

  { id: 'LL-D1', text: 'Altijd te vroeg of altijd te laat?', type: 'dilemma', sfeer: ['lachen'], minFase: 1, phase: 3, choiceA: 'Altijd te vroeg', choiceB: 'Altijd te laat', followUp: 'Waarom kies je toch liever voor die kant?' },
  { id: 'LL-D2', text: 'Nooit meer koffie of nooit meer alcohol?', type: 'dilemma', sfeer: ['lachen'], minFase: 1, phase: 3, choiceA: 'Nooit meer koffie', choiceB: 'Nooit meer alcohol' },
  { id: 'LL-D3', text: 'Nooit meer muziek of nooit meer films?', type: 'dilemma', sfeer: ['lachen'], minFase: 1, phase: 3, choiceA: 'Nooit meer muziek', choiceB: 'Nooit meer films' },

  { id: 'LL-I1', text: 'Doe een indruk van jezelf als je wacht op een reactie die maar niet komt.', type: 'interactief', sfeer: ['lachen'], minFase: 1, phase: 4 },

  { id: 'LL-P1', text: 'Wat is je meest bizarre ritueel dat je gewoon bent gaan doen?', type: 'persoonlijk', sfeer: ['lachen'], minFase: 2, phase: 5 },

  { id: 'LL-A1', text: 'Als je dit gesprek zou omschrijven als een gerecht, wat is het dan?', type: 'afsluiter', sfeer: ['lachen'], minFase: 1, phase: 6 },
  { id: 'LL-A2', text: 'Geef dit gesprek een filmtitel.', type: 'afsluiter', sfeer: ['lachen'], minFase: 1, phase: 6 },

  // ══ LEREN KENNEN & VERWONDERING ══════════════════════════════════════════

  { id: 'LK-O1', text: 'Wat is iets dat jij kunt wat de meeste mensen niet van je verwachten?', type: 'opener', sfeer: ['kennen'], minFase: 1, phase: 1 },
  { id: 'LK-O2', text: 'Hoe zou jouw beste vriend je in drie woorden omschrijven?', type: 'opener', sfeer: ['kennen'], minFase: 1, phase: 1 },
  { id: 'LK-O3', text: 'Wat geeft jou energie dat bijna onmogelijk uit te leggen is aan iemand die je niet kent?', type: 'opener', sfeer: ['kennen'], minFase: 1, phase: 1 },

  { id: 'LK-S1', text: 'Welke plek heeft jou het meest gevormd als persoon?', type: 'scenario', sfeer: ['kennen'], minFase: 1, phase: 2 },
  { id: 'LK-S2', text: 'Als je nu één jaar ergens anders mocht wonen, waar ga je?', type: 'scenario', sfeer: ['kennen'], minFase: 1, phase: 2 },

  { id: 'LK-D1', text: 'Altijd weten wat anderen echt van je denken. Of nooit?', type: 'dilemma', sfeer: ['kennen'], minFase: 1, phase: 3, choiceA: 'Altijd weten', choiceB: 'Nooit weten', followUp: 'Wat zou er veranderen als je dat altijd zou weten?' },
  { id: 'LK-D2', text: 'Een leven met heel veel intensieve vriendschappen, of één absolute beste vriend?', type: 'dilemma', sfeer: ['kennen'], minFase: 1, phase: 3, choiceA: 'Veel vriendschappen', choiceB: 'Één echte vriend' },

  { id: 'LK-I1', text: 'Vertel iets dat je al lang wil vertellen maar waar nooit echt naar gevraagd wordt.', type: 'interactief', sfeer: ['kennen'], minFase: 2, phase: 4 },
  { id: 'LK-Pr1', text: 'Wat denk je dat mijn favoriete seizoen is? Raden. Daarna vertel ik je waarom.', type: 'perspective', sfeer: ['kennen'], minFase: 1, phase: 4, followUp: 'Hoe goed denken jullie al te kunnen raden?' },

  { id: 'LK-P1', text: 'Wat is de meest onderschatte eigenschap die jij zoekt in een partner?', type: 'persoonlijk', sfeer: ['kennen'], minFase: 2, phase: 5 },
  { id: 'LK-P2', text: 'Welk moment in je leven heeft je het meest veranderd?', type: 'persoonlijk', sfeer: ['kennen'], minFase: 3, phase: 5 },

  { id: 'LK-A1', text: 'Wat neem je mee uit dit gesprek?', type: 'afsluiter', sfeer: ['kennen'], minFase: 1, phase: 6 },
  { id: 'LK-A2', text: 'Wat wil je dat ik onthoud na vanavond?', type: 'afsluiter', sfeer: ['kennen'], minFase: 2, phase: 6 },

  // ══ FLIRTEN & SPANNING ════════════════════════════════════════════════════

  { id: 'FL-O1', text: 'Wat valt bij jou als eerste op aan iemand, altijd, zonder na te denken?', type: 'opener', sfeer: ['flirten'], minFase: 1, phase: 1 },
  { id: 'FL-O2', text: 'Hoe weet jij dat er chemie is met iemand?', type: 'opener', sfeer: ['flirten'], minFase: 1, phase: 1 },
  { id: 'FL-O3', text: 'Wat is het beste compliment dat je ooit hebt ontvangen?', type: 'opener', sfeer: ['flirten'], minFase: 1, phase: 1 },

  { id: 'FL-S1', text: 'Stel je voor: dit is onze derde date. Wat is er inmiddels anders?', type: 'scenario', sfeer: ['flirten'], minFase: 1, phase: 2 },
  { id: 'FL-D1', text: 'Eerste kus nemen. Of wachten tot de ander dat doet?', type: 'dilemma', sfeer: ['flirten'], minFase: 1, phase: 2, choiceA: 'Zelf nemen', choiceB: 'Wachten', followUp: 'Hoe lang wacht jij eigenlijk?' },

  { id: 'FL-Pr1', text: 'Avond thuis of spontaan ergens naartoe. Wat denk je dat ik leuker vind?', type: 'perspective', sfeer: ['flirten'], minFase: 1, phase: 3, choiceA: 'Avond thuis', choiceB: 'Spontaan ergens naartoe', followUp: 'Had je het verwacht?' },
  { id: 'FL-D2', text: 'Romantisch weekend weg. Of een avond thuisblijven zonder plan?', type: 'dilemma', sfeer: ['flirten'], minFase: 1, phase: 3, choiceA: 'Weekend weg', choiceB: 'Avond thuis zonder plan' },

  { id: 'FL-I1', text: 'Als je nu één ding aan mij zou willen weten, wat is dat?', type: 'interactief', sfeer: ['flirten'], minFase: 2, phase: 4 },

  { id: 'FL-P1', text: 'Wat is iets dat je nu anders doet dan een jaar geleden als het gaat om dating?', type: 'persoonlijk', sfeer: ['flirten'], minFase: 3, phase: 5 },
  { id: 'FL-P2', text: 'Stel dat we dit gesprek over een jaar terugkijken. Wat hoop jij dat er inmiddels is?', type: 'persoonlijk', sfeer: ['flirten'], minFase: 2, phase: 5 },

  { id: 'FL-A1', text: 'Hoe zou je vanavond omschrijven aan iemand morgen?', type: 'afsluiter', sfeer: ['flirten'], minFase: 1, phase: 6 },
  { id: 'FL-A2', text: 'Wat is er vanavond beter gegaan dan je had verwacht?', type: 'afsluiter', sfeer: ['flirten'], minFase: 2, phase: 6 },

  // ══ ECHT DIEPER GAAN ══════════════════════════════════════════════════════

  { id: 'DG-O1', text: 'Wanneer voel jij je het meest jezelf?', type: 'opener', sfeer: ['dieper'], minFase: 1, phase: 1 },
  { id: 'DG-O2', text: 'Wat is iets dat jij vandaag anders denkt dan vijf jaar geleden?', type: 'opener', sfeer: ['dieper'], minFase: 1, phase: 1 },

  { id: 'DG-S1', text: 'Wat zijn de dingen die jouw energie stelen, maar die je toch blijft doen?', type: 'scenario', sfeer: ['dieper'], minFase: 2, phase: 2 },
  { id: 'DG-D1', text: 'Zou je liever alles weten over iemands verleden, of juist niets?', type: 'dilemma', sfeer: ['dieper'], minFase: 1, phase: 2, choiceA: 'Alles weten', choiceB: 'Niets weten', followUp: 'Maakt dat dit gesprek anders voor je?' },

  { id: 'DG-P1', text: 'Wat is iets dat je lang hebt geprobeerd te veranderen aan jezelf, maar uiteindelijk hebt geaccepteerd?', type: 'persoonlijk', sfeer: ['dieper'], minFase: 3, phase: 3 },
  { id: 'DG-P2', text: 'Wanneer voelde jij je voor het eerst echt volwassen?', type: 'persoonlijk', sfeer: ['dieper'], minFase: 2, phase: 3 },

  { id: 'DG-I1', text: 'Wat is de moedigste keuze die je ooit hebt gemaakt?', type: 'interactief', sfeer: ['dieper'], minFase: 2, phase: 4 },

  { id: 'DG-V1', text: 'Wat hoop jij dat iemand over tien jaar van jou zegt?', type: 'persoonlijk', sfeer: ['dieper'], minFase: 2, phase: 5 },
  { id: 'DG-V2', text: 'In welke situaties trek jij je terug, terwijl je eigenlijk verbinding zoekt?', type: 'persoonlijk', sfeer: ['dieper'], minFase: 4, phase: 5 },

  { id: 'DG-A1', text: 'Wat wil je dat ik weet over jou, nu we dit gesprek hebben gehad?', type: 'afsluiter', sfeer: ['dieper'], minFase: 3, phase: 6 },
  { id: 'DG-A2', text: 'Wat heeft dit gesprek bij jou losgemaakt?', type: 'afsluiter', sfeer: ['dieper'], minFase: 2, phase: 6 },

  // ══ ONVERWACHT & VERRASSEND ═══════════════════════════════════════════════

  { id: 'OV-D1', text: 'Liever altijd dezelfde perfecte dag herhalen, of altijd nieuwe dagen beleven die soms tegenvallen?', type: 'dilemma', sfeer: ['verrassend'], minFase: 1, phase: 1, choiceA: 'Perfecte dag herhalen', choiceB: 'Nieuwe dagen beleven', followUp: 'Wat zegt dat over hoe jij in het leven staat?' },
  { id: 'OV-D2', text: 'Je leven als film: romantische komedie of diepgaande documentaire?', type: 'dilemma', sfeer: ['verrassend'], minFase: 1, phase: 1, choiceA: 'Romantische komedie', choiceB: 'Diepgaande documentaire' },

  { id: 'OV-S1', text: 'Als je één vaardigheid mocht stelen van iemand die je kent, van wie en wat?', type: 'scenario', sfeer: ['verrassend'], minFase: 1, phase: 2 },
  { id: 'OV-D3', text: 'Eén jaar lang alles op de automatische piloot, of altijd bewust aanwezig maar uitputtend?', type: 'dilemma', sfeer: ['verrassend'], minFase: 1, phase: 2, choiceA: 'Automatische piloot', choiceB: 'Altijd bewust aanwezig' },

  { id: 'OV-Pr1', text: 'Welk moment van vanavond denk je dat mij het meest bijblijft? Raden. Dan vertel ik je waarom.', type: 'perspective', sfeer: ['verrassend'], minFase: 2, phase: 3, followUp: 'Klopte je voorspelling?' },
  { id: 'OV-Pr2', text: 'Wat denk je dat ik vaker doe als ik nerveus ben: te veel praten of juist stilvallen?', type: 'perspective', sfeer: ['verrassend'], minFase: 1, phase: 3, choiceA: 'Te veel praten', choiceB: 'Stilvallen', followUp: 'Hoe snel had jij dat door?' },
  { id: 'OV-I1', text: 'Stel één vraag die je altijd al wil stellen op een eerste date maar nooit durft.', type: 'interactief', sfeer: ['verrassend'], minFase: 2, phase: 4 },

  { id: 'OV-I2', text: 'Wijs iets aan in de ruimte dat jou aan mij doet denken. Zonder iets te zeggen. Dan leg je uit waarom.', type: 'interactief', sfeer: ['verrassend'], minFase: 2, phase: 4 },

  { id: 'OV-P1', text: 'Wat is het meest onverwachte dat je over jezelf hebt geleerd de afgelopen jaren?', type: 'persoonlijk', sfeer: ['verrassend'], minFase: 2, phase: 5 },

  { id: 'OV-A1', text: 'Als dit gesprek een soundtrack had, welk liedje sluit je er mee af?', type: 'afsluiter', sfeer: ['verrassend'], minFase: 1, phase: 6 },
  { id: 'OV-A2', text: 'Wat is één ding dat je vanavond wil onthouden?', type: 'afsluiter', sfeer: ['verrassend'], minFase: 1, phase: 6 },
]
