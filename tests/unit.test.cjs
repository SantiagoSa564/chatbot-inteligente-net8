const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'wwwroot/js/app.js'), 'utf8');

function runtime(fetch = async () => new Response(null, { status: 204 })) {
  const context = vm.createContext({
    location: { protocol: 'http:' }, document: { addEventListener() {} },
    setTimeout, clearTimeout, AbortController, fetch, console
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'wwwroot/vendor/fuse.js/fuse.min.js'), 'utf8'), context);
  vm.runInContext(source, context);
  return expression => vm.runInContext(expression, context);
}
test('CSV quotes all cells, preserves content and neutralizes formulas', () => {
  const run = runtime();
  for (const text of ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', ' \t=1', '\nformula']) {
    assert.equal(run(`csvCell(${JSON.stringify(text)})`), `"'${text}"`);
  }
  assert.equal(run('csvCell(\'niño, "sí"\\nsegunda línea\')'), '"niño, ""sí""\nsegunda línea"');
  assert.equal(run('csvCell(null)'), '""');
});
test('untrusted JSON shape validation rejects nulls and malformed records', () => {
  const run = runtime();
  for (const validator of ['validFaqs', 'validSessions', 'validHistory']) {
    assert.equal(run(`${validator}([null])`), false);
    assert.equal(run(`${validator}({})`), false);
    assert.equal(run(`${validator}([])`), true);
  }
  assert.equal(run('validFaqs(seedFaqs)'), true);
});
test('cache namespaces isolate API identities and demo', () => {
  const run = runtime();
  assert.equal(run("mode = 'demo'; cacheKey('sessions')"), 'nexus_v3_demo_visitor_sessions');
  assert.equal(run("mode = 'api'; cacheKey('sessions')"), 'nexus_v3_api_visitor_sessions');
  assert.equal(run("currentUser = { usuarioId: 2 }; cacheKey('sessions')"), 'nexus_v3_api_2_sessions');
});
test('admin routes are denied to visitors and User, including demo mode', () => {
  const run = runtime();
  run("mode = 'demo'");
  for (const view of ['faqs', 'sql']) assert.equal(run(`canView('${view}')`), false);
  run("currentUser = { usuarioId: 2, rol: 'User' }");
  assert.equal(run("canView('faqs')"), false);
  assert.equal(run("canView('help')"), true);
  assert.equal(run("cacheKey('sessions')"), 'nexus_v3_demo_2_sessions');
  run("currentUser = { usuarioId: 1, rol: 'Admin' }");
  assert.equal(run("canView('sql')"), true);
  assert.equal(run("cacheKey('sessions')"), 'nexus_v3_demo_1_sessions');
});
test('Retry-After blocks another network call, no automatic fallback or retry', async () => {
  let count = 0;
  const run = runtime(async () => { count++; return new Response('{}', { status: 429, headers: { 'Retry-After': '60' } }); });
  await assert.rejects(run("request('/api/test')"), /límite/);
  await assert.rejects(run("request('/api/test')"), /Espere/);
  assert.equal(count, 1);
});
test('permission errors remain permission errors with no local success', async () => {
  const run = runtime(async () => new Response('{}', { status: 403 }));
  await assert.rejects(run("request('/api/test')"), /permisos/);
  assert.equal(run('mode'), 'unselected');
});
test('Fuse matches misspellings and accents without selecting inactive FAQs', () => {
  const run = runtime();
  run('faqsState = seedFaqs');
  assert.equal(run("searchFaqs('reembolzo', faqsState)[0].id"), 4);
  assert.equal(run("searchFaqs('contrasea', faqsState)[0].id"), 2);
  assert.equal(run("searchFaqs('ATENCION', faqsState)[0].id"), 1);
  assert.equal(run("findLocalFaq('cuanto tarda mi reembolzo').id"), 4);
  assert.equal(run("findLocalFaq('capital de Francia')"), null);
  run('faqsState = seedFaqs.map(f => ({ ...f, estadoActivo: f.id !== 4 }))');
  assert.equal(run("findLocalFaq('reembolzo')"), null);
});
