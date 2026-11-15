/*
 * Temporary rules
 *
 * Granting a regiment rules or stat changes until the end of the round (or until lost), and removing
 * them again.
 *
 * In this file: grantU(), ungrantU(), grantLoseU(), hasGrant(), grant()
 */

/* temporary rules and stat changes that last until the end of the round */
function grantU(x, src, rules, stats) {
  if ((x.temp || []).some(g => g.src === src)) return x;
  const y = Object.assign({}, x),
    d = {};
  y.rules = (x.rules || []).concat(rules || []);
  if (stats) {
    y.stats = Object.assign({}, x.stats);
    Object.entries(stats).forEach(([k, v]) => {
      if (k === 'M') {
        y.m = (+x.m || 0) + v;
        y.stats.M = (+y.stats.M || 0) + v;
        d.M = v;
        return;
      }
      const b = +y.stats[k] || 0;
      let a = b + v;
      if (k === 'E') a = Math.min(a, Math.max(3, b));
      d[k] = a - b;
      y.stats[k] = a;
    });
  }
  y.temp = (x.temp || []).concat([{ src, rules: rules || [], d }]);
  y.effects = (x.effects || []).includes(src) ? x.effects || [] : (x.effects || []).concat([src]);
  return y;
}

function ungrantU(x, pred) {
  if (!x.temp || !x.temp.length) return x;
  const drop = x.temp.filter(g => !pred || pred(g.src)),
    keep = x.temp.filter(g => pred && !pred(g.src));
  const y = Object.assign({}, x),
    r = (x.rules || []).slice(),
    st = Object.assign({}, x.stats);
  let m = +x.m || 0;
  drop.forEach(g => {
    (g.rules || []).forEach(q => {
      const i = r.lastIndexOf(q);
      if (i >= 0) r.splice(i, 1);
    });
    (g.lost || []).forEach(q => r.push(q)); /* rules the grant took away come back */
    Object.entries(g.d || {}).forEach(([k, v]) => {
      if (k === 'M') {
        m -= v;
        st.M = (+st.M || 0) - v;
      } else st[k] = (+st[k] || 0) - v;
    });
  });
  y.rules = r;
  y.stats = st;
  y.m = m;
  y.effects = (x.effects || []).filter(e => !drop.some(g => g.src === e));
  y.temp = keep;
  return y;
}

/* a grant that also removes rules until it ends (Inscription of Lighter Alloys: loses Phalanx and Shield) */
function grantLoseU(x, src, rules, stats, lose) {
  const y = grantU(x, src, rules, stats);
  if (y === x) return x;
  const lost = (y.rules || []).filter(r => lose.some(re => re.test(String(r))));
  y.rules = (y.rules || []).filter(r => !lost.includes(r));
  y.temp = y.temp.map(g => (g.src === src ? Object.assign({}, g, { lost }) : g));
  return y;
}

function hasGrant(u, src) {
  return !!u && (u.temp || []).some(g => g.src === src);
}

async function grant(id, src, rules, stats, note, extra) {
  const u = base(id);
  if (!u) return false;
  if (hasGrant(u, src)) {
    toast('Already active this round.');
    return false;
  }
  await putState(
    Object.assign(
      {
        units: state.units.map(x => (x.id === id ? grantU(x, src, rules, stats) : x)),
        lastTitle: N(u.side) + ' · ' + (u.short || u.name),
        lastText: note || src
      },
      extra || {}
    )
  );
  return true;
}
