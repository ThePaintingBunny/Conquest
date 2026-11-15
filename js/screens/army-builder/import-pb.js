/*
 * Army builder: import from the Para Bellum app
 *
 * Reads the text the official Para Bellum army builder copies (no AI): the army name and points, the
 * faction, each character with its upgrades ("==" lines) and each regiment with its stands and options
 * ("*" lines). The list becomes the army builder's draft, so it is checked and can be saved like any other.
 * Anything the reader does not recognise, and any points that differ from this builder's, are listed for
 * the player to check.
 *
 *   === The Last Argument of Kings ===
 *   The scholean army [2000/2000]
 *   The City States
 *   == (Warlord) Ipparchos [120]: Initiative
 *    * Companion Cavalry (4) [180]:
 *    * Thorakites (4) [170]: Minotaur Thyrean Auxiliary
 *    * War Chariots (Flogobollon//Skorpios) (2) [270]: Skorpios (2)
 *
 * In this file: pbNorm(), pbItems(), pbLooks(), pbMatch(), pbParse(), pbImport(), abImportNote,
 *   pbDialog(), pbToList()
 */

/* letters and digits only, lower case, without accents: for matching names */
function pbNorm(t) {
  return String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* split "a, b (1, 2), c" on the commas outside brackets */
function pbItems(t) {
  const out = [];
  let depth = 0,
    cur = '';
  for (const ch of String(t || '')) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && !depth) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

/* does this text look like a Para Bellum app export */
function pbLooks(text) {
  return /^\s*===.*===\s*$/m.test(text) && /^\s*==\s*\S/m.test(text) && /\[\d+\]/.test(text);
}

/* the best match for an item among names: exact, then the longest name the item starts with or contains */
function pbMatch(item, names) {
  const n = pbNorm(item);
  if (!n) return null;
  const exact = names.find(x => pbNorm(x) === n);
  if (exact) return exact;
  const hits = names
    .filter(x => {
      const k = pbNorm(x);
      return k && (n.startsWith(k + ' ') || n.endsWith(' ' + k) || n.includes(' ' + k + ' '));
    })
    .sort((a, b) => pbNorm(b).length - pbNorm(a).length);
  return hits[0] || null;
}

function pbParse(text) {
  const notes = [],
    out = { fac: null, wbs: [], warlord: 0, name: '' };
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  let limit = null,
    wb = null;
  const facNames = ENCY.map(f => f.name);
  for (const ln of lines) {
    if (/^===.*===$/.test(ln)) continue;
    /* army name and points */
    let m = ln.match(/^(.*?)\s*\[(\d+)\s*\/\s*(\d+)\]$/);
    if (m && !out.wbs.length) {
      out.name = m[1].trim();
      limit = +m[3];
      continue;
    }
    /* a character */
    m = ln.match(/^==\s*(\(Warlord\)\s*)?(.+?)\s*\[(\d+)\](?:\s*:\s*(.*))?$/i);
    if (m) {
      if (!out.fac) {
        notes.push('No faction line was found before the first character.');
        break;
      }
      const F = ENCY.find(f => f.name === out.fac),
        chars = F.units.filter(u => u.kind === 'char').map(u => u.name);
      const nm = pbMatch(m[2], chars) || pbMatch(m[2].replace(/\s*\(.*\)\s*$/, ''), chars);
      if (!nm) {
        notes.push('Unknown character “' + m[2] + '”: its warband was skipped.');
        wb = null;
        continue;
      }
      wb = { char: nm, regs: [], upg: [], _pts: +m[3], _line: m[2] };
      if (m[1]) out.warlord = out.wbs.length;
      out.wbs.push(wb);
      const upNames = ((UPG[out.fac] || {}).list || []).map(x => x[1]);
      pbItems(m[4]).forEach(it => {
        const u = pbMatch(it, upNames);
        if (u) wb.upg.push(u);
        else if (WAD_CULTS.some(c => pbNorm(it).includes(pbNorm(c))) && out.fac === "W'adrhŭn")
          wb.cult = WAD_CULTS.find(c => pbNorm(it).includes(pbNorm(c)));
        else notes.push(nm + ': upgrade “' + it + '” is not in this builder; add it by hand if needed.');
      });
      continue;
    }
    /* a regiment */
    m = ln.match(/^\*\s*(.+?)\s*\((\d+)\)\s*\[(\d+)\](?:\s*:\s*(.*))?$/);
    if (m) {
      if (!wb) {
        notes.push('“' + m[1] + '” has no character above it: skipped.');
        continue;
      }
      const F = ENCY.find(f => f.name === out.fac),
        regs = F.units.filter(u => u.kind !== 'char');
      const bare = m[1].replace(/\s*\(.*\)\s*$/, '');
      const items = pbItems(m[4]);
      /* War Chariots: the chariots are named in the options, with how many of each */
      /* (the slot is named by its kinds, "War Chariots (Flogobollon//Skorpios)", so match on the bare name) */
      if (
        /chariot/i.test(bare) &&
        !pbMatch(
          bare,
          regs.map(u => u.name)
        )
      ) {
        const kinds = regs.filter(isChariot).map(u => u.name),
          ch = [];
        items.forEach(it => {
          const k = pbMatch(it.replace(/\(\d+\)/, ''), kinds),
            n = +((it.match(/\((\d+)\)/) || [])[1] || 1);
          if (k) for (let i = 0; i < n; i++) ch.push(k);
          else notes.push(wb.char + ' · War Chariots: “' + it + '” is not a known chariot.');
        });
        if (!ch.length) {
          notes.push(wb.char + ' · War Chariots: no chariots named, skipped.');
          continue;
        }
        wb.regs.push({
          chariots: ch.slice(0, 2).concat(ch.length < 2 ? [''] : []),
          _pts: +m[3],
          _line: m[1]
        });
        continue;
      }
      const un =
        pbMatch(
          m[1],
          regs.map(u => u.name)
        ) ||
        pbMatch(
          bare,
          regs.map(u => u.name)
        );
      const u = un && regs.find(x => x.name === un);
      if (!u) {
        notes.push(wb.char + ': unknown regiment “' + m[1] + '”, skipped.');
        continue;
      }
      const o = regOptions(u).opts,
        r = { unit: un, opts: [], _pts: +m[3], _line: m[1] };
      items.forEach(it => {
        const k = pbMatch(
          it,
          o.map(x => x.name)
        );
        if (k) r.opts.push(k);
        else notes.push(un + ': option “' + it + '” is not in this builder; add it by hand if needed.');
      });
      /* the app counts an Auxiliary Stand among the stands; this builder adds it on top */
      const n = +m[2],
        hasAux = r.opts.some(k => (o.find(x => x.name === k) || {}).kind === 'aux');
      const tries = hasAux ? [n - 1, n] : [n, n - 1];
      r.stands = tries[0];
      for (const s of tries) {
        if (s < 1) continue;
        r.stands = s;
        if (rowPts(r) === +m[3]) break;
      }
      if (rowPts(r) !== +m[3]) r.stands = tries[0];
      wb.regs.push(r);
      continue;
    }
    /* the faction */
    const f = !out.fac && pbMatch(ln, facNames);
    if (f) {
      out.fac = f;
      continue;
    }
    if (!out.fac) notes.push('Line not understood: “' + ln + '”.');
  }
  return { bld: out, notes, limit };
}

/* load a parsed list into the army builder, and list what to check */
function pbImport(text) {
  if (!pbLooks(text)) {
    toast('That does not look like a list copied from the Para Bellum army builder.');
    return false;
  }
  const prev = JSON.stringify(bld);
  /* points are worked out with the imported faction's data */
  const keep = bld;
  bld = { fac: null, wbs: [], warlord: 0 };
  const facLine = String(text)
    .split('\n')
    .map(l => l.trim())
    .find(l => ENCY.some(f => pbNorm(f.name) === pbNorm(l)));
  if (facLine) bld.fac = ENCY.find(f => pbNorm(f.name) === pbNorm(facLine)).name;
  const R = pbParse(text);
  if (!R.bld.fac || !R.bld.wbs.length) {
    bld = keep;
    toast(R.notes[0] || 'No faction or characters were found in that list.');
    return false;
  }
  bld = R.bld;
  /* compare points with the app, line by line */
  const notes = R.notes.slice();
  bld.wbs.forEach(w => {
    const cp = wbPtsChar(w);
    if (w._pts != null && cp !== w._pts)
      notes.push(w.char + ': the app says ' + w._pts + ' pts, this builder counts ' + cp + '.');
    w.regs.forEach(r => {
      const rp = rowPts(r);
      if (r._pts != null && rp !== r._pts)
        notes.push(
          (r.unit || 'War Chariots') +
            ' (' +
            w.char +
            '): the app says ' +
            r._pts +
            ' pts, this builder counts ' +
            rp +
            '.'
        );
      delete r._pts;
      delete r._line;
    });
    delete w._pts;
    delete w._line;
  });
  if (R.limit) abSetLimit(R.limit);
  abImportNote = {
    head:
      'Imported “' +
      (bld.name || 'army') +
      '” from the Para Bellum app: ' +
      bld.wbs.length +
      ' warband' +
      (bld.wbs.length === 1 ? '' : 's') +
      ', ' +
      bldTotal() +
      ' pts.',
    notes
  };
  abPick = null;
  abRe();
  if (prev !== JSON.stringify({ fac: null, wbs: [], warlord: 0 }) && JSON.parse(prev).wbs?.length)
    abUndoOffer('Your previous draft was replaced.', prev);
  return true;
}

/* the result of the last import, shown at the top of the builder until dismissed */
let abImportNote = null;

/* the import box: a dialog with a text area */
function pbDialog() {
  let d = $('pb-dlg');
  if (!d) {
    d = document.createElement('dialog');
    d.id = 'pb-dlg';
    d.className = 'en-dlg pb-dlg';
    document.body.append(d);
  }
  d.innerHTML = '';
  const ta = bEl('textarea', {
    rows: 14,
    placeholder:
      '=== The Last Argument of Kings ===\n\nMy army [2000/2000]\nThe City States\n\n== (Warlord) Polemarch [90]: …\n * Hoplites (3) [120]: …'
  });
  ta.setAttribute('aria-label', 'List copied from the Para Bellum army builder');
  const go = bEl('button', { type: 'button', className: 'btn', textContent: 'Import' });
  go.onclick = () => {
    if (pbImport(ta.value)) d.close();
  };
  const cancel = bEl('button', {
    type: 'button',
    className: 'btn ghost',
    textContent: 'Cancel',
    onclick: () => d.close()
  });
  d.append(
    bEl('div', { className: 'en-dbody' }, [
      bEl('h2', { textContent: 'Import from the Para Bellum app' }),
      bEl('p', {
        className: 'hint',
        textContent:
          'In the official army builder, copy your list as text and paste it here. It becomes your draft in this builder, where it is checked and can be saved.'
      }),
      ta,
      bEl('div', { className: 'pb-acts' }, [cancel, go])
    ])
  );
  d.showModal();
  ta.focus();
}

/* a Para Bellum export straight to a game list, without touching the builder draft */
function pbToList(text) {
  if (!pbLooks(text)) return null;
  const keep = bld;
  try {
    bld = { fac: null, wbs: [], warlord: 0 };
    const facLine = String(text)
      .split('\n')
      .map(l => l.trim())
      .find(l => ENCY.some(f => pbNorm(f.name) === pbNorm(l)));
    if (facLine) bld.fac = ENCY.find(f => pbNorm(f.name) === pbNorm(facLine)).name;
    const R = pbParse(text);
    if (!R.bld.fac || !R.bld.wbs.length) return null;
    bld = R.bld;
    bld.wbs.forEach(w => {
      delete w._pts;
      delete w._line;
      w.regs.forEach(r => {
        delete r._pts;
        delete r._line;
      });
    });
    const L = bldToList();
    return L && L.units.length ? L : null;
  } finally {
    bld = keep;
  }
}
