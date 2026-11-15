/*
 * Army builder: option text
 *
 * The text shown for a regiment option or a character upgrade: what it costs and what it does.
 *
 * In this file: optInfo(), upgInfo()
 */

function optInfo(o) {
  if (!o) return '';
  const d = o.detail || '';
  let t = '';
  const gi = x => {
    try {
      return ruleInfo(x, bld.fac) || '';
    } catch (e) {
      return '';
    }
  };
  if (o.kind === 'off') {
    t = (OFF[o.name] && OFF[o.name].t) || gi(o.name) || (d ? d : '');
    return (
      'Officer · ' +
      o.name +
      (o.cost ? ' (+' + o.cost + ' pts)' : '') +
      ': ' +
      (t || 'no rules text available for this officer.')
    );
  }
  if (o.kind === 'vet') {
    const g = gi(d);
    return (
      'Veteran (+' +
      o.cost +
      ' pts): the regiment gains ' +
      (d || 'its veteran upgrade') +
      (g ? '. ' + g.replace(/\n/g, ' · ') : '.')
    );
  }
  if (o.kind === 'aux') {
    const ax = ((ENCY.find(x => x.name === bld.fac) || {}).auxiliaries || {})[o.name];
    if (ax)
      return (
        'Auxiliary (+' +
        o.cost +
        ' pts): adds a ' +
        o.name +
        ' stand to the regiment (one Auxiliary per regiment). Clash ' +
        ax.stats.C +
        ', Attacks ' +
        ax.stats.A +
        ', Wounds ' +
        ax.stats.W +
        '; ' +
        ax.rules.join(', ') +
        '. March, Defense, Resolve and Evasion are the regiment’s.'
      );
    let u = null;
    try {
      u = bldUnit(o.name);
    } catch (e) {}
    const ab = u
      ? (u.abilities || [])
          .map(a => a[0])
          .filter(Boolean)
          .slice(0, 6)
          .join(', ')
      : '';
    return (
      'Auxiliary (+' +
      o.cost +
      ' pts): adds a ' +
      o.name +
      ' stand to the regiment (one Auxiliary per regiment)' +
      (ab ? '. Its rules: ' + ab : '') +
      '.'
    );
  }
  if (o.kind === 'order') return o.name + ' (+' + o.cost + ' pts): ' + d + '.';
  t = d || gi(o.name);
  return (
    o.name +
    (o.cost ? ' (+' + o.cost + ' pts)' : '') +
    ': ' +
    (t ? t.replace(/\n/g, ' · ') : 'no rules text available.')
  );
}

function upgInfo(e) {
  return (
    e[1] +
    ' · ' +
    e[0] +
    ' · ' +
    (e[2] ? e[2] + ' pts' : 'free') +
    (e[3] ? ' · for ' + e[3] : '') +
    ': ' +
    (e[4] || '')
  );
}
