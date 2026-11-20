'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const origin = process.env.NEXUS_REAL_URL || 'http://127.0.0.1:5080';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Only a local development API is permitted.');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage(); const errors = []; let createdId;
  page.on('pageerror', error => errors.push(error.message));
  // No API interception, mocks or demo activation. Only optional font requests are blocked.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  const captures = process.env.NEXUS_REAL_SCREENSHOTS || '/tmp/opencode/nexus-real-browser';
  await fs.mkdir(captures, { recursive: true });
  const question = `Prueba navegador SQL ${randomUUID()}`;
  try {
    await page.goto(origin); await page.waitForFunction(() => typeof checking !== 'undefined' && !checking);
    assert.equal(await page.evaluate(() => mode), 'api');
    assert.match(await page.locator('#connection-status').textContent(), /API disponible/);
    await page.screenshot({ path: path.join(captures, 'real-chat.png'), animations: 'disabled' });
    await page.locator('#profile-action-btn').click();
    await page.locator('#auth-email').fill(process.env.NEXUS_TEST_ADMIN_EMAIL || 'admin@chatbot.com');
    await page.locator('#auth-password').fill(process.env.NEXUS_TEST_ADMIN_PASSWORD || 'Admin123!');
    await page.locator('#auth-form button[type="submit"]').click();
    await page.locator('#auth-modal').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => currentUser.rol), 'Admin');
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(value => value.includes(currentUser.token))), false);
    await page.locator('#admin-entry').click(); await page.locator('#add-faq').click();
    await page.locator('#edit-faq-categoria').fill('Prueba navegador real');
    await page.locator('#edit-faq-pregunta').fill(question);
    await page.locator('#edit-faq-respuesta').fill('Respuesta guardada realmente en SQL Server.');
    await page.locator('#edit-faq-estado').selectOption('false');
    await page.locator('#faq-form button[type="submit"]').click(); await page.waitForFunction(() => !operationBusy);
    assert.equal(await page.locator('#faq-modal').isVisible(), false);
    const created = await page.evaluate(question => faqsState.find(f => f.textoPregunta === question), question); assert.ok(created); createdId = created.id;
    await page.locator('#faq-search-input').fill(question);
    assert.match(await page.locator('#faqs-table-body').textContent(), /Inactiva/);
    await page.screenshot({ path: path.join(captures, 'real-admin-sql.png'), animations: 'disabled' });
    await page.locator('#tab-help').click(); await page.locator('#help-search-input').fill(question);
    assert.equal(await page.locator('#help-list .help-item').count(), 0);
    await page.locator('#admin-entry').click();
    await page.locator('#faqs-table-body button').filter({ hasText: 'Editar' }).click();
    await page.locator('#edit-faq-estado').selectOption('true');
    await page.locator('#faq-form button[type="submit"]').click(); await page.waitForFunction(() => !operationBusy);
    await page.locator('#faqs-table-body button').filter({ hasText: 'Eliminar' }).click();
    await page.locator('#confirm-accept').click(); await page.waitForFunction(() => !operationBusy); createdId = undefined;
    assert.equal(await page.locator('#faqs-table-body').textContent().then(text => text.includes(question)), false);
    await page.locator('#profile-action-btn').click();
    assert.equal(await page.evaluate(() => currentUser), null);
    assert.equal(await page.locator('#admin-entry').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS real browser: API mode, JWT login/logout, memory-only token, SQL FAQ create/update/delete, inactive filtering, no JS exceptions.');
    console.log('Screenshots:', captures);
    console.log('PENDING real LLM generation: no chat/provider request was sent.');
  } finally {
    if (createdId) await page.evaluate(async id => {
      if (currentUser?.token) await fetch(`/api/faqs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${currentUser.token}` } });
    }, createdId).catch(() => {});
    await context.close(); await browser.close();
  }
})().catch(error => { console.error('FAIL', error.message); process.exitCode = 1; });
