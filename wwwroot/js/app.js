'use strict';

// No secrets or authentication tokens are persisted. Demo and API caches are isolated.
const API_BASE = /^https?:$/.test(location.protocol) ? '/api' : null;
const $ = id => document.getElementById(id);
const seedFaqs = [
  ['Información General', '¿Cuáles son los horarios de atención al cliente?', 'La atención con asesores es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m.'],
  ['Cuenta y Acceso', '¿Cómo puedo restablecer mi contraseña?', 'Consulte con el administrador de la entidad el procedimiento para restablecer su contraseña. Esta demo no implementa recuperación de claves.'],
  ['Pagos y Facturación', '¿Cuáles son los medios de pago aceptados?', 'Aceptamos tarjetas de crédito Visa, MasterCard y American Express, PSE y transferencias bancarias.'],
  ['Pagos y Facturación', '¿En cuánto tiempo se procesa un reembolso?', 'Una vez aprobado, el reintegro toma entre 5 y 10 días hábiles, según su entidad financiera.'],
  ['Soporte y PQR', '¿Cómo puedo radicar una petición, queja o reclamo (PQR)?', 'Consulte los canales oficiales de la entidad para radicar su PQR. Esta demo no radica solicitudes.']
].map(([categoria, textoPregunta, textoRespuesta], index) => ({
  id: index + 1, categoria, textoPregunta, estadoActivo: true,
  respuestas: [{ id: index + 1, preguntaId: index + 1, textoRespuesta, ultimaActualizacion: new Date().toISOString() }]
}));

let mode = 'unselected';
let connection = 'connecting';
let faqsState = [];
let sessionsState = [];
let conversationsDb = [];
let currentUser = null;
let currentSessionId = null;
let selectedFaqCategory = 'Todas';
let faqLoadError = false;
let chatBusy = false;
let operationBusy = false;
let checking = false;
let aiConfig = { provider: 'local', apiKey: '', consent: false };
let toastTimer;
let confirmResolver = null;
let sidebarOpen = false;
let currentView = 'chat';
const dialogTriggers = new WeakMap();
const retryAfterUntil = new Map();

// Presentation preference only: identity, roles, tokens and provider keys remain in memory.
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('theme-select').value = theme;
}
function initializeTheme() {
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(readStored('nexus_ui_theme', value => ['light', 'dark'].includes(value), preferred));
  $('theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme); store('nexus_ui_theme', theme);
  });
}
const markdownParser = typeof marked !== 'undefined' ? new marked.Marked({
  gfm: true, breaks: true,
  renderer: {
    // Chat content must not introduce a new page heading or load tracking images.
    heading({ tokens }) { return `<p><strong>${this.parser.parseInline(tokens)}</strong></p>`; },
    html({ text }) { return escapeMarkup(text); },
    image({ text }) { return escapeMarkup(text || ''); }
  }
}) : null;

function escapeMarkup(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function renderReply(content) {
  const body = element('div', 'message-body');
  // Both libraries are required. A missing dependency must fail closed to plain text.
  if (!markdownParser || typeof DOMPurify === 'undefined' || !DOMPurify.isSupported) {
    body.textContent = content;
    return body;
  }
  try {
    const fragment = DOMPurify.sanitize(markdownParser.parse(content), {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ALLOWED_ATTR: ['href', 'title', 'start'],
      ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, RETURN_DOM_FRAGMENT: true
    });
    for (const link of fragment.querySelectorAll('a')) {
      const href = link.getAttribute('href');
      try {
        const url = new URL(href || '', location.href);
        if (!href || !['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) link.removeAttribute('href');
        else if (['http:', 'https:'].includes(url.protocol)) {
          // Only constant safe attributes are added after sanitization.
          link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener noreferrer');
        }
      } catch (_) { link.removeAttribute('href'); }
    }
    body.classList.add('markdown-body'); body.append(fragment);
  } catch (_) { body.textContent = content; }
  return body;
}
async function copyReply(content, control) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(content);
    control.setAttribute('aria-label', 'Copiado'); showToast('Respuesta copiada.');
    setTimeout(() => { if (control.isConnected) control.setAttribute('aria-label', 'Copiar respuesta'); }, 2000);
  } catch (_) { showToast('No se pudo acceder al portapapeles. Seleccione el texto de la respuesta para copiarlo.'); }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
function button(text, className, action) {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
function chatIcon(name) {
  const paths = {
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
    book: 'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15',
    copy: 'M8 8h13v13H8ZM16 8V3H3v13h5',
    like: 'M7 10h-4v11h4Zm0 0 5-8h2v8h6l-2 11H7Z',
    dislike: 'M7 14H3V3h4Zm0 0 5 8h2v-8h6L18 3H7Z',
    regenerate: 'M3 11a9 9 0 1 0 3-6L3 8m0-6v6h6',
    arrow: 'M7 17 17 7M7 7h10v10'
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', paths[name] || paths.chat); svg.append(path); return svg;
}
function errorAt(id, message) {
  const node = $(id);
  node.textContent = message || '';
  node.hidden = !message;
}
function report(message, source = 'general') {
  $('app-error-text').textContent = message;
  $('app-error').dataset.source = source;
  $('app-error').hidden = false;
}
function showToast(message) {
  clearTimeout(toastTimer);
  $('toast-container').textContent = message;
  toastTimer = setTimeout(() => { $('toast-container').textContent = ''; }, 6000);
}
function readStored(key, validate, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const value = JSON.parse(raw);
    if (!validate(value)) throw new Error('Formato inválido');
    return value;
  } catch (_) {
    report('No se pudo leer el almacenamiento local. Se conservaron los datos originales; esta página usará una copia temporal en memoria.');
    unreadableKeys.add(key);
    return fallback;
  }
}
const unreadableKeys = new Set();
function store(key, value) {
  if (unreadableKeys.has(key)) {
    report('No se sobrescribió el almacenamiento dañado. Los cambios solo están en memoria; exporte la bitácora antes de cerrar.');
    return false;
  }
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (_) { report('El navegador no pudo guardar los datos. Los cambios solo están en memoria; exporte la bitácora antes de cerrar.'); return false; }
}
const validFaqs = value => Array.isArray(value) && value.every(f => f && Number.isInteger(f.id) && typeof f.textoPregunta === 'string' && typeof f.categoria === 'string' && typeof f.estadoActivo === 'boolean' && Array.isArray(f.respuestas) && f.respuestas.every(r => r && typeof r.textoRespuesta === 'string'));
const validSessions = value => Array.isArray(value) && value.every(s => s && typeof s.sessionId === 'string' && typeof s.title === 'string' && Array.isArray(s.messages) && s.messages.every(m => m && typeof m.content === 'string' && ['user', 'bot'].includes(m.role) && typeof m.timestamp === 'string'));
const validHistory = value => Array.isArray(value) && value.every(c => c && typeof c.sessionId === 'string' && typeof c.preguntaUsuario === 'string' && typeof c.respuestaBot === 'string' && typeof c.timestamp === 'string');
function cacheKey(part) { return `nexus_v3_${mode}_${currentUser?.usuarioId || 'visitor'}_${part}`; }
function saveSessions() { if (mode !== 'unselected') store(cacheKey('sessions'), sessionsState); }
function saveHistory() { store(cacheKey('history'), conversationsDb); }
function newGuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const bytes = crypto.getRandomValues(new Uint8Array(1));
    const r = bytes[0] & 15;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
function loadScope() {
  $('conversation-search').value = '';
  sessionsState = readStored(cacheKey('sessions'), validSessions, []);
  conversationsDb = readStored(cacheKey('history'), validHistory, []);
  currentSessionId = sessionsState[0]?.sessionId || null;
  if (!currentSessionId) createNewSession(false);
}
function getCurrentSession() { return sessionsState.find(s => s.sessionId === currentSessionId); }
function isAdmin() { return mode !== 'unselected' && currentUser?.rol === 'Admin'; }
function canView(view) { return ['chat', 'help'].includes(view) || (['faqs', 'sql'].includes(view) && isAdmin()); }
function publicFaqs() { return faqsState.filter(f => f.estadoActivo); }

function setSidebarOpen(open, focus = true) {
  const mobile = window.matchMedia('(max-width: 720px)').matches;
  const wasOpen = sidebarOpen;
  sidebarOpen = Boolean(open);
  $('app-layout').classList.toggle('drawer', mobile && sidebarOpen);
  $('app-layout').classList.toggle('collapsed', !mobile && !sidebarOpen);
  $('sidebar-toggle').setAttribute('aria-expanded', String(sidebarOpen));
  $('app-stage').inert = mobile && sidebarOpen;
  if (focus) {
    if (sidebarOpen) $('sidebar-close').focus();
    else if (wasOpen) $('sidebar-toggle').focus();
  }
}
function closeMobileSidebar() {
  if (window.matchMedia('(max-width: 720px)').matches) setSidebarOpen(false, false);
}

function switchView(view, focus = true) {
  if (!canView(view)) view = view === 'faqs' ? 'help' : 'chat';
  closeMobileSidebar();
  currentView = view;
  const adminArea = ['faqs', 'sql'].includes(view) && isAdmin();
  $('admin-shell').hidden = !adminArea;
  $('admin-navigation').hidden = !adminArea;
  document.body.dataset.workspace = adminArea ? 'admin' : 'user';
  document.body.dataset.view = view;
  $('admin-entry').classList.toggle('active', adminArea);
  for (const name of ['chat', 'help', 'faqs', 'sql']) {
    $(`view-${name}`).hidden = name !== view;
    $(`tab-${name}`).classList.toggle('active', name === view);
    if (name === view) $(`tab-${name}`).setAttribute('aria-current', 'page');
    else $(`tab-${name}`).removeAttribute('aria-current');
  }
  if (location.hash !== `#${view}`) history.replaceState(null, '', `#${view}`);
  if (focus) $({ chat: 'chat-title', help: 'help-title', faqs: 'faqs-title', sql: 'history-title' }[view]).focus();
}
function syncControls() {
  const locked = chatBusy || operationBusy || checking;
  $('send-button').disabled = mode === 'unselected' || locked;
  $('send-label').textContent = chatBusy ? 'Procesando…' : 'Enviar';
  $('chat-input').disabled = mode === 'unselected' || chatBusy;
  $('chat-form').setAttribute('aria-busy', String(chatBusy));
  $('typing-row').hidden = !chatBusy;
  for (const id of ['retry-connection', 'enter-demo', 'profile-action-btn', 'settings-button', 'chat-settings']) $(id).disabled = locked;
  $('retry-connection').disabled = locked || !API_BASE;
  $('retry-connection').textContent = checking ? 'Conectando…' : 'Reintentar';
  $('enter-demo').hidden = mode === 'demo';
  $('demo-active').hidden = mode !== 'demo';
  $('add-faq').hidden = !isAdmin();
  $('add-faq').disabled = locked;
  $('new-session').disabled = mode === 'unselected' || operationBusy || checking;
  $('clear-history').disabled = !isAdmin() || locked || !conversationsDb.length;
  $('export-history').disabled = !isAdmin() || !conversationsDb.length;
  $('admin-entry').hidden = !isAdmin();
  $('admin-entry').disabled = locked;
  document.querySelectorAll('[data-mutation], .topic-button, [data-delete-session]').forEach(node => { node.disabled = locked || mode === 'unselected'; });
}
function renderConnection() {
  const status = $('connection-status');
  status.hidden = false;
  status.className = `badge ${mode === 'demo' ? 'demo' : connection === 'available' ? 'available' : checking ? '' : 'unavailable'}`;
  status.textContent = mode === 'demo' ? 'Demo local' : checking ? 'Comprobando…' : connection === 'available' ? 'API disponible' : 'Sin conexión';
  status.title = mode === 'demo' ? 'Demostración local, no es una conexión al servidor.' : 'La disponibilidad de FAQs no garantiza la del proveedor de IA.';
  $('connection-banner').hidden = mode !== 'unselected';
  $('connection-public-message').textContent = checking ? 'Preparando el chat…' : 'El servicio no está disponible. Reintente o elija Modo demostración en el menú, sin envíos externos.';
  $('connection-message').textContent = checking ? 'Comprobando disponibilidad de la API…' : mode === 'demo'
    ? 'Demo elegida: datos separados del servidor. No se sincronizan automáticamente. Por defecto solo se usan FAQs locales, sin envíos externos.'
    : connection === 'available'
      ? 'La API de preguntas frecuentes está disponible; esto no garantiza la disponibilidad del servicio de IA. El chat enviado a la API se procesa en el servidor y puede usar un proveedor externo. No comparta datos sensibles.'
      : 'La API no está disponible o no se pudo comprobar. Puede reintentar o elegir la demo local. No se simularán guardados ni inicios de sesión reales.';
  syncControls();
}
function collapseConnectionDetails() {
  const details = $('connection-details');
  const restore = details.contains(document.activeElement);
  details.open = false;
  if (restore) details.querySelector('summary').focus();
}
function updateUserBar() {
  const name = currentUser?.nombre || 'Visitante';
  $('profile-name').textContent = name; $('profile-name').hidden = false;
  $('profile-role').textContent = currentUser ? `${currentUser.rol === 'Admin' ? 'Administrador' : 'Usuario'}${mode === 'demo' ? ' de demostración' : ''}` : 'Sin iniciar sesión';
  $('profile-action-btn').setAttribute('aria-label', currentUser ? 'Cerrar sesión' : 'Iniciar sesión');
  $('profile-action-btn').title = currentUser ? 'Cerrar sesión' : 'Iniciar sesión';
  for (const avatar of document.querySelectorAll('.user-avatar')) avatar.textContent = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  $('welcome-title').textContent = `¡Hola, ${name.split(' ')[0]}!`;
}
function renderAll() {
  if (!isAdmin()) {
    faqsState = publicFaqs();
    aiConfig = { provider: 'local', apiKey: '', consent: false };
    for (const id of ['faq-modal', 'settings-modal']) if ($(id).open) closeDialog(id, true);
    $('faq-form').reset(); $('edit-faq-id').value = ''; $('faq-search-input').value = '';
    $('settings-form').reset(); $('ai-apikey-input').value = '';
    errorAt('faq-error', ''); errorAt('settings-error', ''); $('faq-sync-warning').hidden = true;
    selectedFaqCategory = 'Todas';
  }
  switchView(currentView, false);
  updateUserBar(); renderConnection(); renderQuickTopics(); renderSessionsList();
  renderChatMessages(true); renderHelp(); renderFaqsTable(); renderHistoryTable(); syncControls();
}

class ServiceError extends Error {
  constructor(message, status = 0, fields = {}) { super(message); this.status = status; this.fields = fields; }
}
async function request(url, options = {}, timeout = 35000) {
  const waitUntil = retryAfterUntil.get(url) || 0;
  if (waitUntil > Date.now()) throw new ServiceError(`Limite temporal activo. Espere ${Math.ceil((waitUntil - Date.now()) / 1000)} segundos antes de reintentar.`, 429);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { /* Handled below without displaying server HTML. */ }
    if (!response.ok) {
      const descriptions = {
        400: 'Revise los datos enviados.', 401: 'Su acceso no es válido o expiró. Inicie sesión nuevamente.',
        403: 'No tiene permisos para realizar esta acción.', 404: 'El recurso ya no existe. Actualice la vista.',
        409: 'Los datos entraron en conflicto. Compruebe el estado antes de continuar.', 422: 'Revise los datos enviados.',
        429: 'Se alcanzó el límite de solicitudes.'
      };
      let message = descriptions[response.status] || 'El servicio no pudo completar la operación. No se guardó una copia demo.';
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const until = retryAfter && /^\d+$/.test(retryAfter) ? Date.now() + Number(retryAfter) * 1000 : Date.parse(retryAfter || '');
        if (Number.isFinite(until) && until > Date.now()) retryAfterUntil.set(url, until);
        message += ` Reintente más tarde${retryAfter ? ` (Retry-After: ${retryAfter})` : ''}.`;
      }
      const fields = data?.errors && typeof data.errors === 'object' ? data.errors : {};
      if ([400, 422].includes(response.status)) message += ' ' + Object.values(fields).flat().filter(v => typeof v === 'string').join(' ');
      if (response.status === 401 && mode === 'api' && currentUser) {
        currentUser = null; loadScope(); renderAll();
        report('Su sesión finalizó. Inicie sesión nuevamente para continuar.', 'auth');
      }
      throw new ServiceError(message, response.status, fields);
    }
    if (text && data === null) throw new ServiceError('El servidor devolvió una respuesta no válida. Compruebe el estado antes de repetir una operación.');
    return data;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (mode === 'api' && url.startsWith('/api')) { connection = 'error'; renderConnection(); }
    throw new ServiceError('No se obtuvo confirmación del servidor (red o tiempo de espera). Conserve sus datos y compruebe el estado antes de repetir; la operación pudo haberse aplicado.');
  } finally { clearTimeout(timer); }
}
function apiOptions(method, payload) {
  const headers = {};
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  if (mode === 'api' && currentUser?.token) headers.Authorization = `Bearer ${currentUser.token}`;
  return { method, headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) };
}
async function checkConnection() {
  if (!API_BASE || checking || chatBusy || operationBusy) return;
  checking = true; renderConnection();
  try {
    const data = await request(`${API_BASE}/faqs`, apiOptions('GET'), 10000);
    if (!validFaqs(data)) throw new ServiceError('El directorio recibido no tiene el formato esperado.');
    if (mode !== 'api') {
      currentUser = null; aiConfig = { provider: 'local', apiKey: '', consent: false };
      mode = 'api'; loadScope();
    }
    faqsState = data; faqLoadError = false; connection = 'available';
    collapseConnectionDetails();
    if ($('app-error').dataset.source === 'connection') $('app-error').hidden = true;
    if (isAdmin()) showToast('Conexión con el servidor comprobada.');
  } catch (error) {
    connection = 'error';
    if (mode === 'unselected' || mode === 'api') faqLoadError = true;
    if (isAdmin()) report(error.message, 'connection');
  } finally { checking = false; renderAll(); }
}
async function enterDemo() {
  if (chatBusy || operationBusy || checking) return;
  if (!await confirmAction('Probar la demo', 'Puede explorar el chat con preguntas de ejemplo. Los datos se guardan solo en este navegador y no se envían a servicios externos. Es una demostración, no una sesión del servicio real.', 'Probar demo')) return;
  mode = 'demo'; currentUser = null; connection = 'demo'; selectedFaqCategory = 'Todas'; faqLoadError = false;
  if ($('app-error').dataset.source === 'connection') $('app-error').hidden = true;
  aiConfig = { provider: 'local', apiKey: '', consent: false };
  faqsState = readStored('nexus_v3_demo_faqs', validFaqs, structuredClone(seedFaqs));
  loadScope(); renderAll(); collapseConnectionDetails(); closeMobileSidebar(); showToast('Demo local activada, sin conexión externa.');
}

function createNewSession(focus = true) {
  $('conversation-search').value = '';
  const sessionId = newGuid();
  sessionsState.unshift({ sessionId, title: 'Consulta general', messages: [{ role: 'bot', content: '**Hola.** Cuénteme qué necesita y le ayudo a encontrar una respuesta.', timestamp: new Date().toISOString() }] });
  currentSessionId = sessionId; saveSessions();
  renderSessionsList(); renderChatMessages(true);
  if (focus) { switchView('chat', false); closeMobileSidebar(); $('chat-input').focus(); }
}
function renderSessionsList() {
  const list = $('sessions-list'); list.replaceChildren();
  const query = normalize($('conversation-search').value.trim());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const sessionDate = session => {
    const stamp = session.messages.at(-1)?.timestamp;
    const value = Date.parse(stamp || ''); return Number.isFinite(value) ? value : today.getTime();
  };
  const matches = sessionsState.filter(session => normalize(session.title).includes(query));
  for (const [group, label] of ['Hoy', 'Ayer', 'Anteriores'].entries()) {
    const entries = matches.filter(session => {
      const date = sessionDate(session); return (date >= today ? 0 : date >= yesterday ? 1 : 2) === group;
    }).sort((a, b) => sessionDate(b) - sessionDate(a));
    if (!entries.length) continue;
    list.append(element('p', 'section-label', label));
    for (const session of entries) {
    const row = element('div', `session-row${session.sessionId === currentSessionId ? ' active' : ''}`);
    const select = button('', 'session-select', () => {
      currentSessionId = session.sessionId; switchView('chat', false); renderSessionsList(); renderChatMessages(true);
      closeMobileSidebar(); $('chat-input').focus();
    });
    select.dataset.session = session.sessionId;
    select.append(chatIcon('chat'), element('span', 'session-title', session.title));
    select.setAttribute('aria-label', session.title);
    select.setAttribute('aria-pressed', String(session.sessionId === currentSessionId));
    const remove = button('×', 'btn btn-danger', async () => {
      if (chatBusy || operationBusy || checking) return;
      if (!await confirmAction('Quitar conversación', `Se quitará «${session.title}» de esta lista del navegador. Esta acción no elimina registros del servicio.`, 'Quitar conversación')) return;
      sessionsState = sessionsState.filter(s => s !== session);
      if (currentSessionId === session.sessionId) currentSessionId = sessionsState[0]?.sessionId || null;
      if (!currentSessionId) createNewSession(false);
      saveSessions(); renderSessionsList(); renderChatMessages(true);
    });
    remove.setAttribute('aria-label', `Eliminar conversación local: ${session.title}`);
    remove.dataset.deleteSession = ''; remove.disabled = chatBusy || operationBusy || checking;
    row.append(select, remove); list.append(row);
    }
  }
  if (!matches.length) empty(list, query ? 'No hay coincidencias.' : 'Sin conversaciones en este navegador.');
}
function empty(container, text) { container.append(element('p', 'empty-state', text)); }
function renderQuickTopics() {
  const container = $('quick-topics-list'); container.replaceChildren();
  const welcomeTopics = $('welcome-topics'); welcomeTopics.replaceChildren();
  const active = faqsState.filter(f => f.estadoActivo);
  const found = active.slice(0, 4);
  $('faq-count-label').textContent = `${active.length} disponibles`;
  if (!found.length) empty(container, faqLoadError ? 'La ayuda no está disponible en este momento.' : mode === 'unselected' ? 'Conecte el servicio o pruebe la demo.' : 'Pronto encontrará preguntas frecuentes aquí.');
  for (const faq of found) {
    const node = button('', 'topic-button', () => {
      if (chatBusy || operationBusy || checking) return;
      closeDialog('knowledge-modal'); switchView('chat', false);
      $('chat-input').value = faq.textoPregunta; $('chat-form').requestSubmit();
    });
    node.append(element('span', '', faq.textoPregunta));
    node.disabled = chatBusy || operationBusy || checking || mode === 'unselected';
    container.append(node);
    const suggestion = button('', 'topic-button suggestion-card', () => {
      if (chatBusy || operationBusy || checking || mode === 'unselected') return;
      $('chat-input').value = faq.textoPregunta; $('chat-form').requestSubmit();
    });
    const tag = element('span', 'tagicon'); tag.append(chatIcon('book'));
    const arrow = element('span', 'suggestion-arrow'); arrow.append(chatIcon('arrow'));
    const words = element('span', 'words'); words.append(element('strong', '', faq.textoPregunta), element('small', '', faq.categoria));
    suggestion.append(tag, arrow, words);
    suggestion.disabled = node.disabled;
    welcomeTopics.append(suggestion);
  }
  if (!found.length) empty(welcomeTopics, faqLoadError ? 'Conecte el servicio para ver las preguntas disponibles.' : 'Las preguntas disponibles aparecerán aquí.');
}
function renderChatMessages(forceScroll = false) {
  const box = $('chat-scroll-box');
  const nearBottom = box.scrollHeight - box.clientHeight - box.scrollTop < 70;
  const previousScroll = box.scrollTop;
  const container = $('chat-messages-container'); container.replaceChildren();
  const session = getCurrentSession();
  $('chat-welcome').hidden = Boolean(session?.messages.some(message => message.role === 'user'));
  if (!session) { empty(container, 'Su conversación aparecerá aquí cuando el servicio esté listo o pruebe la demo.'); return; }
  for (const message of session.messages) {
    const row = element('article', `msg-row ${message.role === 'user' ? 'user' : 'bot'}`);
    // v0 shows the welcome panel instead of a duplicate initial greeting.
    row.hidden = !$('chat-welcome').hidden && message.role === 'bot';
    const meta = element('div', 'message-meta');
    const date = new Date(message.timestamp);
    const time = element('time', '', Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }));
    if (!Number.isNaN(date.getTime())) time.dateTime = date.toISOString();
    if (message.role === 'bot') {
      const logo = element('img'); logo.src = 'images/nexusai/mark.svg'; logo.alt = ''; logo.width = 24; logo.height = 24; meta.append(logo);
    }
    meta.append(element('strong', '', message.role === 'user' ? message.author || 'Tú' : 'NexusAI'), time);
    row.append(meta, message.role === 'bot' ? renderReply(message.content) : element('div', 'message-body', message.content));
    if (message.role === 'bot') {
      const actions = element('div', 'message-actions');
      const copy = button('', 'icon copy-reply', () => copyReply(message.content, copy));
      copy.setAttribute('aria-label', 'Copiar respuesta'); copy.title = 'Copiar respuesta'; copy.append(chatIcon('copy')); actions.append(copy);
      for (const [icon, label] of [['like', 'Me gusta'], ['dislike', 'No me gusta'], ['regenerate', 'Regenerar respuesta']]) {
        const unsupported = element('button', 'icon unavailable-action'); unsupported.type = 'button'; unsupported.disabled = true;
        unsupported.setAttribute('aria-label', `${label}: no disponible`); unsupported.title = 'No disponible: NexusAI no tiene esta funcionalidad conectada.';
        unsupported.append(chatIcon(icon)); actions.append(unsupported);
      }
      row.append(actions);
    }
    container.append(row);
  }
  // A new conversation starts at its welcome panel, not at the greeting below it.
  box.scrollTop = !$('chat-welcome').hidden ? 0 : forceScroll || nearBottom ? box.scrollHeight : previousScroll;
}
async function handleChatSubmit(event) {
  event.preventDefault();
  if (mode === 'unselected' || chatBusy || operationBusy || checking) return;
  const text = $('chat-input').value.trim();
  if (!text || text.length > 1500) { errorAt('chat-error', 'Escriba una consulta de hasta 1500 caracteres.'); return; }
  const session = getCurrentSession();
  const startedMode = mode;
  const author = currentUser?.nombre || 'Usuario';
  const timestamp = new Date().toISOString();
  chatBusy = true; errorAt('chat-error', ''); $('chat-input').removeAttribute('aria-invalid'); syncControls();
  $('chat-announcement').textContent = 'Consulta enviada. Esperando respuesta.';
  try {
    let dto;
    if (mode === 'api') {
      dto = await request(`${API_BASE}/chat/send`, apiOptions('POST', { sessionId: session.sessionId, mensaje: text }));
      if (!validHistory([dto])) throw new ServiceError('La respuesta recibida no es válida. Compruebe el historial antes de repetir la consulta.');
    } else {
      const reply = await generateDemoReply(text, session.messages);
      dto = { conversacionId: Math.max(0, ...conversationsDb.map(c => Number(c.conversacionId) || 0)) + 1, sessionId: session.sessionId, usuarioId: currentUser?.usuarioId || null, preguntaUsuario: text, respuestaBot: reply, timestamp: new Date().toISOString() };
    }
    // Keep the result with the initiating session, not whichever session is now selected.
    session.messages.push({ role: 'user', content: text, author, timestamp }, { role: 'bot', content: dto.respuestaBot, timestamp: dto.timestamp });
    if (session.title === 'Consulta general') session.title = text;
    if (mode === startedMode && sessionsState.includes(session)) {
      conversationsDb.unshift(dto); saveSessions(); saveHistory(); renderSessionsList();
      if (session.sessionId === currentSessionId) renderChatMessages();
      renderHistoryTable();
    }
    $('chat-input').value = '';
    $('chat-announcement').textContent = session.sessionId === currentSessionId ? `NexusAI: ${dto.respuestaBot}` : 'Se recibió una respuesta en la conversación de origen.';
  } catch (error) {
    errorAt('chat-error', error.message); $('chat-input').setAttribute('aria-invalid', 'true');
    $('chat-announcement').textContent = 'No se pudo completar la consulta. El texto se conservó.';
  } finally { chatBusy = false; syncControls(); }
}

function normalize(value) { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function searchFaqs(query, faqs, threshold = 0.35) {
  const text = normalize(query.trim());
  if (!text) return faqs;
  const entries = faqs.map(faq => ({ faq, question: normalize(faq.textoPregunta), category: normalize(faq.categoria), answer: normalize(faq.respuestas[0]?.textoRespuesta || '') }));
  if (typeof Fuse === 'undefined') return entries.filter(f => `${f.question} ${f.category} ${f.answer}`.includes(text)).map(f => f.faq);
  const index = new Fuse(entries, {
    keys: [{ name: 'question', weight: 0.65 }, { name: 'category', weight: 0.25 }, { name: 'answer', weight: 0.1 }],
    threshold, ignoreLocation: true, minMatchCharLength: Math.min(2, text.length), shouldSort: true
  });
  return index.search(text).map(result => result.item.faq);
}
function findLocalFaq(text) {
  const active = faqsState.filter(f => f.estadoActivo);
  const query = normalize(text);
  const exact = active.find(f => normalize(f.textoPregunta) === query);
  if (exact) return exact;
  const stops = new Set(['como', 'cual', 'cuales', 'donde', 'cuando', 'para', 'puedo', 'sobre', 'quiero', 'saber', 'tengo', 'necesito', 'hola']);
  const tokens = [...new Set(query.split(/\W+/).filter(t => t.length >= 4 && !stops.has(t)))];
  const votes = new Map();
  for (const token of tokens) {
    // Restrict local answers to FAQ question/category matches, not arbitrary prose.
    const candidates = searchFaqs(token, active.map(f => ({ ...f, respuestas: [] })), 0.25);
    for (const [rank, faq] of candidates.entries()) votes.set(faq.id, (votes.get(faq.id) || 0) + 1 / (rank + 1));
  }
  return active.filter(f => votes.has(f.id)).sort((a, b) => votes.get(b.id) - votes.get(a.id))[0] || null;
}
function localReply(text) {
  const query = normalize(text);
  if (/^(hola|buenas|buenos dias|saludos|que tal|como estas)\b/.test(query)) return '¡Hola! ¿En qué puedo ayudarle? Puede consultar horarios, pagos, acceso, reembolsos y PQR.';
  const matched = findLocalFaq(text);
  if (matched) return matched.respuestas[0]?.textoRespuesta || 'La pregunta aún no tiene respuesta oficial.';
  return 'La demo local solo consulta las FAQs y responde saludos. Para preguntas generales, conecte la API o elija un proveedor externo en Conexión, revisando primero el aviso de privacidad.';
}
async function generateDemoReply(text, historyMessages) {
  if (aiConfig.provider === 'local') return localReply(text);
  if (!aiConfig.consent) throw new ServiceError('Autorice el envío externo en Conexión antes de continuar.');
  const system = 'Responde en español con tono claro, útil y amable. Puedes saludar y responder preguntas generales. Para información de la entidad usa exclusivamente estas FAQs de demostración; si falta información, dilo: ' + faqsState.filter(f => f.estadoActivo).map(f => `${f.textoPregunta}: ${f.respuestas[0]?.textoRespuesta || ''}`).join('\n');
  const recent = historyMessages.filter(m => m.role === 'user' || m.role === 'bot').slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
  while (recent[0]?.role === 'assistant') recent.shift();
  recent.push({ role: 'user', content: text });
  let data;
  if (aiConfig.provider === 'gemini') {
    data = await request('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': aiConfig.apiKey },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: recent.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) })
    });
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
    if (reply?.trim()) return reply.trim();
  } else {
    const openai = aiConfig.provider === 'openai';
    data = await request(openai ? 'https://api.openai.com/v1/chat/completions' : 'https://text.pollinations.ai/openai', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(openai ? { Authorization: `Bearer ${aiConfig.apiKey}` } : {}) },
      body: JSON.stringify({ model: openai ? 'gpt-4o-mini' : 'openai', messages: [{ role: 'system', content: system }, ...recent], temperature: 0.4 })
    });
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply === 'string' && reply.trim()) return reply.trim();
  }
  throw new ServiceError('El proveedor no devolvió una respuesta. No se consultó otro servicio. Puede elegir «Solo FAQs locales» en Conexión.');
}

function renderHelp() {
  const query = $('help-search-input').value.trim();
  const results = searchFaqs(query, publicFaqs());
  $('help-results').textContent = `${results.length} respuestas disponibles${query ? ' para su búsqueda' : ''}.`;
  const list = $('help-list'); list.replaceChildren();
  if (!results.length) empty(list, faqLoadError ? 'No pudimos cargar la ayuda. Intente más tarde o vuelva al chat.' : query ? 'No encontramos una respuesta. Pruebe otra palabra o pregunte en el chat.' : 'Todavía no hay respuestas disponibles.');
  for (const faq of results) {
    const details = element('details', 'help-item');
    details.append(element('summary', '', faq.textoPregunta));
    const answer = renderReply(faq.respuestas[0]?.textoRespuesta || 'Pronto publicaremos una respuesta.');
    answer.classList.remove('message-body'); answer.classList.add('help-answer');
    answer.append(button('Preguntar en el chat', 'btn btn-quiet', () => {
      switchView('chat', false); $('chat-input').value = faq.textoPregunta; $('chat-input').focus();
    }));
    details.append(answer); list.append(details);
  }
}
function renderFaqsTable() {
  if (!isAdmin()) {
    $('faqs-table-body').replaceChildren(); $('faq-category-pills').replaceChildren();
    $('faq-results').textContent = ''; $('faq-actions-heading').hidden = true;
    return;
  }
  const categories = ['Todas', ...new Set(faqsState.map(f => f.categoria))];
  if (!categories.includes(selectedFaqCategory)) selectedFaqCategory = 'Todas';
  const pills = $('faq-category-pills'); pills.replaceChildren();
  for (const category of categories) {
    const node = button(category, `btn ${selectedFaqCategory === category ? 'btn-primary' : 'btn-secondary'}`, () => {
      selectedFaqCategory = category; renderFaqsTable();
      [...$('faq-category-pills').children].find(item => item.textContent === category)?.focus();
    });
    node.setAttribute('aria-pressed', String(selectedFaqCategory === category)); pills.append(node);
  }
  const query = $('faq-search-input').value.trim();
  const scoped = faqsState.filter(f => selectedFaqCategory === 'Todas' || f.categoria === selectedFaqCategory);
  const filtered = searchFaqs(query, scoped);
  $('faq-results').textContent = faqLoadError ? 'El directorio no se pudo actualizar. Los datos previos, si existen, se conservan.' : `${filtered.length} preguntas encontradas${query ? ' · coincidencias aproximadas' : ''}.`;
  $('faq-actions-heading').hidden = !isAdmin();
  const body = $('faqs-table-body'); body.replaceChildren();
  if (!filtered.length) {
    const row = element('tr'); const cell = element('td'); cell.colSpan = isAdmin() ? 6 : 5;
    empty(cell, faqLoadError ? 'No se pudo cargar el directorio. Compruebe la API.' : mode === 'unselected' ? 'Seleccione una conexión para cargar las preguntas.' : query ? 'No hay coincidencias. Pruebe con otra palabra.' : 'No hay preguntas en esta categoría.');
    row.append(cell); body.append(row); return;
  }
  for (const faq of filtered) {
    const row = element('tr');
    for (const value of [`#${faq.id}`, faq.categoria, faq.textoPregunta, faq.respuestas[0]?.textoRespuesta || 'Sin respuesta oficial']) row.append(element('td', '', value));
    const state = element('td'); state.append(element('span', `tag${faq.estadoActivo ? ' tag-success' : ''}`, faq.estadoActivo ? 'Activa' : 'Inactiva')); row.append(state);
    if (isAdmin()) {
      const actions = element('td');
      const edit = button('Editar', 'btn btn-secondary', () => openFaqEditor(faq.id));
      const remove = button('Eliminar', 'btn btn-secondary btn-danger', () => deleteFaqItem(faq.id));
      for (const node of [edit, remove]) { node.dataset.mutation = ''; node.disabled = chatBusy || operationBusy || checking; }
      actions.append(edit, remove); row.append(actions);
    }
    body.append(row);
  }
}
function openFaqEditor(id = null) {
  if (!isAdmin() || operationBusy || chatBusy || checking) return;
  const faq = faqsState.find(f => f.id === id);
  $('faq-form').reset(); errorAt('faq-error', ''); $('faq-sync-warning').hidden = true;
  $('faq-form').querySelector('[type="submit"]').disabled = false;
  clearFieldErrors('faq-form');
  $('faq-modal-title').textContent = id ? `Editar pregunta #${id}` : 'Registrar pregunta frecuente';
  $('edit-faq-id').value = id || '';
  $('edit-faq-categoria').value = faq?.categoria || '';
  $('edit-faq-estado').value = String(faq?.estadoActivo ?? true);
  $('edit-faq-pregunta').value = faq?.textoPregunta || '';
  $('edit-faq-respuesta').value = faq?.respuestas[0]?.textoRespuesta || '';
  openDialog('faq-modal');
}
function clearFieldErrors(formId) { $(formId).querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid')); }
function formFailure(formId, errorId, error) {
  errorAt(errorId, error.message);
  const mapping = formId === 'auth-form' ? { Email: 'auth-email', Password: 'auth-password' } : { Categoria: 'edit-faq-categoria', TextoPregunta: 'edit-faq-pregunta', TextoRespuesta: 'edit-faq-respuesta' };
  for (const [key, id] of Object.entries(mapping)) if (Object.keys(error.fields || {}).some(k => k.toLowerCase() === key.toLowerCase())) $(id).setAttribute('aria-invalid', 'true');
}
async function busyForm(formId, action) {
  if (operationBusy || chatBusy || checking) return;
  operationBusy = true;
  const form = $(formId); const submit = form.querySelector('[type="submit"]');
  const original = submit.textContent;
  const controls = [...form.querySelectorAll('input, textarea, select')].map(node => [node, node.disabled]);
  for (const [node] of controls) node.disabled = true;
  form.setAttribute('aria-busy', 'true'); submit.textContent = 'Procesando…'; submit.disabled = true; syncControls();
  try { await action(); }
  finally {
    operationBusy = false; form.setAttribute('aria-busy', 'false'); submit.textContent = original;
    for (const [node, wasDisabled] of controls) node.disabled = wasDisabled;
    submit.disabled = formId === 'faq-form' && !$('faq-sync-warning').hidden;
    syncControls();
  }
}
async function saveFaqForm(event) {
  event.preventDefault();
  if (!isAdmin() || !$('faq-sync-warning').hidden) return;
  await busyForm('faq-form', async () => {
    errorAt('faq-error', ''); clearFieldErrors('faq-form');
    const id = Number($('edit-faq-id').value) || null;
    const payload = { categoria: $('edit-faq-categoria').value.trim(), textoPregunta: $('edit-faq-pregunta').value.trim(), textoRespuesta: $('edit-faq-respuesta').value.trim(), estadoActivo: $('edit-faq-estado').value === 'true' };
    if (!payload.categoria || !payload.textoPregunta || !payload.textoRespuesta) { errorAt('faq-error', 'Complete los campos con contenido, no solo espacios.'); return; }
    try {
      if (mode === 'api') {
        await request(`${API_BASE}/faqs${id ? `/${id}` : ''}`, apiOptions(id ? 'PUT' : 'POST', payload));
        try {
          const updated = await request(`${API_BASE}/faqs`, apiOptions('GET'));
          if (!validFaqs(updated)) throw new ServiceError('Formato de directorio inválido.');
          faqsState = updated; faqLoadError = false;
        } catch (_) { $('faq-sync-warning').hidden = false; faqLoadError = true; renderFaqsTable(); return; }
      } else {
        const nextId = id || Math.max(0, ...faqsState.map(f => f.id)) + 1;
        const updated = { id: nextId, ...payload, respuestas: [{ id: nextId, preguntaId: nextId, textoRespuesta: payload.textoRespuesta, ultimaActualizacion: new Date().toISOString() }] };
        faqsState = id ? faqsState.map(f => f.id === id ? updated : f) : [...faqsState, updated];
        store('nexus_v3_demo_faqs', faqsState);
      }
      closeDialog('faq-modal', true); renderHelp(); renderFaqsTable(); renderQuickTopics(); renderHistoryTable();
      showToast(mode === 'api' ? 'La API confirmó el guardado.' : 'Directorio demo actualizado en memoria; se intentó guardar en este navegador.');
    } catch (error) { formFailure('faq-form', 'faq-error', error); }
  });
}
async function deleteFaqItem(id) {
  if (!isAdmin() || operationBusy || chatBusy || checking) return;
  if (!await confirmAction('Eliminar pregunta frecuente', mode === 'api' ? `Se eliminará la pregunta #${id} y sus respuestas del servidor.` : `Se eliminará la pregunta #${id} solo del directorio demo.`, 'Eliminar pregunta')) return;
  operationBusy = true; syncControls();
  try {
    if (!isAdmin()) return;
    if (mode === 'api') await request(`${API_BASE}/faqs/${id}`, apiOptions('DELETE'));
    faqsState = faqsState.filter(f => f.id !== id);
    if (mode === 'demo') store('nexus_v3_demo_faqs', faqsState);
    renderHelp(); renderFaqsTable(); renderQuickTopics(); renderHistoryTable(); showToast('Pregunta eliminada del directorio seleccionado.');
  } catch (error) { report(error.message); }
  finally { operationBusy = false; syncControls(); }
}

function renderHistoryTable() {
  if (!isAdmin()) {
    $('sql-table-body').replaceChildren(); $('history-scope').textContent = '';
    for (const id of ['kpi-total-chats', 'kpi-unique-sessions', 'kpi-active-faqs']) $(id).textContent = '—';
    syncControls(); return;
  }
  $('history-scope').textContent = mode === 'api' ? 'Copia local de respuestas confirmadas por la API para la identidad actual. No es el historial global de SQL Server.' : 'Datos locales de la demo, separados de la API. Las cifras solo describen esta bitácora del navegador.';
  $('kpi-total-chats').textContent = conversationsDb.length;
  $('kpi-unique-sessions').textContent = new Set(conversationsDb.map(c => c.sessionId)).size;
  $('kpi-active-faqs').textContent = faqsState.filter(f => f.estadoActivo).length;
  const body = $('sql-table-body'); body.replaceChildren();
  if (!conversationsDb.length) { const row = element('tr'); const cell = element('td'); cell.colSpan = 6; empty(cell, 'Todavía no hay consultas confirmadas en esta bitácora local.'); row.append(cell); body.append(row); }
  for (const record of conversationsDb) {
    const row = element('tr');
    for (const value of [record.conversacionId, record.sessionId.slice(0, 8).toUpperCase(), record.usuarioId ? `ID #${record.usuarioId}` : 'Visitante', record.preguntaUsuario, record.respuestaBot, new Date(record.timestamp).toLocaleString('es-CO')]) row.append(element('td', '', value));
    body.append(row);
  }
  syncControls();
}
function csvCell(value) {
  let text = String(value ?? '');
  // Prevent formula injection, including whitespace/control-prefixed formulas.
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
function exportHistoryCsv() {
  if (!isAdmin() || !conversationsDb.length) return;
  const rows = [['ID', 'SessionId', 'UsuarioId', 'Pregunta', 'Respuesta', 'Fecha'], ...conversationsDb.map(c => [c.conversacionId, c.sessionId, c.usuarioId ?? 'Visitante', c.preguntaUsuario, c.respuestaBot, c.timestamp])];
  const blob = new Blob(['\uFEFF', rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const link = element('a');
  link.href = url; link.download = `Historial_${mode}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function clearHistoryLog() {
  if (!isAdmin() || operationBusy || chatBusy || checking || !conversationsDb.length) return;
  if (!await confirmAction('Limpiar historial local', 'Se vaciará únicamente esta bitácora en este navegador. No se borran las conversaciones del panel ni los registros de SQL Server.', 'Limpiar historial local')) return;
  if (unreadableKeys.has(cacheKey('history'))) { report('No se borró el almacenamiento que no se pudo leer. Revíselo antes de continuar.'); return; }
  if (!store(cacheKey('history'), [])) return;
  conversationsDb = []; renderHistoryTable(); showToast('Bitácora local vaciada. SQL Server no fue modificado.');
}

function openAuthModal() {
  if (mode === 'unselected') { report('Conecte la API o elija la demo antes de iniciar sesión.'); return; }
  $('auth-form').reset(); clearFieldErrors('auth-form'); errorAt('auth-error', '');
  $('demo-accounts').hidden = mode !== 'demo';
  $('demo-accounts').open = false;
  $('auth-mode-description').textContent = mode === 'demo' ? 'Acceso simulado para probar roles en la demo. No se guarda su contraseña ni se genera un token real.' : 'Autenticación real contra la API. El token se conserva solo en memoria hasta cerrar o recargar esta página.';
  openDialog('auth-modal');
}
async function submitAuthForm(event) {
  event.preventDefault();
  await busyForm('auth-form', async () => {
    errorAt('auth-error', ''); clearFieldErrors('auth-form');
    const email = $('auth-email').value.trim(); const password = $('auth-password').value;
    try {
      if (mode === 'api') {
        const user = await request(`${API_BASE}/auth/login`, apiOptions('POST', { email, password }));
        if (!user?.token || !Number.isInteger(user.usuarioId) || !['Admin', 'User'].includes(user.rol)) throw new ServiceError('Respuesta de autenticación no válida.');
        currentUser = user; loadScope();
        try {
          const updated = await request(`${API_BASE}/faqs`, apiOptions('GET'));
          if (!validFaqs(updated)) throw new ServiceError('No se pudo actualizar el directorio.');
          faqsState = updated; faqLoadError = false;
        } catch (_) { faqLoadError = true; report('La sesión se abrió, pero no pudimos actualizar la ayuda. Intente cargarla nuevamente.'); }
        if (!currentUser) throw new ServiceError('Su sesión no pudo validarse. Inicie sesión nuevamente.');
      } else if (mode === 'demo') {
        const admin = email.toLowerCase() === 'admin@chatbot.com' && password === 'Admin123!';
        const user = email.toLowerCase() === 'usuario@chatbot.com' && password === 'User123!';
        if (!admin && !user) throw new ServiceError('Credenciales demo incorrectas. Use las cuentas de prueba indicadas.');
        currentUser = { usuarioId: admin ? 1 : 2, nombre: admin ? 'Administrador demo' : 'Usuario demo', rol: admin ? 'Admin' : 'User' };
        faqsState = readStored('nexus_v3_demo_faqs', validFaqs, structuredClone(seedFaqs));
        loadScope();
      } else throw new ServiceError('Seleccione una conexión.');
      $('auth-password').value = '';
      if ($('app-error').dataset.source === 'auth') $('app-error').hidden = true;
      closeDialog('auth-modal', true); renderAll(); showToast('Sesión iniciada.');
    } catch (error) { formFailure('auth-form', 'auth-error', error); }
  });
}
function logoutUser() { currentUser = null; if (mode !== 'unselected') loadScope(); renderAll(); showToast('Sesión cerrada.'); }
function openSettingsModal() {
  if (!isAdmin()) return;
  $('ai-provider-select').value = aiConfig.provider; $('ai-apikey-input').value = aiConfig.apiKey; $('external-consent').checked = aiConfig.consent;
  $('ai-provider-select').disabled = mode !== 'demo';
  errorAt('settings-error', ''); toggleApiKeyBox(); openDialog('settings-modal');
}
function toggleApiKeyBox() {
  const provider = $('ai-provider-select').value;
  $('ai-apikey-box').hidden = !['gemini', 'openai'].includes(provider);
  $('ai-apikey-input').required = ['gemini', 'openai'].includes(provider);
  $('external-consent-box').hidden = provider === 'local';
}
function saveSettingsForm(event) {
  event.preventDefault();
  if (!isAdmin()) return;
  if (mode !== 'demo') { closeDialog('settings-modal'); return; }
  const provider = $('ai-provider-select').value;
  if (provider !== 'local' && !$('external-consent').checked) { errorAt('settings-error', 'Confirme que autoriza el envío al proveedor seleccionado.'); return; }
  if (['gemini', 'openai'].includes(provider) && !$('ai-apikey-input').value.trim()) { errorAt('settings-error', 'Ingrese una clave temporal o seleccione Solo FAQs locales.'); return; }
  aiConfig = { provider, apiKey: ['gemini', 'openai'].includes(provider) ? $('ai-apikey-input').value.trim() : '', consent: provider !== 'local' && $('external-consent').checked };
  closeDialog('settings-modal'); showToast('Preferencias temporales aplicadas. No se guardaron claves en el navegador.');
}

function openDialog(id) {
  const dialog = $(id);
  if (document.querySelector('dialog[open]')) return;
  dialogTriggers.set(dialog, document.activeElement); dialog.showModal();
  const first = dialog.querySelector('[autofocus], input:not([type="hidden"]), textarea, select, button');
  first?.focus();
}
function closeDialog(id, force = false) {
  const dialog = $(id);
  if (!force && dialog.querySelector('[aria-busy="true"]')) return;
  dialog.close();
}
function confirmAction(title, description, accept) {
  if (document.querySelector('dialog[open]')) return Promise.resolve(false);
  $('confirm-title').textContent = title; $('confirm-description').textContent = description; $('confirm-accept').textContent = accept;
  return new Promise(resolve => { confirmResolver = resolve; openDialog('confirm-modal'); });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  setSidebarOpen(!window.matchMedia('(max-width: 720px)').matches, false);
  // Remove only legacy credentials/configuration, never old conversation or FAQ data.
  try {
    if (localStorage.getItem('chatbot_v2_aiconfig') || localStorage.getItem('chatbot_v2_user')) {
      localStorage.removeItem('chatbot_v2_aiconfig'); localStorage.removeItem('chatbot_v2_user');
      report('Se retiraron credenciales y claves persistidas por la versión anterior. Sus FAQs y conversaciones antiguas no se borraron ni se mezclaron con la nueva demo.');
    }
  } catch (_) { report('No se pudo acceder al almacenamiento. La página funcionará en memoria sin persistir credenciales.'); }
  document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => switchView(node.dataset.view)));
  document.querySelector('.brand').addEventListener('click', () => switchView('chat'));
  window.addEventListener('hashchange', () => switchView(location.hash.slice(1)));
  $('settings-button').addEventListener('click', openSettingsModal);
  $('sidebar-toggle').addEventListener('click', () => setSidebarOpen(true));
  $('sidebar-close').addEventListener('click', () => setSidebarOpen(false));
  $('sidebar-backdrop').addEventListener('click', () => setSidebarOpen(false));
  $('conversation-search').addEventListener('input', renderSessionsList);
  $('account-shortcut').addEventListener('click', () => { setSidebarOpen(true, false); $('profile-action-btn').focus(); });
  $('knowledge-button').addEventListener('click', () => { renderQuickTopics(); openDialog('knowledge-modal'); });
  $('chat-settings').addEventListener('click', () => {
    if (isAdmin()) openSettingsModal();
    else { $('theme-select').value = document.documentElement.dataset.theme; openDialog('preferences-modal'); }
  });
  $('theme-select').addEventListener('change', () => { applyTheme($('theme-select').value); store('nexus_ui_theme', $('theme-select').value); });
  window.matchMedia('(max-width: 720px)').addEventListener('change', event => setSidebarOpen(!event.matches, false));
  document.addEventListener('keydown', event => {
    const mobile = window.matchMedia('(max-width: 720px)').matches;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) {
      event.preventDefault(); setSidebarOpen(true, false); $('conversation-search').focus();
    }
    if (document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape' && mobile && sidebarOpen) setSidebarOpen(false);
    if (event.key === 'Tab' && mobile && sidebarOpen) {
      const nodes = [...$('chat-sidebar').querySelectorAll('a[href], button:not(:disabled), input:not(:disabled)')].filter(node => node.getClientRects().length);
      const first = nodes[0]; const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  $('manage-connection').addEventListener('click', () => {
    if (!isAdmin()) return;
    closeDialog('settings-modal');
    if (API_BASE) checkConnection();
    else showToast('Abra la aplicación desde el servidor para comprobar la conexión.');
  });
  $('retry-connection').addEventListener('click', checkConnection);
  $('enter-demo').addEventListener('click', enterDemo);
  $('dismiss-error').addEventListener('click', () => { $('app-error').hidden = true; });
  $('profile-action-btn').addEventListener('click', () => currentUser ? logoutUser() : openAuthModal());
  $('new-session').addEventListener('click', () => { if (mode !== 'unselected') createNewSession(); });
  $('chat-form').addEventListener('submit', handleChatSubmit);
  $('chat-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); if (!chatBusy) $('chat-form').requestSubmit(); }
  });
  $('add-faq').addEventListener('click', () => openFaqEditor());
  $('faq-search-input').addEventListener('input', renderFaqsTable);
  $('help-search-input').addEventListener('input', renderHelp);
  $('faq-form').addEventListener('submit', saveFaqForm);
  $('export-history').addEventListener('click', exportHistoryCsv);
  $('clear-history').addEventListener('click', clearHistoryLog);
  $('auth-form').addEventListener('submit', submitAuthForm);
  $('settings-form').addEventListener('submit', saveSettingsForm);
  $('ai-provider-select').addEventListener('change', () => { $('external-consent').checked = false; $('ai-apikey-input').value = ''; toggleApiKeyBox(); });
  $('see-all-help').addEventListener('click', () => { closeDialog('knowledge-modal'); switchView('help'); });
  document.querySelectorAll('[data-demo-role]').forEach(node => node.addEventListener('click', () => {
    if (mode !== 'demo') return;
    $('auth-email').value = node.dataset.demoRole === 'Admin' ? 'admin@chatbot.com' : 'usuario@chatbot.com';
    $('auth-password').value = node.dataset.demoRole === 'Admin' ? 'Admin123!' : 'User123!';
  }));
  document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => closeDialog(node.dataset.close)));
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')].filter(node => node.getClientRects().length > 0);
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('cancel', event => { if (dialog.querySelector('[aria-busy="true"]')) event.preventDefault(); });
    dialog.addEventListener('close', () => {
      if (dialog.id === 'auth-modal') $('auth-password').value = '';
      if (dialog.id === 'settings-modal') $('ai-apikey-input').value = '';
      if (dialog.id === 'confirm-modal' && confirmResolver) { const resolve = confirmResolver; confirmResolver = null; resolve(false); }
      const trigger = dialogTriggers.get(dialog);
      if (trigger?.isConnected && !trigger.disabled && trigger.getClientRects().length && !trigger.closest('[inert]')) trigger.focus();
      else $('account-shortcut').focus();
    });
  }
  $('confirm-form').addEventListener('submit', event => {
    event.preventDefault(); const resolve = confirmResolver; confirmResolver = null; closeDialog('confirm-modal'); resolve?.(true);
  });
  switchView(location.hash.slice(1), false); renderAll();
  if (API_BASE) checkConnection(); else { connection = 'error'; renderConnection(); }
});
