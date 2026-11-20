# Integración visual v0 sobre NexusAI

> **Informe histórico de la primera integración, sustituida por solicitud del usuario.** La reconstrucción estructural vigente y sus capturas están en `Docs/CHAT_LAYOUT_V0.md` y `Docs/Capturas/chat-v0/`. Los resultados de pruebas que siguen corresponden a aquella primera integración, no a la reconstrucción actual.

Fecha: 20 de noviembre de 2026.

## Resultado y alcance

Se aplicó la referencia visual de `NexusAI-estatico.zip` sobre la SPA original sin importar su aplicación demo, sus módulos ES, usuarios ficticios ni servicios simulados. Se mantienen HTML5, CSS3, JavaScript clásico, las cuatro vistas y los diálogos originales. No se añadieron frameworks, paquetes ni bundler.

La renovación incluye cabecera, marca, tipografía Inter, botones, formularios, menú administrativo, tablas, tarjetas, mensajes, ayuda pública y login. Se añadió la preferencia visual claro/oscuro requerida. La aplicación permanece a pantalla completa, sin marco redondeado exterior ni widget centrado; solo las zonas de contenido tienen scroll. Enviar permanece visible en los tamaños automatizados.

El original no tenía formulario de registro, aunque el servidor sí dispone de `POST /api/auth/register`. No se agregó un registro nuevo, cambio de contraseña, perfil editable, gestión de usuarios ni dashboard global: contradirían la restricción de no añadir funcionalidades. El registro ficticio del ZIP no se integró.

## Respaldo previo

Antes de modificar se creó:

`/tmp/opencode/nexusai-pre-v0-20261120-072636/`

Contenido:

- `source.tar.gz`: archivos del proyecto, excluyendo `.git` y `node_modules`.
- `status.txt`: estado Git previo.
- `staged.patch`: cambios que ya estaban preparados.
- `unstaged.patch`: cambios que ya estaban pendientes.

No se hicieron commits, resets ni cambios del índice. El respaldo se encuentra fuera del repositorio y puede incluir configuración local: custodiarlo como información privada y copiarlo a almacenamiento duradero si se necesita conservarlo más allá de esta sesión. No publicarlo.

## Archivos modificados en esta integración

| Archivo | Cambios |
|---|---|
| `wwwroot/index.html` | Marca SVG, selector de tema, cabecera, bienvenida y contenedor de sugerencias, presentación de login con panel ilustrativo. Conserva IDs/formularios/eventos funcionales. |
| `wwwroot/css/styles.css` | Tokens claros/oscuros, Inter con fallback, componentes v0 adaptados, responsive y diálogos. Se retiran tokens sin uso y reglas móviles redundantes. |
| `wwwroot/js/app.js` | Preferencia visual, renderizado de sugerencias basadas en FAQs activas, visibilidad/scroll de bienvenida y corrección del refresco autenticado de FAQs. |
| `tests/ui.test.cjs` | MIME/allowlist de recursos visuales y cuatro regresiones nuevas. Se conserva la línea base. |
| `Docs/INTERFAZ_Y_PRUEBAS.md` | Descripción vigente, privacidad, pruebas y limitaciones. |
| `Docs/PROMPT_CONTEXTO_GEMINI.md` | Nota inicial actualizada; no se eliminó el contexto histórico. |
| `design-system/nexusai/MASTER.md` | Reglas visuales vigentes; se conserva el archivo histórico explícitamente no normativo. |

Archivos añadidos:

- `wwwroot/images/nexusai/mark.svg`.
- `wwwroot/images/nexusai/neural.webp`.
- `wwwroot/images/nexusai/README.md`: procedencia y limitaciones de licencia.
- `Docs/INTEGRACION_VISUAL_V0.md`: este informe.

Una comparación SHA-256 con el respaldo confirmó que no se modificaron `Controllers/`, `DTOs/`, `Services/`, `Models/`, `Data/`, `Migrations/`, `Program.cs`, `appsettings.json`, `ChatbotApi.csproj`, `package.json` ni `package-lock.json`. Los cambios de backend que ya existían en Git antes de empezar no pertenecen a esta integración.

## Funcionalidades conservadas

- API REST real con endpoints y contratos originales.
- JWT/roles originales, token solo en memoria, cierre de sesión y manejo de 401.
- Chat anónimo/autenticado, límite de 1500 caracteres, identidad de sesión de origen, control de duplicados y conservación de texto fallido.
- Historial local aislado por modo/identidad, creación/selección/eliminación local de conversaciones sin borrar SQL Server.
- Marked 18.2.1, DOMPurify 3.4.18 y Fuse.js 7.1.0 locales, sin cambios de versión o política de sanitización.
- Ayuda pública solo con FAQs activas y búsqueda aproximada.
- CRUD de FAQs para Admin, categorías, estados, confirmaciones y recuperación tras errores.
- Bitácora y KPI locales, exportación CSV segura y limpieza local confirmada.
- Demo original explícita, consentimiento y ajustes temporales originales. No se incorporaron pantallas demo del ZIP.
- Proveedores de IA y sus solicitudes sin modificaciones.
- Foco de diálogos, Escape, avisos accesibles y movimiento reducido.

La clave nueva `nexus_ui_theme` contiene únicamente una cadena JSON `light` o `dark`. No cambia los namespaces funcionales, no importa datos `nexus-demo:` y no persiste tokens, claves, contraseñas ni roles. Un valor ilegible se conserva sin sobrescribirlo, igual que el almacenamiento funcional existente.

## Correcciones

1. El GET de FAQs posterior al guardado envía ahora `apiOptions('GET')`. Antes se omitía el JWT y el Admin podía perder las FAQs inactivas de su directorio. Se mantiene la exclusión de inactivas en la ayuda pública.
2. Una conversación nueva comienza al inicio de la bienvenida. El scroll automático original hacia el saludo dejaba cortada la cabecera del hero; se preserva el comportamiento de scroll del chat con mensajes del usuario.
3. Los controles heredan el color del tema; botones principales usan un token de contraste independiente del papel.

La ilustración del ZIP se redujo de 1 195 628 bytes a 20 110 bytes en WebP, con dimensiones reservadas. No se instaló un optimizador ni se ejecutó código del ZIP.

## Pruebas realmente ejecutadas

| Ejecución | Aprobadas | Fallidas | Omitidas |
|---|---:|---:|---:|
| `npm test`, antes de modificar | 27 | 0 | 0 |
| `NEXUS_SCREENSHOT_DIR=/tmp/opencode/nexus-v0 npm test`, primera integración | 31 | 0 | 0 |
| `NEXUS_SCREENSHOT_DIR=/tmp/opencode/nexus-v0-final npm test`, después de corregir scroll/color | 31 | 0 | 0 |

La ejecución final incluye 24 pruebas de navegador con Playwright/Chromium y 7 unitarias con Node. Los endpoints están interceptados en el navegador: **no son pruebas del servidor real**.

Las cuatro regresiones nuevas verifican:

1. POST de FAQ y GET posterior con el mismo Bearer JWT; inactivas visibles al Admin pero no en ayuda pública.
2. Sugerencias procedentes de FAQs reales interceptadas, envío exacto de `{sessionId, mensaje}`, recursos locales válidos, límite y nueva conversación sin scroll inicial.
3. Preferencia de sistema al iniciar, alternancia y persistencia visual, token intacto durante alternancia y eliminado al recargar, almacenamiento corrupto preservado.
4. Login claro/oscuro a 375 y 1440px, foco confinado/restaurado, axe en las cuatro vistas oscuras a ambos tamaños, ajustes y editor FAQ oscuros.

La suite existente sigue comprobando permisos, sanitización, búsquedas, fallos API, duplicados, aislamiento, CSV, Markdown, apertura `file://`, movimiento reducido y responsive a 320/375/768/1024/1440px. Enviar se comprueba a 1366×654, 1280×600, 1024×600, 1440×900, 375×667, 320×568 y 375×480.

También se ejecutó `node --check wwwroot/js/app.js` sin errores. La comprobación `git diff --check` no encontró errores de formato durante la integración; repetirla tras cualquier edición posterior.

### Comprobación visual

Capturas finales en `/tmp/opencode/nexus-v0-final/`. Se revisaron visualmente chat claro de escritorio, chat oscuro móvil, login oscuro móvil, FAQs claras de escritorio y editor de FAQ oscuro de escritorio. También se había revisado el login claro de escritorio en la primera pasada. Las capturas usan la demo explícita original para poblar contenido; no acreditan funcionamiento real del backend.

La revisión de capturas identificó el scroll inicial cortado del hero, corregido antes de la última suite. Las capturas finales desactivan transiciones al fotografiar para no mezclar colores intermedios al alternar tema.

## Validaciones pendientes

- `dotnet build` y ejecución real: no existe ejecutable `dotnet` en el entorno.
- SQL Server, migraciones y CRUD persistido real: no se ejecutaron; tampoco hay `sqlcmd` disponible.
- JWT emitido/validado por el servidor y pruebas HTTP reales.
- Gemini, OpenAI y Pollinations reales; no se hicieron solicitudes ni se probaron claves.
- Verificación manual en Safari/Firefox, teléfono con teclado virtual, lector de pantalla y zoom real al 200%.
- Política institucional de privacidad y derechos de publicación de las imágenes proporcionadas. El ZIP no incluye licencia separada de imágenes.
- No se hizo una nueva auditoría npm; no se actualizaron dependencias.

Los resultados de axe no certifican cumplimiento WCAG completo. La lectura del historial por UUID continúa siendo un endpoint anónimo existente; no se conectó a nuevos buscadores ni se alteró su autorización. Las métricas siguen siendo locales, no globales de SQL Server.

## Ejecutar y verificar localmente

### Solo interfaz estática

Desde la raíz:

```sh
python3 -m http.server 8080 --directory wwwroot
```

Abrir `http://localhost:8080`. Este servidor no contiene `/api`: el aviso de conexión es esperado. Elegir explícitamente **Probar demo** para explorar la demo original. No hay fallback automático. También se puede abrir `wwwroot/index.html` directamente para la demo sin API.

Verificar Chat/Ayuda, selector claro/oscuro, Conversaciones y login. Las cuentas indicadas por la interfaz demo solo funcionan en ese modo. No introducir datos sensibles.

### Aplicación completa

En un equipo con .NET SDK 8 y SQL Server disponibles, configurar los valores originales mediante configuración local/variables de entorno: conexión SQL Server, firma JWT y proveedor de IA. No publicar secretos en Git.

```sh
dotnet restore ChatbotApi.csproj
dotnet build ChatbotApi.csproj
dotnet run --project ChatbotApi.csproj
```

Abrir la dirección que indique ASP.NET Core. **Atención:** el arranque original ejecuta migraciones/seeder; usar una base de desarrollo preparada y respaldada. Esta integración no ejecutó ni modificó ese proceso. No elegir demo para comprobar las solicitudes reales. Iniciar sesión con una cuenta de desarrollo real y revisar la pestaña Network: `/api/auth/login`, `/api/faqs` y `/api/chat/send`; sin inspeccionar/publicar tokens en capturas.

### Reproducir pruebas del frontend

```sh
npm ci
npx playwright install chromium
npm test
```

Las dependencias y versiones ya están fijadas. `npm ci` sincroniza vendor mediante el script existente. Para guardar capturas:

```sh
NEXUS_SCREENSHOT_DIR=/tmp/opencode/nexus-v0-verificacion npm test
```

Finalmente comprobar responsive, alternancia de temas, foco/Escape, creación/selección de conversaciones, búsquedas, permisos User/Admin, CRUD, CSV y errores. Recargar con Ctrl+Shift+R si el navegador conserva CSS anterior.
