/*
 * Action names
 *
 * The name and one-line description of every action.
 *
 * In this file: ACT
 */

const ACT = {
  march: { n: 'March', d: 'Move up to M; sideways and back at half' },
  charge: { n: 'Charge', d: 'Roll D6 + M to reach a target' },
  reform: { n: 'Reform', d: 'Turn up to 180° and reshape' },
  volley: { n: 'Volley', d: 'Shoot with Barrage' },
  aim: { n: 'Take Aim', d: '+1 Volley this activation' },
  rally: { n: 'Rally', d: 'Remove Broken' },
  xclash: { n: 'Extra Clash', d: 'One more Clash (Raging Elements or Savage)' },
  node: { n: 'Detonate Catabolic Node', d: 'D6+4 Hits on every engaged enemy, D6 on itself' },
  flame: { n: 'Flamethrower', d: 'A Volley at the enemy touching its front' },
  xvolley: { n: 'Free Volley', d: 'A Volley that costs no action' },
  soar: { n: 'On Soaring Winds', d: 'March any way, through regiments and terrain' },
  sweep: { n: 'Sweeping Step', d: 'Two Marches through regiments, then a free Clash' },
  rooted: { n: 'Rooted Might', d: 'Seed Markers to friends within 8″' },
  duel: { n: 'Duel', d: 'Challenge an enemy character in contact' },
  xreform: { n: 'Free Reform', d: 'Out of sequence, after destroying a regiment' },
  assassin: { n: 'Clash with the Mimetic Assassin', d: 'Assassination Directive: once per game' },
  clash: { n: 'Clash', d: 'Fight the enemy in contact' },
  creform: { n: 'Combat Reform', d: 'Resolve test, then reshape' },
  inspire: { n: 'Inspire', d: '+1 Clash this activation' },
  btl: { n: 'Break Their Lines', d: 'Implacable: every stand gains Linebreaker' },
  pres: { n: 'Preservation Protocols', d: 'Remove all wounds from the character and its Husk regiment' },
  seed: { n: 'Seedbearer', d: 'A friendly regiment within 12″ gains a Seed Marker' },
  cast: { n: 'Spellcasting', d: 'Cast one of its spells' },
  occupy: { n: 'Occupy building', d: 'Move into it; ends the activation' },
  leave: { n: 'Leave building', d: 'Takes both actions; ends the activation' },
  memory: { n: 'Memories of Old', d: 'Gain its Memory until the end of the round' },
  loadtar: { n: 'Load: Tar Barrels', d: 'Hit: −2 Impact, −2 March, no Charge re-roll' },
  loadboulder: { n: 'Load: Boulder', d: 'Wounds = target Size per Hit, no Defense' },
  loadpot: { n: 'Load: Incendiary Pot', d: 'Barrage = target stands +6' },
  withdraw: { n: 'Withdraw', d: 'Resolve test, fall back' },
  crally: { n: 'Combat Rally', d: 'Remove Broken in combat' },
  fluid: { n: 'Free Reform', d: 'Fluid Formation, first or last' },
  hammer: { n: 'Free Reform', d: 'Hammer and Anvil, last action' },
  fadv: { n: 'Free March', d: 'Fire and Advance, forward or wheel only' },
  dtmarch: { n: 'Free March', d: 'Double Time, after two Marches' },
  trample: { n: 'Trample', d: 'End of activation: automatic Hits on the enemy in front' }
};
