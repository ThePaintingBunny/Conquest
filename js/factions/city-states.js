/*
 * City States
 *
 * Strategic Stack and Direct Orders, and the Eidolon's Combat Directives.
 *
 * In this file: canStrat(), directOrders(), stratU(), stratWhy(), ordersU(), CDIR, cdirKeys(),
 *   cdirOf(), cdirSet()
 */

function canStrat(side) {
  const a = (state.army && state.army[side]) || [];
  if (a.length) return a.some(x => /Strategic Stack/.test(x));
  return facOf(N(side)) === 'City States';
}

function directOrders(side) {
  const a = (state.army && state.army[side]) || [];
  if (a.length) return a.some(x => /Direct Orders/.test(x));
  return facOf(N(side)) === 'City States';
}

function stratU(u) {
  return canStrat(u.side) && (!u.fac || u.fac === 'City States');
}

/* the card in the Strategic Stack is played after this turn's normal activation, or when no Command Stack card is
   left; '' when it can be played now, otherwise why not */
function stratWhy() {
  if (SBX() || !huStackOn()) return '';
  if (!validCards(PS().huStack || []).length) return '';
  if (myTurnCards != null && humanCardsLeft() < myTurnCards) return '';
  return 'Activate your drawn card first: the Strategic Stack card can be played after it, or once your Command Stack is empty.';
}

function ordersU(u) {
  return directOrders(u.side) && (!u.fac || u.fac === 'City States');
}

/* ---- City States: Combat Directives (Eidolon) after each Supremacy Phase ---- */
const CDIR = {
  'Greetings to a Fellow General': ['Greetings to a Fellow General (+5 Attacks, −1 Evasion)', []],
  'Secure the Breach': ['Secure the Breach (Parry)', ['Parry']],
  'Precision Armament': ['Precision Armament (character Cleave +3)', []],
  /* Alternate Programming (Eidolon Modification) replaces the first two */
  'Heavy Exoskeleton': ['Heavy Exoskeleton (Brute: Brutal Impact +1)', ['Brutal Impact (+1)'], true],
  Relentless: ['Relentless (Brute: Oblivious)', ['Oblivious'], true]
};

/* the Directives this Eidolon may choose */
function cdirKeys(u) {
  return u && upgOf(u, /Alternate Programming/)
    ? ['Heavy Exoskeleton', 'Relentless', 'Precision Armament']
    : ['Greetings to a Fellow General', 'Secure the Breach', 'Precision Armament'];
}

function cdirOf(u) {
  return Object.keys(CDIR).find(k => hasGrant(u, CDIR[k][0]));
}

function cdirSet(id, k) {
  const D = CDIR[k];
  /* the Brute-only Directives give nothing to a regiment that is not a Brute */
  const rules = D[2] && !/Brute/.test((base(id) || {}).cls || '') ? [] : D[1];
  return putState({
    units: state.units.map(x => (x.id === id ? grantU(x, D[0], rules) : x)),
    lastTitle: N(base(id).side) + ' · Combat Directive',
    lastText: 'The Eidolon chooses ' + k + ' until the end of the round.'
  });
}
