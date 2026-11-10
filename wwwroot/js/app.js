// ============================================================================
// ESTADO GLOBAL Y CONEXIÓN HÍBRIDA CON ASP.NET CORE WEB API (.NET 8)
// ============================================================================
const API_BASE = window.location.protocol.startsWith('http') ? '/api' : null;
let isBackendOnline = false;

// Datos Semilla (Idénticos a Data/DbInitializer.cs)
const seedFaqs = [
  {
    id: 1,
    textoPregunta: "¿Cuáles son los horarios de atención al cliente?",
    categoria: "Información General",
    estadoActivo: true,
    respuestas: [{
      id: 1,
      preguntaId: 1,
      textoRespuesta: "Nuestro horario de atención con asesores humanos es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Nuestro asistente virtual está disponible las 24 horas del día.",
      ultimaActualizacion: new Date().toISOString()
    }]
  },
  {
    id: 2,
    textoPregunta: "¿Cómo puedo restablecer mi contraseña?",
    categoria: "Cuenta y Acceso",
    estadoActivo: true,
    respuestas: [{
      id: 2,
      preguntaId: 2,
      textoRespuesta: "Para restablecer su contraseña, diríjase a la pantalla de inicio de sesión, seleccione '¿Olvidó su contraseña?' e ingrese su correo electrónico registrado. Recibirá un enlace temporal para crear una nueva clave.",
      ultimaActualizacion: new Date().toISOString()
    }]
  },
  {
    id: 3,
    textoPregunta: "¿Cuáles son los medios de pago aceptados?",
    categoria: "Pagos y Facturación",
    estadoActivo: true,
    respuestas: [{
      id: 3,
      preguntaId: 3,
      textoRespuesta: "Aceptamos tarjetas de crédito (Visa, MasterCard, American Express), tarjetas débito a través de PSE y transferencias bancarias directas.",
      ultimaActualizacion: new Date().toISOString()
    }]
  },
  {
    id: 4,
    textoPregunta: "¿En cuánto tiempo se procesa un reembolso?",
    categoria: "Pagos y Facturación",
    estadoActivo: true,
    respuestas: [{
      id: 4,
      preguntaId: 4,
      textoRespuesta: "Una vez aprobada la solicitud de reembolso, el reintegro del dinero toma entre 5 y 10 días hábiles dependiendo de su entidad financiera.",
      ultimaActualizacion: new Date().toISOString()
    }]
  },
  {
    id: 5,
    textoPregunta: "¿Cómo puedo radicar una petición, queja o reclamo (PQR)?",
    categoria: "Soporte y PQR",
    estadoActivo: true,
    respuestas: [{
      id: 5,
      preguntaId: 5,
      textoRespuesta: "Puede radicar una PQR desde la sección 'Centro de Ayuda -> Radicar PQR' en nuestro portal web, o enviando un correo electrónico detallado a soporte@chatbot.com. Recibirá un número de radicado con respuesta en un plazo máximo de 15 días hábiles.",
      ultimaActualizacion: new Date().toISOString()
    }]
  }
];

let faqsState = JSON.parse(localStorage.getItem('chatbot_v2_faqs') || 'null') || seedFaqs;
let sessionsState = JSON.parse(localStorage.getItem('chatbot_v2_sessions') || '[]');
let conversationsDb = JSON.parse(localStorage.getItem('chatbot_v2_conversations') || '[]');
let currentUser = JSON.parse(localStorage.getItem('chatbot_v2_user') || 'null');
let aiConfig = JSON.parse(localStorage.getItem('chatbot_v2_aiconfig') || '{"provider":"free-llm","apiKey":"","model":"gemini-1.5-flash"}');
let currentSessionId = null;
let selectedFaqCategory = 'Todas';
let authMode = 'login'; // 'login' | 'register'

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupTextareaAutoResize();
  updateUserProfileUI();

  // Intentar conectar con el Backend .NET 8 si se sirve por HTTP
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/faqs`);
      if (res.ok) {
        isBackendOnline = true;
        faqsState = await res.json();
        updateConnectionBadge(true);
      }
    } catch (_) {
      isBackendOnline = false;
      updateConnectionBadge(false);
    }
  } else {
    updateConnectionBadge(false);
  }

  // Crear o cargar sesión inicial
  if (sessionsState.length === 0) {
    createNewChatSession(false);
  } else {
    currentSessionId = sessionsState[0].sessionId;
  }

  renderSessionsSidebar();
  renderCurrentChatMessages();
  renderSuggestedPrompts();
  renderFaqsView();
  renderConversationsLog();
});

function generateGuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function updateConnectionBadge(online) {
  const dot = document.getElementById('conn-dot');
  const label = document.getElementById('conn-label');
  if (online) {
    dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]';
    label.textContent = '.NET 8 API + SQL Server';
  } else {
    dot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-pulse';
    label.textContent = 'Motor IA Local Activo';
  }
}

// ============================================================================
// GESTIÓN DE SESIONES DE CHAT (HISTORIAL TIPO CHATGPT)
// ============================================================================
function createNewChatSession(switchToChat = true) {
  const newGuid = generateGuid();
  const newSession = {
    sessionId: newGuid,
    title: 'Nueva conversación',
    createdAt: new Date().toISOString(),
    messages: []
  };

  sessionsState.unshift(newSession);
  currentSessionId = newGuid;
  saveSessions();
  renderSessionsSidebar();
  renderCurrentChatMessages();

  if (switchToChat) {
    switchWorkspaceView('chat');
    document.getElementById('chat-input')?.focus();
  }
}

function selectSession(sessionId) {
  currentSessionId = sessionId;
  renderSessionsSidebar();
  renderCurrentChatMessages();
  switchWorkspaceView('chat');
}

function deleteSession(event, sessionId) {
  event.stopPropagation();
  sessionsState = sessionsState.filter(s => s.sessionId !== sessionId);
  if (sessionsState.length === 0) {
    createNewChatSession(false);
  } else if (currentSessionId === sessionId) {
    currentSessionId = sessionsState[0].sessionId;
  }
  saveSessions();
  renderSessionsSidebar();
  renderCurrentChatMessages();
}

function saveSessions() {
  localStorage.setItem('chatbot_v2_sessions', JSON.stringify(sessionsState));
}

function getCurrentSession() {
  return sessionsState.find(s => s.sessionId === currentSessionId) || sessionsState[0];
}

function renderSessionsSidebar() {
  const list = document.getElementById('sessions-list');
  const badge = document.getElementById('active-session-guid');
  if (badge && currentSessionId) {
    badge.textContent = currentSessionId;
  }

  list.innerHTML = sessionsState.map(session => {
    const isActive = session.sessionId === currentSessionId;
    const count = session.messages.filter(m => m.role === 'user').length;
    return `
      <div
        onclick="selectSession('${session.sessionId}')"
        class="group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition ${
          isActive
            ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
        }"
      >
        <div class="flex items-center gap-2.5 min-w-0 pr-2">
          <i class="fa-regular fa-message text-xs ${isActive ? 'text-indigo-400' : 'text-slate-500'}"></i>
          <div class="truncate">
            <p class="text-xs font-medium truncate">${escapeHtml(session.title)}</p>
            <p class="text-[10px] text-slate-500 font-mono truncate">${session.sessionId.slice(0, 8)}... &bull; ${count} msj</p>
          </div>
        </div>
        <button
          onclick="deleteSession(event, '${session.sessionId}')"
          class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 transition text-xs"
          title="Eliminar sesión"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;
  }).join('');
}

// ============================================================================
// RENDERIZADO DE MENSAJES Y PANTALLA DE BIENVENIDA DEL CHATBOT
// ============================================================================
function renderCurrentChatMessages() {
  const session = getCurrentSession();
  const emptyState = document.getElementById('chat-empty-state');
  const messagesList = document.getElementById('chat-messages-list');
  const container = document.getElementById('chat-scroll-container');

  document.getElementById('active-session-guid').textContent = session.sessionId;

  if (!session.messages || session.messages.length === 0) {
    emptyState.classList.remove('hidden');
    messagesList.classList.add('hidden');
    messagesList.innerHTML = '';
    renderSuggestedPrompts();
    return;
  }

  emptyState.classList.add('hidden');
  messagesList.classList.remove('hidden');

  messagesList.innerHTML = session.messages.map((msg, idx) => buildMessageHTML(msg, idx)).join('');
  scrollToBottom(container);
}

function buildMessageHTML(msg, idx) {
  const timeStr = new Date(msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  if (msg.role === 'user') {
    return `
      <div class="flex justify-end msg-enter">
        <div class="max-w-2xl flex items-end gap-3">
          <div class="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-br-xs shadow-lg">
            <p class="text-sm leading-relaxed whitespace-pre-line">${escapeHtml(msg.content)}</p>
            <div class="flex items-center justify-end gap-2 mt-1.5 text-[10px] text-indigo-200/80">
              <span>${currentUser ? escapeHtml(currentUser.nombre) : 'Visitante'}</span>
              <span>&bull;</span>
              <span>${timeStr}</span>
            </div>
          </div>
          <div class="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
            ${currentUser ? currentUser.nombre.charAt(0).toUpperCase() : '<i class="fa-regular fa-user"></i>'}
          </div>
        </div>
      </div>
    `;
  }

  // Respuesta del Bot (IA)
  const sourceBadge = msg.matchedCategory
    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
         <i class="fa-solid fa-check-double text-[9px]"></i> Fuente FAQ: ${escapeHtml(msg.matchedCategory)}
       </span>`
    : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
         <i class="fa-solid fa-wand-magic-sparkles text-[9px]"></i> System Prompt Institucional
       </span>`;

  return `
    <div class="flex justify-start msg-enter">
      <div class="max-w-3xl flex items-start gap-3.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md glow-indigo shrink-0 mt-0.5">
          <i class="fa-solid fa-robot text-sm"></i>
        </div>
        <div class="glass-card rounded-2xl rounded-tl-xs px-5 py-4 text-slate-100 shadow-lg flex-1">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-700/50">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-white">Asistente Inteligente IA</span>
              ${sourceBadge}
            </div>
            <span class="text-[10px] text-slate-400 font-mono">${timeStr}</span>
          </div>
          <div class="text-sm text-slate-200 leading-relaxed space-y-2 whitespace-pre-line">${formatBotRichText(msg.content)}</div>
          <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div class="flex items-center gap-3">
              <button onclick="copyBotResponse(${idx})" class="hover:text-indigo-400 transition flex items-center gap-1" title="Copiar respuesta">
                <i class="fa-regular fa-copy"></i> <span>Copiar</span>
              </button>
              <button onclick="rateResponse(this, 'up')" class="hover:text-emerald-400 transition" title="Respuesta útil">
                <i class="fa-regular fa-thumbs-up"></i>
              </button>
              <button onclick="rateResponse(this, 'down')" class="hover:text-rose-400 transition" title="No resolvió mi duda">
                <i class="fa-regular fa-thumbs-down"></i>
              </button>
            </div>
            <span class="font-mono text-[10px] text-slate-500">Tabla: Conversaciones</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSuggestedPrompts() {
  const grid = document.getElementById('suggested-prompts-grid');
  const activeFaqs = faqsState.filter(f => f.estadoActivo);
  document.getElementById('sidebar-faq-counter').textContent = activeFaqs.length;

  const icons = {
    'Información General': 'fa-clock text-cyan-400',
    'Cuenta y Acceso': 'fa-shield-halved text-indigo-400',
    'Pagos y Facturación': 'fa-credit-card text-emerald-400',
    'Soporte y PQR': 'fa-headset text-amber-400'
  };

  grid.innerHTML = activeFaqs.slice(0, 6).map(faq => {
    const iconClass = icons[faq.categoria] || 'fa-circle-question text-indigo-400';
    return `
      <button
        onclick="sendPredefinedPrompt(${JSON.stringify(faq.textoPregunta).replace(/"/g, '&quot;')})"
        class="glass-card text-left p-4 rounded-2xl group flex flex-col justify-between gap-3 cursor-pointer"
      >
        <div class="flex items-center justify-between w-full">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
            ${escapeHtml(faq.categoria)}
          </span>
          <i class="fa-solid ${iconClass} text-sm group-hover:scale-110 transition"></i>
        </div>
        <p class="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-white leading-snug">
          ${escapeHtml(faq.textoPregunta)}
        </p>
        <div class="flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
          <span>Consultar al asistente</span>
          <i class="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition"></i>
        </div>
      </button>
    `;
  }).join('');
}

function sendPredefinedPrompt(text) {
  const input = document.getElementById('chat-input');
  input.value = text;
  handleChatSubmit(new Event('submit'));
}

// ============================================================================
// ENVÍO DE MENSAJES Y CONEXIÓN CON AiIntegrationService (POST /api/chat/send)
// ============================================================================
async function handleChatSubmit(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';

  const session = getCurrentSession();
  const nowIso = new Date().toISOString();

  // Actualizar título de la sesión con el primer mensaje
  if (session.messages.length === 0) {
    session.title = text.length > 34 ? text.slice(0, 34) + '...' : text;
  }

  // Agregar mensaje del usuario
  session.messages.push({
    role: 'user',
    content: text,
    timestamp: nowIso
  });

  saveSessions();
  renderSessionsSidebar();
  renderCurrentChatMessages();

  // Mostrar animación "Escribiendo..."
  showTypingIndicator(true);

  let botReply = '';
  let matchedCat = null;
  let replyTime = new Date().toISOString();

  if (isBackendOnline) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: session.sessionId,
          mensaje: text
        })
      });
      if (res.ok) {
        const dto = await res.json();
        botReply = dto.respuestaBot;
        replyTime = dto.timestamp || replyTime;
        conversationsDb.unshift(dto);
      } else {
        const sim = runLocalRagEngine(text);
        botReply = sim.reply;
        matchedCat = sim.category;
      }
    } catch (_) {
      const sim = await generateSmartAiResponse(text, session.messages);
      botReply = sim.reply;
      matchedCat = sim.category;
    }
  } else {
    // Llamar al motor de IA (API de LLM en vivo + RAG con FAQs + Conversación natural)
    const sim = await generateSmartAiResponse(text, session.messages);
    botReply = sim.reply;
    matchedCat = sim.category;

    const newRecord = {
      conversacionId: conversationsDb.length + 1,
      sessionId: session.sessionId,
      usuarioId: currentUser ? currentUser.usuarioId : null,
      preguntaUsuario: text,
      respuestaBot: botReply,
      timestamp: replyTime
    };
    conversationsDb.unshift(newRecord);
    localStorage.setItem('chatbot_v2_conversations', JSON.stringify(conversationsDb));
  }

  showTypingIndicator(false);

  session.messages.push({
    role: 'bot',
    content: botReply,
    matchedCategory: matchedCat,
    timestamp: replyTime
  });

  saveSessions();
  renderSessionsSidebar();
  renderCurrentChatMessages();
  renderConversationsLog();
}

// ============================================================================
// MOTOR DE INTELIGENCIA ARTIFICIAL REAL (LLM API + RAG FAQs + CONVERSACIÓN NATURAL)
// ============================================================================
function buildSystemPromptWithFaqs() {
  const activeFaqs = faqsState.filter(f => f.estadoActivo);
  const faqText = activeFaqs.map(f => {
    const resp = f.respuestas?.[0]?.textoRespuesta || 'Sin respuesta';
    return `- Categoría [${f.categoria}] | Pregunta: ${f.textoPregunta} -> Respuesta Oficial: ${resp}`;
  }).join('\n');

  return `Eres NexusAI, un asistente virtual inteligente de atención al usuario, muy amable, empático, natural y capaz de responder cualquier pregunta.
Usuario actual: ${currentUser ? currentUser.nombre + ' (' + currentUser.rol + ')' : 'Visitante'}.

BASE DE CONOCIMIENTO OFICIAL DE LA EMPRESA (FAQs):
${faqText || 'No hay FAQs activas.'}

INSTRUCCIONES:
1. Si el usuario te saluda ("hola", "buenos días", "cómo estás", "qué tal") o conversa casualmente, respóndele con calidez, naturalidad y simpatía.
2. Si el usuario pregunta algo relacionado con las FAQs de la empresa (horarios, contraseñas, pagos, PSE, tarjetas, reembolsos, PQR, quejas o soporte), utiliza los datos exactos de la BASE DE CONOCIMIENTO OFICIAL.
3. Si el usuario te pregunta sobre CUALQUIER OTRO TEMA (cultura general, programación, matemáticas, consejos, redacción, ciencia, chistes, etc.), respóndele de forma completa, inteligente y útil como un asistente de IA avanzado.
4. Responde siempre en español y usa negritas (**texto**) para resaltar ideas clave.`;
}

function detectMatchingFaqCategory(userMessage) {
  const clean = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const query = clean(userMessage);
  const activeFaqs = faqsState.filter(f => f.estadoActivo);
  const stopWords = new Set(['como', 'cual', 'cuales', 'donde', 'cuando', 'para', 'puedo', 'tienen', 'estan', 'hacer', 'sobre', 'este', 'esta', 'hola', 'buenos', 'buenas']);
  const tokens = query.replace(/[¿?¡!.,;:]/g, '').split(/\s+/).filter(w => w.length >= 4 && !stopWords.has(w));

  let bestFaq = null;
  let bestScore = 0;

  for (const faq of activeFaqs) {
    const hay = clean(`${faq.textoPregunta} ${faq.categoria}`);
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }
  return bestScore >= 3 && bestFaq ? bestFaq : null;
}

async function generateSmartAiResponse(userMessage, conversationHistory = []) {
  const systemPrompt = buildSystemPromptWithFaqs();
  const matchedFaq = detectMatchingFaqCategory(userMessage);

  // Construir historial reciente (últimos 6 mensajes) para que el chatbot tenga memoria conversacional
  const recentMessages = conversationHistory.slice(-6).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  // 1. Si el usuario configuró su propia API Key de Google Gemini
  if (aiConfig.provider === 'gemini' && aiConfig.apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: recentMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { category: matchedFaq?.categoria || 'Google Gemini API', reply: text.trim() };
      }
    } catch (e) {
      console.warn('Error invocando Gemini directo, pasando a LLM gratuito...', e);
    }
  }

  // 2. Si el usuario configuró su propia API Key de OpenAI
  if (aiConfig.provider === 'openai' && aiConfig.apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, ...recentMessages],
          temperature: 0.4
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return { category: matchedFaq?.categoria || 'OpenAI GPT-4o', reply: text.trim() };
      }
    } catch (e) {
      console.warn('Error invocando OpenAI directo, pasando a LLM gratuito...', e);
    }
  }

  // 3. API de IA Gratuita sin necesidad de API Key (Pollinations OpenAI Endpoint)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages
        ],
        temperature: 0.45
      })
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return {
          category: matchedFaq ? matchedFaq.categoria : 'IA Conversacional (LLM)',
          reply: text.trim()
        };
      }
    }
  } catch (err) {
    console.warn('API LLM en la nube sin conexión, usando motor conversacional local:', err);
  }

  // 4. Motor Conversacional Local Inteligente (por si el PC no tiene internet)
  return runOfflineConversationalEngine(userMessage, matchedFaq);
}

function runOfflineConversationalEngine(userMessage, matchedFaq) {
  const clean = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const q = clean(userMessage);
  const activeFaqs = faqsState.filter(f => f.estadoActivo);
  const userName = currentUser ? ` **${currentUser.nombre}**` : '';

  // 1. Si coincide con una FAQ de la Base de Datos
  if (matchedFaq) {
    const answer = matchedFaq.respuestas?.[0]?.textoRespuesta || '';
    return {
      category: matchedFaq.categoria,
      reply: `${answer}\n\n¿Te gustaría conocer algo más sobre **${matchedFaq.categoria}** o tienes otra inquietud?`
    };
  }

  // 2. Saludos y charla casual ("hola", "como estas", "buenos dias", "que tal")
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|saludos|que tal|hola como estas|como vas|como estas)\b/.test(q)) {
    return {
      category: 'Conversación Natural',
      reply: `¡Hola${userName}! Qué gusto saludarte. Estoy funcionando al 100% y listo para ayudarte.\n\nPuedes preguntarme tanto por nuestros **servicios oficiales** (horarios, pagos, reembolsos, contraseñas, PQR) como hacerme **cualquier pregunta general** o conversar conmigo. ¿Cómo te puedo ayudar hoy?`
    };
  }

  // 3. Preguntas sobre el estado o identidad del bot ("quien eres", "que puedes hacer", "como te llamas")
  if (/(quien eres|como te llamas|que eres|que puedes hacer|para que sirves|tu nombre)/.test(q)) {
    return {
      category: 'Identidad del Asistente',
      reply: `Soy **NexusAI**, un Chatbot Inteligente de Atención al Usuario desarrollado con arquitectura **.NET 8 Web API, Entity Framework Core, SQL Server y Modelos de Lenguaje (LLM)**.\n\nEstoy entrenado con **${activeFaqs.length} preguntas frecuentes activas** en nuestra Base de Conocimiento y además puedo conversar contigo sobre cualquier tema que necesites.`
    };
  }

  // 4. Agradecimientos y despedidas ("gracias", "muchas gracias", "adios", "chao", "hasta luego")
  if (/(gracias|muchas gracias|mil gracias|te lo agradezco|genial|excelente|perfecto)/.test(q)) {
    return {
      category: 'Conversación Natural',
      reply: `¡Con muchísimo gusto${userName}! Me alegra haberte sido de ayuda. Si necesitas cualquier otra cosa, aquí estaré disponible las 24 horas.`
    };
  }

  if (/(adios|chao|hasta luego|nos vemos|bye|feliz dia|feliz noche)/.test(q)) {
    return {
      category: 'Conversación Natural',
      reply: `¡Hasta pronto${userName}! Que tengas un excelente día. Cuando quieras volver a conversar, aquí estaré.`
    };
  }

  // 5. Chistes o humor
  if (/(chiste|cuentame algo gracioso|hazme reir)/.test(q)) {
    return {
      category: 'Conversación Natural',
      reply: `¡Claro! Ahí va uno de desarrolladores:\n\n— *¿Por qué los programadores de C# prefieren el modo oscuro?*\n— *¡Porque la luz atrae a los bugs!* 🐛😄\n\n¿En qué más te puedo colaborar hoy?`
    };
  }

  // 6. Operaciones matemáticas simples (ej: "cuanto es 25 * 4")
  const mathMatch = q.match(/(\d+)\s*([\+\-\*\/x])\s*(\d+)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let res = 0;
    if (op === '+') res = a + b;
    if (op === '-') res = a - b;
    if (op === '*' || op === 'x') res = a * b;
    if (op === '/' && b !== 0) res = +(a / b).toFixed(2);
    return {
      category: 'Cálculo Directo',
      reply: `El resultado de **${a} ${op} ${b}** es **${res}**.\n\n¿Te ayudo con alguna otra consulta?`
    };
  }

  // 7. Respuesta amigable y abierta cuando está sin internet y es otro tema
  return {
    category: 'Asistente General',
    reply: `¡Interesante consulta! Sobre *"${userMessage}"*, te cuento que puedo responderte tanto dudas generales como todo lo relacionado con nuestra plataforma.\n\nRecuerda que en nuestra Base de Conocimiento Oficial tengo información inmediata sobre:\n• **Horarios de atención**\n• **Restablecimiento de contraseña**\n• **Medios de pago (PSE, Tarjetas)**\n• **Tiempos de reembolso**\n• **Radicación de PQR**`
  };
}

// Configurador de API Key de IA desde el Frontend
function openAiSettingsModal() {
  document.getElementById('ai-provider-select').value = aiConfig.provider || 'free-llm';
  document.getElementById('ai-apikey-input').value = aiConfig.apiKey || '';
  toggleApiKeyField();
  const modal = document.getElementById('ai-settings-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeAiSettingsModal() {
  const modal = document.getElementById('ai-settings-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function toggleApiKeyField() {
  const provider = document.getElementById('ai-provider-select').value;
  const box = document.getElementById('ai-apikey-box');
  if (provider === 'free-llm') {
    box.classList.add('hidden');
  } else {
    box.classList.remove('hidden');
  }
}

function saveAiSettings(e) {
  e.preventDefault();
  aiConfig = {
    provider: document.getElementById('ai-provider-select').value,
    apiKey: document.getElementById('ai-apikey-input').value.trim()
  };
  localStorage.setItem('chatbot_v2_aiconfig', JSON.stringify(aiConfig));
  closeAiSettingsModal();
  showToast('Motor de Inteligencia Artificial actualizado', 'emerald');
}

function showTypingIndicator(show) {
  const indicator = document.getElementById('typing-indicator');
  const container = document.getElementById('chat-scroll-container');
  if (show) {
    indicator.classList.remove('hidden');
    scrollToBottom(container);
  } else {
    indicator.classList.add('hidden');
  }
}

function copyBotResponse(idx) {
  const session = getCurrentSession();
  const msg = session.messages[idx];
  if (!msg) return;
  navigator.clipboard.writeText(msg.content);
  showToast('Respuesta copiada al portapapeles', 'indigo');
}

function rateResponse(btn, type) {
  btn.className = type === 'up' ? 'text-emerald-400 scale-110 transition' : 'text-rose-400 scale-110 transition';
  showToast('¡Gracias por calificar la respuesta del asistente!', 'emerald');
}

// ============================================================================
// MÓDULO 2 Y 3: BASE DE CONOCIMIENTO (CRUD DE PREGUNTAS Y RESPUESTAS)
// ============================================================================
function renderFaqsView() {
  const searchVal = (document.getElementById('faq-search-input')?.value || '').toLowerCase();
  const categories = ['Todas', ...new Set(faqsState.map(f => f.categoria))];

  // Renderizar filtros de categoría
  const filterBar = document.getElementById('faq-category-pills');
  if (filterBar) {
    filterBar.innerHTML = categories.map(cat => {
      const active = selectedFaqCategory === cat;
      return `
        <button
          onclick="setFaqCategoryFilter('${escapeHtml(cat)}')"
          class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
            active
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/70'
          }"
        >
          ${escapeHtml(cat)}
        </button>
      `;
    }).join('');
  }

  const filtered = faqsState.filter(f => {
    const matchesCat = selectedFaqCategory === 'Todas' || f.categoria === selectedFaqCategory;
    const resp = f.respuestas?.[0]?.textoRespuesta || '';
    const matchesSearch = !searchVal ||
      f.textoPregunta.toLowerCase().includes(searchVal) ||
      f.categoria.toLowerCase().includes(searchVal) ||
      resp.toLowerCase().includes(searchVal);
    return matchesCat && matchesSearch;
  });

  const grid = document.getElementById('faqs-cards-grid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full glass-card rounded-2xl p-10 text-center text-slate-400">
        <i class="fa-solid fa-folder-open text-3xl text-slate-600 mb-3"></i>
        <p class="text-sm font-medium">No se encontraron preguntas frecuentes con ese criterio.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(faq => {
    const respObj = faq.respuestas?.[0] || {};
    const updatedDate = respObj.ultimaActualizacion
      ? new Date(respObj.ultimaActualizacion).toLocaleDateString('es-CO')
      : 'Hoy';

    return `
      <div class="glass-card rounded-2xl p-5 flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              ${escapeHtml(faq.categoria)}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[11px] font-mono text-slate-500">ID #${faq.id}</span>
              ${faq.estadoActivo
                ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVO</span>'
                : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">INACTIVO</span>'}
            </div>
          </div>

          <h4 class="font-display font-bold text-white text-base mb-2 leading-snug">
            ${escapeHtml(faq.textoPregunta)}
          </h4>
          <p class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            ${escapeHtml(respObj.textoRespuesta || 'Sin respuesta registrada')}
          </p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
          <span class="text-[11px] text-slate-500">
            <i class="fa-regular fa-clock mr-1"></i> Actualizado: ${updatedDate}
          </span>
          <div class="flex items-center gap-1.5">
            <button
              onclick="sendPredefinedPrompt(${JSON.stringify(faq.textoPregunta).replace(/"/g, '&quot;')}); switchWorkspaceView('chat');"
              class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition"
              title="Probar en el chat"
            >
              <i class="fa-solid fa-play text-[10px] mr-1"></i> Probar
            </button>
            <button
              onclick="openFaqEditor(${faq.id})"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Editar Pregunta/Respuesta"
            >
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button
              onclick="handleDeleteFaq(${faq.id})"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 transition"
              title="Eliminar FAQ"
            >
              <i class="fa-solid fa-trash text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setFaqCategoryFilter(category) {
  selectedFaqCategory = category;
  renderFaqsView();
}

function openFaqEditor(id = null) {
  if (!currentUser || currentUser.rol !== 'Admin') {
    showToast('Se requiere Rol Administrador (JWT) para gestionar las FAQs', 'amber');
    openAuthModal();
    return;
  }

  const modal = document.getElementById('faq-editor-modal');
  const title = document.getElementById('faq-editor-title');
  document.getElementById('edit-faq-id').value = id || '';

  if (id) {
    const faq = faqsState.find(f => f.id === id);
    if (!faq) return;
    title.textContent = `Editar Pregunta Frecuente #${id}`;
    document.getElementById('edit-faq-categoria').value = faq.categoria;
    document.getElementById('edit-faq-estado').value = String(faq.estadoActivo);
    document.getElementById('edit-faq-pregunta').value = faq.textoPregunta;
    document.getElementById('edit-faq-respuesta').value = faq.respuestas?.[0]?.textoRespuesta || '';
  } else {
    title.textContent = 'Nueva Pregunta y Respuesta Oficial';
    document.getElementById('edit-faq-categoria').value = '';
    document.getElementById('edit-faq-estado').value = 'true';
    document.getElementById('edit-faq-pregunta').value = '';
    document.getElementById('edit-faq-respuesta').value = '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeFaqEditor() {
  const modal = document.getElementById('faq-editor-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function saveFaqForm(event) {
  event.preventDefault();
  const id = document.getElementById('edit-faq-id').value;
  const payload = {
    textoPregunta: document.getElementById('edit-faq-pregunta').value.trim(),
    categoria: document.getElementById('edit-faq-categoria').value.trim(),
    estadoActivo: document.getElementById('edit-faq-estado').value === 'true',
    textoRespuesta: document.getElementById('edit-faq-respuesta').value.trim()
  };

  if (isBackendOnline) {
    const url = id ? `${API_BASE}/faqs/${id}` : `${API_BASE}/faqs`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentUser.token}`
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const updated = await fetch(`${API_BASE}/faqs`);
      faqsState = await updated.json();
    }
  } else {
    if (id) {
      const idx = faqsState.findIndex(f => f.id === Number(id));
      if (idx !== -1) {
        faqsState[idx].textoPregunta = payload.textoPregunta;
        faqsState[idx].categoria = payload.categoria;
        faqsState[idx].estadoActivo = payload.estadoActivo;
        faqsState[idx].respuestas[0].textoRespuesta = payload.textoRespuesta;
        faqsState[idx].respuestas[0].ultimaActualizacion = new Date().toISOString();
      }
    } else {
      const nextId = faqsState.length ? Math.max(...faqsState.map(f => f.id)) + 1 : 1;
      faqsState.push({
        id: nextId,
        textoPregunta: payload.textoPregunta,
        categoria: payload.categoria,
        estadoActivo: payload.estadoActivo,
        respuestas: [{
          id: nextId,
          preguntaId: nextId,
          textoRespuesta: payload.textoRespuesta,
          ultimaActualizacion: new Date().toISOString()
        }]
      });
    }
    localStorage.setItem('chatbot_v2_faqs', JSON.stringify(faqsState));
  }

  closeFaqEditor();
  renderFaqsView();
  renderSuggestedPrompts();
  showToast(id ? 'FAQ actualizada en la Base de Conocimiento' : 'Nueva FAQ incorporada al contexto de IA', 'emerald');
}

async function handleDeleteFaq(id) {
  if (!currentUser || currentUser.rol !== 'Admin') {
    showToast('Se requiere Rol Administrador para eliminar FAQs', 'amber');
    openAuthModal();
    return;
  }
  if (!confirm(`¿Confirmas eliminar la Pregunta #${id} y sus Respuestas asociadas?`)) return;

  if (isBackendOnline) {
    await fetch(`${API_BASE}/faqs/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentUser.token}` }
    });
  }

  faqsState = faqsState.filter(f => f.id !== id);
  localStorage.setItem('chatbot_v2_faqs', JSON.stringify(faqsState));
  renderFaqsView();
  renderSuggestedPrompts();
  showToast(`Pregunta #${id} eliminada correctamente`, 'rose');
}

// ============================================================================
// BITÁCORA SQL (TABLA CONVERSACIONES)
// ============================================================================
function renderConversationsLog() {
  const tbody = document.getElementById('sql-conversations-tbody');
  const counter = document.getElementById('sql-total-rows');
  if (counter) counter.textContent = `${conversationsDb.length} registros`;
  if (!tbody) return;

  if (conversationsDb.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-12 text-center text-slate-500 text-xs">
          No hay registros en la tabla <code class="text-indigo-400">Conversaciones</code> todavía. Envía una consulta en el chat para generar filas.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = conversationsDb.map(row => `
    <tr class="hover:bg-slate-800/40 transition border-b border-slate-800/70">
      <td class="py-3.5 px-4 font-mono text-xs text-indigo-400">#${row.conversacionId}</td>
      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-400">${row.sessionId}</td>
      <td class="py-3.5 px-4 text-xs">
        ${row.usuarioId
          ? `<span class="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">UsuarioId: ${row.usuarioId}</span>`
          : `<span class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[11px]">NULL (Anónimo)</span>`}
      </td>
      <td class="py-3.5 px-4 text-xs text-white font-medium max-w-xs">${escapeHtml(row.preguntaUsuario)}</td>
      <td class="py-3.5 px-4 text-xs text-slate-300 max-w-md truncate" title="${escapeHtml(row.respuestaBot)}">${escapeHtml(row.respuestaBot)}</td>
      <td class="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">${new Date(row.timestamp).toLocaleString('es-CO')}</td>
    </tr>
  `).join('');
}

function clearConversationsLog() {
  conversationsDb = [];
  localStorage.removeItem('chatbot_v2_conversations');
  renderConversationsLog();
  showToast('Bitácora local reiniciada', 'indigo');
}

// ============================================================================
// MÓDULO 1: AUTENTICACIÓN JWT (/api/auth/login & /api/auth/register)
// ============================================================================
function openAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
  document.getElementById('auth-modal').classList.add('flex');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  document.getElementById('auth-modal').classList.remove('flex');
}

function fillDemoCredentials(role) {
  if (role === 'Admin') {
    document.getElementById('auth-email').value = 'admin@chatbot.com';
    document.getElementById('auth-password').value = 'Admin123!';
  } else {
    document.getElementById('auth-email').value = 'usuario@chatbot.com';
    document.getElementById('auth-password').value = 'User123!';
  }
}

async function submitAuthForm(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.mensaje || 'Credenciales incorrectas', 'rose');
        return;
      }
      currentUser = data;
    } catch (_) {
      showToast('Error de red al autenticar con el servidor', 'rose');
      return;
    }
  } else {
    if (email.toLowerCase() === 'admin@chatbot.com' && password === 'Admin123!') {
      currentUser = {
        usuarioId: 1,
        nombre: 'Administrador Principal',
        email: 'admin@chatbot.com',
        rol: 'Admin',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.admin-jwt-signature'
      };
    } else if (email.toLowerCase() === 'usuario@chatbot.com' && password === 'User123!') {
      currentUser = {
        usuarioId: 2,
        nombre: 'Usuario Demo',
        email: 'usuario@chatbot.com',
        rol: 'User',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user-jwt-signature'
      };
    } else {
      showToast('Credenciales inválidas. Usa los botones de acceso rápido.', 'rose');
      return;
    }
  }

  localStorage.setItem('chatbot_v2_user', JSON.stringify(currentUser));
  updateUserProfileUI();
  closeAuthModal();
  showToast(`Sesión iniciada como ${currentUser.nombre} (${currentUser.rol})`, 'emerald');
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('chatbot_v2_user');
  updateUserProfileUI();
  showToast('Sesión JWT cerrada', 'indigo');
}

function updateUserProfileUI() {
  const nameEl = document.getElementById('profile-name');
  const roleEl = document.getElementById('profile-role');
  const avatarEl = document.getElementById('profile-avatar');
  const actionBtn = document.getElementById('profile-action-btn');

  if (currentUser) {
    nameEl.textContent = currentUser.nombre;
    roleEl.textContent = `Rol: ${currentUser.rol} • JWT Activo`;
    roleEl.className = 'text-[11px] text-emerald-400 font-medium';
    avatarEl.textContent = currentUser.nombre.charAt(0).toUpperCase();
    avatarEl.className = 'w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow';
    actionBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
    actionBtn.title = 'Cerrar sesión JWT';
    actionBtn.onclick = logoutUser;
  } else {
    nameEl.textContent = 'Usuario Anónimo';
    roleEl.textContent = 'Sin autenticar • Click para Login';
    roleEl.className = 'text-[11px] text-slate-400';
    avatarEl.innerHTML = '<i class="fa-regular fa-user"></i>';
    avatarEl.className = 'w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-sm';
    actionBtn.innerHTML = '<i class="fa-solid fa-key text-indigo-400"></i>';
    actionBtn.title = 'Iniciar sesión JWT';
    actionBtn.onclick = openAuthModal;
  }
}

// ============================================================================
// NAVEGACIÓN ENTRE VISTAS Y UTILIDADES UI
// ============================================================================
function switchWorkspaceView(viewName) {
  ['chat', 'faqs', 'sql'].forEach(v => {
    document.getElementById(`workspace-${v}`).classList.toggle('hidden', v !== viewName);
    const navBtn = document.getElementById(`nav-btn-${v}`);
    if (v === viewName) {
      navBtn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md glow-indigo transition';
    } else {
      navBtn.className = 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 transition';
    }
  });
}

function setupTextareaAutoResize() {
  const textarea = document.getElementById('chat-input');
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 130) + 'px';
  });

  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit(e);
    }
  });
}

function scrollToBottom(el) {
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
}

function formatBotRichText(str) {
  const safe = escapeHtml(str);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-indigo-300">$1</em>');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message, color = 'indigo') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const colors = {
    indigo: 'border-indigo-500/40 bg-slate-900/95 text-indigo-200',
    emerald: 'border-emerald-500/40 bg-slate-900/95 text-emerald-200',
    amber: 'border-amber-500/40 bg-slate-900/95 text-amber-200',
    rose: 'border-rose-500/40 bg-slate-900/95 text-rose-200'
  };
  toast.className = `px-4 py-3 rounded-xl border ${colors[color] || colors.indigo} shadow-xl text-xs font-medium flex items-center gap-2.5 msg-enter backdrop-blur-md`;
  toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
