const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

let browser, server, origin;
const faq = { id: 1, categoria: 'Información General', textoPregunta: '¿Cuáles son los horarios?', estadoActivo: true, respuestas: [{ textoRespuesta: 'De lunes a viernes.' }] };
before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      const name = req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0];
      if (!['/index.html', '/css/styles.css', '/css/chat-v0.css', '/js/app.js', '/images/nexusai/mark.svg', '/images/nexusai/neural.webp', '/vendor/marked/marked.umd.js', '/vendor/dompurify/purify.min.js', '/vendor/fuse.js/fuse.min.js'].includes(name)) { res.writeHead(404).end(); return; }
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
      res.setHeader('Content-Type', types[path.extname(name)] || 'text/html');
      res.end(await fs.readFile(path.join(__dirname, '..', 'wwwroot', name)));
    } catch (_) { res.writeHead(500).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); });

async function pageFor(t, api = false) {
  const context = await browser.newContext();
  const page = await context.newPage();
  t.after(() => context.close());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'No uncaught browser exceptions'));
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.route('**/api/**', route => {
    if (api && route.request().url().endsWith('/faqs')) return route.fulfill({ json: [faq] });
    if (api && route.request().url().endsWith('/auth/login')) return route.fulfill({ json: { usuarioId: 1, nombre: 'Admin real', rol: 'Admin', token: 'real-test-token' } });
    return route.fulfill({ status: 503, json: { mensaje: 'Offline' } });
  });
  await page.goto(origin);
  await page.waitForFunction(() => !checking);
  return page;
}
async function demo(page) {
  await openSidebar(page);
  await page.locator('#enter-demo').click();
  await page.locator('#confirm-accept').click();
  await page.waitForFunction(() => mode === 'demo');
}
async function login(page, role = 'Admin', real = false) {
  await openSidebar(page);
  await page.locator('#profile-action-btn').click();
  if (real) { await page.locator('#auth-email').fill('admin@example.com'); await page.locator('#auth-password').fill('password'); }
  else {
    await page.locator('#demo-accounts summary').click();
    await page.locator(`[data-demo-role="${role}"]`).click();
  }
  await page.locator('#auth-form button[type="submit"]').click();
  await page.locator('#auth-modal').waitFor({ state: 'hidden' });
}
async function adminView(page, view = 'faqs') {
  if (!await page.locator('#admin-navigation').isVisible()) { await openSidebar(page); await page.locator('#admin-entry').click(); }
  await page.locator(`#tab-${view}`).click();
}
async function openSidebar(page) {
  if (!await page.locator('#chat-sidebar').isVisible()) await page.locator('#sidebar-toggle').click();
}
async function publicView(page, view) {
  if (await page.evaluate(() => currentView) === view) {
    if (page.viewportSize().width <= 720 && await page.locator('#chat-sidebar').isVisible()) await page.keyboard.press('Escape');
    return;
  }
  await openSidebar(page); await page.locator(`#tab-${view}`).click();
}
async function fillFaq(page) {
  await page.locator('#edit-faq-categoria').fill('Atención \' " <script>');
  await page.locator('#edit-faq-pregunta').fill('¿Pregunta de prueba?');
  await page.locator('#edit-faq-respuesta').fill('Respuesta con tildes y <img src=x onerror=alert(1)>');
}

test('offline requires explicit demo; consent and secrets are memory-only', async t => {
  const page = await pageFor(t);
  assert.equal(await page.evaluate(() => mode), 'unselected');
  assert.equal(await page.locator('#send-button').isDisabled(), true);
  const external = [];
  page.on('request', req => { if (/pollinations|generativelanguage|api.openai/.test(req.url())) external.push(req.url()); });
  await demo(page);
  await page.locator('#chat-input').fill('hola');
  await page.locator('#send-button').click();
  await page.waitForFunction(() => !chatBusy);
  assert.match(await page.locator('#chat-messages-container').innerText(), /¡Hola!/);
  assert.deepEqual(external, []);
  await login(page); await adminView(page);
  await page.locator('#settings-button').click();
  await page.locator('#ai-provider-select').selectOption('openai');
  await page.locator('#ai-apikey-input').fill('temporary-secret');
  await page.locator('#settings-form button[type="submit"]').click();
  assert.equal(await page.locator('#settings-modal').isVisible(), true);
  await page.locator('#external-consent').check();
  await page.locator('#settings-form button[type="submit"]').click();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  assert.equal(storage.includes('temporary-secret'), false);
  await page.reload(); await page.waitForFunction(() => !checking);
  assert.equal(await page.evaluate(() => aiConfig.provider), 'local');
});

test('demo CRUD, safe rendering, role gating, modal Escape and focus', async t => {
  const page = await pageFor(t); await demo(page);
  await page.locator('#tab-help').click();
  assert.equal(await page.locator('#add-faq').isVisible(), false);
  await login(page);
  await adminView(page);
  await page.locator('#add-faq').click(); await fillFaq(page);
  await page.locator('#faq-form button[type="submit"]').click();
  await page.locator('#faq-modal').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#faqs-table-body').innerText(), /<img src=x onerror=alert\(1\)>/);
  assert.equal(await page.locator('#faqs-table-body img, #faq-category-pills script').count(), 0);
  const category = page.locator('#faq-category-pills button').filter({ hasText: 'Atención' });
  await category.click();
  assert.equal(await page.locator('#faqs-table-body tr').count(), 1);
  assert.equal(await page.evaluate(() => document.activeElement.textContent), await category.textContent());
  await page.locator('#add-faq').click(); await page.keyboard.press('Escape');
  await page.locator('#faq-modal').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => document.activeElement.id), 'add-faq');
  await page.locator('#profile-action-btn').click(); await login(page, 'User');
  assert.equal(await page.locator('#add-faq').isVisible(), false);
  assert.equal(await page.locator('#faqs-table-body button').count(), 0);
});

test('visitor and User only see chat and public help, even with direct admin routes', async t => {
  const page = await pageFor(t); await demo(page);
  for (const actor of ['Visitante', 'User']) {
    if (actor === 'User') await login(page, 'User');
    assert.equal(await page.locator('#admin-entry').isVisible(), false);
    assert.equal(await page.locator('#settings-button').isVisible(), false);
    await page.evaluate(() => { switchView('faqs'); openFaqEditor(); openSettingsModal(); });
    assert.equal(await page.evaluate(() => currentView), 'help');
    assert.equal(await page.locator('#faq-modal').isVisible(), false);
    assert.equal(await page.locator('#settings-modal').isVisible(), false);
    assert.equal(await page.locator('#faqs-table-body tr').count(), 0);
    await page.evaluate(() => { location.hash = '#sql'; });
    await page.waitForFunction(() => currentView === 'chat');
    assert.equal(await page.locator('#admin-navigation').isVisible(), false);
    assert.equal(await page.locator('#sql-table-body tr').count(), 0);
    const before = await page.evaluate(() => conversationsDb.length);
    await page.evaluate(async () => { exportHistoryCsv(); await clearHistoryLog(); });
    assert.equal(await page.evaluate(() => conversationsDb.length), before);
    assert.equal(await page.locator('#confirm-modal').isVisible(), false);
    await page.locator('#tab-help').click();
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(result.violations.map(v => v.id), []);
  }
  if (process.env.NEXUS_SCREENSHOT_DIR) {
    await fs.mkdir(process.env.NEXUS_SCREENSHOT_DIR, { recursive: true });
    await page.locator('#tab-chat').click();
    await page.screenshot({ path: path.join(process.env.NEXUS_SCREENSHOT_DIR, 'user-chat.png') });
    await page.locator('#tab-help').click();
    await page.screenshot({ path: path.join(process.env.NEXUS_SCREENSHOT_DIR, 'user-help.png') });
  }
});

test('inactive FAQs and personal conversations remain separated across roles and logout', async t => {
  const page = await pageFor(t); await demo(page); await login(page);
  await adminView(page);
  await page.locator('#add-faq').click();
  await page.locator('#edit-faq-categoria').fill('Información interna');
  await page.locator('#edit-faq-pregunta').fill('Pregunta privada inactiva');
  await page.locator('#edit-faq-respuesta').fill('Respuesta privada de administración');
  await page.locator('#edit-faq-estado').selectOption('false');
  await page.locator('#faq-form button[type="submit"]').click();
  await page.locator('#faq-modal').waitFor({ state: 'hidden' });
  assert.match(await page.locator('#faqs-table-body').innerText(), /Pregunta privada inactiva/);
  if (process.env.NEXUS_SCREENSHOT_DIR) {
    await fs.mkdir(process.env.NEXUS_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.NEXUS_SCREENSHOT_DIR, 'admin-faqs.png') });
  }
  await page.locator('#tab-help').click();
  assert.doesNotMatch(await page.locator('#help-list').innerText(), /Pregunta privada inactiva/);
  await page.locator('#tab-chat').click();
  await page.locator('#chat-input').fill('Conversación personal del administrador');
  await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  await adminView(page, 'sql');
  await page.locator('#profile-action-btn').click();
  assert.equal(await page.locator('#admin-navigation').isVisible(), false);
  assert.equal(await page.locator('#sql-table-body tr').count(), 0);
  assert.equal(await page.locator('#edit-faq-respuesta').inputValue(), '');
  assert.equal(await page.locator('#ai-apikey-input').inputValue(), '');
  await login(page, 'User');
  assert.doesNotMatch(await page.locator('#sessions-list').textContent(), /Conversación personal del administrador/);
  assert.equal(await page.evaluate(() => conversationsDb.length), 0);
  await page.locator('#tab-help').click();
  assert.doesNotMatch(await page.locator('#help-list').innerText(), /Pregunta privada inactiva/);
  await page.locator('#profile-action-btn').click();
  await login(page);
  await page.locator('#tab-chat').click();
  assert.match(await page.locator('#sessions-list').textContent(), /Conversación personal del administrador/);
  await adminView(page);
  assert.match(await page.locator('#faqs-table-body').innerText(), /Pregunta privada inactiva/);
});

test('API refresh sends the real token and public help never renders inactive records', async t => {
  const page = await pageFor(t, true);
  const inactive = { ...faq, id: 9, estadoActivo: false, textoPregunta: 'FAQ interna inactiva' };
  let authorizedReads = 0;
  await page.route('**/api/faqs', route => {
    const authorized = route.request().headers().authorization === 'Bearer real-test-token';
    if (authorized) authorizedReads++;
    return route.fulfill({ json: authorized ? [faq, inactive] : [faq] });
  });
  await login(page, 'Admin', true); await adminView(page);
  assert.ok(authorizedReads > 0);
  assert.match(await page.locator('#faqs-table-body').innerText(), /FAQ interna inactiva/);
  await page.locator('#tab-help').click();
  assert.doesNotMatch(await page.locator('#help-list').innerText(), /FAQ interna inactiva/);
  await page.locator('#profile-action-btn').click();
  assert.equal(await page.locator('#admin-entry').isVisible(), false);
  assert.equal(await page.locator('#faqs-table-body tr').count(), 0);
  assert.equal(await page.evaluate(() => faqsState.every(f => f.estadoActivo)), true);
});

test('expired API access closes administrative forms and removes privileged data', async t => {
  const page = await pageFor(t, true); await login(page, 'Admin', true); await adminView(page);
  await page.locator('#add-faq').click(); await fillFaq(page);
  await page.route('**/api/faqs', route => route.request().method() === 'POST' ? route.fulfill({ status: 401 }) : route.fulfill({ json: [faq] }));
  await page.locator('#faq-form button[type="submit"]').click();
  await page.waitForFunction(() => !operationBusy);
  assert.equal(await page.evaluate(() => currentUser), null);
  assert.equal(await page.locator('#admin-entry').isVisible(), false);
  assert.equal(await page.locator('#faq-modal').isVisible(), false);
  assert.equal(await page.locator('#faqs-table-body tr').count(), 0);
  assert.match(await page.locator('#app-error').textContent(), /Su sesión finalizó/);
});

test('FAQ save refresh keeps the JWT and inactive administrative records', async t => {
  const page = await pageFor(t, true); await login(page, 'Admin', true);
  const inactive = { ...faq, id: 9, estadoActivo: false, textoPregunta: 'Información solo administrativa' };
  const calls = [];
  await page.route('**/api/faqs', route => {
    calls.push({ method: route.request().method(), token: route.request().headers().authorization });
    return route.fulfill({ status: route.request().method() === 'POST' ? 201 : 200, json: route.request().method() === 'POST' ? faq : [faq, inactive] });
  });
  await adminView(page); await page.locator('#add-faq').click(); await fillFaq(page);
  await page.locator('#faq-form button[type="submit"]').click(); await page.waitForFunction(() => !operationBusy);
  assert.deepEqual(calls, [{ method: 'POST', token: 'Bearer real-test-token' }, { method: 'GET', token: 'Bearer real-test-token' }]);
  assert.match(await page.locator('#faqs-table-body').innerText(), /Información solo administrativa/);
  await page.locator('#tab-help').click();
  assert.doesNotMatch(await page.locator('#help-list').innerText(), /Información solo administrativa/);
});

test('welcome uses real active FAQs and sends the unchanged API chat contract', async t => {
  const page = await pageFor(t, true);
  assert.equal(await page.locator('#welcome-topics button').count(), 1);
  assert.match(await page.locator('#welcome-topics').innerText(), /¿Cuáles son los horarios\?/);
  const requests = [];
  await page.route('**/api/chat/send', route => {
    const data = route.request().postDataJSON(); requests.push(data);
    return route.fulfill({ json: { conversacionId: 42, sessionId: data.sessionId, preguntaUsuario: data.mensaje, respuestaBot: '**Horario confirmado.**', timestamp: new Date().toISOString() } });
  });
  const sessionId = await page.evaluate(() => currentSessionId);
  await page.locator('#welcome-topics button').click(); await page.waitForFunction(() => !chatBusy);
  assert.deepEqual(requests, [{ sessionId, mensaje: faq.textoPregunta }]);
  assert.equal(await page.locator('#chat-welcome').isVisible(), false);
  assert.match(await page.locator('#chat-messages-container').innerText(), /Horario confirmado/);
  await openSidebar(page); await page.locator('#new-session').click();
  assert.equal(await page.locator('#chat-welcome').isVisible(), true);
  assert.equal(await page.locator('#chat-scroll-box').evaluate(node => node.scrollTop), 0);
  assert.equal(await page.locator('#chat-input').getAttribute('maxlength'), '1500');
  assert.equal(await page.locator('.welcome-art').evaluate(img => img.complete && img.naturalWidth === 760), true);
  assert.equal(await page.locator('.brand-mark').evaluate(img => img.complete && img.naturalWidth > 0), true);
});

test('theme follows the system until chosen, persists only appearance and preserves corrupt preferences', async t => {
  const page = await pageFor(t, true);
  await page.emulateMedia({ colorScheme: 'dark' }); await page.reload(); await page.waitForFunction(() => !checking);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await page.locator('#theme-toggle').getAttribute('aria-pressed'), 'true');
  await page.locator('#theme-toggle').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('nexus_ui_theme'))), 'light');
  await login(page, 'Admin', true);
  const before = await page.evaluate(() => currentUser.token);
  await page.locator('#theme-toggle').click();
  assert.equal(await page.evaluate(() => currentUser.token), before);
  assert.doesNotMatch(await page.evaluate(() => JSON.stringify({ ...localStorage })), /real-test-token|password/);
  await page.reload(); await page.waitForFunction(() => !checking);
  assert.equal(await page.evaluate(() => currentUser), null);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.evaluate(() => localStorage.setItem('nexus_ui_theme', 'invalid-json'));
  await page.reload(); await page.waitForFunction(() => !checking); await page.locator('#theme-toggle').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('nexus_ui_theme')), 'invalid-json');
});

test('v0 permanent sidebar, collapse, integrated composer and separate admin workspace', async t => {
  const page = await pageFor(t); await demo(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  const widget = await page.locator('.chat-layout').boundingBox();
  assert.equal(widget.x, 0);
  assert.equal(widget.width, 1280);
  assert.equal(await page.locator('.chat-layout').evaluate(node => getComputedStyle(node).borderRadius), '0px');
  assert.equal(await page.locator('#chat-sidebar').isVisible(), true);
  assert.equal((await page.locator('#chat-sidebar').boundingBox()).width, 265);
  assert.equal((await page.locator('.topbar').boundingBox()).height, 70);
  assert.equal(await page.locator('.top-nav, .view-nav, .chat-heading, .composer-bottom').count(), 0);
  assert.equal(await page.locator('#chat-form #send-button').count(), 1);
  assert.equal(await page.locator('#chat-form #knowledge-button').count(), 1);
  assert.equal(await page.locator('#admin-shell').isVisible(), false);
  await page.locator('#sidebar-close').click();
  assert.equal(await page.locator('#chat-sidebar').isVisible(), false);
  await page.locator('#sidebar-toggle').click();
  assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#app-stage').evaluate(node => node.inert), false);
  await page.locator('#chat-input').focus();
  assert.equal(await page.locator('#chat-input').evaluate(node => getComputedStyle(node).outlineStyle), 'none');
  assert.equal(await page.locator('.composer-field').evaluate(node => getComputedStyle(node).outlineWidth), '2px');
  await login(page); await adminView(page);
  const rail = await page.locator('#admin-navigation').boundingBox();
  const content = await page.locator('#view-faqs').boundingBox();
  assert.ok(rail.x + rail.width <= content.x + 1, 'desktop rail is beside the workspace');
  assert.ok(rail.height > 400);
  await page.locator('#admin-return').click();
  assert.equal(await page.locator('#admin-shell').isVisible(), false);
  assert.equal(await page.evaluate(() => isAdmin()), true);
  await page.setViewportSize({ width: 375, height: 667 });
  assert.equal(await page.locator('#chat-sidebar').isVisible(), false);
  await openSidebar(page);
  assert.equal(await page.locator('#app-stage').evaluate(node => node.inert), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebar-toggle');
  assert.equal(await page.locator('#app-stage').evaluate(node => node.inert), false);
  await adminView(page);
  const mobileRail = await page.locator('#admin-navigation').boundingBox();
  const mobileContent = await page.locator('#view-faqs').boundingBox();
  assert.ok(mobileRail.y + mobileRail.height <= mobileContent.y + 1, 'mobile menu moves above content');
  const mobileMetrics = await page.evaluate(() => ({
    root: document.documentElement.scrollHeight, viewport: innerHeight, body: document.body.getBoundingClientRect().toJSON(),
    main: document.querySelector('main').getBoundingClientRect().toJSON(), shell: document.getElementById('admin-shell').getBoundingClientRect().toJSON(), scrollY
  }));
  assert.ok(mobileMetrics.root <= mobileMetrics.viewport + 1, JSON.stringify(mobileMetrics));
});

test('external demo provider requires consent and never switches provider on failure', async t => {
  const page = await pageFor(t); await demo(page);
  await login(page); await adminView(page);
  const requests = [];
  await page.route('https://api.openai.com/**', route => { requests.push('openai'); return route.fulfill({ status: 503 }); });
  await page.route('https://text.pollinations.ai/**', route => { requests.push('pollinations'); return route.fulfill({ status: 500 }); });
  await page.locator('#settings-button').click();
  await page.locator('#ai-provider-select').selectOption('openai');
  await page.locator('#ai-apikey-input').fill('temporary-secret');
  await page.locator('#external-consent').check();
  await page.locator('#settings-form button[type="submit"]').click();
  await page.locator('#tab-chat').click();
  await page.locator('#chat-input').fill('Pregunta general');
  await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  assert.deepEqual(requests, ['openai']);
  assert.equal(await page.locator('#chat-input').inputValue(), 'Pregunta general');
  assert.equal(await page.evaluate(() => conversationsDb.length), 0);
});

test('API mutations never fall back on validation, permission, rate limit or server errors', async t => {
  const page = await pageFor(t, true); await login(page, 'Admin', true);
  await adminView(page); await page.locator('#add-faq').click(); await fillFaq(page);
  for (const status of [400, 403, 429, 500]) {
    await page.route('**/api/faqs', route => route.request().method() === 'POST'
      ? route.fulfill({ status, json: { errors: { Categoria: ['Revise categoría.'] } } })
      : route.fulfill({ json: [faq] }));
    await page.locator('#faq-form button[type="submit"]').click();
    await page.waitForFunction(() => !operationBusy);
    assert.equal(await page.locator('#faq-modal').isVisible(), true);
    assert.match(await page.locator('#edit-faq-respuesta').inputValue(), /Respuesta/);
    assert.equal(await page.evaluate(() => mode), 'api');
    assert.equal(await page.evaluate(() => faqsState.length), 1);
    assert.equal(await page.locator('#faq-error').isVisible(), true);
  }
  await page.route('**/api/faqs', route => route.request().method() === 'POST' ? route.abort() : route.fulfill({ json: [faq] }));
  await page.locator('#faq-form button[type="submit"]').click(); await page.waitForFunction(() => !operationBusy);
  assert.equal(await page.locator('#faq-modal').isVisible(), true);
  assert.equal(await page.evaluate(() => mode), 'api');
  await page.locator('[data-close="faq-modal"]').first().click();
  await page.route('**/api/faqs', route => route.request().method() === 'DELETE' ? route.fulfill({ status: 403 }) : route.fulfill({ json: [faq] }));
  await page.locator('#faqs-table-body button').filter({ hasText: 'Eliminar' }).click();
  await page.locator('#confirm-accept').click(); await page.waitForFunction(() => !operationBusy);
  assert.equal(await page.evaluate(() => faqsState.length), 1);
});

test('confirmed save plus failed refresh cannot be submitted twice', async t => {
  const page = await pageFor(t, true); await login(page, 'Admin', true);
  let posts = 0;
  await page.route('**/api/faqs', route => {
    if (route.request().method() === 'POST') { posts++; return route.fulfill({ status: 201, json: { ...faq, id: 2 } }); }
    return route.fulfill({ status: 503 });
  });
  await adminView(page); await page.locator('#add-faq').click(); await fillFaq(page);
  await page.locator('#faq-form button[type="submit"]').click(); await page.waitForFunction(() => !operationBusy);
  assert.equal(await page.locator('#faq-sync-warning').isVisible(), true);
  assert.equal(await page.locator('#faq-form button[type="submit"]').isDisabled(), true);
  assert.equal(posts, 1);
});

test('chat keeps originating session, prevents duplicates and preserves failed input', async t => {
  const page = await pageFor(t, true);
  const originatingSession = await page.evaluate(() => currentSessionId);
  let finish;
  let calls = 0;
  await page.route('**/api/chat/send', async route => {
    calls++; const payload = route.request().postDataJSON();
    await new Promise(resolve => { finish = resolve; });
    await route.fulfill({ json: { conversacionId: 1, sessionId: payload.sessionId, usuarioId: null, preguntaUsuario: payload.mensaje, respuestaBot: 'Respuesta de la sesión original', timestamp: new Date().toISOString() } });
  });
  await page.locator('#chat-input').fill('Pregunta original'); await page.locator('#send-button').click();
  assert.equal(await page.locator('#send-button').isDisabled(), true);
  await openSidebar(page);
  await page.locator('#new-session').click();
  finish(); await page.waitForFunction(() => !chatBusy);
  assert.equal(calls, 1);
  assert.doesNotMatch(await page.locator('#chat-messages-container').innerText(), /Respuesta de la sesión original/);
  await openSidebar(page);
  await page.locator(`.session-select[data-session="${originatingSession}"]`).click();
  assert.match(await page.locator('#chat-messages-container').innerText(), /Respuesta de la sesión original/);
  await page.route('**/api/chat/send', route => route.fulfill({ status: 500 }));
  await page.locator('#chat-input').fill('No perder este texto'); await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  assert.equal(await page.locator('#chat-input').inputValue(), 'No perder este texto');
  assert.equal(await page.evaluate(() => conversationsDb.length), 1);
  assert.equal(await page.evaluate(() => mode), 'api');
});

test('401 clears real identity without demo login, 429 respects Retry-After', async t => {
  const page = await pageFor(t, true); await login(page, 'Admin', true);
  await page.route('**/api/chat/send', route => route.fulfill({ status: 401 }));
  await page.locator('#chat-input').fill('Consulta'); await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  assert.equal(await page.evaluate(() => currentUser), null);
  assert.equal(await page.evaluate(() => mode), 'api');
  let calls = 0;
  await page.route('**/api/chat/send', route => { calls++; return route.fulfill({ status: 429, headers: { 'Retry-After': '60' } }); });
  await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  assert.equal(calls, 1);
});

test('CSV escaping, formula defense, confirmed local cleanup', async t => {
  const page = await pageFor(t); await demo(page);
  await login(page);
  assert.equal(await page.evaluate(() => csvCell(' =SUM(1,2)')), '"\' =SUM(1,2)"');
  assert.equal(await page.evaluate(() => csvCell('Línea "uno"\nniño')), '"Línea ""uno""\nniño"');
  await page.locator('#chat-input').fill('hola'); await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  await adminView(page, 'sql');
  const downloadPromise = page.waitForEvent('download'); await page.locator('#export-history').click();
  const download = await downloadPromise;
  const csv = await fs.readFile(await download.path(), 'utf8');
  assert.equal(csv.charCodeAt(0), 0xfeff); assert.match(csv, /"hola"/);
  await page.locator('#clear-history').click(); await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => conversationsDb.length), 1);
  await page.locator('#clear-history').click(); await page.locator('#confirm-accept').click();
  await page.waitForFunction(() => conversationsDb.length === 0);
});

test('malformed local storage is preserved, no unsafe automatic overwrite', async t => {
  const page = await pageFor(t);
  await page.evaluate(() => localStorage.setItem('nexus_v3_demo_visitor_sessions', '{broken'));
  await demo(page);
  assert.equal(await page.evaluate(() => localStorage.getItem('nexus_v3_demo_visitor_sessions')), '{broken');
  assert.equal(await page.locator('#app-error').isVisible(), true);
});

test('Markdown renders safe structure, prevents HTML execution, external images and unsafe links', async t => {
  const page = await pageFor(t, true);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const reply = '### Respuesta de prueba\n\n**Información importante**\n\n- Primer paso\n- Segundo paso\n\n[Consultar](https://example.com/ayuda) y [No ejecutar](javascript:alert(1))\n\n![Imagen remota](https://tracker.invalid/imagen.png)\n\n<img src="https://tracker.invalid/x" onerror="window.injected = true"><script>window.injected = true</script>\n\n```js\nconst mensaje = "Hola";\n```\n\n| Tema | Estado |\n| --- | --- |\n| Cuenta | Activa |';
  const remoteImages = [];
  page.on('request', req => { if (req.url().includes('tracker.invalid')) remoteImages.push(req.url()); });
  await page.route('**/api/chat/send', route => {
    const payload = route.request().postDataJSON();
    return route.fulfill({ json: { conversacionId: 1, sessionId: payload.sessionId, preguntaUsuario: payload.mensaje, respuestaBot: reply, timestamp: new Date().toISOString() } });
  });
  await page.locator('#chat-input').fill('<b>Texto del usuario</b>');
  await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  const rendered = page.locator('.bot .markdown-body').last();
  assert.equal(await rendered.locator('strong').count(), 2);
  assert.equal(await rendered.locator('li').count(), 2);
  assert.equal(await rendered.locator('pre code').count(), 1);
  assert.equal(await rendered.locator('table').count(), 1);
  assert.equal(await rendered.locator('img, script, iframe, [onerror], [onclick], [id], [style]').count(), 0);
  assert.equal(await rendered.locator('a[href^="javascript:"], a[href^="data:"]').count(), 0);
  assert.equal(await rendered.locator('a[href="https://example.com/ayuda"]').getAttribute('rel'), 'noopener noreferrer');
  assert.equal(await page.locator('.topbar #chat-title').count(), 1);
  assert.equal(await page.locator('#chat-messages-container h1').count(), 0);
  assert.equal(await page.locator('.user .message-body b').count(), 0);
  assert.equal(await page.locator('.user .message-body').textContent(), '<b>Texto del usuario</b>');
  assert.equal(await page.evaluate(() => window.injected), undefined);
  assert.deepEqual(remoteImages, []);
  await page.locator('.copy-reply').last().click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), reply);
});

test('missing sanitizer degrades to plain text, never unsanitized Markdown', async t => {
  const page = await pageFor(t, true);
  await page.evaluate(() => {
    window.DOMPurify = undefined;
    getCurrentSession().messages.push({ role: 'bot', content: '**Texto seguro** <img src=x onerror=alert(1)>', timestamp: new Date().toISOString() });
    renderChatMessages();
  });
  const last = page.locator('.bot .message-body').last();
  assert.equal(await last.locator('img, strong').count(), 0);
  assert.match(await last.textContent(), /\*\*Texto seguro\*\*/);
});

test('public help and admin searches find typos after CRUD changes', async t => {
  const page = await pageFor(t); await demo(page);
  await page.locator('#tab-help').click();
  await page.locator('#help-search-input').fill('reembolzo');
  assert.equal(await page.locator('.help-item').count(), 1);
  assert.match(await page.locator('#help-list').innerText(), /reembolso/);
  await login(page);
  await adminView(page);
  await page.locator('#add-faq').click();
  await page.locator('#edit-faq-categoria').fill('Envíos');
  await page.locator('#edit-faq-pregunta').fill('¿Cómo consultar el despacho?');
  await page.locator('#edit-faq-respuesta').fill('Revise la guía del envío.');
  await page.locator('#faq-form button[type="submit"]').click();
  await page.locator('#faq-modal').waitFor({ state: 'hidden' });
  await page.locator('#faq-search-input').fill('despaco');
  assert.match(await page.locator('#faqs-table-body').innerText(), /despacho/);
  await page.locator('#tab-help').click();
  await page.locator('#help-search-input').fill('despaco');
  await page.locator('.help-item summary').first().click();
  await page.locator('.help-item .btn').first().click();
  await page.locator('#send-button').click(); await page.waitForFunction(() => !chatBusy);
  assert.match(await page.locator('.bot .message-body').last().textContent(), /Revise la guía/);
});

test('file opening loads local libraries and works without a CDN', async t => {
  const context = await browser.newContext(); t.after(() => context.close());
  const page = await context.newPage();
  await page.route(/^https?:\/\//, route => route.abort());
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'wwwroot/index.html')).href);
  assert.equal(await page.evaluate(() => typeof marked.Marked), 'function');
  assert.equal(await page.evaluate(() => DOMPurify.isSupported), true);
  assert.equal(await page.evaluate(() => typeof Fuse), 'function');
  await demo(page);
  assert.equal(await page.locator('.bot .markdown-body strong').count(), 1);
  await page.locator('#tab-help').click();
  await page.locator('#help-search-input').fill('contrasea');
  assert.match(await page.locator('#help-list').innerText(), /contraseña/);
});

test('chat fits the viewport: no document scrolling and composer stays visible', async t => {
  const page = await pageFor(t);
  async function assertFits(label) {
    const metrics = await page.evaluate(() => {
      const send = document.getElementById('send-button').getBoundingClientRect();
      const input = document.getElementById('chat-input').getBoundingClientRect();
      return {
        pageHeight: document.documentElement.scrollHeight, viewport: innerHeight,
        scrollY, sendTop: send.top, sendBottom: send.bottom, inputTop: input.top, inputBottom: input.bottom
      };
    });
    assert.ok(metrics.pageHeight <= metrics.viewport + 1, `${label}: document must not overflow vertically ${JSON.stringify(metrics)}`);
    assert.equal(metrics.scrollY, 0, `${label}: document stays in place`);
    assert.ok(metrics.sendTop >= 0 && metrics.sendBottom <= metrics.viewport, `${label}: full send button must stay in view ${JSON.stringify(metrics)}`);
    assert.ok(metrics.inputTop >= 0 && metrics.inputBottom <= metrics.viewport, `${label}: input must stay in view`);
  }
  for (const [width, height] of [[1366, 654], [1280, 600], [1024, 600], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await assertFits(`${width}x${height}, offline with alert`);
  }
  await demo(page);
  await page.evaluate(() => {
    const session = getCurrentSession();
    session.messages = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? 'bot' : 'user', content: 'Mensaje largo de prueba. '.repeat(20), timestamp: new Date().toISOString() }));
    renderChatMessages(true);
  });
  for (const [width, height] of [[1366, 654], [1024, 600], [375, 667], [320, 568], [375, 480]]) {
    await page.setViewportSize({ width, height });
    await assertFits(`${width}x${height}, long history`);
    await page.locator('#chat-scroll-box').evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.equal(await page.evaluate(() => scrollY), 0);
  }
  await page.locator('#sidebar-toggle').click();
  assert.equal(await page.locator('#sidebar-close').isVisible(), true);
  await page.locator('#sidebar-close').click();
  await assertFits('mobile after returning from help');
  if (process.env.NEXUS_SCREENSHOT_DIR) {
    await page.setViewportSize({ width: 1366, height: 654 });
    await page.screenshot({ path: path.join(process.env.NEXUS_SCREENSHOT_DIR, 'nexus-fixed-1366x654.png') });
  }
});

test('responsive layouts, semantic accessibility, reduced motion and modal focus', async t => {
  const page = await pageFor(t); await demo(page); await login(page);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    for (const view of ['chat', 'help', 'faqs', 'sql']) {
      if (['faqs', 'sql'].includes(view)) await adminView(page, view);
      else await publicView(page, view);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px ${view}: no page overflow`);
      if (process.env.NEXUS_SCREENSHOT_DIR && view === 'chat' && [375, 1440].includes(width)) {
        await fs.mkdir(process.env.NEXUS_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.NEXUS_SCREENSHOT_DIR, `nexus-${width}.png`), fullPage: true });
      }
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `${width}px ${view}: axe`);
    }
  }
  await page.setViewportSize({ width: 375, height: 480 });
  await adminView(page); await page.locator('#add-faq').click();
  const modalAxe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  assert.deepEqual(modalAxe.violations.map(v => v.id), []);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('dialog')?.id), 'faq-modal');
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'add-faq');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('#add-faq').evaluate(node => getComputedStyle(node).transitionDuration), '0s');
});

test('v0 visual surfaces are accessible in dark mode and retain responsive dialogs in both themes', async t => {
  const page = await pageFor(t); await demo(page);
  async function capture(name) {
    if (!process.env.NEXUS_SCREENSHOT_DIR) return;
    await fs.mkdir(process.env.NEXUS_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.NEXUS_SCREENSHOT_DIR, `${name}.png`), animations: 'disabled' });
  }
  async function accessible(label) {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], label);
  }
  for (const theme of ['light', 'dark']) {
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#theme-toggle').click();
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await capture(`chat-${theme}-${width}`);
      await openSidebar(page); await page.locator('#profile-action-btn').click();
      await accessible(`login ${theme} ${width}`);
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.closest('dialog')?.id), 'auth-modal');
      }
      await capture(`login-${theme}-${width}`);
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'profile-action-btn');
    }
  }
  await login(page);
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    for (const view of ['chat', 'help', 'faqs', 'sql']) {
      if (['faqs', 'sql'].includes(view)) await adminView(page, view);
      else await publicView(page, view);
      await accessible(`dark ${view} ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight + 1), true);
      await capture(`${view}-dark-${width}`);
    }
    await adminView(page); await page.locator('#settings-button').click();
    await page.locator('#ai-provider-select').selectOption('openai');
    await accessible(`dark settings ${width}`); await capture(`settings-dark-${width}`);
    await page.keyboard.press('Escape');
    await page.locator('#add-faq').click(); await accessible(`dark FAQ editor ${width}`);
    await capture(`faq-editor-dark-${width}`); await page.keyboard.press('Escape');
  }
  await page.locator('#theme-toggle').click();
  await capture('faqs-light-1440');
  await page.locator('#tab-sql').click(); await capture('sql-light-1440');
});

test('v0 sidebar groups and searches local conversations without changing their storage', async t => {
  const page = await pageFor(t, true);
  await page.evaluate(() => {
    const stamp = days => { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString(); };
    sessionsState = Array.from({ length: 35 }, (_, i) => ({ sessionId: newGuid(), title: i === 0 ? 'Atención contraseña' : `Consulta ${i}`, messages: [{ role: 'bot', content: 'Respuesta', timestamp: stamp(i < 10 ? 0 : i < 20 ? 1 : 5) }] }));
    currentSessionId = sessionsState[0].sessionId; saveSessions(); renderSessionsList();
  });
  assert.deepEqual(await page.locator('#sessions-list .section-label').allTextContents(), ['Hoy', 'Ayer', 'Anteriores']);
  const stored = await page.evaluate(() => localStorage.getItem(cacheKey('sessions')));
  await page.locator('#conversation-search').fill('atencion');
  assert.equal(await page.locator('.session-select').count(), 1);
  assert.match(await page.locator('#sessions-list').textContent(), /contraseña/);
  assert.equal(await page.evaluate(() => localStorage.getItem(cacheKey('sessions'))), stored);
  await page.locator('#conversation-search').fill('sin resultados');
  assert.match(await page.locator('#sessions-list').textContent(), /No hay coincidencias/);
  await page.locator('#conversation-search').fill('');
  const scroll = await page.evaluate(() => {
    const list = document.getElementById('sessions-list'); list.scrollTop = list.scrollHeight;
    return { history: list.scrollTop, document: scrollY, editor: document.getElementById('chat-input').getBoundingClientRect().bottom, viewport: innerHeight };
  });
  assert.ok(scroll.history > 0); assert.equal(scroll.document, 0); assert.ok(scroll.editor <= scroll.viewport);
  await page.locator('#sidebar-close').click(); await page.keyboard.press('Control+k');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'conversation-search');
  await page.setViewportSize({ width: 375, height: 667 }); await openSidebar(page);
  await page.locator('#profile-action-btn').focus(); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('#chat-sidebar'))), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#chat-sidebar').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sidebar-toggle');
});

test('v0 knowledge action sends the original API contract; unsupported feedback never simulates success', async t => {
  const page = await pageFor(t, true); const sent = [];
  await page.route('**/api/chat/send', route => {
    const payload = route.request().postDataJSON(); sent.push(payload);
    return route.fulfill({ json: { conversacionId: 4, sessionId: payload.sessionId, preguntaUsuario: payload.mensaje, respuestaBot: 'Respuesta **real confirmada**.', timestamp: new Date().toISOString() } });
  });
  await page.locator('#knowledge-button').click();
  assert.equal(await page.locator('#knowledge-modal').isVisible(), true);
  await page.locator('#quick-topics-list button').first().click(); await page.waitForFunction(() => !chatBusy);
  assert.equal(sent.length, 1); assert.equal(sent[0].mensaje, faq.textoPregunta);
  assert.equal(await page.locator('#knowledge-modal').isVisible(), false);
  const actions = page.locator('.bot').last().locator('.message-actions button');
  assert.equal(await actions.count(), 4);
  assert.equal(await actions.first().isEnabled(), true);
  for (const action of await actions.all().then(items => items.slice(1))) assert.equal(await action.isDisabled(), true);
  await page.locator('#chat-settings').click();
  assert.equal(await page.locator('#preferences-modal').isVisible(), true);
  assert.equal(await page.locator('#settings-modal').isVisible(), false);
  await page.locator('#theme-select').selectOption('dark');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.keyboard.press('Escape');
  assert.equal(sent.length, 1);
  assert.equal(await page.evaluate(() => aiConfig.provider), 'local');
});
