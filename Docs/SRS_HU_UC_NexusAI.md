# ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS), HISTORIAS DE USUARIO (HU) Y CASOS DE USO (UC)

> **Nota de implementación (20/11/2026):** este documento describe el diseño original, que planteaba SQL Server. La implementación se ejecuta finalmente sobre **PostgreSQL 17 con EF Core + Npgsql**, para desplegar en Supabase/Railway. Los requisitos funcionales, roles, contratos y reglas de negocio no cambian; solo el motor de base de datos. Ver `Docs/EJECUCION_REAL_LOCAL.md`.

- **Proyecto:** Software de Chatbot Inteligente de Atención al Usuario (**NexusAI / Centro de Atención al Usuario**)
- **Autor / Desarrollador:** Santiago Muñoz Salazar (`santiagomunozsa12@gmail.com`)
- **Instructor:** Carlos Fabian Martínez Mora
- **Institución:** Servicio Nacional de Aprendizaje – SENA
- **Programa:** Tecnólogo en Análisis y Desarrollo de Software (ADSO) – **Ficha 3413988**
- **Año:** 2026

---

## 1. INTRODUCCIÓN

### 1.1 Planteamiento del Problema
Actualmente, las organizaciones e instituciones presentan dificultades críticas en la atención y resolución de dudas frecuentes de sus usuarios (horarios de atención, restablecimiento de contraseñas, medios de pago, tiempos de reembolso y radicación de PQR). Estos procesos suelen realizarse manualmente por personal de soporte, generando:
- Demoras significativas en los tiempos de respuesta.
- Saturación del personal humano en tareas operativas y repetitivas.
- Falta de disponibilidad de atención continua 24/7.
- Inconsistencia en las respuestas institucionales entregadas por distintos canales.
- Ausencia de trazabilidad y métricas sobre las dudas más frecuentes de los usuarios.

### 1.2 Propósito
Definir de manera estructurada y verificable los **Requerimientos Funcionales (RF)**, **Requerimientos No Funcionales (RNF)**, **Historias de Usuario (HU)** y **Casos de Uso (UC)** del sistema **NexusAI**, sirviendo como base oficial para el análisis, diseño, construcción y evaluación de la API REST en C# (`.NET 8`), la base de datos en **Microsoft SQL Server** y el Frontend Web SPA.

### 1.3 Justificación
La implementación de un Chatbot Inteligente con **Generación Aumentada por Recuperación (RAG)** permite responder de forma inmediata, precisa y empática las 24 horas del día basándose estrictamente en las Preguntas Frecuentes (FAQs) oficiales almacenadas en SQL Server, reduciendo la carga operativa y registrando automáticamente una bitácora auditable.

### 1.4 Objetivo General
Desarrollar un aplicativo web con arquitectura **Clean Architecture** en C# (`.NET 8`) y **Microsoft SQL Server** para la gestión de atención al usuario mediante un chatbot inteligente integrado con Modelos de Lenguaje (LLMs) y base de conocimiento propia (FAQs).

#### 1.4.1 Objetivos Específicos
1. Desarrollar un módulo seguro de registro y autenticación con **JWT (HMAC-SHA256)** y **BCrypt** para Administradores y Usuarios.
2. Implementar un directorio público y módulo administrativo **CRUD de Preguntas Frecuentes (FAQs)** con filtrado por categoría y búsqueda instantánea.
3. Integrar el motor de Inteligencia Artificial (`AiIntegrationService`) mediante `HttpClient` asíncrono con inyección de contexto **RAG** desde SQL Server y soporte multi-proveedor (**Google Gemini 1.5 Flash**, **OpenAI GPT-4o Mini**, **Pollinations AI** y respaldo local).
4. Diseñar un sistema de **Bitácora de Conversaciones** (`dbo.Conversaciones`) que registre automáticamente cada interacción vinculada a su `SessionId` (GUID) y `UsuarioId`.
5. Proporcionar un módulo de **Auditoría Histórica** con indicadores KPI en tiempo real y exportación de reportes en formato **CSV**.

### 1.5 Alcance del Proyecto
- Módulo de autenticación JWT y control de acceso basado en roles (`Admin`, `User`, `Visitante`).
- Mesa de Consultas en Línea con soporte para múltiples sesiones (`SessionId` GUID) y botones de temas frecuentes rápidos.
- Gestión completa CRUD de la base de conocimiento (`dbo.Preguntas` y `dbo.Respuestas` con borrado en cascada).
- Registro automático en bitácora (`dbo.Conversaciones`), consulta de historial por sesión, KPIs y exportación CSV.
- Documentación interactiva en **Swagger / OpenAPI v1** (`/swagger`).

### 1.6 Tecnologías Utilizadas
| Capa / Componente | Tecnologías e Implementación |
|---|---|
| **Backend API REST** | C# 12, ASP.NET Core Web API (.NET 8.0), Controladores REST y DTOs con `DataAnnotations`. |
| **Base de Datos y ORM** | Microsoft SQL Server (`ChatbotAtencionDB`) y Entity Framework Core 8.0 (Code-First, Migraciones, Data Seeder). |
| **Seguridad** | `Microsoft.AspNetCore.Authentication.JwtBearer` (JWT HMAC-SHA256) y `BCrypt.Net-Next` v4.0.3. |
| **Inteligencia Artificial** | `HttpClient` asíncrono (Timeout 30s) con **Google Gemini 1.5 Flash**, **OpenAI GPT-4o Mini**, **Pollinations LLM** y motor léxico local. |
| **Frontend Web (SPA)** | HTML5, CSS3, Tailwind CSS y JavaScript ES6+ (`wwwroot/index.html`, `wwwroot/js/app.js`). |

---

## 2. DESCRIPCIÓN GENERAL Y MODELO DE DATOS

### 2.1 Actores del Sistema
| Actor | Clasificación | Permisos y Funciones Principales |
|---|---|---|
| **Visitante (Anónimo)** | Usuario Final | Enviar consultas al chatbot, usar temas frecuentes rápidos, gestionar sus sesiones locales y consultar/filtrar el directorio de FAQs. |
| **Usuario Registrado (`User`)** | Usuario Autenticado | Iniciar sesión con JWT, realizar consultas vinculadas a su `UsuarioId` en SQL Server y consultar su historial de sesiones. |
| **Administrador (`Admin`)** | Administrador | Control total del CRUD de FAQs (crear, editar, activar/inactivar, eliminar), configurar el proveedor de IA, auditar bitácora y exportar CSV. |
| **API Proveedor LLM** | Sistema Externo | Procesar el `System Prompt` con contexto RAG y devolver la respuesta en lenguaje natural. |

### 2.2 Modelo Entidad-Relación (SQL Server `ChatbotAtencionDB`)
- **`dbo.Usuarios`**: `Id` (PK, IDENTITY), `Nombre` (NVARCHAR(100)), `Email` (NVARCHAR(150), UNIQUE `IX_Usuarios_Email`), `PasswordHash` (NVARCHAR(MAX)), `Rol` (`Admin` / `User`), `FechaCreacion` (DATETIME2 UTC).
- **`dbo.Preguntas`**: `Id` (PK, IDENTITY), `TextoPregunta` (NVARCHAR(500)), `Categoria` (NVARCHAR(100)), `EstadoActivo` (BIT DEFAULT 1).
- **`dbo.Respuestas`**: `Id` (PK, IDENTITY), `PreguntaId` (FK -> `Preguntas.Id` `ON DELETE CASCADE`), `TextoRespuesta` (NVARCHAR(MAX)), `UltimaActualizacion` (DATETIME2 UTC).
- **`dbo.Conversaciones`**: `Id` (PK, IDENTITY), `SessionId` (UNIQUEIDENTIFIER IDX), `UsuarioId` (FK NULL -> `Usuarios.Id` `ON DELETE SET NULL`), `PreguntaUsuario` (NVARCHAR(MAX)), `RespuestaBot` (NVARCHAR(MAX)), `Timestamp` (DATETIME2 UTC).

---

## 3. REQUERIMIENTOS FUNCIONALES (RF1 – RF15)

### RF1: Registro de Usuarios con Cifrado BCrypt
| Campo | Especificación |
|---|---|
| **Identificador** | `RF1` |
| **Nombre** | Registro de Usuarios con Cifrado BCrypt |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Base para RF2, RF3, RF8 y RF11 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Modal de Acceso de Usuarios en Frontend (wwwroot/index.html). Endpoint POST /api/auth/register (AuthController.cs / AuthService.cs). |
| **Entrada** | RegisterDto (JSON): • Nombre (string, requerido, máx. 100 caracteres). • Email (string, formato correo válido, máx. 150 caracteres). • Password (string, requerido, mín. 6 caracteres). • Rol (string: 'Admin' o 'User', por defecto 'User'). |
| **Salida** | AuthResponseDto (HTTP 201 Created): • UsuarioId (int, PK generada en SQL Server). • Nombre, Email y Rol asignado. • Token JWT firmado con HMAC-SHA256. • Expiracion (DateTime UTC). |
| **Descripción** | El sistema debe permitir el registro de nuevos usuarios en la tabla dbo.Usuarios a través del servicio AuthService. El correo electrónico se normaliza en minúsculas, se verifica su unicidad mediante índice único (IX_Usuarios_Email), la contraseña se cifra con el algoritmo criptográfico BCrypt (BCrypt.Net-Next) y se emite automáticamente un token JWT de sesión activa. |
| **Situaciones anormales** | • Correo ya registrado: Retorna HTTP 409 Conflict con mensaje 'El correo electrónico ya se encuentra registrado.' • Campos obligatorios vacíos o formato inválido: Retorna HTTP 400 Bad Request con detalle de ModelState. • Rol distinto a 'Admin' o 'User': El sistema asigna automáticamente el rol seguro 'User'. |

### RF2: Inicio de Sesión y Autenticación Segura con JWT
| Campo | Especificación |
|---|---|
| **Identificador** | `RF2` |
| **Nombre** | Inicio de Sesión y Autenticación Segura con JWT |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF1; habilita RF3, RF5, RF6 y RF7 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Modal de Inicio de Sesión (#auth-modal) y Barra Superior de Usuario. Endpoint POST /api/auth/login (AuthController.cs / AuthService.cs). |
| **Entrada** | LoginDto (JSON): • Email (string, correo electrónico registrado). • Password (string, contraseña en texto plano enviada por HTTPS). |
| **Salida** | AuthResponseDto (HTTP 200 OK): • Datos de sesión del usuario (UsuarioId, Nombre, Email, Rol). • Token JWT con Claims (Sub, NameIdentifier, Name, Email, Role, Jti). • Fecha y hora de expiración del token (120 minutos). |
| **Descripción** | El sistema debe autenticar a los usuarios registrados validando la existencia del correo electrónico normalizado en SQL Server y comprobando el hash de la contraseña mediante BCrypt.Verify(). Si las credenciales son válidas, genera un JSON Web Token firmado con SymmetricSecurityKey (HmacSha256) y actualiza el estado de la interfaz según el rol. |
| **Situaciones anormales** | • Usuario inexistente o contraseña incorrecta: Lanza UnauthorizedAccessException y retorna HTTP 401 Unauthorized con mensaje 'Credenciales inválidas (correo o contraseña incorrectos).' • Falta de clave secreta JWT en servidor: Lanza InvalidOperationException controlada en configuración. |

### RF3: Control de Acceso Basado en Roles (RBAC) y Cierre de Sesión
| Campo | Especificación |
|---|---|
| **Identificador** | `RF3` |
| **Nombre** | Control de Acceso Basado en Roles (RBAC) y Cierre de Sesión |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF2 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Barra de navegación institucional, botones de acción administrativa y selector de cuentas de prueba. Atributos [Authorize(Roles = "Admin")] y [AllowAnonymous] en Controladores C#. |
| **Entrada** | • Cabecera HTTP Authorization: Bearer {token} en peticiones protegidas. • Acción de cierre de sesión o cambio de perfil en Frontend. |
| **Salida** | • Acceso concedido (HTTP 200/201/204) o denegado (HTTP 401/403). • Limpieza de credenciales locales (localStorage) al cerrar sesión y paso a modo 'Visitante'. |
| **Descripción** | El sistema debe restringir las operaciones de creación, edición y eliminación del directorio de preguntas frecuentes exclusivamente a usuarios con rol 'Admin' mediante validación de Claims JWT en el pipeline de ASP.NET Core, permitiendo a usuarios con rol 'User' y 'Visitante' realizar consultas en línea y lectura de FAQs. Incluye cierre seguro de sesión eliminando el token activo. |
| **Situaciones anormales** | • Intento de modificar o eliminar FAQs sin sesión o con rol 'User': El Frontend bloquea la acción solicitando cuenta de Administrador y el Backend rechaza la petición con HTTP 401 Unauthorized o HTTP 403 Forbidden. • Token JWT expirado o alterado: El middleware JwtBearer rechaza el token con ClockSkew = TimeSpan.Zero. |

### RF4: Consulta, Filtrado por Categoría y Búsqueda de Preguntas Frecuentes
| Campo | Especificación |
|---|---|
| **Identificador** | `RF4` |
| **Nombre** | Consulta, Filtrado por Categoría y Búsqueda de Preguntas Frecuentes |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Base para RF8, RF9 y RF10 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Vista 2: Directorio de Preguntas Frecuentes (#view-faqs), píldoras de categorías y buscador en tiempo real. Endpoints GET /api/faqs?onlyActive=true|false y GET /api/faqs/{id:int} (FaqsController.cs). |
| **Entrada** | • Parámetro opcional Query String: onlyActive (bool). • Parámetro de ruta opcional: id (int). • Filtros en cliente: categoría seleccionada y término de búsqueda por palabra clave. |
| **Salida** | • Lista de objetos FaqResponseDto (Id, TextoPregunta, Categoria, EstadoActivo y lista de RespuestaDto asociadas) ordenada por Categoría e Id. |
| **Descripción** | El servicio FaqService permite consultar de forma pública y optimizada (AsNoTracking) todas las preguntas frecuentes junto con sus respuestas oficiales mediante Eager Loading (.Include(p => p.Respuestas)). En la interfaz web, el usuario puede filtrar instantáneamente por categoría (Información General, Cuenta y Acceso, Pagos y Facturación, Soporte y PQR) o buscar coincidencias en pregunta, categoría o respuesta. |
| **Situaciones anormales** | • Consulta de un ID inexistente en GET /api/faqs/{id}: Retorna HTTP 404 NotFound con mensaje descriptivo. • Búsqueda sin coincidencias en tabla: Muestra fila informativa 'No se encontraron preguntas registradas.' |

### RF5: Creación de Pregunta Frecuente y Respuesta Oficial (Rol Admin)
| Campo | Especificación |
|---|---|
| **Identificador** | `RF5` |
| **Nombre** | Creación de Pregunta Frecuente y Respuesta Oficial (Rol Admin) |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF2 y RF3 (Rol Admin) |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Modal de Crear / Editar Pregunta Frecuente (#faq-modal) en Frontend. Endpoint POST /api/faqs (FaqsController.cs / FaqService.cs). |
| **Entrada** | CreateFaqDto (JSON) + Token JWT Admin: • TextoPregunta (string, requerido, máx. 500 caracteres). • Categoria (string, requerido, máx. 100 caracteres). • EstadoActivo (bool, por defecto true). • TextoRespuesta (string, requerido). |
| **Salida** | FaqResponseDto (HTTP 201 Created) con la pregunta y su respuesta insertadas en las tablas dbo.Preguntas y dbo.Respuestas. |
| **Descripción** | El sistema permite al Administrador registrar una nueva pregunta frecuente y su respuesta oficial en una única transacción de Entity Framework Core. Al guardar, actualiza inmediatamente el directorio de preguntas, los botones de temas frecuentes y el contexto de conocimiento disponible para el motor de IA. |
| **Situaciones anormales** | • Datos incompletos o que superan la longitud máxima: Retorna HTTP 400 Bad Request. • Usuario no autenticado como Admin: Retorna HTTP 401/403 y solicita inicio de sesión administrativo. |

### RF6: Actualización y Activación/Inactivación de Preguntas Frecuentes
| Campo | Especificación |
|---|---|
| **Identificador** | `RF6` |
| **Nombre** | Actualización y Activación/Inactivación de Preguntas Frecuentes |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF3 y RF5 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Formulario de edición en Modal (#faq-modal) y etiquetas de estado (Activa / Inactiva). Endpoint PUT /api/faqs/{id:int} (FaqsController.cs / FaqService.cs). |
| **Entrada** | • Parámetro de ruta: id (int) de la pregunta a modificar. • UpdateFaqDto (JSON): TextoPregunta, Categoria, EstadoActivo (true/false), TextoRespuesta. |
| **Salida** | FaqResponseDto (HTTP 200 OK) con los datos actualizados y nueva marca UltimaActualizacion = DateTime.UtcNow. |
| **Descripción** | Permite al Administrador modificar el enunciado de una pregunta frecuente, reclasificar su categoría, actualizar el texto de su respuesta oficial o cambiar su estado (Activa / Inactiva). Las preguntas marcadas como inactivas (EstadoActivo = false) se conservan en base de datos pero se excluyen automáticamente del System Prompt del Chatbot y de los temas rápidos. |
| **Situaciones anormales** | • ID de pregunta no existe en base de datos: Retorna HTTP 404 NotFound con mensaje 'No se encontró la FAQ con ID {id} para actualizar.' • Pregunta sin registro previo en tabla Respuestas: El servicio crea e inserta automáticamente la entidad Respuesta asociada. |

### RF7: Eliminación de Pregunta Frecuente con Borrado en Cascada
| Campo | Especificación |
|---|---|
| **Identificador** | `RF7` |
| **Nombre** | Eliminación de Pregunta Frecuente con Borrado en Cascada |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF3 y RF4 |
| **¿Crítico?** | Sí |
| **Prioridad** | Media |
| **Componentes asociados** | Botón 'Eliminar' en la tabla del Directorio de Preguntas Frecuentes con diálogo de confirmación. Endpoint DELETE /api/faqs/{id:int} (FaqsController.cs / FaqService.cs). |
| **Entrada** | • Parámetro de ruta: id (int) de la pregunta frecuente. • Confirmación explícita del Administrador y cabecera Bearer JWT. |
| **Salida** | • Respuesta HTTP 204 No Content tras eliminar el registro padre en dbo.Preguntas y sus registros hijos en dbo.Respuestas. |
| **Descripción** | Permite al Administrador eliminar definitivamente una pregunta frecuente del directorio. Gracias a la restricción relacional FK_Respuestas_Preguntas_PreguntaId con ON DELETE CASCADE configurada en Fluent API y SQL Server, las respuestas asociadas se eliminan automáticamente sin dejar registros huérfanos. |
| **Situaciones anormales** | • ID de pregunta no encontrado: Retorna HTTP 404 NotFound. • Cancelación en cuadro de confirmación: La operación se aborta sin realizar peticiones al servidor. |

### RF8: Inferencia de Chatbot Inteligente con Contexto RAG (AiIntegrationService)
| Campo | Especificación |
|---|---|
| **Identificador** | `RF8` |
| **Nombre** | Inferencia de Chatbot Inteligente con Contexto RAG (AiIntegrationService) |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF4; alimenta a RF11 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Vista 1: Mesa de Consultas / Canal de Atención Automática (#view-chat). Endpoint POST /api/chat/send (ChatController.cs / AiIntegrationService.cs). |
| **Entrada** | ChatRequestDto (JSON): • SessionId (Guid opcional; si es vacío o nulo se genera un nuevo Guid). • Mensaje (string, requerido, máx. 1500 caracteres). • Token JWT opcional en cabecera Authorization. |
| **Salida** | ChatResponseDto (HTTP 200 OK): • ConversacionId (int), SessionId (Guid), UsuarioId (int? nullable). • PreguntaUsuario (string), RespuestaBot (string generada por IA), Timestamp (DateTime UTC). |
| **Descripción** | Al recibir una consulta del usuario, AiIntegrationService recupera en tiempo real todas las preguntas frecuentes con EstadoActivo = true y sus respuestas oficiales desde SQL Server, construye dinámicamente un System Prompt institucional (arquitectura RAG ligera) e invoca de forma asíncrona mediante HttpClient el modelo de lenguaje (LLM) para producir una respuesta precisa, empática y en español. |
| **Situaciones anormales** | • Mensaje vacío o superior a 1500 caracteres: Retorna HTTP 400 Bad Request. • Caída de red o Timeout (>30s) del proveedor externo de IA: Se captura HttpRequestException / TaskCanceledException, se registra en ILogger y se entrega respuesta de respaldo sin interrumpir la experiencia del usuario. |

### RF9: Configuración Multi-Proveedor de IA (Gemini, OpenAI, Cloud LLM) y Motor de Respaldo
| Campo | Especificación |
|---|---|
| **Identificador** | `RF9` |
| **Nombre** | Configuración Multi-Proveedor de IA (Gemini, OpenAI, Cloud LLM) y Motor de Respaldo |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Especializa a RF8 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Modal de Preferencias del Servicio de Respuesta (#settings-modal) en Frontend. Configuración AiSettings en appsettings.json y métodos CallGeminiApiAsync / CallOpenAiApiAsync / CallFreeFallbackLlmAsync. |
| **Entrada** | • Selección de proveedor: Servicio Automático Estándar (Pollinations OpenAI-compatible), Google Gemini 1.5 Flash o OpenAI GPT-4o Mini. • API Key opcional proporcionada por el administrador/usuario. |
| **Salida** | • Preferencia persistida y enrutamiento dinámico de peticiones de inferencia hacia el proveedor seleccionado o hacia el motor local de coincidencias FAQ. |
| **Descripción** | El sistema soporta múltiples motores de inferencia LLM tanto en Backend como en Frontend: Google Gemini 1.5 Flash, OpenAI GPT-4o Mini y un proveedor gratuito en la nube sin necesidad de API Key (Pollinations AI). Además, incorpora un algoritmo local de coincidencia léxica por tokens (findMatchingFaq) que garantiza respuestas inmediatas basadas en las FAQs oficiales incluso sin conexión al proveedor externo. |
| **Situaciones anormales** | • API Key inválida o cuota agotada en Gemini/OpenAI: El sistema conmuta automáticamente al proveedor estándar o al motor local de FAQs sin perder la consulta. |

### RF10: Gestión de Múltiples Sesiones de Conversación y Temas Frecuentes Rápidos
| Campo | Especificación |
|---|---|
| **Identificador** | `RF10` |
| **Nombre** | Gestión de Múltiples Sesiones de Conversación y Temas Frecuentes Rápidos |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Relacionado con RF4 y RF8 |
| **¿Crítico?** | No |
| **Prioridad** | Media |
| **Componentes asociados** | Panel lateral 'Temas frecuentes' (#quick-topics-list) y Panel 'Mis conversaciones' (#sessions-list) en Vista 1. |
| **Entrada** | • Clic en '+ Nueva consulta', selección de una sesión existente, eliminación de sesión o clic sobre un tema frecuente sugerido. |
| **Salida** | • Generación de nuevo código GUID de sesión (Ref: 8 caracteres hexadecimales), actualización del hilo de mensajes en pantalla o envío automático de la pregunta seleccionada. |
| **Descripción** | Permite al usuario mantener múltiples hilos de conversación independientes identificados por un SessionId (GUID), cambiar entre sesiones previas sin perder el contexto, eliminar conversaciones individuales y disparar consultas rápidas con un solo clic a partir de las preguntas frecuentes activas. |
| **Situaciones anormales** | • Eliminación de todas las sesiones de la lista: El sistema crea automáticamente una nueva sesión limpia con mensaje institucional de bienvenida. |

### RF11: Registro Automático en Bitácora de Conversaciones (SQL Server)
| Campo | Especificación |
|---|---|
| **Identificador** | `RF11` |
| **Nombre** | Registro Automático en Bitácora de Conversaciones (SQL Server) |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF8 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Tabla dbo.Conversaciones en SQL Server y Vista 3: Historial de Registros (#view-sql). |
| **Entrada** | • Entidad Conversacion: SessionId (Guid), UsuarioId (int? extraído del Claim NameIdentifier del JWT o NULL si es visitante), PreguntaUsuario, RespuestaBot, Timestamp (DateTime.UtcNow). |
| **Salida** | • Registro persistido en dbo.Conversaciones con Id autoincremental (IDENTITY) e índices no agrupados en SessionId y UsuarioId. |
| **Descripción** | Cada consulta procesada por el Chatbot se almacena de forma automática e inmutable en la tabla dbo.Conversaciones. El diseño permite auditar tanto interacciones de usuarios autenticados (vinculadas a dbo.Usuarios) como de visitantes anónimos (UsuarioId = NULL). |
| **Situaciones anormales** | • Eliminación futura de un usuario registrado: La restricción FK_Conversaciones_Usuarios_UsuarioId con ON DELETE SET NULL preserva intacto el historial estadístico de conversaciones. |

### RF12: Consulta de Historial Cronológico por Sesión
| Campo | Especificación |
|---|---|
| **Identificador** | `RF12` |
| **Nombre** | Consulta de Historial Cronológico por Sesión |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF11 |
| **¿Crítico?** | No |
| **Prioridad** | Media |
| **Componentes asociados** | Ventana de conversación (#chat-messages-container) y Endpoint GET /api/chat/history/{sessionId:guid} (ChatController.cs). |
| **Entrada** | • Parámetro de ruta: sessionId (Guid) de la sesión a consultar. |
| **Salida** | • Lista JSON de objetos ChatResponseDto ordenada cronológicamente de forma ascendente (.OrderBy(c => c.Timestamp)). |
| **Descripción** | El sistema permite recuperar mediante una consulta optimizada AsNoTracking() todos los mensajes intercambiados entre el usuario y el asistente virtual dentro de una sesión específica identificada por su GUID. |
| **Situaciones anormales** | • Código SessionId sin mensajes registrados: Retorna una lista vacía [] con código HTTP 200 OK. |

### RF13: Panel de Auditoría Histórica, Indicadores KPI y Exportación a CSV
| Campo | Especificación |
|---|---|
| **Identificador** | `RF13` |
| **Nombre** | Panel de Auditoría Histórica, Indicadores KPI y Exportación a CSV |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Depende de RF11 y RF12 |
| **¿Crítico?** | No |
| **Prioridad** | Media |
| **Componentes asociados** | Vista 3: Registro Histórico de Atención (#view-sql), tarjetas de indicadores KPI y botones 'Descargar CSV' / 'Limpiar listado'. |
| **Entrada** | • Acceso a la pestaña 'Historial de Registros' o clic en 'Descargar CSV'. |
| **Salida** | • Tarjetas KPI actualizadas en tiempo real (Total de consultas atendidas, Conversaciones abiertas, Preguntas activas en directorio). • Tabla de auditoría detallada y descarga de archivo 'historial_atencion.csv' con codificación UTF-8 con BOM. |
| **Descripción** | Proporciona un módulo de supervisión y auditoría donde se consolidan todas las consultas recibidas y respuestas entregadas por el sistema, mostrando métricas operativas en tiempo real y permitiendo exportar la bitácora completa en formato CSV compatible con Microsoft Excel. |
| **Situaciones anormales** | • Intento de exportar CSV cuando no existen registros en la bitácora: Muestra notificación Toast indicando 'No hay registros para exportar.' |

### RF14: Inicialización Automática y Semilla de Datos (Data Seeder)
| Campo | Especificación |
|---|---|
| **Identificador** | `RF14` |
| **Nombre** | Inicialización Automática y Semilla de Datos (Data Seeder) |
| **Tipo** | Funcional (Necesario) |
| **Requerimiento relacionado** | Base de infraestructura para RF1, RF4 y RF11 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Componentes asociados** | Clase DbInitializer.cs invocada en el arranque de Program.cs y script Data/database.sql. |
| **Entrada** | • Cadena de conexión DefaultConnection en appsettings.json al iniciar el servidor Kestrel. |
| **Salida** | • Base de datos ChatbotAtencionDB creada/migrada con 2 usuarios iniciales (Admin y User) y 5 preguntas frecuentes institucionales con sus respuestas oficiales. |
| **Descripción** | Al iniciar la aplicación, DbInitializer.SeedAsync verifica el estado de la base de datos SQL Server, aplica las migraciones pendientes (MigrateAsync) y, si las tablas están vacías, inserta las cuentas iniciales con contraseñas cifradas en BCrypt y el catálogo base de FAQs institucionales. |
| **Situaciones anormales** | • Instancia de SQL Server inaccesible al iniciar: Se captura la excepción en Program.cs, se registra el error crítico en ILogger<Program> y la aplicación continúa sirviendo el Frontend con respaldo local. |

### RF15: Documentación Interactiva y Pruebas de API REST con Swagger / OpenAPI
| Campo | Especificación |
|---|---|
| **Identificador** | `RF15` |
| **Nombre** | Documentación Interactiva y Pruebas de API REST con Swagger / OpenAPI |
| **Tipo** | Funcional (Deseable) |
| **Requerimiento relacionado** | Transversal a RF1–RF12 |
| **¿Crítico?** | No |
| **Prioridad** | Media |
| **Componentes asociados** | Interfaz interactiva Swagger UI en la ruta /swagger/index.html. |
| **Entrada** | • Ingreso de token en el botón 'Authorize' (Bearer {token}) y ejecución de peticiones de prueba. |
| **Salida** | • Esquema OpenAPI v1 JSON y respuestas HTTP en vivo de los controladores Auth, Faqs y Chat. |
| **Descripción** | El backend integra Swashbuckle.AspNetCore configurado con definición de seguridad OpenApiSecurityScheme (esquema HTTP Bearer JWT), permitiendo a desarrolladores, instructores y evaluadores inspeccionar los contratos DTO y probar todos los endpoints directamente desde el navegador. |
| **Situaciones anormales** | • Invocación de endpoints protegidos desde Swagger sin autorizar token: Retorna respuesta estándar HTTP 401 Unauthorized con cabecera WWW-Authenticate. |

---

## 4. REQUERIMIENTOS NO FUNCIONALES (RNF1 – RNF12)

### RNF1: Seguridad de Autenticación y Cifrado Criptográfico (JWT / BCrypt)
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF1` |
| **Nombre** | Seguridad de Autenticación y Cifrado Criptográfico (JWT / BCrypt) |
| **Tipo** | No Funcional (Seguridad) |
| **Alcance** | Aplica a RF1, RF2, RF3, RF5, RF6 y RF7 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | Ninguna contraseña puede almacenarse ni transmitirse en texto claro desde la base de datos; todas deben procesarse con BCrypt.Net-Next. Los endpoints administrativos deben validar emisor (Issuer), audiencia (Audience), tiempo de vida (Lifetime con ClockSkew cero) y firma criptográfica del JWT. |
| **Control de fallos** | Rechazo inmediato (HTTP 401/403) ante tokens manipulados, firmas inválidas o intentos de acceso sin privilegios de rol. |

### RNF2: Arquitectura Limpia y Separación de Responsabilidades (Clean Architecture)
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF2` |
| **Nombre** | Arquitectura Limpia y Separación de Responsabilidades (Clean Architecture) |
| **Tipo** | No Funcional (Arquitectura) |
| **Alcance** | Aplica a toda la solución ChatbotApi (.NET 8) |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | El backend debe estructurarse separando estrictamente la capa de presentación REST (Controllers), contratos de transferencia (DTOs), lógica de negocio e integración (Services con inyección de dependencias por interfaces) y capa de persistencia de datos (ApplicationDbContext y Entities). |
| **Control de fallos** | Prevención de acoplamiento directo o serialización cíclica de entidades mediante el uso obligatorio de DTOs. |

### RNF3: Tolerancia a Fallos y Procesamiento 100% Asíncrono (Async/Await + Fallback)
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF3` |
| **Nombre** | Tolerancia a Fallos y Procesamiento 100% Asíncrono (Async/Await + Fallback) |
| **Tipo** | No Funcional (Fiabilidad) |
| **Alcance** | Aplica a RF8, RF9, RF11 y RF12 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | Todas las operaciones de entrada/salida hacia SQL Server y servicios externos HTTP deben implementarse de forma asíncrona (Task / async / await). El cliente HttpClient tipado debe contar con un Timeout máximo de 30 segundos y bloques de captura controlada que activen respuestas de respaldo en caso de falla del proveedor LLM. |
| **Control de fallos** | Captura de HttpRequestException y TaskCanceledException registrando la traza en ILogger y activando el motor de respuesta de respaldo. |

### RNF4: Tiempo de Respuesta y Rendimiento en Consultas
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF4` |
| **Nombre** | Tiempo de Respuesta y Rendimiento en Consultas |
| **Tipo** | No Funcional (Rendimiento) |
| **Alcance** | Aplica a todos los módulos del sistema |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | Las consultas de solo lectura en Entity Framework Core deben emplear .AsNoTracking() para evitar sobrecarga de seguimiento en memoria, y la base de datos SQL Server debe contar con índices en Email (IX_Usuarios_Email), PreguntaId (IX_Respuestas_PreguntaId), SessionId (IX_Conversaciones_SessionId) y UsuarioId. |
| **Control de fallos** | Si el proveedor de IA supera los 10s en cliente o 30s en servidor, se aborta la espera y se entrega respuesta local inmediata. |

### RNF5: Disponibilidad Continua 24/7 y Operación Híbrida (Online / Offline)
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF5` |
| **Nombre** | Disponibilidad Continua 24/7 y Operación Híbrida (Online / Offline) |
| **Tipo** | No Funcional (Disponibilidad) |
| **Alcance** | Aplica a RF4, RF8, RF9 y RF13 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | El sistema debe garantizar atención continua 24/7. En caso de que el servidor de base de datos no esté disponible temporalmente en el entorno local, el Frontend detecta el estado de conectividad y opera sin interrupciones utilizando su base de conocimiento sincronizada y persistencia local. |
| **Control de fallos** | Conmutación transparente entre modo API Online y modo Respaldo Local sin mostrar pantallas de error fatales al usuario. |

### RNF6: Integridad Referencial en Base de Datos Relacional
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF6` |
| **Nombre** | Integridad Referencial en Base de Datos Relacional |
| **Tipo** | No Funcional (Datos) |
| **Alcance** | Aplica a RF5, RF7 y RF11 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | El modelo de datos en Microsoft SQL Server debe hacer cumplir llaves primarias IDENTITY(1,1), índice único en Usuarios.Email, borrado en cascada (ON DELETE CASCADE) entre Preguntas y Respuestas, y preservación histórica (ON DELETE SET NULL) entre Usuarios y Conversaciones. |
| **Control de fallos** | Rechazo transaccional automático en SQL Server ante violaciones de llave foránea, nulabilidad o unicidad. |

### RNF7: Usabilidad y Diseño Institucional Limpio (UX/UI)
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF7` |
| **Nombre** | Usabilidad y Diseño Institucional Limpio (UX/UI) |
| **Tipo** | No Funcional (Usabilidad) |
| **Alcance** | Aplica a todas las vistas del Frontend (wwwroot) |
| **¿Crítico?** | No |
| **Prioridad** | Alta |
| **Descripción** | La interfaz gráfica debe presentar un diseño institucional sobrio, limpio y accesible tipo Mesa de Ayuda Digital, con jerarquía tipográfica clara, contraste mínimo WCAG AA (4.5:1) y navegación intuitiva en tres pestañas principales sin recargas de página. |
| **Control de fallos** | Validación inmediata en formularios HTML5 y mensajes Toast claros ante acciones no permitidas. |

### RNF8: Compatibilidad Multiplataforma y Diseño Responsivo
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF8` |
| **Nombre** | Compatibilidad Multiplataforma y Diseño Responsivo |
| **Tipo** | No Funcional (Portabilidad / Compatibilidad) |
| **Alcance** | Aplica al Aplicativo Web Frontend |
| **¿Crítico?** | Sí |
| **Prioridad** | Media |
| **Descripción** | El aplicativo web debe ejecutarse correctamente en Google Chrome, Mozilla Firefox, Microsoft Edge y Safari, adaptando su disposición visual a pantallas móviles y de escritorio sin pérdida de funcionalidad. |
| **Control de fallos** | Contenedores con overflow-x-auto para evitar desbordamiento horizontal en pantallas pequeñas. |

### RNF9: Auditoría y Trazabilidad Completa de Interacciones
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF9` |
| **Nombre** | Auditoría y Trazabilidad Completa de Interacciones |
| **Tipo** | No Funcional (Auditoría) |
| **Alcance** | Aplica a RF11, RF12 y RF13 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | El sistema debe dejar trazabilidad completa de todas las consultas atendidas por el chatbot para fines de control de calidad institucional, análisis de dudas recurrentes y mejora continua de las FAQs. |
| **Control de fallos** | Sincronización y exportación íntegra en CSV con escape adecuado de comillas y saltos de línea. |

### RNF10: Mantenibilidad y Escalabilidad Modular
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF10` |
| **Nombre** | Mantenibilidad y Escalabilidad Modular |
| **Tipo** | No Funcional (Mantenibilidad) |
| **Alcance** | Aplica al Backend .NET 8 y Frontend JS |
| **¿Crítico?** | No |
| **Prioridad** | Media |
| **Descripción** | Gracias al patrón de Inyección de Dependencias (IAuthService, IFaqService, IAiIntegrationService) y migraciones Code-First de EF Core, el sistema permite agregar nuevos modelos LLM o ampliar tablas manteniendo bajo acoplamiento y alta cohesión. |
| **Control de fallos** | Detección en tiempo de compilación de cualquier incumplimiento de contrato de interfaz. |

### RNF11: Interoperabilidad y Estándares de Comunicación REST / JSON
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF11` |
| **Nombre** | Interoperabilidad y Estándares de Comunicación REST / JSON |
| **Tipo** | No Funcional (Interoperabilidad) |
| **Alcance** | Aplica a todos los endpoints /api/* |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | Toda comunicación entre el Frontend, clientes externos y el Backend se realiza mediante API RESTful sobre HTTP/HTTPS utilizando serialización JSON estándar y cabeceras CORS configuradas. |
| **Control de fallos** | Respuestas de error estructuradas en JSON ({ mensaje: '...' }) para fácil consumo desde cualquier cliente. |

### RNF12: Protección de Datos y No Exposición de Información Sensible
| Campo | Especificación |
|---|---|
| **Identificador** | `RNF12` |
| **Nombre** | Protección de Datos y No Exposición de Información Sensible |
| **Tipo** | No Funcional (Seguridad de Datos) |
| **Alcance** | Aplica a RF1, RF2 y RF9 |
| **¿Crítico?** | Sí |
| **Prioridad** | Alta |
| **Descripción** | Las entidades de dominio que contienen datos sensibles (como Usuario.PasswordHash o claves secretas de configuración) nunca se serializan directamente hacia el cliente; se proyectan exclusivamente a través de DTOs seguros. |
| **Control de fallos** | Validación con DataAnnotations ([Required], [EmailAddress], [MinLength], [MaxLength]) antes de procesar cualquier entrada. |

---

## 5. HISTORIAS DE USUARIO (HU-01 – HU-15)

### 5.1 Product Backlog Priorizado
| Código | Número | Usuario / Rol | Nombre de la Historia | Prioridad | Riesgo | Puntos | Iteración |
|---|---|---|---|---|---|---|---|
| **HU-01** | 1.1 | Visitante / Usuario Nuevo | Registro de cuenta de usuario | Alta | Bajo | 3 | Iteración 1 (Sprint 1) |
| **HU-02** | 1.2 | Usuario Registrado / Administrador | Inicio de sesión con autenticación JWT | Alta | Medio | 5 | Iteración 1 (Sprint 1) |
| **HU-03** | 1.3 | Usuario Registrado / Administrador | Control de acceso según rol y cierre seguro de sesión | Alta | Bajo | 3 | Iteración 1 (Sprint 1) |
| **HU-04** | 2.1 | Usuario / Visitante | Consulta y filtrado del directorio de Preguntas Frecuentes (FAQs) | Alta | Bajo | 3 | Iteración 1 (Sprint 1) |
| **HU-05** | 2.2 | Administrador | Crear nueva Pregunta Frecuente (FAQ) y respuesta oficial | Alta | Bajo | 5 | Iteración 1 (Sprint 1) |
| **HU-06** | 2.3 | Administrador | Editar y activar/inactivar Preguntas Frecuentes | Alta | Bajo | 3 | Iteración 2 (Sprint 2) |
| **HU-07** | 2.4 | Administrador | Eliminar Pregunta Frecuente del directorio | Media | Bajo | 2 | Iteración 2 (Sprint 2) |
| **HU-08** | 3.1 | Usuario / Visitante | Interacción en tiempo real con el Chatbot Inteligente (RAG + LLM) | Alta | Medio | 8 | Iteración 2 (Sprint 2) |
| **HU-09** | 3.2 | Usuario / Visitante | Consulta rápida mediante botones de temas frecuentes | Media | Bajo | 2 | Iteración 2 (Sprint 2) |
| **HU-10** | 3.3 | Usuario / Visitante | Gestión de múltiples sesiones de conversación | Media | Bajo | 3 | Iteración 2 (Sprint 2) |
| **HU-11** | 3.4 | Administrador / Usuario Avanzado | Configuración del servicio de generación de respuestas (Proveedor IA) | Media | Medio | 5 | Iteración 3 (Sprint 3) |
| **HU-12** | 4.1 | Sistema / Administrador | Registro automático de interacciones en bitácora SQL Server | Alta | Bajo | 5 | Iteración 3 (Sprint 3) |
| **HU-13** | 4.2 | Usuario / Administrador | Consulta de historial cronológico por código de sesión | Media | Bajo | 3 | Iteración 3 (Sprint 3) |
| **HU-14** | 4.3 | Administrador | Auditoría de bitácora y visualización de indicadores KPI | Media | Bajo | 3 | Iteración 3 (Sprint 3) |
| **HU-15** | 4.4 | Administrador | Exportación del historial de atención a formato CSV | Media | Bajo | 2 | Iteración 3 (Sprint 3) |

### 5.2 Fichas Detalladas de Historias de Usuario

#### HU-01 (Número: 1.1) — Registro de cuenta de usuario
| Atributo | Detalle |
|---|---|
| **Número / Código** | 1.1 (`HU-01`) |
| **Usuario / Actor** | Visitante / Usuario Nuevo |
| **Nombre de la historia** | Registro de cuenta de usuario |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 1 (Sprint 1) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** visitante de la plataforma de atención, **quiero** registrarme con mi nombre, correo electrónico y contraseña, **para** obtener una cuenta personal y asociar mis consultas futuras a mi perfil. |
| **Validación (Criterios Gherkin)** | **Dado** que me encuentro en el modal de acceso y mis datos son válidos y el correo no está registrado previamente. **Cuando** envío el formulario de registro hacia POST /api/auth/register. **Entonces** el sistema cifra mi contraseña con BCrypt, crea mi cuenta en SQL Server y me devuelve un token JWT de sesión activa. |

#### HU-02 (Número: 1.2) — Inicio de sesión con autenticación JWT
| Atributo | Detalle |
|---|---|
| **Número / Código** | 1.2 (`HU-02`) |
| **Usuario / Actor** | Usuario Registrado / Administrador |
| **Nombre de la historia** | Inicio de sesión con autenticación JWT |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Medio |
| **Puntos estimados** | 5 puntos |
| **Iteración asignada** | Iteración 1 (Sprint 1) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario registrado o administrador, **quiero** iniciar sesión ingresando mi correo electrónico y contraseña, **para** autenticar mi identidad mediante un token JWT y acceder a las funciones de mi rol. |
| **Validación (Criterios Gherkin)** | **Dado** que poseo una cuenta registrada en la tabla Usuarios. **Cuando** ingreso mis credenciales correctas en el modal de acceso y presiono 'Ingresar'. **Entonces** el sistema verifica el hash BCrypt, emite un token JWT válido por 120 minutos y muestra mi nombre y rol en la barra superior. |

#### HU-03 (Número: 1.3) — Control de acceso según rol y cierre seguro de sesión
| Atributo | Detalle |
|---|---|
| **Número / Código** | 1.3 (`HU-03`) |
| **Usuario / Actor** | Usuario Registrado / Administrador |
| **Nombre de la historia** | Control de acceso según rol y cierre seguro de sesión |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 1 (Sprint 1) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario autenticado en la plataforma, **quiero** que el sistema valide mis permisos según mi rol (Admin o User) y me permita cerrar sesión cuando termine, **para** proteger las funciones administrativas de edición del directorio y resguardar mi cuenta en equipos compartidos. |
| **Validación (Criterios Gherkin)** | **Dado** que tengo una sesión activa con un rol específico. **Cuando** intento realizar acciones administrativas o presiono el botón 'Salir'. **Entonces** el sistema autoriza las modificaciones solo al rol Admin y, al cerrar sesión, elimina el token JWT regresando al estado Visitante. |

#### HU-04 (Número: 2.1) — Consulta y filtrado del directorio de Preguntas Frecuentes (FAQs)
| Atributo | Detalle |
|---|---|
| **Número / Código** | 2.1 (`HU-04`) |
| **Usuario / Actor** | Usuario / Visitante |
| **Nombre de la historia** | Consulta y filtrado del directorio de Preguntas Frecuentes (FAQs) |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 1 (Sprint 1) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario o visitante del centro de atención, **quiero** consultar el directorio de preguntas frecuentes filtrando por categoría o buscando por palabra clave, **para** encontrar rápidamente respuestas oficiales sobre horarios, pagos, contraseñas, reembolsos o PQR. |
| **Validación (Criterios Gherkin)** | **Dado** que accedo a la pestaña 'Preguntas Frecuentes'. **Cuando** selecciono una categoría o escribo un término en el campo de búsqueda. **Entonces** el sistema filtra en tiempo real la tabla mostrando únicamente las preguntas y respuestas oficiales que coinciden. |

#### HU-05 (Número: 2.2) — Crear nueva Pregunta Frecuente (FAQ) y respuesta oficial
| Atributo | Detalle |
|---|---|
| **Número / Código** | 2.2 (`HU-05`) |
| **Usuario / Actor** | Administrador |
| **Nombre de la historia** | Crear nueva Pregunta Frecuente (FAQ) y respuesta oficial |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 5 puntos |
| **Iteración asignada** | Iteración 1 (Sprint 1) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador del sistema, **quiero** registrar nuevas preguntas frecuentes con su categoría, estado y respuesta oficial, **para** ampliar el directorio institucional y nutrir inmediatamente la base de conocimiento (RAG) del chatbot con IA. |
| **Validación (Criterios Gherkin)** | **Dado** que he iniciado sesión con rol 'Admin' y abro el formulario '+ Agregar pregunta'. **Cuando** completo la categoría, estado, pregunta y respuesta oficial y presiono 'Guardar cambios'. **Entonces** el sistema almacena el registro en las tablas Preguntas y Respuestas de SQL Server y actualiza el directorio y temas rápidos. |

#### HU-06 (Número: 2.3) — Editar y activar/inactivar Preguntas Frecuentes
| Atributo | Detalle |
|---|---|
| **Número / Código** | 2.3 (`HU-06`) |
| **Usuario / Actor** | Administrador |
| **Nombre de la historia** | Editar y activar/inactivar Preguntas Frecuentes |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 2 (Sprint 2) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador del sistema, **quiero** modificar el contenido de una pregunta frecuente existente o cambiar su estado entre Activa e Inactiva, **para** mantener actualizada la información oficial y controlar qué respuestas utiliza el asistente virtual. |
| **Validación (Criterios Gherkin)** | **Dado** que existe una pregunta frecuente registrada y tengo sesión activa como Administrador. **Cuando** edito sus campos o cambio su estado en el modal y guardo los cambios (PUT /api/faqs/{id}). **Entonces** el sistema actualiza el registro y su fecha UltimaActualizacion, incluyendo o excluyendo la pregunta del contexto de IA según su estado. |

#### HU-07 (Número: 2.4) — Eliminar Pregunta Frecuente del directorio
| Atributo | Detalle |
|---|---|
| **Número / Código** | 2.4 (`HU-07`) |
| **Usuario / Actor** | Administrador |
| **Nombre de la historia** | Eliminar Pregunta Frecuente del directorio |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 2 puntos |
| **Iteración asignada** | Iteración 2 (Sprint 2) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador del sistema, **quiero** eliminar preguntas frecuentes obsoletas junto con sus respuestas asociadas, **para** evitar que información desactualizada confunda a los usuarios o al motor de inteligencia artificial. |
| **Validación (Criterios Gherkin)** | **Dado** que he iniciado sesión con rol 'Admin' y selecciono 'Eliminar' sobre una pregunta del directorio. **Cuando** confirmo la eliminación en el cuadro de diálogo. **Entonces** el sistema ejecuta el borrado en cascada en SQL Server (DELETE /api/faqs/{id}) y retira la pregunta de la interfaz. |

#### HU-08 (Número: 3.1) — Interacción en tiempo real con el Chatbot Inteligente (RAG + LLM)
| Atributo | Detalle |
|---|---|
| **Número / Código** | 3.1 (`HU-08`) |
| **Usuario / Actor** | Usuario / Visitante |
| **Nombre de la historia** | Interacción en tiempo real con el Chatbot Inteligente (RAG + LLM) |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Medio |
| **Puntos estimados** | 8 puntos |
| **Iteración asignada** | Iteración 2 (Sprint 2) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario o visitante, **quiero** enviar mis preguntas en lenguaje natural al canal de atención automática y recibir una respuesta inmediata, **para** resolver mis inquietudes institucionales o generales las 24 horas del día sin tiempos de espera. |
| **Validación (Criterios Gherkin)** | **Dado** que me encuentro en la vista 'Consultas en Línea'. **Cuando** escribo mi consulta y presiono 'Enviar consulta' (POST /api/chat/send). **Entonces** el sistema inyecta las FAQs activas en el System Prompt, consulta el motor de IA y muestra la respuesta clara y contextualizada en el hilo de conversación. |

#### HU-09 (Número: 3.2) — Consulta rápida mediante botones de temas frecuentes
| Atributo | Detalle |
|---|---|
| **Número / Código** | 3.2 (`HU-09`) |
| **Usuario / Actor** | Usuario / Visitante |
| **Nombre de la historia** | Consulta rápida mediante botones de temas frecuentes |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 2 puntos |
| **Iteración asignada** | Iteración 2 (Sprint 2) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario o visitante, **quiero** seleccionar con un solo clic cualquiera de los temas frecuentes listados en el panel izquierdo, **para** realizar consultas habituales sin necesidad de redactar toda la pregunta manualmente. |
| **Validación (Criterios Gherkin)** | **Dado** que existen preguntas frecuentes activas en el directorio. **Cuando** hago clic sobre un tema sugerido en el panel 'Temas frecuentes'. **Entonces** el sistema envía automáticamente la pregunta al canal de atención y presenta la respuesta oficial correspondiente. |

#### HU-10 (Número: 3.3) — Gestión de múltiples sesiones de conversación
| Atributo | Detalle |
|---|---|
| **Número / Código** | 3.3 (`HU-10`) |
| **Usuario / Actor** | Usuario / Visitante |
| **Nombre de la historia** | Gestión de múltiples sesiones de conversación |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 2 (Sprint 2) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario de la mesa de ayuda digital, **quiero** iniciar nuevas conversaciones, alternar entre mis sesiones anteriores o eliminar sesiones que ya no necesite, **para** organizar mis consultas por temas separados con su propio código de referencia (SessionId GUID). |
| **Validación (Criterios Gherkin)** | **Dado** que utilizo el panel 'Mis conversaciones'. **Cuando** presiono '+ Nueva consulta', selecciono otra sesión de la lista o elimino una existente. **Entonces** el sistema genera o carga el hilo de mensajes correspondiente manteniendo su código único de referencia. |

#### HU-11 (Número: 3.4) — Configuración del servicio de generación de respuestas (Proveedor IA)
| Atributo | Detalle |
|---|---|
| **Número / Código** | 3.4 (`HU-11`) |
| **Usuario / Actor** | Administrador / Usuario Avanzado |
| **Nombre de la historia** | Configuración del servicio de generación de respuestas (Proveedor IA) |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Medio |
| **Puntos estimados** | 5 puntos |
| **Iteración asignada** | Iteración 3 (Sprint 3) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador o usuario avanzado, **quiero** seleccionar el proveedor de inteligencia artificial (Servicio Automático Estándar, Google Gemini o OpenAI) y configurar su llave API si aplica, **para** adaptar el motor de inferencia a la infraestructura disponible y garantizar respaldo automático ante fallos. |
| **Validación (Criterios Gherkin)** | **Dado** que abro el modal de 'Conexión / Preferencias del Servicio de Respuesta'. **Cuando** elijo el proveedor deseado, ingreso la API Key opcional y guardo la configuración. **Entonces** el sistema almacena la preferencia y procesa las siguientes consultas con el proveedor elegido o con el respaldo local si ocurre una falla de red. |

#### HU-12 (Número: 4.1) — Registro automático de interacciones en bitácora SQL Server
| Atributo | Detalle |
|---|---|
| **Número / Código** | 4.1 (`HU-12`) |
| **Usuario / Actor** | Sistema / Administrador |
| **Nombre de la historia** | Registro automático de interacciones en bitácora SQL Server |
| **Prioridad en negocio** | Alta |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 5 puntos |
| **Iteración asignada** | Iteración 3 (Sprint 3) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador responsable de la trazabilidad, **quiero** que cada pregunta enviada por un usuario y cada respuesta generada por el bot se guarden automáticamente en la base de datos, **para** asegurar el respaldo histórico y la auditoría de todas las atenciones realizadas. |
| **Validación (Criterios Gherkin)** | **Dado** que un usuario o visitante envía una consulta al chatbot. **Cuando** el servicio de IA genera la respuesta correspondiente. **Entonces** el sistema inserta automáticamente un registro en la tabla Conversaciones con SessionId, UsuarioId (o NULL), PreguntaUsuario, RespuestaBot y Timestamp UTC. |

#### HU-13 (Número: 4.2) — Consulta de historial cronológico por código de sesión
| Atributo | Detalle |
|---|---|
| **Número / Código** | 4.2 (`HU-13`) |
| **Usuario / Actor** | Usuario / Administrador |
| **Nombre de la historia** | Consulta de historial cronológico por código de sesión |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 3 (Sprint 3) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** usuario o administrador, **quiero** recuperar el historial completo de mensajes asociados a un identificador de sesión específico, **para** revisar en orden cronológico todas las preguntas y respuestas de una atención previa. |
| **Validación (Criterios Gherkin)** | **Dado** que existe una sesión con código GUID válido. **Cuando** se consulta el endpoint GET /api/chat/history/{sessionId} o se selecciona la sesión en la interfaz. **Entonces** el sistema retorna y muestra la secuencia completa de mensajes ordenada por fecha y hora ascendente. |

#### HU-14 (Número: 4.3) — Auditoría de bitácora y visualización de indicadores KPI
| Atributo | Detalle |
|---|---|
| **Número / Código** | 4.3 (`HU-14`) |
| **Usuario / Actor** | Administrador |
| **Nombre de la historia** | Auditoría de bitácora y visualización de indicadores KPI |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 3 puntos |
| **Iteración asignada** | Iteración 3 (Sprint 3) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador del centro de atención, **quiero** visualizar el registro histórico de atención junto con indicadores de total de consultas, conversaciones abiertas y preguntas activas, **para** monitorear el volumen de atención, identificar dudas frecuentes y evaluar el desempeño del asistente. |
| **Validación (Criterios Gherkin)** | **Dado** que existen interacciones registradas en el sistema. **Cuando** ingreso a la pestaña 'Historial de Registros'. **Entonces** el sistema actualiza las tarjetas de indicadores KPI y despliega la tabla detallada con N.º, Código de sesión, Usuario, Consulta, Respuesta y Fecha/Hora. |

#### HU-15 (Número: 4.4) — Exportación del historial de atención a formato CSV
| Atributo | Detalle |
|---|---|
| **Número / Código** | 4.4 (`HU-15`) |
| **Usuario / Actor** | Administrador |
| **Nombre de la historia** | Exportación del historial de atención a formato CSV |
| **Prioridad en negocio** | Media |
| **Riesgo en desarrollo** | Bajo |
| **Puntos estimados** | 2 puntos |
| **Iteración asignada** | Iteración 3 (Sprint 3) |
| **Programador responsable** | Santiago Muñoz Salazar |
| **Descripción (Como / Quiero / Para)** | **Como** administrador del sistema, **quiero** descargar el listado histórico de conversaciones en un archivo CSV compatible con hojas de cálculo, **para** elaborar informes de gestión, analizar métricas externamente y conservar respaldos de auditoría. |
| **Validación (Criterios Gherkin)** | **Dado** que me encuentro en la vista 'Historial de Registros' y existen consultas atendidas. **Cuando** presiono el botón 'Descargar CSV'. **Entonces** el sistema genera y descarga inmediatamente el archivo 'historial_atencion.csv' con codificación UTF-8 y todas las columnas del registro histórico. |

---

## 6. CASOS DE USO (CU-01 – CU-15)

### 6.1 Matriz de Trazabilidad (RF ↔ HU ↔ CU)
| Código CU | Nombre del Caso de Uso | RF | Historia de Usuario |
|---|---|---|---|
| **CU-01** | Registro de Nuevo Usuario en el Sistema | `RF1` | H.U. 1.1 (HU-01: Registro de cuenta de usuario) |
| **CU-02** | Inicio de Sesión y Autenticación JWT | `RF2` | H.U. 1.2 (HU-02: Inicio de sesión con autenticación JWT) |
| **CU-03** | Control de Acceso por Rol y Cierre Seguro de Sesión | `RF3` | H.U. 1.3 (HU-03: Control de acceso según rol y cierre seguro de sesión) |
| **CU-04** | Consultar y Filtrar Directorio de Preguntas Frecuentes (FAQs) | `RF4` | H.U. 2.1 (HU-04: Consulta y filtrado del directorio de Preguntas Frecuentes) |
| **CU-05** | Registrar Nueva Pregunta Frecuente y Respuesta Oficial | `RF5` | H.U. 2.2 (HU-05: Crear nueva Pregunta Frecuente y respuesta oficial) |
| **CU-06** | Actualizar y Cambiar Estado de Pregunta Frecuente | `RF6` | H.U. 2.3 (HU-06: Editar y activar/inactivar Preguntas Frecuentes) |
| **CU-07** | Eliminar Pregunta Frecuente en Cascada | `RF7` | H.U. 2.4 (HU-07: Eliminar Pregunta Frecuente del directorio) |
| **CU-08** | Enviar Consulta al Chatbot e Inferencia IA con Contexto RAG | `RF8` | H.U. 3.1 (HU-08: Interacción en tiempo real con el Chatbot Inteligente) |
| **CU-09** | Realizar Consulta Rápida mediante Temas Frecuentes Sugeridos | `RF10` | H.U. 3.2 (HU-09: Consulta rápida mediante botones de temas frecuentes) |
| **CU-10** | Gestionar Sesiones de Conversación (Crear, Seleccionar y Eliminar) | `RF10` | H.U. 3.3 (HU-10: Gestión de múltiples sesiones de conversación) |
| **CU-11** | Configurar Proveedor de Inteligencia Artificial y Motor de Respaldo | `RF9` | H.U. 3.4 (HU-11: Configuración del servicio de generación de respuestas) |
| **CU-12** | Registrar Interacción en Bitácora de Conversaciones (SQL Server) | `RF11` | H.U. 4.1 (HU-12: Registro automático de interacciones en bitácora SQL Server) |
| **CU-13** | Consultar Historial de Conversación por Código de Sesión | `RF12` | H.U. 4.2 (HU-13: Consulta de historial cronológico por código de sesión) |
| **CU-14** | Auditar Bitácora Histórica y Visualizar Indicadores KPI | `RF13` | H.U. 4.3 (HU-14: Auditoría de bitácora y visualización de indicadores KPI) |
| **CU-15** | Exportar Reporte Histórico de Conversaciones en Formato CSV | `RF13` | H.U. 4.4 (HU-15: Exportación del historial de atención a formato CSV) |

### 6.2 Fichas Detalladas de Casos de Uso

#### CU-01: Registro de Nuevo Usuario en el Sistema
| Campo | Descripción |
|---|---|
| **Código** | `CU-01` |
| **Nombre del Caso de Uso** | Registro de Nuevo Usuario en el Sistema |
| **Historias y RF asociados** | H.U. 1.1 (HU-01: Registro de cuenta de usuario) (`RF1`) |
| **Actores** | • Actor Principal: Visitante / Usuario Nuevo<br>• Actor Secundario: Base de Datos SQL Server (Tabla dbo.Usuarios) |
| **Descripción** | Permite a un visitante crear una cuenta en el sistema ingresando su nombre, correo electrónico, contraseña y rol, almacenando la clave encriptada con BCrypt y emitiendo su token JWT inicial. |
| **Precondición** | El servicio API REST (.NET 8) y la base de datos SQL Server se encuentran operativos; el correo electrónico no está registrado previamente. |
| **Flujo Principal** | 1. El usuario solicita registrarse en el sistema enviando sus datos (Nombre, Email, Password, Rol).<br>2. El controlador AuthController recibe el objeto RegisterDto en POST /api/auth/register y valida el ModelState.<br>3. El servicio AuthService normaliza el correo electrónico (Trim y minúsculas) y consulta en dbo.Usuarios si ya existe.<br>4. El sistema verifica que el correo es único y genera el hash criptográfico de la contraseña mediante BCrypt.Net.BCrypt.HashPassword().<br>5. El sistema crea la entidad Usuario con FechaCreacion = DateTime.UtcNow y guarda el registro en SQL Server.<br>6. El servicio genera el token JWT firmado con HmacSha256 incluyendo los Claims de identidad y rol.<br>7. El sistema retorna HTTP 201 Created con el objeto AuthResponseDto. |
| **Flujos Alternos** | • Flujo Alterno 3.1 (Rol no especificado o diferente a Admin/User): El sistema asigna por defecto el rol seguro 'User' y continúa en el paso 4. |
| **Postcondición** | El nuevo usuario queda persistido en la tabla dbo.Usuarios con su contraseña cifrada y recibe su token JWT válido por 120 minutos. |
| **Excepciones** | • Excepción E1 (Correo duplicado): Si el correo ya existe en dbo.Usuarios, AuthService lanza InvalidOperationException y el controlador devuelve HTTP 409 Conflict con el mensaje 'El correo electrónico ya se encuentra registrado.'<br>• Excepción E2 (Datos incompletos): Si faltan campos obligatorios o la contraseña tiene menos de 6 caracteres, retorna HTTP 400 Bad Request. |

#### CU-02: Inicio de Sesión y Autenticación JWT
| Campo | Descripción |
|---|---|
| **Código** | `CU-02` |
| **Nombre del Caso de Uso** | Inicio de Sesión y Autenticación JWT |
| **Historias y RF asociados** | H.U. 1.2 (HU-02: Inicio de sesión con autenticación JWT) (`RF2`) |
| **Actores** | • Actor Principal: Usuario Registrado / Administrador<br>• Actor Secundario: Servicio AuthService / SQL Server |
| **Descripción** | Permite autenticar a un usuario mediante correo y contraseña, verificando su hash BCrypt y entregando un JSON Web Token para autorizar sus operaciones según su rol. |
| **Precondición** | El usuario debe encontrarse previamente registrado en la tabla dbo.Usuarios (por semilla inicial o registro previo). |
| **Flujo Principal** | 1. El usuario abre el modal 'Acceso de Usuarios' haciendo clic en 'Iniciar sesión'.<br>2. El usuario ingresa su correo electrónico y contraseña (o selecciona una cuenta rápida de prueba) y presiona 'Ingresar'.<br>3. El Frontend envía una petición POST /api/auth/login con el objeto LoginDto.<br>4. AuthService busca en dbo.Usuarios el registro cuyo Email normalizado coincida.<br>5. El sistema verifica la contraseña ingresada contra PasswordHash usando BCrypt.Net.BCrypt.Verify().<br>6. Al ser válida, AuthService construye el JwtSecurityToken con los Claims (Sub, NameIdentifier, Name, Email, Role, Jti) y expiración de 120 minutos.<br>7. El sistema retorna HTTP 200 OK con AuthResponseDto; el Frontend almacena la sesión y actualiza la barra superior con el nombre y rol del usuario. |
| **Flujos Alternos** | • Flujo Alterno 2.1 (Carga rápida de credenciales de demostración): El usuario presiona 'Cargar Administrador' o 'Cargar Usuario' en el modal; el sistema autocompleta las credenciales semilla antes de enviar el formulario.<br>• Flujo Alterno 3.1 (Modo de respaldo local): Si el backend no está conectado, el Frontend valida las cuentas institucionales locales y activa la sesión correspondiente. |
| **Postcondición** | El usuario mantiene una sesión autenticada con su token JWT activo y la interfaz habilita las opciones correspondientes a su rol. |
| **Excepciones** | • Excepción E1 (Credenciales inválidas): Si el correo no existe o la contraseña no coincide con el hash BCrypt, el sistema retorna HTTP 401 Unauthorized y muestra notificación de error. |

#### CU-03: Control de Acceso por Rol y Cierre Seguro de Sesión
| Campo | Descripción |
|---|---|
| **Código** | `CU-03` |
| **Nombre del Caso de Uso** | Control de Acceso por Rol y Cierre Seguro de Sesión |
| **Historias y RF asociados** | H.U. 1.3 (HU-03: Control de acceso según rol y cierre seguro de sesión) (`RF3`) |
| **Actores** | • Actor Principal: Usuario Registrado / Administrador<br>• Actor Secundario: Middleware JwtBearer de ASP.NET Core |
| **Descripción** | Valida los permisos del rol del usuario en cada operación protegida del sistema y permite finalizar la sesión activa eliminando las credenciales almacenadas. |
| **Precondición** | El usuario ha iniciado sesión en la plataforma. |
| **Flujo Principal** | 1. El usuario autenticado solicita ejecutar una operación administrativa o presiona el botón 'Salir' en la barra superior.<br>2. Si ejecuta una operación protegida, el Frontend adjunta la cabecera 'Authorization: Bearer {token}'.<br>3. El middleware de autenticación y autorización de .NET 8 valida la firma del token, su vigencia y que el Claim Role sea 'Admin'.<br>4. El sistema permite ejecutar la acción solicitada.<br>5. Cuando el usuario presiona 'Salir', el sistema ejecuta logoutUser(), elimina la sesión de localStorage, restablece el perfil a 'Visitante' y notifica 'Sesión finalizada.' |
| **Flujos Alternos** | • Flujo Alterno 2.1 (Usuario con rol 'User' o 'Visitante' intenta editar FAQs): El sistema intercepta la acción, muestra el aviso 'Para modificar el directorio debe iniciar sesión como Administrador' y abre el modal de autenticación. |
| **Postcondición** | Las operaciones críticas quedan resguardadas bajo el rol Admin y, tras el cierre de sesión, ningún token permanece activo en el navegador. |
| **Excepciones** | • Excepción E1 (Token vencido o rol insuficiente en API): El servidor responde con HTTP 401 Unauthorized o HTTP 403 Forbidden impidiendo la operación. |

#### CU-04: Consultar y Filtrar Directorio de Preguntas Frecuentes (FAQs)
| Campo | Descripción |
|---|---|
| **Código** | `CU-04` |
| **Nombre del Caso de Uso** | Consultar y Filtrar Directorio de Preguntas Frecuentes (FAQs) |
| **Historias y RF asociados** | H.U. 2.1 (HU-04: Consulta y filtrado del directorio de Preguntas Frecuentes) (`RF4`) |
| **Actores** | • Actor Principal: Usuario / Visitante / Administrador<br>• Actor Secundario: Servicio FaqService / SQL Server |
| **Descripción** | Permite visualizar el catálogo completo de preguntas frecuentes y sus respuestas oficiales, aplicando filtros dinámicos por categoría o búsqueda por palabras clave. |
| **Precondición** | Existen preguntas frecuentes registradas en la base de datos o cargadas por el Data Seeder inicial. |
| **Flujo Principal** | 1. El usuario selecciona la pestaña 'Preguntas Frecuentes' en la barra de navegación superior.<br>2. El sistema solicita GET /api/faqs al controlador FaqsController.<br>3. FaqService consulta en SQL Server la tabla dbo.Preguntas incluyendo dbo.Respuestas (.Include(p => p.Respuestas)), ordenando por Categoría e Id.<br>4. El Frontend renderiza las píldoras de categorías ('Todas', 'Información General', 'Cuenta y Acceso', 'Pagos y Facturación', 'Soporte y PQR') y la tabla de datos.<br>5. El usuario selecciona una categoría o digita una palabra clave en el buscador 'Buscar palabra clave...'.<br>6. El sistema filtra instantáneamente las filas mostrando solo aquellas cuya pregunta, categoría o respuesta coincida con los criterios. |
| **Flujos Alternos** | • Flujo Alterno 2.1 (Consulta exclusiva de FAQs activas): Cuando el motor de chat o el panel de temas rápidos solicita solo preguntas vigentes, invoca GET /api/faqs?onlyActive=true.<br>• Flujo Alterno 6.1 (Sin coincidencias en el filtro): La tabla muestra el mensaje 'No se encontraron preguntas registradas.' |
| **Postcondición** | El usuario visualiza de manera clara y estructurada las preguntas frecuentes y sus respuestas oficiales vigentes. |
| **Excepciones** | • Excepción E1 (ID específico no encontrado en GET /api/faqs/{id}): El controlador retorna HTTP 404 NotFound. |

#### CU-05: Registrar Nueva Pregunta Frecuente y Respuesta Oficial
| Campo | Descripción |
|---|---|
| **Código** | `CU-05` |
| **Nombre del Caso de Uso** | Registrar Nueva Pregunta Frecuente y Respuesta Oficial |
| **Historias y RF asociados** | H.U. 2.2 (HU-05: Crear nueva Pregunta Frecuente y respuesta oficial) (`RF5`) |
| **Actores** | • Actor Principal: Administrador<br>• Actor Secundario: Servicio FaqService / SQL Server |
| **Descripción** | Permite al Administrador agregar una nueva pregunta frecuente junto con su categoría, estado y respuesta oficial a la base de conocimiento institucional. |
| **Precondición** | El usuario ha iniciado sesión con rol 'Admin' (posee token JWT válido con Role = Admin). |
| **Flujo Principal** | 1. En la vista 'Preguntas Frecuentes', el Administrador presiona el botón '+ Agregar pregunta'.<br>2. El sistema abre el modal 'Registrar pregunta frecuente' con los campos limpios y estado predeterminado 'Activa'.<br>3. El Administrador ingresa la Categoría, selecciona el Estado (Activa/Inactiva), redacta la Pregunta y escribe la Respuesta oficial.<br>4. El Administrador presiona 'Guardar cambios'.<br>5. El Frontend envía POST /api/faqs con el objeto CreateFaqDto y la cabecera Authorization Bearer JWT.<br>6. FaqService crea la entidad Pregunta junto con su entidad hija Respuesta (UltimaActualizacion = DateTime.UtcNow) y ejecuta SaveChangesAsync() en SQL Server.<br>7. El sistema cierra el modal, recarga el directorio, actualiza los temas rápidos y muestra la notificación 'Directorio de preguntas actualizado.' |
| **Flujos Alternos** | • Flujo Alterno 3.1 (Cancelación): Si el Administrador presiona 'Cancelar' o 'Cerrar', el modal se cierra sin realizar cambios. |
| **Postcondición** | La nueva pregunta y su respuesta quedan almacenadas en dbo.Preguntas y dbo.Respuestas, quedando inmediatamente disponibles para el contexto RAG de la IA. |
| **Excepciones** | • Excepción E1 (Campos obligatorios vacíos): El formulario valida los campos requeridos y el backend retorna HTTP 400 Bad Request si el DTO es inválido.<br>• Excepción E2 (Token sin rol Admin): El backend rechaza la petición con HTTP 401/403. |

#### CU-06: Actualizar y Cambiar Estado de Pregunta Frecuente
| Campo | Descripción |
|---|---|
| **Código** | `CU-06` |
| **Nombre del Caso de Uso** | Actualizar y Cambiar Estado de Pregunta Frecuente |
| **Historias y RF asociados** | H.U. 2.3 (HU-06: Editar y activar/inactivar Preguntas Frecuentes) (`RF6`) |
| **Actores** | • Actor Principal: Administrador<br>• Actor Secundario: Servicio FaqService / SQL Server |
| **Descripción** | Permite al Administrador modificar el texto, categoría, respuesta oficial o estado (Activa/Inactiva) de una pregunta frecuente existente. |
| **Precondición** | El Administrador ha iniciado sesión con rol 'Admin' y la pregunta frecuente existe en el directorio. |
| **Flujo Principal** | 1. En la tabla del directorio de FAQs, el Administrador hace clic en el botón 'Editar' de la fila deseada.<br>2. El sistema abre el modal precargando la Categoría, Estado actual, Pregunta y Respuesta oficial del registro.<br>3. El Administrador modifica los campos requeridos (o cambia el estado entre Activa e Inactiva) y presiona 'Guardar cambios'.<br>4. El Frontend envía una petición PUT /api/faqs/{id} con UpdateFaqDto y el token JWT.<br>5. FaqService localiza la pregunta en SQL Server, actualiza TextoPregunta, Categoria, EstadoActivo y modifica TextoRespuesta y UltimaActualizacion = DateTime.UtcNow.<br>6. El sistema guarda los cambios en SQL Server, refresca la tabla del directorio, actualiza el conteo de temas activos y muestra notificación de éxito. |
| **Flujos Alternos** | • Flujo Alterno 3.1 (Inactivación de pregunta): Si el Administrador cambia el estado a 'Inactiva', la pregunta permanece visible en la tabla administrativa pero se retira inmediatamente de los 'Temas frecuentes' del chat y del prompt de la IA. |
| **Postcondición** | El registro queda actualizado en SQL Server y el contexto de conocimiento del Chatbot refleja los cambios en tiempo real. |
| **Excepciones** | • Excepción E1 (ID inexistente): Si la pregunta fue eliminada previamente, PUT /api/faqs/{id} retorna HTTP 404 NotFound. |

#### CU-07: Eliminar Pregunta Frecuente en Cascada
| Campo | Descripción |
|---|---|
| **Código** | `CU-07` |
| **Nombre del Caso de Uso** | Eliminar Pregunta Frecuente en Cascada |
| **Historias y RF asociados** | H.U. 2.4 (HU-07: Eliminar Pregunta Frecuente del directorio) (`RF7`) |
| **Actores** | • Actor Principal: Administrador<br>• Actor Secundario: Servicio FaqService / SQL Server |
| **Descripción** | Permite al Administrador eliminar una pregunta frecuente y sus respuestas asociadas mediante borrado en cascada. |
| **Precondición** | El Administrador tiene sesión activa con rol 'Admin' y el registro existe en dbo.Preguntas. |
| **Flujo Principal** | 1. El Administrador ubica la pregunta en el Directorio de Preguntas Frecuentes y presiona el botón 'Eliminar'.<br>2. El sistema presenta el cuadro de confirmación '¿Desea eliminar la pregunta #{id}?'.<br>3. El Administrador confirma la operación.<br>4. El Frontend envía la petición DELETE /api/faqs/{id} adjuntando el token JWT de Administrador.<br>5. FaqService elimina la entidad en dbo.Preguntas y SQL Server ejecuta automáticamente ON DELETE CASCADE sobre las respuestas asociadas en dbo.Respuestas.<br>6. El sistema retorna HTTP 204 No Content, actualiza la tabla del directorio, recalcula los indicadores KPI y muestra la notificación 'Pregunta eliminada.' |
| **Flujos Alternos** | • Flujo Alterno 2.1 (Administrador cancela la confirmación): Si selecciona 'Cancelar', no se realiza ninguna petición y el registro se conserva. |
| **Postcondición** | La pregunta y sus respuestas son eliminadas definitivamente de la base de datos y dejan de formar parte del contexto del Chatbot. |
| **Excepciones** | • Excepción E1 (Registro no encontrado): Si el ID no existe en la base de datos, el servidor retorna HTTP 404 NotFound. |

#### CU-08: Enviar Consulta al Chatbot e Inferencia IA con Contexto RAG
| Campo | Descripción |
|---|---|
| **Código** | `CU-08` |
| **Nombre del Caso de Uso** | Enviar Consulta al Chatbot e Inferencia IA con Contexto RAG |
| **Historias y RF asociados** | H.U. 3.1 (HU-08: Interacción en tiempo real con el Chatbot Inteligente) (`RF8`) |
| **Actores** | • Actor Principal: Usuario Registrado / Visitante<br>• Actor Secundario: AiIntegrationService / SQL Server / API Externa LLM (Gemini, OpenAI, Pollinations) |
| **Descripción** | Procesa una consulta en lenguaje natural enviada por el usuario, inyecta las preguntas frecuentes activas como contexto institucional (RAG), invoca el modelo de lenguaje (LLM) y devuelve la respuesta generada. |
| **Precondición** | El usuario se encuentra en la vista 'Consultas en Línea' con una sesión de conversación activa. |
| **Flujo Principal** | 1. El usuario escribe su inquietud en el área de texto del Canal de Atención Automática y presiona 'Enviar consulta' (o la tecla Enter).<br>2. El Frontend agrega el mensaje del usuario al hilo de conversación, muestra el indicador animado 'Buscando información y redactando respuesta...' y envía POST /api/chat/send con { sessionId, mensaje }.<br>3. ChatController valida el DTO, verifica o genera el SessionId (Guid) y extrae el UsuarioId del Claim JWT si el usuario está autenticado.<br>4. AiIntegrationService consulta en SQL Server todas las preguntas con EstadoActivo = true junto con sus respuestas oficiales.<br>5. AiIntegrationService construye el System Prompt institucional inyectando la base de conocimiento oficial y las reglas de atención.<br>6. AiIntegrationService envía de forma asíncrona (HttpClient) el payload JSON al proveedor LLM configurado.<br>7. El proveedor LLM procesa el contexto y retorna la respuesta en lenguaje natural.<br>8. ChatController registra la interacción en dbo.Conversaciones y devuelve HTTP 200 OK con ChatResponseDto.<br>9. El Frontend oculta el indicador de escritura y presenta la respuesta del asistente con su etiqueta de categoría y hora. |
| **Flujos Alternos** | • Flujo Alterno 6.1 (Saludos o preguntas de conversación general): El modelo LLM responde con cortesía en español y recuerda amablemente los temas institucionales disponibles. |
| **Postcondición** | El usuario recibe una respuesta precisa en pantalla y la interacción queda registrada en la bitácora de conversaciones. |
| **Excepciones** | • Excepción E1 (Fallo de conexión o Timeout del proveedor LLM): AiIntegrationService captura HttpRequestException / TaskCanceledException y retorna respuesta de respaldo sin bloquear el sistema. |

#### CU-09: Realizar Consulta Rápida mediante Temas Frecuentes Sugeridos
| Campo | Descripción |
|---|---|
| **Código** | `CU-09` |
| **Nombre del Caso de Uso** | Realizar Consulta Rápida mediante Temas Frecuentes Sugeridos |
| **Historias y RF asociados** | H.U. 3.2 (HU-09: Consulta rápida mediante botones de temas frecuentes) (`RF10`) |
| **Actores** | • Actor Principal: Usuario / Visitante<br>• Actor Secundario: Canal de Atención Automática |
| **Descripción** | Permite al usuario disparar automáticamente una consulta en el chat haciendo clic sobre cualquiera de los temas frecuentes activos mostrados en el panel izquierdo. |
| **Precondición** | Existen preguntas frecuentes con EstadoActivo = true cargadas en la plataforma. |
| **Flujo Principal** | 1. El usuario visualiza el panel 'Temas frecuentes' ubicado a la izquierda de la ventana de conversación.<br>2. El usuario hace clic sobre el botón del tema de su interés (ej. '¿Cuáles son los medios de pago aceptados?').<br>3. El sistema ejecuta askQuickTopic(pregunta), coloca el texto en el campo de consulta y dispara automáticamente el envío del mensaje (CU-08).<br>4. El sistema procesa la consulta y muestra la respuesta oficial en el hilo de la conversación activa. |
| **Flujos Alternos** | • Flujo Alterno 1.1 (Actualización del directorio): Si un administrador agrega o desactiva una FAQ, la lista de botones rápidos se actualiza automáticamente. |
| **Postcondición** | La consulta seleccionada es respondida en la sesión actual y registrada en el historial. |
| **Excepciones** | • No aplica. |

#### CU-10: Gestionar Sesiones de Conversación (Crear, Seleccionar y Eliminar)
| Campo | Descripción |
|---|---|
| **Código** | `CU-10` |
| **Nombre del Caso de Uso** | Gestionar Sesiones de Conversación (Crear, Seleccionar y Eliminar) |
| **Historias y RF asociados** | H.U. 3.3 (HU-10: Gestión de múltiples sesiones de conversación) (`RF10`) |
| **Actores** | • Actor Principal: Usuario / Visitante |
| **Descripción** | Permite al usuario crear nuevas sesiones de consulta identificadas por un código único GUID, alternar entre conversaciones existentes o eliminar sesiones del listado. |
| **Precondición** | El usuario se encuentra en la vista principal 'Consultas en Línea'. |
| **Flujo Principal** | 1. Para iniciar un nuevo hilo, el usuario presiona '+ Nueva consulta' en el panel 'Mis conversaciones'.<br>2. El sistema genera un nuevo identificador único GUID (createNewSession), inicializa el hilo con el mensaje de recepción y muestra el código de referencia (Ref: 8 caracteres).<br>3. Cuando el usuario envía el primer mensaje de la sesión, el sistema actualiza automáticamente el título de la conversación con los primeros 32 caracteres de la consulta.<br>4. Para revisar otra conversación, el usuario hace clic sobre ella en la lista y el sistema renderiza sus mensajes.<br>5. Para borrar una sesión, el usuario presiona el botón '×' junto a la conversación y el sistema la retira del listado. |
| **Flujos Alternos** | • Flujo Alterno 5.1 (Eliminación de la única sesión existente): Si el usuario elimina la última sesión de su lista, el sistema crea automáticamente una nueva sesión en blanco para mantener operativo el chat. |
| **Postcondición** | El usuario mantiene sus conversaciones organizadas por sesión con su respectivo código de referencia único. |
| **Excepciones** | • No aplica. |

#### CU-11: Configurar Proveedor de Inteligencia Artificial y Motor de Respaldo
| Campo | Descripción |
|---|---|
| **Código** | `CU-11` |
| **Nombre del Caso de Uso** | Configurar Proveedor de Inteligencia Artificial y Motor de Respaldo |
| **Historias y RF asociados** | H.U. 3.4 (HU-11: Configuración del servicio de generación de respuestas) (`RF9`) |
| **Actores** | • Actor Principal: Administrador / Usuario Avanzado<br>• Actor Secundario: Proveedores API (Pollinations, Google Gemini, OpenAI) |
| **Descripción** | Permite seleccionar el motor de generación de respuestas del sistema y configurar llaves API personalizadas para Google Gemini o OpenAI. |
| **Precondición** | El aplicativo web se encuentra activo en el navegador. |
| **Flujo Principal** | 1. El usuario presiona el botón 'Conexión' en la barra superior institucional.<br>2. El sistema despliega el modal 'Preferencias del Servicio de Respuesta'.<br>3. El usuario selecciona entre 'Servicio Automático Estándar (Predeterminado)', 'Google Gemini API (Con llave propia)' u 'OpenAI API (Con llave propia)'.<br>4. Si selecciona Gemini u OpenAI, el sistema muestra el campo de contraseña para ingresar la llave API correspondiente.<br>5. El usuario presiona 'Guardar preferencia'.<br>6. El sistema almacena la configuración y muestra la notificación 'Preferencias de conexión actualizadas.' |
| **Flujos Alternos** | • Flujo Alterno 3.1 (Uso del Servicio Automático Estándar): No requiere ingresar API Key; el sistema utiliza el proveedor LLM gratuito en la nube junto con el motor local de FAQs. |
| **Postcondición** | Las consultas posteriores al chatbot se procesan utilizando el proveedor de IA seleccionado. |
| **Excepciones** | • Excepción E1 (Llave API inválida o sin cuota): Si el proveedor externo rechaza la llave, el sistema conmuta de forma transparente al proveedor estándar y al buscador semántico local de FAQs. |

#### CU-12: Registrar Interacción en Bitácora de Conversaciones (SQL Server)
| Campo | Descripción |
|---|---|
| **Código** | `CU-12` |
| **Nombre del Caso de Uso** | Registrar Interacción en Bitácora de Conversaciones (SQL Server) |
| **Historias y RF asociados** | H.U. 4.1 (HU-12: Registro automático de interacciones en bitácora SQL Server) (`RF11`) |
| **Actores** | • Actor Principal: Sistema (ChatController)<br>• Actor Secundario: SQL Server (Tabla dbo.Conversaciones) |
| **Descripción** | Persiste automáticamente cada par de pregunta del usuario y respuesta del bot en la base de datos relacional para fines de auditoría y trazabilidad. |
| **Precondición** | Se ha procesado un mensaje en el endpoint POST /api/chat/send (CU-08). |
| **Flujo Principal** | 1. Una vez obtenida la respuesta de AiIntegrationService, ChatController instancia un objeto de la entidad Conversacion.<br>2. El sistema asigna SessionId, UsuarioId (Id del usuario autenticado o NULL si es visitante), PreguntaUsuario, RespuestaBot y Timestamp = DateTime.UtcNow.<br>3. El sistema agrega la entidad al DbSet _context.Conversaciones y ejecuta SaveChangesAsync().<br>4. SQL Server inserta la fila en dbo.Conversaciones generando el Id autoincremental y actualizando los índices IX_Conversaciones_SessionId e IX_Conversaciones_UsuarioId. |
| **Flujos Alternos** | • Flujo Alterno 3.1 (Persistencia local en modo desconectado): Si el cliente opera sin conexión al backend .NET, el registro se almacena en la bitácora local (conversationsDb) manteniendo la misma estructura. |
| **Postcondición** | La interacción queda almacenada de forma permanente y disponible para consultas de historial y auditoría. |
| **Excepciones** | • Excepción E1 (Error de escritura en SQL Server): El sistema registra la excepción en el log del servidor. |

#### CU-13: Consultar Historial de Conversación por Código de Sesión
| Campo | Descripción |
|---|---|
| **Código** | `CU-13` |
| **Nombre del Caso de Uso** | Consultar Historial de Conversación por Código de Sesión |
| **Historias y RF asociados** | H.U. 4.2 (HU-13: Consulta de historial cronológico por código de sesión) (`RF12`) |
| **Actores** | • Actor Principal: Usuario / Administrador<br>• Actor Secundario: ChatController / SQL Server |
| **Descripción** | Recupera todos los mensajes históricos de una sesión específica ordenados cronológicamente. |
| **Precondición** | Existe un identificador SessionId (Guid) válido. |
| **Flujo Principal** | 1. El cliente o administrador solicita consultar el historial de una sesión enviando GET /api/chat/history/{sessionId}.<br>2. ChatController valida el formato GUID del parámetro sessionId.<br>3. El sistema ejecuta una consulta en dbo.Conversaciones filtrando por c.SessionId == sessionId y ordenando por c.Timestamp ascendente.<br>4. El sistema proyecta cada registro en un objeto ChatResponseDto y retorna la lista con código HTTP 200 OK. |
| **Flujos Alternos** | • Flujo Alterno 3.1 (Sesión sin interacciones previas): El sistema devuelve un arreglo JSON vacío [] con estado HTTP 200 OK. |
| **Postcondición** | El solicitante obtiene la secuencia cronológica exacta de preguntas y respuestas de la sesión consultada. |
| **Excepciones** | • Excepción E1 (Formato GUID inválido en URL): El enrutador de ASP.NET Core rechaza la ruta con HTTP 404/400. |

#### CU-14: Auditar Bitácora Histórica y Visualizar Indicadores KPI
| Campo | Descripción |
|---|---|
| **Código** | `CU-14` |
| **Nombre del Caso de Uso** | Auditar Bitácora Histórica y Visualizar Indicadores KPI |
| **Historias y RF asociados** | H.U. 4.3 (HU-14: Auditoría de bitácora y visualización de indicadores KPI) (`RF13`) |
| **Actores** | • Actor Principal: Administrador |
| **Descripción** | Permite supervisar en una vista consolidada todas las consultas atendidas por el sistema y visualizar indicadores clave de desempeño en tiempo real. |
| **Precondición** | El usuario accede a la plataforma y selecciona la pestaña 'Historial de Registros'. |
| **Flujo Principal** | 1. El Administrador hace clic en la pestaña 'Historial de Registros' en la barra de navegación.<br>2. El sistema calcula y muestra los tres indicadores KPI superiores: 'Total de consultas atendidas', 'Conversaciones abiertas' y 'Preguntas activas en directorio'.<br>3. El sistema renderiza la tabla histórica con las columnas: N.º, Código de sesión, Usuario (Autenticado o Visitante), Consulta realizada, Respuesta entregada y Fecha y hora.<br>4. El Administrador revisa el detalle de las respuestas entregadas por el asistente para evaluar su calidad. |
| **Flujos Alternos** | • Flujo Alterno 4.1 (Limpiar listado local): Si el Administrador presiona 'Limpiar listado' y confirma en el cuadro de diálogo, el sistema depura la vista local de registros. |
| **Postcondición** | El Administrador obtiene visibilidad completa sobre las métricas de uso y la bitácora de interacciones. |
| **Excepciones** | • Excepción E1 (Bitácora sin registros): La tabla muestra el mensaje 'Aún no se han registrado consultas en el historial.' |

#### CU-15: Exportar Reporte Histórico de Conversaciones en Formato CSV
| Campo | Descripción |
|---|---|
| **Código** | `CU-15` |
| **Nombre del Caso de Uso** | Exportar Reporte Histórico de Conversaciones en Formato CSV |
| **Historias y RF asociados** | H.U. 4.4 (HU-15: Exportación del historial de atención a formato CSV) (`RF13`) |
| **Actores** | • Actor Principal: Administrador |
| **Descripción** | Genera y descarga un archivo CSV codificado en UTF-8 con la totalidad de los registros de la bitácora de conversaciones. |
| **Precondición** | Existen registros de conversaciones almacenados en el historial de atención. |
| **Flujo Principal** | 1. En la vista 'Historial de Registros', el Administrador presiona el botón 'Descargar CSV'.<br>2. El sistema verifica que existan registros en la bitácora.<br>3. El sistema construye las cabeceras ('ID,Sesion,UsuarioId,Pregunta,Respuesta,Fecha') y formatea cada fila escapando comillas dobles y saltos de línea.<br>4. El sistema antepone la marca de orden de bytes UTF-8 (\uFEFF) para correcta lectura de tildes en Microsoft Excel y genera un objeto Blob ('text/csv;charset=utf-8;').<br>5. El navegador inicia automáticamente la descarga del archivo 'historial_atencion.csv'. |
| **Flujos Alternos** | • No aplica. |
| **Postcondición** | El Administrador obtiene en su equipo el archivo CSV con todos los registros de auditoría listos para análisis estadístico. |
| **Excepciones** | • Excepción E1 (Sin registros para exportar): Si la bitácora está vacía, el sistema interrumpe la descarga y muestra la notificación Toast 'No hay registros para exportar.' |
