/*
 * Charge special rules
 *
 * Charge bonuses and what a successful Charge triggers: Fury, Wedge!, Glorious Charge, Death from
 * Above, Thundering Charge, Combined Arms Drills, Like Gods Among Men and more.
 *
 * In this file: cadArmy(), CAD_MARK, lgamTargets(), inObjZone(), cadOnCharge(), endocrineNear(),
 *   srChargeBonus(), srOnCharge()
 */

/* Combined Arms Drills (City States Mastery): an enemy that charges a friendly Infantry regiment is marked; friendly
   Brutes and Cavalry that then successfully charge it gain Terrifying (+1), to at most Terrifying (2), for that activation */
function cadArmy(side) {
  return all().some(x => x.side === side && !x.destroyed && upgOf(x, /Combined Arms Drills/));
}

const CAD_MARK = 'Charged Infantry (Combined Arms Drills)';

/* friendly Infantry regiments within 8″ of the Cavalry regiment that can be healed (most wounded first) */
function lgamTargets(C) {
  return all()
    .filter(
      x =>
        x.side === C.side &&
        x.onTable &&
        !x.destroyed &&
        /Infantry/.test(x.cls || '') &&
        (+x.wounds || 0) > 0 &&
        canHeal(x) &&
        polyDist(corners(C), corners(x)) <= 8
    )
    .sort((a, b) => (+b.wounds || 0) - (+a.wounds || 0));
}

function inObjZone(u) {
  return !!u && u.onTable && zonesOf().some(z => standsOf(u).some(st => inZone(st.poly, z)));
}

function cadOnCharge(cid, tid) {
  const C = byId(cid),
    T = byId(tid);
  if (!C || !T) return;
  let units = null;
  const put = f => (units = (units || state.units).map(f));
  const notes = [];
  /* Like Gods Among Men (Hundred Kingdoms Mastery): after its Cavalry regiment completes a successful Charge, a friendly
     Infantry regiment within 8″ of the Cavalry (closest points) heals 4 wounds. The player picks it in the activation
     panel; the AI takes the most wounded. */
  if (upgOf(C, /Like Gods Among Men/) && /Cavalry/.test(C.cls || '')) {
    const L = lgamTargets(C);
    const auto = !PVP() && C.side === AI;
    if (L.length && !auto && act && act.id === cid) {
      act.lgam = true;
      notes.push('Like Gods Among Men: choose a friendly Infantry regiment within 8″ to heal 4 wounds');
    }
    const H = auto ? L[0] : null;
    if (H) {
      const n = Math.min(4, +H.wounds || 0);
      put(x => (x.id === H.id ? Object.assign({}, x, { wounds: (+x.wounds || 0) - n }) : x));
      notes.push('Like Gods Among Men: ' + (H.short || H.name) + ' heals ' + n);
    }
  }
  /* Scars of Endekar (W'adrhŭn, Cult of Famine): a successful Charge on an enemy within range of an Objective Zone
     gives Terrifying (+1) until the end of the round */
  if (upgOf(C, /Scars of Endekar/) && inObjZone(T)) {
    put(x => (x.id === cid ? grantU(x, 'Scars of Endekar', ['Terrifying (+1)']) : x));
    notes.push('Scars of Endekar: ' + (C.short || C.name) + ' gains Terrifying (+1) this round');
  }
  if (/Brute|Cavalry/.test(C.cls || '') && cadArmy(C.side) && hasGrant(base(T.id), CAD_MARK)) {
    const now = rx(RU(C), 'Terrifying');
    if (now < 2 && act && act.id === cid) {
      act.extraFx.push('Terrifying (+1) (Combined Arms Drills)');
      notes.push('Combined Arms Drills: ' + (C.short || C.name) + ' gains Terrifying (+1) this activation');
    }
  }
  if (/Infantry/.test(T.cls || '') && cadArmy(T.side) && !hasGrant(base(C.id), CAD_MARK))
    put(x => (x.id === cid ? grantU(x, CAD_MARK, []) : x));
  if (notes.length) toast(notes.join(' · ') + '.');
  if (units)
    putState(
      Object.assign(
        { units },
        notes.length ? { lastTitle: N(C.side) + ' · Charge', lastText: notes.join('; ') + '.' } : {}
      )
    );
}

/* Endocrine Overstimulation (Spires): friendly regiments within 8″ of the character roll 2D6, highest, for the Charge */
function endocrineNear(u) {
  return all().some(
    x =>
      x.side === u.side &&
      x.onTable &&
      !x.destroyed &&
      upgOf(x, /Endocrine Overstimulation/) &&
      (x.id === u.id || polyDist(corners(x), corners(u)) <= 8)
  );
}

function srChargeBonus(u, t) {
  let b = 0;
  const F = fx(u).concat((u.rules || []).filter(r => /^Charge \+\d+″/.test(r) && !fx(u).includes(r)));
  F.forEach(x => {
    const k = x.match(/^Charge \+(\d+)″/);
    if (k) b += +k[1];
  });
  if (t) {
    if (rh(u.rules, 'Hubris') && t.type === 'monster') b += 3;
    if (rh(u.rules, 'Arrogance') && (t.type === 'monster' || t.charName)) b += 3;
    if (fx(t).some(x => /^Marked \(Designate Target\)/.test(x))) b += 2;
  }
  if (srHas(u, /^Divine Purpose/) && act && act.id === u.id && !act.dpUsed) b += 2;
  /* Seize the Advantage: Imperial regiments activated as an Entourage get +2″ Charge */
  if (act && act.id === u.id && act.source === 'entourage' && frRoles(u).includes('Imperial') && seizeAdv(u))
    b += 2;
  /* Bloody Sacrifice: +1 March until the end of the first action (a Charge as the first action) */
  if (act && act.bloody && srFirstAct(u)) b += 1;
  return b + srMarchMod(u);
}

/* ---- successful charge: Fury, Wedge!, Glorious Charge, Death from Above, Thundering Charge, Savage Retaliation ... ---- */
function srOnCharge(u, c) {
  const R = RU(u),
    T = byId(c.target);
  if (!T) return;
  const push = x => {
    if (!act.extraFx.includes(x)) act.extraFx.push(x);
  };
  if (rh(R, 'Fury')) push('Fury (+1 Attacks)');
  if (rh(R, 'Wedge!') || rh(R, 'Wedge') || rh(R, 'Sundering Charge')) push('Cleave (+1)');
  if (rh(R, 'Glorious Charge')) push('Glorious Charge (Impact +1 Clash, Terrifying (1))');
  const arc = c.face || arcOf(T, [u.x, u.y]);
  if (rh(R, 'Death from Above') && arc !== 'front') push('Brutal Impact (2)');
  const used = act.actions.filter(a => !a.free),
    prev = used[used.length - 1];
  if (act.thunder && prev && prev.type === 'march') push('Brutal Impact (+1)');
  if (rh(R, 'Resounding Malevolence') && prev && prev.type === 'march') act.resoundT = T.id;
  if (arc === 'front' && offOn(T, 'dori'))
    act.postFx = (act.postFx || []).concat([[T.id, 'Inspired (Dorilates)']]);
  if (rh(RU(T), 'Savage Retaliation') && arc === 'front' && !mostlyHindering(T))
    srQueue({
      type: 'impact',
      att: T.id,
      tgt: u.id,
      inAct: false,
      selfTitle: 'Savage Retaliation',
      retal: true
    });
}
