# Chat reconstruido sobre el layout de v0

## Alcance

Esta implementación sustituye el enfoque visual anterior. La base del chat es la estructura de `shell()` en `assets/js/app.js` y `renderChat()` en `assets/js/chat.js` del ZIP de v0, no el HTML antiguo de NexusAI. `chat.html` del ZIP es solo el shell que carga esos módulos.

No se encontró una carpeta fuente `NexusAI-Frontend-V0` junto al proyecto ni en la raíz de Descargas; se utilizó `/home/santiago/Descargas/NexusAI-estatico.zip`. Se extrajo una referencia aislada en `/tmp/opencode/NexusAI-Frontend-V0/` para servirla y visualizarla con Chromium. Sus servicios demo no se copiaron a la aplicación.

### Respaldo anterior a esta reconstrucción

`/tmp/opencode/nexusai-before-layout-20261120-083814/`

Incluye `source.tar.gz`, estado Git y diffs staged/unstaged. Se excluyeron `.git` y `node_modules` del tar; no se alteró el índice Git ni se descartó trabajo previo. El respaldo puede contener configuración privada: no publicarlo y copiarlo a un lugar duradero si se necesita conservar.

## Estructura implementada

```text
.layout                         100% × 100dvh
├── .sidebar                    265px, altura completa
│   ├── .side-head              marca + contraer
│   ├── .new                    nueva conversación
│   ├── .search                 búsqueda local + Ctrl/Cmd K
│   ├── .history                Hoy / Ayer / Anteriores, scroll propio
│   └── .side-foot              ayuda, configuración, demo, cuenta
└── .stage
    ├── .topbar                 70px escritorio / 61px móvil
    └── main
        └── .chat-page
            ├── .scroll-area   conversación/bienvenida con scroll propio
            └── .composer-wrap
                ├── form.composer
                │   ├── textarea
                │   └── .composer-tools
                │       ├── Base de conocimiento
                │       └── Enviar, alineado a la derecha
                └── advertencia informativa
```

La antigua navegación horizontal y la segunda cabecera del chat se eliminaron del HTML. El editor anterior con el botón fuera del campo fue reemplazado. El lateral queda abierto por defecto en escritorio; puede colapsarse. En móvil se convierte en drawer con fondo inerte, cierre por Escape/backdrop y foco confinado.

La navegación compartida permite llegar a las vistas originales de ayuda y administración sin recargar la SPA. No se reconstruyeron sus formularios/tablas ni el login en esta fase; solamente se conectaron a la nueva navegación. El panel administrativo mantiene sus permisos y su contenido original.

## Adaptación directa y diferencias justificadas

- `wwwroot/css/chat-v0.css` adapta las reglas de `assets/css/global.css` y `assets/css/chat.css`: dimensiones, distribución, márgenes, hero, rejilla de dos columnas, historial y editor.
- Se mantienen los tokens claro/oscuro de NexusAI y las bibliotecas locales actuales, no las versiones antiguas del ZIP ni su CDN duplicado de Lucide.
- Los SVG de controles son locales/inline, sin framework ni dependencia adicional.
- Las sugerencias mantienen la rejilla visual de v0, pero proceden de hasta cuatro FAQs activas reales, no de las sugerencias ficticias del ZIP.
- La disponibilidad muestra `API disponible`, `Sin conexión`, `Comprobando…` o `Demo local`, no un `En línea` fijo. La disponibilidad de FAQs no certifica la del LLM.
- Los botones pequeños del ZIP se amplían hasta 44px donde corresponde; la advertencia también conserva la indicación de no compartir datos sensibles.
- Los grupos temporales se calculan con fechas locales y la última marca de tiempo existente en los mensajes; no se cambió el esquema de caché ni se migraron datos.
- La búsqueda filtra solamente conversaciones de la identidad/modo actual; no consulta un historial global ni escribe cambios al filtrar.

## Conexiones funcionales

- Nueva conversación, seleccionar y quitar una conversación: manejadores originales, con borrado exclusivamente local y confirmación.
- Enviar: `POST /api/chat/send` y contrato `{sessionId, mensaje}`, con máximo de 1500 caracteres, JWT cuando corresponda y prevención de duplicados.
- Respuestas: política original de Marked + DOMPurify, sin HTML inseguro ni imágenes remotas.
- Copiar: API de portapapeles existente, conservando el icono al anunciar el resultado.
- Base de conocimiento: abre FAQs activas actuales; seleccionar una usa el mismo envío real del chat. El acceso a toda la ayuda mantiene la búsqueda Fuse.js.
- Login/logout: manejadores JWT originales; avatar y nombre reflejan la identidad en memoria. No se inventó un perfil editable.
- Configuración: Admin abre el modal original de conexión/proveedores. Visitante/User solo acceden a la preferencia visual claro/oscuro ya existente, sin controles de proveedor.
- Modo demostración: únicamente la confirmación y comportamiento originales; no hay selector falso de roles ni login automático del ZIP.
- Administración: conserva los accesos y validaciones de rol originales, sin endpoints nuevos.

### Elementos sin funcionalidad real en el original

**Me gusta, No me gusta y Regenerar respuesta** aparecen como acciones deshabilitadas, con nombre accesible y explicación de indisponibilidad. No se guardan votos, no se simula regeneración y no se hace ninguna solicitud nueva. Copiar sí está conectado. No se añadió edición de perfil ni configuración global ficticia.

## Archivos de esta fase

- `wwwroot/index.html`: reemplazo del shell/chat y conexiones de navegación.
- `wwwroot/css/chat-v0.css`: estructura y componentes derivados del frontend v0.
- `wwwroot/css/styles.css`: retirada de reglas del layout viejo que dejaron de usarse; estilos compartidos y de otras vistas conservados.
- `wwwroot/js/app.js`: adaptación de selectores, agrupación/búsqueda, drawer, cuenta, disponibilidad, base de conocimiento y presentación de acciones.
- `tests/ui.test.cjs`: adaptación de rutas de navegación y pruebas de la distribución nueva; regresiones adicionales.
- Este informe, las notas de vigencia y capturas comparativas.

No se modifican backend, SQL Server, EF, contratos, autenticación JWT, proveedores de IA ni dependencias.

## Comparación visual

Se sirvieron ambos proyectos con servidores HTTP aislados y se visualizaron mediante Playwright/Chromium. Condiciones iguales: ventanas de 1440×900 y 375×900, temas claro/oscuro y dos estados (bienvenida y un intercambio). Se bloquearon servicios externos en la comparación. Las FAQs y mensajes del ensayo son fixtures de captura, no datos incorporados al producto ni sustitución de API en ejecución normal.

En la referencia los fixtures se cargaron únicamente en su demo aislada; en NexusAI las FAQs se interceptaron en el navegador y el intercambio se preparó en memoria para reproducir exactamente el contenido. Todas las capturas de este ensayo mostraron cero excepciones JavaScript no capturadas.

Archivos temporales: `/tmp/opencode/nexus-layout-comparison/`, prefijos `v0-`, `before-`, `after-`. Las capturas anteriores se tomaron antes de modificar la estructura. Las seleccionadas para entrega se guardan en `Docs/Capturas/chat-v0/`.

Las comparaciones no son una certificación pixel-perfect: textos funcionales, disponibilidad honesta, controles accesibles y datos reales justifican diferencias frente a los mocks de v0.

## Pruebas

Primera pasada de la reconstrucción: 31 pruebas ejecutadas, 27 aprobadas y 4 fallidas. Los fallos correspondían a expectativas de ubicación/orden antiguas (índice fijo de sesión, encabezado dentro de la sección en vez de topbar y navegación hacia el tab Chat cuando ya estaba seleccionado). Se corrigieron los selectores/expectativas sin eliminar las verificaciones de seguridad ni de API. El historial ahora se selecciona por su identificador, no por posición tras ordenarlo por actividad.

Reejecución dirigida de los cuatro casos y dos regresiones nuevas: **6/6 aprobadas**.

Suite final ejecutada con `NEXUS_SCREENSHOT_DIR=/tmp/opencode/nexus-chat-final npm test`: **33/33 aprobadas** (26 de navegador y 7 unitarias), **0 fallidas, 0 omitidas**, duración aproximada 106 segundos. Conserva los escenarios funcionales de la línea base original de 27 pruebas, las cuatro regresiones anteriores y dos nuevas del lateral/base de conocimiento.

Además de las pruebas de seguridad/API originales, se verifica explícitamente:

- Lateral visible de 265px por defecto y topbar de 70px en escritorio.
- Ausencia en el DOM de `.top-nav`, `.view-nav`, `.chat-heading` y `.composer-bottom`.
- Enviar y Base de conocimiento dentro del mismo formulario.
- Colapso/reapertura, Ctrl K, drawer móvil, foco y Escape.
- Grupos Hoy/Ayer/Anteriores, filtrado sin alterar almacenamiento y scroll independiente.
- Selección de conversación por identidad después de ordenar por actividad.
- Base de conocimiento con contrato de API sin cambios y acciones de valoración/regeneración deshabilitadas.
- Preferencias de visitante sin acceso a proveedores y sin solicitudes simuladas.
- Responsive/axe, temas, sanitización, CSV, duplicados, errores y sesión de origen.

`node --check wwwroot/js/app.js` y `git diff --check` se ejecutaron sin errores. Las comprobaciones del servidor real siguen pendientes; los endpoints de las pruebas se interceptan en Playwright.

Las láminas de comparación y las capturas individuales seleccionadas se revisaron visualmente: bienvenida e intercambio de escritorio claros, intercambio móvil oscuro y vistas finales individuales. No se declara equivalencia pixel-perfect ni validación real del backend.

## Pendientes de entorno

Actualización posterior: ya se ejecutó el entorno Docker .NET 8 + SQL Server, con 20 verificaciones HTTP reales y el flujo real de navegador aprobados. Después el backend se migró a **PostgreSQL 17** (Npgsql) y se repitieron: 20 verificaciones HTTP, flujo Playwright real y 33 pruebas de interfaz. Ver `Docs/EJECUCION_REAL_LOCAL.md`. Las limitaciones siguientes eran las del momento de reconstruir el layout; proveedores IA, TLS y revisión manual ampliada siguen pendientes.

- Build/ejecución ASP.NET Core .NET 8 y PostgreSQL reales: no disponibles en ese momento (ya validados después).
- JWT emitido por backend, persistencia y proveedores de IA reales: el JWT y la persistencia ya se validaron; los proveedores de IA siguen sin probarse.
- Firefox/Safari, lector de pantalla, zoom real y teclado virtual: revisión manual pendiente.
- Derechos de publicación de imágenes entregadas en el ZIP, como se indica en `wwwroot/images/nexusai/README.md`.

## Ejecutar

Interfaz estática: `python3 -m http.server 8080 --directory wwwroot`; abrir `http://localhost:8080` y elegir explícitamente Modo demostración en el lateral. No hay API en ese servidor y el estado Sin conexión es correcto.

Pruebas: `npm test`. Para capturas de la suite: `NEXUS_SCREENSHOT_DIR=/tmp/opencode/nexus-chat-verificacion npm test`.

Aplicación completa, en un entorno preparado: `dotnet run --project ChatbotApi.csproj`, con su configuración SQL/JWT/IA existente. El arranque original ejecuta migraciones/seeder: usar base de desarrollo respaldada. No se ejecutó ni modificó ese proceso aquí.
