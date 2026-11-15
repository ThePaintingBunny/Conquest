/*
 * Opening and closing combat
 *
 * Starts a Clash, Impact or Volley in the combat panel and closes it again.
 *
 * In this file: cb, pick, openCombat(), maybeAutoAI(), autoRunning, closeCombat()
 */

let cb = null,
  pick = null;

function openCombat(o) {
  if (o && o.type === 'clashAfterNode') return clashAfterNode(o);
  if (o && Array.isArray(o.split) && splitStale(o)) return;
  setTimeout(() => {
    const c = $('combat');
    if (c && !c.hidden)
      try {
        revealIn(c);
      } catch (e) {}
  }, 120);
  if (o && o.type === 'volley' && o.tgt && o.att) {
    const T0 = byId(o.tgt),
      A0 = byId(o.att);
    if (T0 && A0 && fx(T0).some(x => /^Prowling/.test(x)) && polyDist(corners(A0), corners(T0)) >= 8) {
      toast('That regiment is Prowling: it cannot be seen from 8″ or more.');
      return;
    }
  }
  cb = Object.assign({ step: 'att', groups: null, cover: false, owner: HU }, o);
  if (cb.type === 'volley' && cb.tgt && rh((byId(cb.tgt) || {}).rules || [], 'Loose Formation'))
    cb.cover = true;
  if (cb.type === 'volley' && cb.tgt && cb.att) {
    const cv = tCover(byId(cb.att), byId(cb.tgt)),
      sure = (() => {
        const AA = byId(cb.att);
        return rh(RU(AA), 'Sureshot') || (AA.charName && rh(chRulesX(AA), 'Sureshot'));
      })();
    if (cv && !sure) {
      cb.cover = true;
      cb.coverWhy = cv;
    } else if (cv && sure) setTimeout(() => toast('Sureshot: no penalty for ' + cv + '.'), 30);
    cb.vst = volleyStands(byId(cb.att), byId(cb.tgt));
    const lo = cb.vst.some(v => v.inRange && v.clear)
      ? null
      : (cb.vst.find(v => v.inRange && v.blocker) || {}).blocker || 'terrain or a regiment';
    if (arcingOn(byId(cb.att)) || cb.arcing) {
      cb.arcing = true;
      act.arcUsed = true;
    } else if (lo) setTimeout(() => toast('Check Line of Sight: ' + lo + ' is in the way.'), 30);
  }
  if (cb.type === 'freform') {
    cb.hits = 0;
    cb.wounds = cb.preWounds;
    cb.step = cb.noMorale ? 'done' : 'mor';
    cb.extra = 0;
    cb.groups = [];
  } else if (cb.type === 'lethal') {
    cb.hits = cb.lethalHits;
    cb.step = 'def';
    cb.groups = [
      {
        label: cb.lethalLabel || 'Lethal Demise',
        n: cb.lethalHits,
        nUse: cb.lethalHits,
        hits: cb.lethalHits,
        ones: 0,
        red: cb.lethalRed || 0,
        rolls: null
      }
    ];
  } else if (cb.tgt) cb.groups = buildGroups(cb.type, byId(cb.att), byId(cb.tgt));
  renderCombat();
  renderCard();
  maybeAutoAI();
  try {
    revealIn($('combat'));
  } catch (e) {}
}

function maybeAutoAI() {
  if (PVP()) return;
  if (cb && !aiBusy && !autoRunning) {
    const A = base(cb.att);
    if (A && A.side === AI && cb.tgt) {
      setTimeout(async () => {
        if (autoRunning || aiBusy || !cb) return;
        autoRunning = true;
        try {
          await autoResolve();
        } finally {
          autoRunning = false;
        }
      }, 400);
    }
  }
}

let autoRunning = false;

function closeCombat() {
  if (PVP() && cb && cb.owner !== HU) return;
  if (cb && cb.inAct && act && act.cur && (act.cur.type === 'clash' || act.cur.type === 'volley'))
    act.cur = null;
  cb = null;
  renderCombat();
  render();
}
