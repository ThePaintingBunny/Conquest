/*
 * Stands
 *
 * A regiment as stands: wounds and casualty order, where each stand sits in the formation, and the
 * footprint of every stand.
 *
 * In this file: regTot(), auxDead(), modHas(), sW(), woundState(), removalSeq(), fullSlots(), layout(),
 *   MODSTYLE, auxStyle(), lostOf(), live(), specials(), allocate(), riderOn(), geom(), standsOf()
 */

function regTot(u) {
  return Math.max(1, (u.stands || 1) - (u.char != null ? 1 : 0) - (u.aux != null && u.auxStats ? 1 : 0));
}

function auxDead(u) {
  return !!(u.aux != null && u.auxStats && (u.auxWounds || 0) >= (+u.auxStats.W || 4));
}

function modHas(u, re) {
  if (!u || !u.mods || !u.modProfiles) return false;
  const liveN = regTot(u) - lostOf(u);
  return u.mods.slice(0, liveN).some(t => ((u.modProfiles[t] || {}).rules || []).some(r => re.test(r)));
}

function sW(u, i) {
  if (u.mods && u.modProfiles) {
    const pr = u.modProfiles[u.mods[i]];
    if (pr) return +pr.W || 4;
  }
  return +(u.stats && u.stats.W) || 4;
}

function woundState(u, wounds) {
  const rt = regTot(u);
  let w = wounds == null ? u.wounds || 0 : wounds,
    l = 0;
  if (!u.mods) {
    const W = sW(u, 0);
    l = Math.min(rt, Math.floor(w / W));
    return { lost: l, rem: l >= rt ? 0 : w - l * W, max: rt * W };
  }
  let max = 0;
  for (let i = 0; i < rt; i++) max += sW(u, i);
  for (const i of removalSeq(u)) {
    const W = sW(u, i);
    if (w >= W) {
      w -= W;
      l++;
    } else break;
  }
  return { lost: l, rem: l >= rt ? 0 : w, max };
}

/* stand order: tokens r0 (command stand), r1.. (other regiment stands), a (auxiliary), c (character) */
function removalSeq(u) {
  const rt = regTot(u),
    out = [];
  if (Array.isArray(u.order)) {
    u.order
      .slice()
      .reverse()
      .forEach(t => {
        if (/^r\d+$/.test(t) && t !== 'r0') {
          const i = +t.slice(1);
          if (i < rt && !out.includes(i)) out.push(i);
        }
      });
  }
  if (!Array.isArray(u.order)) {
    const FS = u.slotBase && u.slotFiles ? { slots: u.slotBase, files: u.slotFiles } : fullSlots(u),
      F = Math.max(1, FS.files || u.files || 1),
      rk = [];
    for (let k = 0; k < FS.slots.length; k += F) rk.push(FS.slots.slice(k, k + F));
    /* rear rank first; within a rank work in from the ends so the survivors stay side by side */
    const ok = t => t && /^r\d+$/.test(t) && t !== 'r0' && +t.slice(1) < rt;
    /* core rules: rearmost rank first; in it, the stand furthest from the Command Stand, alternating ends, the centre-most last */
    const cmdCol = Math.max(0, FS.slots.indexOf('r0')) % F;
    let last = 0;
    rk.reverse().forEach(row => {
      let cand = row.map((t, c) => ({ t, c })).filter(o => ok(o.t));
      while (cand.length) {
        const md = Math.max(...cand.map(o => Math.abs(o.c - cmdCol))),
          tied = cand.filter(o => Math.abs(o.c - cmdCol) === md);
        const pick =
          tied.length > 1
            ? tied.find(o => Math.sign(o.c - cmdCol) === -last) || tied[tied.length - 1]
            : tied[0];
        last = Math.sign(pick.c - cmdCol) || last;
        cand = cand.filter(o => o !== pick);
        const i = +pick.t.slice(1);
        if (!out.includes(i)) out.push(i);
      }
    });
  }
  for (let i = rt - 1; i >= 1; i--) if (!out.includes(i)) out.unshift(i);
  out.push(0);
  return out;
}

/* full-strength positions of every stand (command stand centre front, then the character, then the auxiliary) */
function fullSlots(u) {
  const rt = regTot(u),
    all = [];
  for (let i = 0; i < rt; i++) all.push('r' + i);
  if (u.aux != null && u.auxStats) all.push('a');
  if (u.char != null) all.push('c');
  const N0 = all.length,
    fF = Math.max(1, Math.min(u.files || 1, N0));
  const SP = specials(Object.assign({}, u, { auxWounds: 0 }), fF),
    full = new Array(N0).fill(null);
  const put = (k, t) => {
    if (k != null && k < N0 && full[k] == null && all.includes(t)) full[k] = t;
  };
  put(SP.cmd, 'r0');
  put(SP.aux, 'a');
  put(SP.ch, 'c');
  const rest = all.filter(t => !full.includes(t));
  for (let k = 0; k < N0; k++) if (full[k] == null) full[k] = rest.shift();
  return { files: fF, slots: full };
}

function layout(u) {
  if (riderOn(u)) {
    /* Rider: the character is on the Monster's stand and measures from it */ const v = Object.assign({}, u, {
      char: null,
      rider: false,
      stands: Math.max(1, (u.stands || 2) - 1)
    });
    const L = layout(v),
      m = L.find(x => x.cmd) || L[0];
    return L.concat([
      { pos: m ? m.pos : 0, tok: 'c', kind: 'char', cmd: false, ri: null, mod: null, rider: true }
    ]);
  }
  const G = geom(u),
    n = live(u),
    rt = regTot(u),
    lost = lostOf(u),
    rs = removalSeq(u),
    dead = new Set(rs.slice(0, lost).map(i => 'r' + i));
  const alive = [];
  for (let i = 0; i < rt; i++) if (!dead.has('r' + i)) alive.push('r' + i);
  if (u.aux != null && u.auxStats && !auxDead(u)) alive.push('a');
  if (u.char != null) alive.push('c');
  let seq;
  if (Array.isArray(u.order)) {
    seq = u.order.filter(t => alive.includes(t));
    alive.forEach(t => {
      if (!seq.includes(t)) seq.push(t);
    });
    const sp = t => t === 'r0' || t === 'c' || t === 'a';
    for (let k = G.files; k < seq.length; k++)
      if (sp(seq[k])) {
        let j = Math.min(G.files, seq.length) - 1;
        while (j >= 0 && sp(seq[j])) j--;
        if (j >= 0) {
          [seq[j], seq[k]] = [seq[k], seq[j]];
        }
      }
  } else {
    const FS = u.slotBase && u.slotFiles ? { files: u.slotFiles, slots: u.slotBase } : fullSlots(u);
    if (G.files === FS.files || (G.files < FS.files && G.ranks === 1)) {
      /* every stand keeps its place; casualties leave the rear. If a character (or the command stand) is lost, the rear-most stand steps into its place */
      const slots = FS.slots.map(t => (t && alive.includes(t) ? t : null));
      alive.forEach(t => {
        if (!slots.includes(t)) slots.push(t);
      });
      for (let k = 0; k < slots.length; k++) {
        if (slots[k]) continue;
        let last = -1;
        for (let m = slots.length - 1; m > k; m--)
          if (slots[m]) {
            last = m;
            break;
          }
        if (last < 0) break;
        if (Math.floor(last / FS.files) > Math.floor(k / FS.files)) {
          slots[k] = slots[last];
          slots[last] = null;
        }
      }
      const out = [];
      slots.forEach((t, k) => {
        if (t) out.push({ pos: k, tok: t });
      });
      if (G.files < FS.files && out.length === alive.length && out.every(o => o.pos < FS.files)) {
        out.sort((a, b) => a.pos - b.pos).forEach((o, i) => (o.pos = i));
      }
      if (
        out.length === alive.length &&
        Math.max(...out.map(o => o.pos)) < Math.ceil(n / FS.files) * FS.files
      )
        return out.map(o => ({
          pos: o.pos,
          tok: o.tok,
          kind: o.tok === 'a' ? 'aux' : o.tok === 'c' ? 'char' : 'reg',
          cmd: o.tok === 'r0',
          ri: o.tok[0] === 'r' ? +o.tok.slice(1) : null,
          mod: u.mods && o.tok[0] === 'r' ? u.mods[+o.tok.slice(1)] : null
        }));
    }
    const SP = specials(u, G.files);
    seq = new Array(n).fill(null);
    const put = (k, t) => {
      if (k != null && k < n && seq[k] == null && alive.includes(t)) seq[k] = t;
    };
    put(SP.cmd, 'r0');
    put(SP.aux, 'a');
    put(SP.ch, 'c');
    const rest = alive.filter(t => !seq.includes(t));
    for (let k = 0; k < n; k++) if (seq[k] == null) seq[k] = rest.shift();
    seq = seq.filter(Boolean);
  }
  return seq.slice(0, n).map((t, k) => ({
    pos: k,
    tok: t,
    kind: t === 'a' ? 'aux' : t === 'c' ? 'char' : 'reg',
    cmd: t === 'r0',
    ri: t[0] === 'r' ? +t.slice(1) : null,
    mod: u.mods && t[0] === 'r' ? u.mods[+t.slice(1)] : null
  }));
}

const MODSTYLE = {
  'Oni Ayakashi': ['ON', '#C8553D'],
  'Kami Ayakashi': ['KA', '#6B9E5A'],
  'Tengu Bushi': ['TB', '#5B8FC7'],
  'Tengu Ayakashi': ['TA', '#8C6BB1'],
  'Kappa Bushi': ['KB', '#3E9C95'],
  'Origami Warriors': ['OR', '#E9E2CF']
};

function auxStyle(u) {
  return /sacred band/i.test(u.auxName || '')
    ? { key: 'sb', fill: '#2E3B55', label: 'Sacred Band' }
    : { key: 'mino', fill: '#3B1A14', label: 'Minotaur' };
}

function lostOf(u) {
  return Math.max(0, woundState(u).lost);
}

function live(u) {
  return Math.max(1, (u.stands || 1) - lostOf(u) - (auxDead(u) ? 1 : 0));
}

/* front-rank slots: the Command Stand in the centre, then the Character as close to the centre as possible, then the Auxiliary */
function specials(u, files) {
  const used = new Set(),
    mid = (files - 1) / 2,
    order = Array.from({ length: files }, (_, c) => c).sort(
      (a, b) => Math.abs(a - mid) - Math.abs(b - mid) || b - a
    );
  const pick = on => {
    if (!on) return null;
    for (const c of order)
      if (!used.has(c)) {
        used.add(c);
        return c;
      }
    return null;
  };
  const cmd = pick(true),
    ch = pick(u.char != null),
    aux = pick(u.aux != null && !auxDead(u));
  return { cmd, aux, ch };
}

function allocate(T, tot) {
  if (T.mods) {
    const mx = woundState(T).max,
      w = Math.min(mx, (T.wounds || 0) + tot);
    return { w, aw: T.auxWounds || 0, dead: w >= mx };
  }
  const W = +(T.stats && T.stats.W) || 4,
    hasAux = T.aux != null && !!T.auxStats,
    aW = hasAux ? +T.auxStats.W || W : 0,
    rt = regTot(T);
  let w = T.wounds || 0,
    aw = T.auxWounds || 0,
    left = tot,
    t;
  t = Math.min(left, Math.max(0, Math.max(0, rt - 1) * W - w));
  w += t;
  left -= t;
  if (hasAux) {
    t = Math.min(left, Math.max(0, aW - aw));
    aw += t;
    left -= t;
  }
  t = Math.min(left, Math.max(0, rt * W - w));
  w += t;
  left -= t;
  return { w, aw, dead: w >= rt * W && (!hasAux || aw >= aW) };
}

function riderOn(u) {
  return !!(u && u.rider && u.char != null);
}

function geom(u) {
  const LS = Math.max(1, live(u) - (riderOn(u) ? 1 : 0)),
    files = Math.max(1, Math.min(u.files || 1, LS)),
    ranks = Math.ceil(LS / files),
    sw = u.sw || 2,
    sd = u.sd || 2;
  return { files, ranks, w: files * sw, d: ranks * sd, sw, sd };
}

function standsOf(u) {
  const G = geom(u),
    a = ((u.facing || 0) * Math.PI) / 180,
    f = [Math.sin(a), Math.cos(a)],
    r = [Math.cos(a), -Math.sin(a)],
    n = live(u),
    out = [];
  layout(u).forEach(L => {
    const rr = Math.floor(L.pos / G.files),
      fi = L.pos % G.files,
      cmd = L.cmd,
      aux = L.kind === 'aux',
      ch = L.kind === 'char',
      mod = L.mod;
    const fo = G.d / 2 - (rr + 0.5) * G.sd,
      lo = -G.w / 2 + (fi + 0.5) * G.sw,
      cx = u.x + f[0] * fo + r[0] * lo,
      cy = u.y + f[1] * fo + r[1] * lo,
      hw = G.sw / 2,
      hd = G.sd / 2;
    out.push({
      rank: rr,
      pos: L.pos,
      cmd,
      mod,
      tok: L.tok,
      kind: aux ? 'aux' : ch ? 'char' : 'reg',
      poly: [
        [1, 1],
        [1, -1],
        [-1, -1],
        [-1, 1]
      ].map(([i, j]) => [cx + f[0] * hd * i + r[0] * hw * j, cy + f[1] * hd * i + r[1] * hw * j])
    });
  });
  return out;
}
