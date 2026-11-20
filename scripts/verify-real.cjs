'use strict';

// Explicit, local-only integration checks. Never loaded by the browser or npm test.
// Creates one test User (no delete-user endpoint exists), then cleans up its test FAQ.
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const base = new URL(process.env.NEXUS_REAL_URL || 'http://127.0.0.1:5080');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)) throw new Error('Only a local development API is permitted.');
let checks = 0;
async function request(method, path, body, token, expected = 200) {
  const response = await fetch(new URL(path, base), {
    method, signal: AbortSignal.timeout(45000),
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  assert.equal(response.status, expected, `${method} ${path}: HTTP ${response.status}, expected ${expected}`);
  // JWT challenges (401/403) may legitimately have an empty body.
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  checks++; console.log(`PASS ${method} ${path} → ${expected}`);
  return data;
}
async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(new URL('/api/faqs', base), { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* Retry availability GET only, never mutations. */ }
    await delay(1000);
  }
  throw new Error('API/PostgreSQL not ready after 60 availability checks.');
}
(async () => {
  console.log('Real local API integration checks (no mocks). AI calls require --ai.');
  await ready();
  const html = await (await fetch(base)).text();
  assert.match(html, /css\/chat-v0.css/); assert.doesNotMatch(html, /class="top-nav"/);
  checks++; console.log('PASS SPA served by ASP.NET Core');
  for (const resource of ['/css/chat-v0.css', '/js/app.js', '/images/nexusai/mark.svg', '/vendor/marked/marked.umd.js', '/vendor/dompurify/purify.min.js', '/vendor/fuse.js/fuse.min.js']) {
    const response = await fetch(new URL(resource, base)); assert.equal(response.status, 200, resource);
  }
  checks++; console.log('PASS static frontend and local dependencies served');
  const publicFaqs = await request('GET', '/api/faqs'); assert.ok(Array.isArray(publicFaqs)); assert.ok(publicFaqs.every(f => f.estadoActivo));
  await request('POST', '/api/auth/login', { email: 'missing@example.test', password: randomBytes(20).toString('hex') }, undefined, 401);
  const admin = await request('POST', '/api/auth/login', { email: process.env.NEXUS_TEST_ADMIN_EMAIL || 'admin@chatbot.com', password: process.env.NEXUS_TEST_ADMIN_PASSWORD || 'Admin123!' });
  assert.equal(admin.rol, 'Admin'); assert.ok(admin.token); assert.ok(Date.parse(admin.expiracion) > Date.now());
  const userData = { nombre: 'Prueba integración local', email: `integration-${randomUUID()}@example.test`, password: randomBytes(24).toString('hex'), rol: 'Admin' };
  const user = await request('POST', '/api/auth/register', userData, undefined, 201);
  assert.equal(user.rol, 'User'); assert.ok(user.token);
  console.log('INFO One test User remains in the isolated development database; its password/token are not logged.');
  await request('POST', '/api/auth/register', userData, undefined, 409);
  const authenticated = await request('POST', '/api/auth/login', { email: userData.email, password: userData.password }); assert.equal(authenticated.rol, 'User');
  const faq = { textoPregunta: `Pregunta integración ${randomUUID()}`, textoRespuesta: 'Respuesta de prueba PostgreSQL, sin información personal.', categoria: 'Integración local', estadoActivo: false };
  await request('POST', '/api/faqs', faq, undefined, 401);
  await request('POST', '/api/faqs', faq, user.token, 403);
  let id;
  try {
    const created = await request('POST', '/api/faqs', faq, admin.token, 201); id = created.id; assert.ok(Number.isInteger(id));
    const all = await request('GET', '/api/faqs', undefined, admin.token); assert.ok(all.some(f => f.id === id));
    await request('GET', `/api/faqs/${id}`, undefined, undefined, 404);
    await request('GET', `/api/faqs/${id}`, undefined, user.token, 404);
    await request('PUT', `/api/faqs/${id}`, { ...faq, estadoActivo: true }, admin.token);
    const fetched = await request('GET', `/api/faqs/${id}`); assert.equal(fetched.textoPregunta, faq.textoPregunta); assert.equal(fetched.respuestas[0].textoRespuesta, faq.textoRespuesta);
    await request('POST', '/api/chat/send', { mensaje: 'x'.repeat(1501), sessionId: randomUUID() }, user.token, 400);
    const empty = await request('GET', `/api/chat/history/${randomUUID()}`); assert.deepEqual(empty, []);
    if (process.argv.includes('--ai')) {
      const sessionId = randomUUID();
      const answer = await request('POST', '/api/chat/send', { sessionId, mensaje: '¿Cuáles son los horarios de atención al cliente?' }, user.token);
      assert.equal(answer.sessionId, sessionId); assert.equal(answer.usuarioId, user.usuarioId); assert.ok(answer.respuestaBot?.trim());
      const history = await request('GET', `/api/chat/history/${sessionId}`); assert.ok(history.some(row => row.conversacionId === answer.conversacionId));
      console.log('INFO Chat response and PostgreSQL history checked. Provider success must also be confirmed; HTTP 200 alone can contain a backend fallback/error message.');
    } else console.log('PENDING Real AI generation: provider/key/consent not yet supplied. No provider request sent.');
  } finally {
    if (id) { await request('DELETE', `/api/faqs/${id}`, undefined, admin.token, 204); await request('GET', `/api/faqs/${id}`, undefined, admin.token, 404); }
  }
  console.log(`RESULT ${checks} checks passed; no tokens or keys written to browser storage or output.`);
})().catch(error => { console.error('FAIL', error.message); process.exitCode = 1; });
