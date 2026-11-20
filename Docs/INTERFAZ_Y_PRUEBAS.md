# Interfaz NexusAI: chat de servicio y pruebas

> **Ejecución real local validada:** API .NET 8 y SQL Server arrancados mediante Docker en `http://localhost:5080`. Pasaron 20 verificaciones HTTP reales y el flujo Playwright real de login/JWT y CRUD, sin mocks de API. Migración confirmada por consulta SQL. La IA sigue pendiente por decisión del usuario; no se enviaron mensajes a proveedores. Ver `Docs/EJECUCION_REAL_LOCAL.md`. Las notas de falta de entorno que siguen describen etapas anteriores.

> **Actualización de estructura:** el chatbot fue reconstruido sobre el shell de v0, no sobre el HTML anterior. Lateral permanente de 265px en escritorio (colapsable/drawer móvil), topbar de 70px y editor con Base de conocimiento y Enviar dentro del mismo contenedor. La antigua navegación horizontal fue retirada. Ver `Docs/CHAT_LAYOUT_V0.md` y `Docs/Capturas/chat-v0/` para la validación vigente. Las descripciones anteriores de conversaciones exclusivamente bajo demanda quedan sustituidas por esta estructura.

> **Validación vigente de esta reconstrucción:** suite final ejecutada, **33/33 pruebas aprobadas** (26 de navegador y 7 unitarias), 0 fallidas y 0 omitidas. La primera pasada tuvo 4 fallos de expectativas/selectores anteriores; se corrigieron y se repitió la suite completa. Las cifras de 27/31 que aparecen más abajo documentan etapas anteriores. Backend .NET/SQL/IA real pendiente.

## Referencia visual vigente

La interfaz adopta el diseño de `NexusAI-estatico.zip` sobre la SPA original: Inter, acento violeta, superficies claras, bienvenida lavanda e ilustración abstracta optimizada. Chat y aplicación ocupan todo el espacio disponible sin marco exterior ni tarjeta de 720px. Las tarjetas interiores y la columna legible no limitan la aplicación. «Conversaciones» abre el espacio personal bajo demanda; el admin conserva vistas separadas con menú lateral de 250px que pasa arriba en móvil. El editor mantiene un único contorno de foco. No se copiaron perfiles, métricas ficticias ni funciones demo del ZIP.

El selector claro/oscuro usa tokens en todas las vistas, diálogos y estados semánticos. La preferencia inicial respeta el sistema y solo se persiste `nexus_ui_theme`; roles, JWT y claves siguen en memoria. Las sugerencias muestran hasta tres FAQs activas del directorio actual y envían el contrato original a `/api/chat/send`. La bienvenida desaparece al existir preguntas del usuario y una conversación nueva comienza arriba. El login conserva su diálogo, eventos y endpoint. No se agregó registro: el endpoint existe, pero no había formulario original y la autorización excluye nuevas funcionalidades.

## Separación de usuario y administración

| Función | Visitante / User | Admin |
|---|---|---|
| Chat, Markdown seguro y copiar respuesta | Sí | Sí |
| Ayuda pública con búsqueda y respuestas desplegables | Solo FAQs activas | Solo FAQs activas en la ayuda pública |
| Conversaciones personales del navegador | Solo su espacio actual | Solo su propio espacio actual |
| Panel de preguntas/respuestas, IDs, categorías, estados y CRUD | No | Sí |
| Registros locales, KPI, exportar CSV y limpiar bitácora | No | Sí, con alcance local claramente indicado |
| Ajustes de proveedor y claves temporales de la demo | No | Sí, con consentimiento para envío externo |

El botón **Administración** solo aparece para Admin. Abre un espacio distinto del chat con navegación propia: Preguntas y respuestas, Registros locales y Ajustes del servicio. Los usuarios consultan ayuda mediante preguntas desplegables, sin tablas administrativas ni acciones de edición.

El panel está contenido en `#admin-shell`, oculto fuera del espacio administrativo o para no Admin. «Volver al chat» conserva la sesión. Las conversaciones se abren también en escritorio, con foco gestionado, contenido del chat inerte y cierre con Escape.

`switchView` valida permisos también al abrir hashes o invocar funciones directamente. Los manejadores de CRUD, ajustes, exportación y limpieza vuelven a comprobar el rol. Al cerrar sesión o recibir 401 se oculta el panel, se vacían tablas y formularios administrativos y se restaura el espacio personal correspondiente; las claves temporales se retiran de memoria y del formulario.

La protección real no depende de ocultar controles: la API conserva `[Authorize(Roles = "Admin")]` para mutaciones, y ahora `GET /api/faqs` fuerza el filtro activo para cualquier identidad no Admin, aunque solicite `onlyActive=false`. `GET /api/faqs/{id}` devuelve 404 para una FAQ inactiva solicitada por alguien no Admin. El login actualiza el directorio con el JWT real. Estos cambios no requieren migración de base de datos. El servidor real aún requiere validación con SDK .NET y SQL Server, no disponibles en este entorno.

**Registros locales no es una consola global de todas las conversaciones del servidor.** No se agregó un endpoint de auditoría global ni se mezclaron historiales entre cuentas para simularlo.

## Uso

- Servir `wwwroot` desde ASP.NET Core o abrir `wwwroot/index.html` para usar la demo. El frontend no requiere Node, Tailwind CDN ni compilación: todo el layout usa CSS semántico local.
- La página comprueba `/api/faqs` cuando se sirve por HTTP. Si no está disponible, **no activa una demo silenciosamente**: el usuario debe elegir «Usar demo local» y confirmar.
- La demo inicia con FAQs locales y saludos, sin envío de consultas a terceros. Para preguntas generales, conectar la API o seleccionar explícitamente un proveedor en Conexión, aportar una clave temporal si corresponde y aceptar el aviso de privacidad.
- Las claves de demo y los tokens JWT se mantienen en memoria; al recargar se requiere autenticarse nuevamente. El backend administra sus propias claves, independientemente de este modal.
- Las cuentas demo `admin@chatbot.com / Admin123!` y `usuario@chatbot.com / User123!` solo funcionan en modo demo. El registro público de la API ahora siempre asigna `User`, aunque el cliente solicite `Admin`; el seeder mantiene el administrador inicial.

## Cambios

- Tema claro `#f8f9fc` con acento `#7051df`, papel blanco y mensajes del usuario `#f0ebff`; modo oscuro `#171820`, papel `#21222c` y acento `#b09aff`. Texto secundario y bordes funcionales varían por tema. Se eliminaron tokens obsoletos y reglas móviles duplicadas; se conservan estados de éxito, advertencia y error con variantes oscuras.
- Dos vistas públicas (Chat y Ayuda) y dos vistas restringidas dentro de Administración (Preguntas/respuestas y Registros locales), con ajustes en modal solo para Admin. Chat en burbujas, lateral de conversaciones y preguntas comunes; filtros, CRUD y CSV solo en su contexto administrativo.
- Modales nativos `<dialog>`: fondo inerte, Escape, foco inicial y restauración, cancelación segura de acciones destructivas.
- Etiquetas visibles, focos, mensajes anunciados, loading, estados vacíos distintos de errores, prevención de envíos duplicados y respeto a reducción de movimiento.
- Datos del usuario y celdas de FAQs mediante DOM y `textContent`, sin manejadores inline interpolados. Las respuestas del asistente usan Marked seguido de DOMPurify con lista restringida de etiquetas y atributos, sin imágenes externas, HTML crudo ejecutable ni enlaces con protocolos inseguros. Si falta una librería, se muestra texto plano.
- La API confirma una mutación antes de cambiar el directorio. Si guardó pero falló el refresco, se bloquea el segundo guardado y se explica qué ocurrió.
- Se corrigió el GET posterior al guardado de FAQs para enviar el JWT mediante `apiOptions('GET')`, sin cambiar el contrato ni la autenticación. Así el Admin conserva las FAQs inactivas tras guardar; la ayuda pública las sigue excluyendo.
- Errores 400/401/403/404/409/422/429/5xx y red se gestionan sin fallback de autenticación ni éxitos simulados. `Retry-After` impide nuevas llamadas al mismo endpoint durante el plazo indicado. No se reintentan mutaciones automáticamente.
- Respuestas del chat asociadas a la sesión que inició el envío. Si la consulta falla, se conserva el texto; si el usuario está leyendo mensajes anteriores, no se fuerza el scroll al recibir una respuesta.
- KPI y exportación describen solo la copia local de interacciones confirmadas, no cifras globales de SQL Server. «Limpiar historial local» requiere confirmación y no borra el servidor ni los hilos del panel.

## Persistencia y privacidad

Los datos funcionales tienen prefijo `nexus_v3_`, con espacios separados por modo (demo/API) e identidad (visitante/ID de usuario). También se separan las cuentas demo entre sí; las antiguas claves demo compartidas con sufijo `_demo_` se conservan sin importarlas automáticamente porque no identificaban al propietario. Las FAQs demo siguen siendo un directorio compartido administrable, no un historial personal. La única clave nueva es `nexus_ui_theme` (cadena JSON `light` o `dark`), una preferencia visual sin identidad. El rol y las credenciales no se persisten. La autorización real sigue dependiendo del JWT del servidor.

Solo se retiran las antiguas claves `chatbot_v2_user` y `chatbot_v2_aiconfig`, que contenían credenciales/configuración persistida. Las antiguas FAQs, conversaciones y sesiones no se borran ni se importan automáticamente, para no mezclarlas con datos de otro origen. Ante JSON inválido, el valor original se preserva y no se sobrescribe; se informa del uso temporal de memoria.

Los historiales locales contienen texto de las consultas; no son almacenamiento cifrado ni una barrera contra otros usuarios del mismo navegador. Evitar equipos compartidos y datos sensibles. El chat de producción también puede transferir contexto a un proveedor del servidor: revisar política y consentimiento de la entidad antes de un despliegue real.

## Librerías aprobadas para el frontend

- **Marked 18.2.1 + DOMPurify 3.4.18**: respuestas con negritas, listas, enlaces, tablas y código, usando sanitización antes de insertarlas en el DOM. Los encabezados Markdown se presentan como párrafos destacados para no romper la jerarquía de la página. Botón «Copiar respuesta» mediante la API nativa de portapapeles, sin otra dependencia.
- **Fuse.js 7.1.0**: coincidencias aproximadas en la Ayuda pública y el directorio administrativo; también mejora la coincidencia de FAQs activas en la demo local. El lateral solo ofrece tres preguntas rápidas para evitar duplicar buscadores. Probar «reembolzo», «contrasea» y consultas sin tildes. Los resultados se ordenan por relevancia; puede haber varias coincidencias. No es búsqueda semántica.
- Las tres se cargan localmente desde `wwwroot/vendor`, con versiones fijadas y licencias incluidas. No necesitan CDN, React, compilación ni instalar Node en el servidor. `npm ci` reproduce las versiones y sincroniza los archivos; `npm run vendor:sync` permite repetir solo la copia. Fuse usa una distribución clásica compatible con abrir el HTML como archivo.
- Las conversaciones antiguas no se sobrescriben. Crear una nueva consulta para ver el saludo nuevo con formato. Las nuevas capacidades no activan proveedores externos ni alteran la separación de datos demo/API.

## Pruebas de navegador

Playwright y axe-core son dependencias **solo de desarrollo**; Marked, DOMPurify y Fuse son las dependencias de navegador descritas arriba. Para reproducir las pruebas:

```sh
npm ci
npx playwright install chromium
npm test
```

La suite levanta un servidor estático efímero, simula los endpoints de la API y ejecuta Chromium con Playwright y axe-core. No usa SQL Server ni envía consultas a proveedores reales. Comprueba demo explícita, roles, CRUD, inyección de contenido, fallos de API, bloqueo de reenvío, 401, 429, sesiones concurrentes, almacenamiento inválido, CSV, foco, contraste automatizado, reducción de movimiento y anchos de 320 a 1440px.

No sustituye `dotnet build`, pruebas de integración con SQL Server/JWT/LLM reales ni una revisión manual con lector de pantalla, teclado virtual, zoom real al 200% y políticas de privacidad. No afirmar cumplimiento completo WCAG solo por pasar axe.

La suite incluye pruebas de roles, rutas restringidas, cambio de identidad, cierre de sesión y 401, FAQs inactivas, formato Markdown, bloqueo de inyecciones y recursos remotos, enlaces seguros, copia, degradación a texto plano sin sanitizador, búsquedas con errores, actualización tras CRUD y apertura como archivo sin CDN. Se comprueban con axe las cuatro vistas a 320, 375, 768, 1024 y 1440px y el modal evaluado, además de foco, Escape, reducción de movimiento y ausencia de desbordamiento global. No verifica el servidor real ni certifica cumplimiento completo WCAG.

Línea base ejecutada antes de integrar: **27/27 aprobadas** (20 de navegador y 7 unitarias). Primera ejecución del rediseño: **31/31 aprobadas**. Repetición final tras corregir el scroll inicial de bienvenida: **31/31 aprobadas** (24 de navegador y 7 unitarias), sin fallos ni omisiones. Las cuatro regresiones adicionales cubren refresco autenticado, sugerencias reales/contrato del chat, preferencia visual y accesibilidad oscura/login responsive. Detalles en `Docs/INTEGRACION_VISUAL_V0.md`. No se ejecutó una nueva auditoría de dependencias en esta integración ni se cambiaron sus versiones. Las pruebas del servidor real siguen pendientes.

La etiqueta del editor continúa disponible para lectores de pantalla sin repetir el placeholder. Copiar es accesible por teclado y permanece visible en dispositivos táctiles. La prueba de composición verifica pantalla completa, conversaciones desplegables, menú del admin, regreso al chat sin cerrar sesión y menú superior móvil. Las regresiones nuevas comprueban login en ambos temas a 375/1440px, confinamiento/restauración de foco, cuatro vistas oscuras, ajustes y editor de FAQs. El contenedor principal evita que textos accesibles extiendan el documento fuera del viewport.

### Pantalla fija, sin bajar la página

La aplicación ocupa `100dvh` con una cadena flex/grid de `min-height: 0`. El documento no se desplaza: mensajes, bienvenida, panel desplegable y vistas largas tienen desplazamiento interno. No hay margen exterior ni alturas mínimas rígidas. La cabecera y el editor permanecen dentro del viewport. «Conversaciones» y «Volver al chat»/Escape funcionan en cualquier tamaño. Los avisos breves ocupan una franja de estado, sin tapar menús ni Enviar.

La prueba de regresión verifica el editor y el botón Enviar completos dentro del viewport, sin scroll del documento, en 1366×654 (la situación reportada), 1280×600, 1024×600, 1440×900, 375×667, 320×568 y 375×480, con alerta offline o un historial largo.

## Limpieza autorizada

Se eliminaron `wwwroot/figma-prototipo.html`, `wwwroot/Video_Prototipo_Figma_NexusAI.mp4`, `Docs/Figma/` y `Docs/Video_Prototipo_Figma_NexusAI.mp4`, tras confirmación explícita del usuario. El video estaba duplicado entre la web y Docs. Se conservan SRS, historias de usuario, casos de uso, diagramas, backend, migraciones, scripts de base de datos y pruebas.
