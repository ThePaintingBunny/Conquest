/*
 * Checks the scripts in src/js. Run with: npm run check
 *
 * The game's scripts share one global scope and load in the order listed in src/index.html, so three things
 * can go wrong when files are added or code is moved. This tool looks for each of them:
 *
 *   1. a script on disk that index.html does not load, or a listed script that does not exist;
 *   2. the same top-level name declared in two places (the second would silently replace the first);
 *   3. code that runs while the page loads and uses something from a script that has not loaded yet.
 *
 * It also reports scripts without a file header.
 */
const { scriptList, scriptsOnDisk, parseScript } = require('./scripts');

const problems = [];
const listed = scriptList();

// 1. index.html and the files on disk agree
const onDisk = new Set(scriptsOnDisk());
const seen = new Set();
listed.forEach(f => {
  if (!onDisk.has(f)) problems.push(`index.html loads js/${f}, which does not exist`);
  if (seen.has(f)) problems.push(`index.html loads js/${f} twice`);
  seen.add(f);
});
onDisk.forEach(f => {
  if (!seen.has(f)) problems.push(`js/${f} is not loaded by index.html`);
});

const scripts = listed.filter(f => onDisk.has(f)).map(parseScript);
scripts.forEach(s => {
  if (!s.header) problems.push(`js/${s.file} has no file header`);
});

// 2. every top-level name is declared once
const declared = new Map(); // name -> statement
let position = 0;
scripts.forEach((script, fileIndex) =>
  script.statements.forEach(st => {
    st.fileIndex = fileIndex;
    st.position = position++;
    st.names.forEach(name => {
      if (declared.has(name))
        problems.push(`${name} is declared in js/${declared.get(name).file} and again in js/${st.file}`);
      declared.set(name, st);
    });
  })
);

// 3. nothing is used while loading before it exists
const isFunctionNode = n => !!n && /Function/.test(n.type);
/* array methods (and the like) that call their callback straight away */
const RUNS_CALLBACK_NOW = new Set([
  'forEach',
  'map',
  'filter',
  'some',
  'every',
  'find',
  'findIndex',
  'reduce',
  'sort',
  'flatMap',
  'replace',
  'from'
]);

/* names declared inside a function (or inside a top-level statement such as a loop): they hide globals */
function localNames(fn) {
  const names = new Set();
  const pattern = p => {
    if (!p) return;
    if (p.type === 'Identifier') names.add(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach(q => pattern(q.value || q.argument));
    else if (p.type === 'ArrayPattern') p.elements.forEach(pattern);
    else if (p.type === 'AssignmentPattern') pattern(p.left);
    else if (p.type === 'RestElement') pattern(p.argument);
  };
  (fn.params || []).forEach(pattern);
  (function walk(n, isRoot) {
    if (!n || typeof n.type !== 'string') return;
    if (isFunctionNode(n) && !isRoot) {
      if (n.type === 'FunctionDeclaration' && n.id) names.add(n.id.name);
      return;
    }
    if (n.type === 'VariableDeclaration') n.declarations.forEach(d => pattern(d.id));
    if (n.type === 'CatchClause') pattern(n.param);
    for (const key in n) {
      if (key === 'loc') continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(c => walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(fn.body || fn, true);
  return names;
}

/* the global names a piece of code touches when it runs, and which of them it calls */
function namesUsedNow(root, rootLocals) {
  const used = new Set();
  const called = new Set();
  (function visit(n, parent, key, scopes) {
    if (!n || typeof n.type !== 'string') return;
    if (isFunctionNode(n)) {
      const calledNow = parent && parent.type === 'CallExpression' && key === 'callee';
      const callbackNow =
        parent &&
        parent.type === 'CallExpression' &&
        key === 'arguments' &&
        parent.callee.type === 'MemberExpression' &&
        RUNS_CALLBACK_NOW.has(parent.callee.property.name);
      if (!calledNow && !callbackNow && n !== root) return; // runs later, not while loading
      scopes = scopes.concat([localNames(n)]);
    }
    if (n.type === 'Identifier') {
      const isLabel =
        parent &&
        ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
          (parent.type === 'Property' && key === 'key' && !parent.computed) ||
          ['LabeledStatement', 'BreakStatement', 'ContinueStatement'].includes(parent.type));
      if (isLabel || scopes.some(s => s.has(n.name))) return;
      used.add(n.name);
      if (parent && parent.type === 'CallExpression' && key === 'callee') called.add(n.name);
      return;
    }
    for (const k in n) {
      if (k === 'loc') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && visit(c, n, k, scopes));
      else if (v && typeof v.type === 'string') visit(v, n, k, scopes);
    }
  })(root, null, null, [rootLocals]);
  return { used, called };
}

/* the function behind a global name, whether declared as a function or as a const arrow function */
function functionOf(name) {
  const st = declared.get(name);
  if (!st) return null;
  if (st.isFunction) return st.node;
  const d = st.node.type === 'VariableDeclaration' && st.node.declarations.find(x => x.id.name === name);
  return d && isFunctionNode(d.init) ? d.init : null;
}

const neededBy = new Map();
function namesNeededToCall(name, inProgress) {
  if (neededBy.has(name)) return neededBy.get(name);
  const out = new Set();
  const fn = functionOf(name);
  if (!fn || inProgress.has(name)) return out;
  inProgress.add(name);
  const { used, called } = namesUsedNow(fn, new Set());
  used.forEach(n => out.add(n));
  called.forEach(c => namesNeededToCall(c, inProgress).forEach(n => out.add(n)));
  neededBy.set(name, out);
  return out;
}

scripts.forEach(script =>
  script.statements.forEach(st => {
    if (st.isFunction) return; // a function declaration does nothing until it is called
    const locals =
      st.node.type === 'VariableDeclaration' ? new Set() : localNames({ params: [], body: st.node });
    const { used, called } = namesUsedNow(st.node, locals);
    const needed = new Set(used);
    called.forEach(c => namesNeededToCall(c, new Set()).forEach(n => needed.add(n)));
    const tooEarly = [...needed].filter(name => {
      const d = declared.get(name);
      if (!d || d === st) return false;
      return d.isFunction ? d.fileIndex > st.fileIndex : d.position > st.position;
    });
    if (tooEarly.length)
      problems.push(
        `js/${st.file}:${st.line} runs while loading and uses ` +
          tooEarly.map(n => `${n} (js/${declared.get(n).file})`).join(', ') +
          ', which loads later'
      );
  })
);

if (problems.length) {
  problems.forEach(p => console.log('PROBLEM: ' + p));
  console.log(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} found.`);
  process.exit(1);
}
console.log(`OK: ${scripts.length} scripts, ${declared.size} top-level names, load order is safe.`);
