/* Spells from the 2026 army lists: range, attunement, scaling, targets and effects. */
const SPELLDB = {
  'Blurred Vision': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    lbl: 'Blurred Vision (counts as in Cover)',
    d: 'A friendly regiment counts as in Cover terrain this round.'
  },
  'Mist Weave': {
    r: 12,
    a: 3,
    t: 'friend',
    st: { E: 1 },
    cap: { E: 2 },
    d: 'A friendly regiment gets +1 Evasion (max 2) this round.'
  },
  'Reshape Destiny': {
    r: 0,
    a: 3,
    t: 'self',
    lbl: 'Reshape Destiny (Aura 12″: chargers gain Unstoppable)',
    d: 'Aura: friendly regiments declaring a Charge within 12″ gain Unstoppable this round.'
  },
  Hoarfrost: { r: 12, a: 4, t: 'enemy', h: [1, 1], d: 'One Hit per success, Armor Piercing (1).' },
  Dominate: { r: 12, a: 3, t: 'enemy', st: { R: -1 }, d: 'An enemy regiment gets −1 Resolve this round.' },
  Enrage: {
    r: 0,
    a: 3,
    t: 'self',
    lbl: 'Enrage',
    x: 'enrage',
    d: 'Friendly regiments within 12″ immediately Rally or Combat Rally out of sequence.'
  },
  'Aspect of Fenrir': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    g: ['Unyielding'],
    d: 'A friendly regiment gains Unyielding this round.'
  },
  'Fruit of the Golden Tree': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Infantry',
    heal: 's',
    d: 'A friendly Infantry regiment heals 1 wound per success.'
  },
  'Glory of Valhalla': {
    r: 12,
    a: 3,
    t: 'friend',
    g: ['Indomitable (2)'],
    d: 'A friendly regiment gains Indomitable (2) this round.'
  },
  "Hela's Caress": { r: 12, a: 4, t: 'enemy', h: [1, 0], d: 'One Hit per success.' },
  "Warbringer's Light": {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    g: ['Blessed'],
    d: 'A friendly regiment gains Blessed this round.'
  },
  'Ice Armor': { r: 0, a: 3, t: 'self', st: { D: 1 }, d: 'Its regiment gets +1 Defense this round.' },
  'Rime Storm': { r: 12, a: 3, t: 'enemy', h: [2, 0], d: 'Two Hits per success.' },
  Encase: { r: 12, a: 3, s: 1, t: 'enemy', st: { M: -2 }, d: 'An enemy regiment gets −2 March this round.' },
  'Aggression Directive': {
    r: 12,
    a: 4,
    t: 'friend',
    q: 'Automaton',
    st: { C: 1 },
    cap: { C: 4 },
    d: 'A friendly Automaton regiment gets +1 Clash (max 4) this round.'
  },
  'Clockwork Parade': {
    r: 12,
    a: 3,
    t: 'friend',
    lbl: 'Clockwork Parade (Charge distance = March +5″)',
    d: 'A friendly regiment’s Charge distance is its March +5″ this round, ignoring the Phalanx limit.'
  },
  'Iron Stride': {
    r: 8,
    a: 2,
    t: 'friend',
    g: ['Ignores Hindering'],
    d: 'A friendly regiment ignores Hindering terrain this round.'
  },
  Torque: {
    r: 12,
    a: 4,
    t: 'friend',
    q: 'nonmonster',
    g: ['Untouchable'],
    d: 'A friendly non-Monster regiment gains Untouchable this round.'
  },
  Othismos: {
    r: 0,
    a: 3,
    t: 'self',
    g: ['Indomitable (3)'],
    lbl: 'Othismos (Command Stand counts as 3 for Seizing)',
    d: 'Its regiment gains Indomitable (3); its Command Stand counts as two extra stands for Seizing.'
  },
  'Molon Labe': { r: 0, a: 3, t: 'self', heal: 's', d: 'Its regiment heals 1 wound per success.' },
  'Temper Resolve': {
    r: 0,
    a: 4,
    t: 'self',
    lbl: 'Temper Resolve (8″: re-roll Defense and Morale 6s)',
    d: 'It and non-Monster regiments within 8″ re-roll Defense and Morale rolls of 6 this round.'
  },
  'Quench Blades': {
    r: 0,
    a: 4,
    t: 'self',
    lbl: 'Quench Blades (8″: re-roll hits of 6, +1 Clash max 4)',
    d: 'Friendly regiments within 8″ re-roll Hit rolls of 6 and get +1 Clash (max 4) this round.'
  },
  'Trident Strike': { r: 6, a: 4, t: 'enemy', h: [1, 0], d: 'One Hit per success.' },
  "Crucible's Fire": {
    r: 0,
    a: 4,
    t: 'self',
    g: ['Aura of Death (7)'],
    d: 'Its regiment gains Aura of Death (7) this round.'
  },
  Cacophony: { r: 12, a: 4, t: 'enemy', h: [1, 0], d: 'One Hit per success.' },
  Crescendo: {
    r: 0,
    a: 4,
    t: 'self',
    x: 'crescendo',
    d: 'Add a Conquest Chant Marker to the Sequence and reorder the top 3 cards of your Command Stack.'
  },
  Dissonance: {
    r: 12,
    a: 4,
    t: 'friend',
    lbl: 'Dissonance (when it Chants, engaged enemies lose Inspired)',
    d: 'When the regiment Chants this round, engaged enemies lose Inspired.'
  },
  Discordance: {
    r: 12,
    a: 4,
    s: 1,
    t: 'enemy',
    lbl: 'Discordance (cannot Seize)',
    d: 'An enemy regiment cannot Seize Objective Zones this round.'
  },
  Resonance: {
    r: 12,
    a: 3,
    s: 1,
    t: 'enemy',
    q: 'inzone',
    g: ['Decay'],
    d: 'An enemy regiment within range of an Objective Zone gains Decay this round.'
  },
  'Dark Supplication': {
    r: 0,
    a: 2,
    t: 'self',
    x: 'supplication',
    d: 'Add 1 token to the Dark Power or Fallen Pantheon pool.'
  },
  'Undying Devotion': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'name:Cultists|Hashashin',
    lbl: 'Undying Devotion (Fallen Pantheon; destroyed stands add tokens)',
    d: 'A friendly Cultists or Hashashin regiment gains the Fallen Pantheon role; each stand destroyed adds a Power token.'
  },
  'Blackflame Coruscation': {
    r: 12,
    a: 3,
    s: 1,
    t: 'enemy',
    h: [1, 0],
    x: 'blackflame',
    d: 'One Hit per success plus Hits equal to your highest Empowerment Tier.'
  },
  'Benediction of the Black Sun': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    q: 'Brute',
    g: ['Blessed'],
    d: 'A friendly Brute regiment gains Blessed this round.'
  },
  'Unholy Baptism': { r: 12, a: 3, t: 'enemy', h: [1, 1], d: 'One Hit per success, Armor Piercing (1).' },
  "Hazlia's Touch": {
    r: 12,
    a: 3,
    t: 'friend',
    x: 'hazlia',
    d: 'A friendly regiment heals wounds equal to the Dark Power Tier (+1 for Creed or Legion regiments).'
  },
  'Dark Immolation': {
    r: 12,
    a: 3,
    t: 'friend',
    g: ['Aura of Death (+1)'],
    d: 'A friendly regiment gains the Creed role and Aura of Death (+1) this round.'
  },
  'Blasphemous Power': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    lbl: 'Blasphemous Power (counts as Dark Power Tier +1)',
    d: 'A friendly regiment counts as one Dark Power Tier higher this round (at the top Tier it gains Flurry and Decay).'
  },
  Insanity: {
    r: 14,
    a: 3,
    t: 'enemy',
    h: [2, 0],
    nm: 1,
    d: 'Two Hits per success, Defense rolled against its lowest Resolve; no Morale Tests.'
  },
  Translocation: {
    r: 0,
    a: 3,
    s: 1,
    t: 'self',
    lbl: 'Translocation (free 8″ March through anything)',
    d: 'Its regiment makes a free 8″ March, ignoring regiments and terrain, sideways or backwards at no penalty. Not while engaged.'
  },
  'Drain Will': {
    r: 12,
    a: 3,
    s: 1,
    t: 'enemy',
    st: { D: -1 },
    d: 'An enemy regiment gets −1 Defense this round.'
  },
  Immolation: {
    r: 0,
    a: 3,
    s: 1,
    t: 'self',
    g: ['Aura of Death (+1)'],
    d: 'Its regiment gains Aura of Death (+1).'
  },
  'Burn to Cinders': {
    r: 12,
    a: 4,
    t: 'enemy',
    h: [1, 0],
    lbl: 'Inflamed',
    d: 'One Hit per success; the target becomes Inflamed.'
  },
  Cauterize: {
    r: 12,
    a: 3,
    t: 'enemy',
    lbl: 'Inflamed, cannot be Healed',
    d: 'The target cannot be healed this round and becomes Inflamed.'
  },
  Ignite: {
    r: 12,
    a: 3,
    t: 'enemy',
    q: 'fx:Inflamed',
    hf: [5, 0],
    nm: 1,
    d: 'An Inflamed enemy takes 5 Hits (no Morale) and loses Inflamed; regiments within 6″ become Inflamed.'
  },
  'Searing Sandstorm': {
    r: 0,
    a: 3,
    t: 'self',
    lbl: 'Searing Sandstorm (Tenacious (1) against Volleys)',
    d: 'When volleyed this round it gains Tenacious (1) and becomes Inflamed.'
  },
  'Molten Blades': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Fire',
    g: ['Cleave (+1)', 'Deadly Blades'],
    d: 'A friendly Court of Fire regiment gains Cleave (1) and Deadly Blades this round.'
  },
  'Wreathed in Fire': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Fire',
    g: ['Untouchable'],
    d: 'A friendly Court of Fire regiment gains Untouchable this round.'
  },
  'Blood to Water': {
    r: 12,
    a: 3,
    t: 'enemy',
    h: [1, 0],
    x: 'bloodwater',
    d: 'One Hit per success; if engaged with a Court of Water regiment, extra Hits equal to its Resolve (2 without one).'
  },
  'Lammelar Flow': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    q: 'Court of Water',
    g: ['Aimed Shot'],
    d: 'A friendly Court of Water regiment gains Aimed Shot this round.'
  },
  'Swirling Embrace': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Water',
    g: ['Untouchable'],
    d: 'A friendly Court of Water regiment gains Untouchable this round.'
  },
  'Induced Hypoxia': {
    r: 12,
    a: 3,
    t: 'enemy',
    lbl: 'Induced Hypoxia (uses its lowest Resolve)',
    d: 'An enemy regiment uses its lowest unmodified Resolve this round.'
  },
  'Flowing Stride': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Water',
    g: ['Ignores Hindering'],
    d: 'A friendly Court of Water regiment ignores Hindering terrain this round.'
  },
  'Water to Blood': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Mortals',
    heal: 5,
    d: 'A friendly Mortal regiment heals 5 wounds.'
  },
  'Lifting Winds': {
    r: 0,
    a: 4,
    t: 'self',
    x: 'liftwinds',
    d: 'Friendly Court of Air regiments within 12″ gain Unstoppable this round.'
  },
  'Lightning Bolt': {
    r: 12,
    a: 3,
    t: 'enemy',
    h: [1, 0],
    x: 'lightning',
    d: 'One Hit per success; if engaged with a Court of Air regiment, extra Hits equal to its Defense.'
  },
  'Homing Winds': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Air',
    lbl: 'Homing Winds (re-roll Volley hits of 6)',
    d: 'A friendly Court of Air regiment re-rolls failed Volley hit rolls of 6 this round.'
  },
  'Air Step': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Air',
    lbl: 'Air Step (free 2″ March in any direction)',
    d: 'A friendly unengaged Court of Air regiment makes a free 2″ March in any direction.'
  },
  Cyclone: {
    r: 12,
    a: 3,
    t: 'enemy',
    h: [1, 0],
    lbl: 'Cyclone (0 stands for Seizing if engaged with Court of Air)',
    d: 'One Hit per success; if engaged with a Court of Air regiment in the Victory Phase it counts as 0 stands for Seizing.'
  },
  'Wind Kissed Blades': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Court of Air',
    g: ['Counter-Attack', 'Parry'],
    d: 'A friendly Court of Air regiment gains Counter-Attack and Parry this round.'
  },
  'Sunder (the Land)': {
    r: 12,
    a: 3,
    t: 'zone',
    need: 3,
    d: 'Needs 3 successes. A target Objective Zone becomes Hindering terrain this round.'
  },
  'Stabilize (the Pattern)': {
    r: 0,
    a: 3,
    t: 'self',
    lbl: 'Stabilize (Aura 8″: Elementals ignore Aura of Death and Decay)',
    d: 'Friendly Elemental regiments within 8″ suffer no Aura of Death or Decay this round.'
  },
  'Overwhelm (the Form)': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    q: 'Court of Earth',
    g: ['Trample (+2)'],
    d: 'A friendly Court of Earth Elemental gains Trample (+2) this round.'
  },
  'Reinforce (the Pattern)': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    q: 'Court of Earth',
    lbl: 'Reinforce (no Charge or Reform; ignores Impact and Trample)',
    d: 'A friendly Court of Earth regiment cannot Charge or Reform and ignores Impact and Trample Hits this round.'
  },
  'Hurl (the Earth)': { r: 12, a: 3, t: 'enemy', hf: [4, 1], d: '4 Hits, Armor Piercing (1).' },
  'Reincarnate (the Self)': { r: 12, a: 4, t: 'friend', heal: 3, d: 'A friendly regiment heals 3 wounds.' },
  'Iron Soul of Discipline': {
    r: 0,
    a: 3,
    t: 'self',
    g: ['Untouchable'],
    x: 'ironsoul',
    d: 'Its regiment gains Untouchable (and Tenacious (1) if below starting strength) this round.'
  },
  'Blossom in the Wind': {
    r: 14,
    a: 3,
    t: 'enemy',
    lbl: 'Blossom in the Wind (no Unstoppable, Charge roll 2D6 lowest)',
    d: 'An enemy loses Unstoppable and rolls 2D6, lowest, for Charge distance (−1 March inside zonal terrain).'
  },
  'Hesitation, Bane of Deeds': {
    r: 14,
    a: 3,
    s: 1,
    t: 'enemy',
    lbl: 'Bane of Deeds (no Inspiration this round)',
    d: 'An enemy cannot benefit from Inspired this round (−1 Clash if no friend within 8″).'
  },
  'Misery of Failure Envisioned': {
    r: 14,
    a: 3,
    t: 'enemy',
    st: { R: -1 },
    d: 'An enemy gets −1 Resolve (−2 if it has not activated) this round.'
  },
  'Repose in Healing Spring': {
    r: 12,
    a: 4,
    t: 'friend',
    q: 'modular',
    heal: 3,
    d: 'A friendly Modular regiment heals 3 wounds.'
  },
  'Honor, a Void of Self': {
    r: 12,
    a: 4,
    t: 'enemy',
    lbl: 'Honor, a Void of Self (no Entourage activation)',
    d: 'An enemy cannot activate as part of an Entourage this round.'
  },
  'Witness of the Void': {
    r: 12,
    a: 4,
    t: 'friend',
    st: { D: 1 },
    cap: { D: 4 },
    d: 'A friendly regiment gets +1 Defense (max 4) this round.'
  },
  'Dancing Shadows': {
    r: 12,
    a: 4,
    t: 'friend',
    g: ['Counter-Attack', 'Parry'],
    d: 'A friendly regiment gains Counter-Attack and Parry this round.'
  },
  Disseminate: {
    r: 0,
    a: 3,
    t: 'self',
    lbl: 'Disseminate (next card activates in Summer)',
    d: 'Your next Command Card activates as if in Summer this round.'
  },
  Dehydrate: {
    r: 16,
    a: 3,
    t: 'enemy',
    st: { M: -1 },
    lbl: 'Dehydrate (no Charge re-rolls)',
    d: 'An enemy gets −1 March and cannot re-roll Charge distance this round.'
  },
  'Heat Haze': { r: 16, a: 4, t: 'enemy', h: [1, 0], d: 'One Hit per success.' },
  Propagate: {
    r: 16,
    a: 4,
    t: 'friend',
    x: 'propagate',
    d: 'Move a Seed Marker from a friendly regiment to up to three friendly regiments within 8″ (one each).'
  },
  'Dark of Winter': {
    r: 0,
    a: 3,
    t: 'self',
    lbl: 'Dark of Winter (next card activates in Winter)',
    d: 'Your next Command Card activates as if in Winter this round.'
  },
  'Armor of Rime': {
    r: 16,
    a: 2,
    s: 1,
    t: 'enemy',
    lbl: 'Armor of Rime (always counts as moving through Hindering)',
    d: 'An enemy always counts as moving through Hindering terrain; others cannot move through it this round.'
  },
  'Mouldering Bloom': { r: 16, a: 3, t: 'enemy', h: [1, 1], d: 'One Hit per success, Armor Piercing (1).' },
  'Heart of Winter': {
    r: 16,
    a: 3,
    s: 1,
    t: 'enemy',
    st: { R: -1 },
    d: 'An enemy gets −1 Resolve; one friendly Court of Winter regiment within 12″ gains Hardened (1).'
  },
  'Kindle Courage': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    g: ['Oblivious'],
    d: 'A friendly regiment gains Oblivious this round.'
  },
  'Fire Dart': { r: 16, a: 4, t: 'enemy', h: [1, 1], d: 'One Hit per success, Armor Piercing (1).' },
  'Earth to Mud': {
    r: 16,
    a: 3,
    s: 1,
    t: 'enemy',
    lbl: 'Earth to Mud (Charge only as first action; max 2 actions)',
    d: 'An enemy can only Charge as its first action and has at most 2 actions this round.'
  },
  'Stone Spikes': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Infantry',
    g: ['Pike Formation'],
    d: 'A friendly Infantry regiment gains Pike Formation this round.'
  },
  "Ninuah's Tears": {
    r: 12,
    a: 4,
    t: 'any',
    q: 'Infantry',
    heal: 's',
    d: 'An Infantry regiment heals 1 wound per success.'
  },
  'Call Fog': {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Infantry',
    lbl: 'Call Fog (counts as in Cover against Volleys)',
    d: 'A friendly Infantry regiment counts as in Cover against Volleys this round.'
  },
  'Seeking Winds': {
    r: 12,
    a: 4,
    s: 1,
    t: 'friend',
    g: ['Sureshot'],
    d: 'A friendly regiment gains Sureshot this round.'
  },
  Guide: {
    r: 12,
    a: 4,
    s: 1,
    t: 'friend',
    st: { V: 1 },
    cap: { V: 4 },
    d: 'A friendly regiment gets +1 Volley (max 4) this round.'
  },
  'Elemental Vortex': {
    r: 12,
    a: 4,
    t: 'friend',
    lbl: 'Elemental Vortex (enemy spells at it: −2 successes)',
    d: 'Enemy spells targeting it count two fewer successes this round.'
  },
  'Elemental Missile': { r: 12, a: null, t: 'enemy', hf: [3, 0], d: 'Automatically cast: 3 Hits.' },
  'Divine Sanction': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    q: 'Theist',
    g: ['Cleave (+1)'],
    d: 'A friendly Theist regiment gains Cleave (+1) this round.'
  },
  Fervour: {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    q: 'Theist',
    g: ['Flurry'],
    d: 'A friendly Theist regiment gains Flurry this round.'
  },
  'Heavenly Blessing': {
    r: 0,
    a: 3,
    s: 1,
    t: 'self',
    g: ['Blessed'],
    d: 'Its regiment gains Blessed this round.'
  },
  'Holy Fire': { r: 12, a: 3, t: 'enemy', h: [2, 0], d: 'Two Hits per success.' },
  "Saint's Favour": {
    r: 12,
    a: 3,
    t: 'friend',
    st: { E: 1 },
    cap: { E: 3 },
    d: 'A friendly regiment gets +1 Evasion (max 3) this round.'
  },
  Coruscation: { r: 16, a: 4, t: 'enemy', h: [1, 0], d: 'One Hit per success.' },
  Fireball: { r: 12, a: 3, t: 'enemy', h: [1, 2], d: 'One Hit per success, Armor Piercing (2).' },
  Flamewall: {
    r: 12,
    a: 3,
    t: 'enemy',
    h: [1, 0],
    x: 'flamewall',
    d: 'One Hit per success; with 4+ successes the target counts as in Hindering terrain this round.'
  },
  'Magmatic Seep': {
    r: 12,
    a: 3,
    t: 'terrain',
    d: 'A piece of zonal terrain is Erupting this round and loses Cover for the rest of the game.'
  },
  Pyroclast: {
    r: 10,
    a: 3,
    t: 'enemy',
    h: [1, 1],
    d: 'One Hit per success, Armor Piercing (1); may target enemies near Erupting terrain at any range as Flank Hits.'
  },
  Eruption: {
    r: 12,
    a: 3,
    t: 'terrain',
    d: 'Zonal terrain Erupts: stands in it take a flank Hit with AP (1); garrisons take 2 Hits and lose Garrison benefits.'
  },
  'Roots of Stone': {
    r: 12,
    a: 4,
    s: 1,
    t: 'any',
    x: 'roots',
    d: 'A friendly regiment gains Counter-Attack and Parry, or an enemy gets −2 March, this round.'
  },
  'Broken Ground': {
    r: 12,
    a: 3,
    t: 'enemy',
    lbl: 'Broken Ground (no Juggernaut or Charge re-rolls; failed Charge hurts)',
    d: 'An enemy loses Juggernaut and cannot re-roll Charge distance; a failed Charge costs wounds equal to the die.'
  },
  'Rock Shaping': {
    r: 12,
    a: 4,
    t: 'enemy',
    h: [1, 0],
    x: 'rockshape',
    d: 'One Hit per success, then add 1 Elemental Power.'
  },
  'Unmake Armor': {
    r: 12,
    a: 'D',
    s: 1,
    t: 'enemy',
    st: { D: -1 },
    lbl: 'Unmake Armor (loses Hardened)',
    d: 'Attunement equals the target’s Defense. It gets −1 Defense and loses Hardened this round.'
  },
  'Temper Plate': {
    r: 12,
    a: 3,
    t: 'friend',
    g: ['Indomitable (1)', 'Tenacious (1)'],
    d: 'A friendly regiment gains Indomitable (1) and Tenacious (1) this round.'
  },
  'Hone Blades': {
    r: 12,
    a: 3,
    s: 1,
    t: 'friend',
    x: 'hone',
    d: 'A friendly regiment re-rolls failed Clash hits of 6 (Tempered regiments gain Deadly Blades instead).'
  },
  Fear: {
    r: 12,
    a: 3,
    s: 1,
    t: 'enemy',
    lbl: 'Fear (Charge roll 2D6 lowest; re-roll passed Morale 1s)',
    d: 'An enemy rolls 2D6, lowest, for Charge distance and re-rolls successful Morale rolls of 1 this round.'
  },
  Dismay: {
    r: 12,
    a: 3,
    s: 1,
    t: 'enemy',
    lbl: 'Dismay (re-roll passed Morale 1s; cannot refuse Duels)',
    d: 'An enemy re-rolls successful Morale rolls of 1; its characters cannot deny Duels.'
  },
  Rancor: {
    r: 8,
    a: 3,
    t: 'friend',
    q: 'Ardent',
    g: ['Juggernaut'],
    d: 'A friendly Ardent regiment gains Juggernaut this round.'
  },
  Resolve: {
    r: 12,
    a: 3,
    t: 'friend',
    q: 'Ardent',
    x: 'resolve',
    d: 'A friendly Ardent regiment gains Indomitable (1 per 2 successes, max 3) this round.'
  },
  'Litanies of Battle': {
    r: 12,
    a: null,
    t: 'friend',
    g: ['Dread'],
    d: 'Automatically cast: a friendly regiment gains Dread this round.'
  },
  'Songs of the Descent': {
    r: 10,
    a: null,
    t: 'enemy',
    x: 'songs',
    d: 'Automatically cast: 1 Hit plus 1 per Awakened friendly regiment within 12″ (max 6).'
  }
};
