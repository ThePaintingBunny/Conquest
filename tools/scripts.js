/*
 * Shared by the tools: reads the script list from src/index.html and parses every script.
 */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/* The scripts in load order, as listed in src/index.html (paths relative to src/js). */
function scriptList() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="js\/([^"]+)"><\/script>/g)].map(m => m[1]);
}

/* Every .js file under src/js (paths relative to src/js, with forward slashes). */
function scriptsOnDisk(dir = path.join(SRC, 'js'), prefix = '') {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap(e =>
      e.isDirectory()
        ? scriptsOnDisk(path.join(dir, e.name), prefix + e.name + '/')
        : e.name.endsWith('.js')
          ? [prefix + e.name]
          : []
    );
}

/* The names a top-level statement declares. */
function declaredNames(node) {
  const out = [];
  const pattern = p => {
    if (!p) return;
    if (p.type === 'Identifier') out.push(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach(q => pattern(q.value || q.argument));
    else if (p.type === 'ArrayPattern') p.elements.forEach(pattern);
    else if (p.type === 'AssignmentPattern') pattern(p.left);
    else if (p.type === 'RestElement') pattern(p.argument);
  };
  if (node.type === 'FunctionDeclaration') out.push(node.id.name);
  else if (node.type === 'VariableDeclaration') node.declarations.forEach(d => pattern(d.id));
  return out;
}

/* Parses one script: its source, its header comment and its top-level statements. */
function parseScript(file) {
  const source = fs.readFileSync(path.join(SRC, 'js', file), 'utf8');
  const ast = acorn.parse(source, { ecmaVersion: 2022, locations: true });
  const header = (source.match(/^\/\*\n(?: \*[^\n]*\n)+ \*\/\n/) || [null])[0];
  const statements = ast.body.map(node => ({
    file,
    node,
    names: declaredNames(node),
    isFunction: node.type === 'FunctionDeclaration',
    line: node.loc.start.line
  }));
  return { file, source, header, statements };
}

module.exports = { ROOT, SRC, scriptList, scriptsOnDisk, parseScript };
