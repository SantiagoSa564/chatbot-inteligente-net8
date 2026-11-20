# Ejecución real local de NexusAI

Entorno de desarrollo aislado con Docker Compose: **.NET 8 + PostgreSQL 17**. No es configuración de producción.

El backend usa **EF Core 8.0.10 con el proveedor Npgsql**, migrado desde SQL Server para que la aplicación pueda desplegarse junto a una base PostgreSQL gestionada (Supabase o Railway). Los contratos HTTP, la autenticación JWT, los endpoints y la integración de IA no cambiaron.

## Archivos

- `deploy/Dockerfile`: compila con el SDK .NET 8 y publica en una imagen ASP.NET Core 8, ejecutada como usuario no root.
- `compose.real.yml`: PostgreSQL 17 con volumen propio y API publicada exclusivamente en `127.0.0.1:5080`.
- `.dockerignore`: excluye Git, dependencias de Node, documentación y secretos del contexto de build.
- `scripts/verify-real.cjs`: prueba HTTP real de autenticación, roles y CRUD; IA opcional explícita.
- `scripts/verify-browser-real.cjs`: prueba Playwright contra el servidor real, sin interceptar `/api` ni activar demo.

La instancia de PostgreSQL no publica su puerto al host. Base: `NexusAI_Real_Dev`, usuario `nexusai`. Volumen de Compose: `nexusai-real-dev_pg-data`. No se usan ni modifican los demás contenedores del equipo.

## Secretos

Archivo local fuera del repositorio:

`/home/santiago/.config/nexusai/real.env`

Permisos `0600`. Contiene una contraseña de base de datos y la firma JWT, ambas aleatorias; no copiarlo a Git, capturas ni chats.

Variables admitidas:

```text
NEXUS_DB_PASSWORD=contraseña local de PostgreSQL
NEXUS_JWT_SECRET=secreto de firma local
NEXUS_HTTP_PORT=5080
NEXUS_AI_PROVIDER=Gemini
NEXUS_AI_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
NEXUS_AI_KEY=clave del proveedor
```

No copiar los valores descriptivos anteriores como credenciales. El archivo generado usa secretos aleatorios y conserva el placeholder de IA hasta que se configure una clave válida. `docker inspect` o `docker compose config` sin `--quiet` pueden revelar variables: no publicar su salida. `NEXUS_SQL_PASSWORD` solo pertenece al stack anterior de SQL Server y ya no se usa.

## Arrancar

Desde la raíz del proyecto:

```sh
docker compose --env-file "$HOME/.config/nexusai/real.env" -f compose.real.yml up --build -d --wait
```

Abrir **http://localhost:5080**. La interfaz y `/api` se sirven desde ASP.NET Core en el mismo origen. No iniciar el servidor estático de Python para las pruebas reales y no activar demo.

La primera ejecución crea la base, aplica la migración `20261120160314_InitialCreate` y ejecuta el seeder. El seeder crea cuentas de desarrollo conocidas (`admin@chatbot.com` y `usuario@chatbot.com`); consultar `Data/DbInitializer.cs` para sus contraseñas. No usar estos datos ni exponer este entorno como producción.

El HTTP de loopback es para desarrollo. El middleware HTTPS original se conserva: si no hay puerto HTTPS configurado puede registrar una advertencia y continuar en HTTP. No representa validación de TLS/producción.

## Pruebas reales

```sh
npm run test:real
npm run test:real:browser
```

La prueba HTTP crea una cuenta User de prueba con correo aleatorio `@example.test`, comprueba que el registro no conceda Admin y no imprime su contraseña/token. Esa cuenta permanece en la base local porque no existe endpoint de eliminación de usuarios. La FAQ de prueba se elimina mediante la API en la limpieza. No se borran datos ajenos.

La prueba de navegador usa login real de Admin, crea/actualiza/elimina su propia FAQ y comprueba que una FAQ inactiva no aparezca en ayuda pública. Las capturas se guardan en `/tmp/opencode/nexus-real-browser/` por defecto. No se interceptan los endpoints ni se activa la demo; solo se bloquean fuentes remotas opcionales para reproducibilidad.

Los tokens de las pruebas se mantienen en memoria; la SPA no los guarda en localStorage. El JWT del servidor se configura mediante variable de entorno, no en el navegador.

## Conectar IA

**Decisión actual del usuario: solo API y base de datos por ahora.** No ejecutar la opción `--ai` ni enviar mensajes desde el chat hasta autorizar/configurar el proveedor. La integración de respaldo original permanece en el código, por lo que pulsar Enviar podría intentar llamar a Pollinations aunque no se haya configurado Gemini/OpenAI.

Falta que el usuario elija proveedor y configure su clave de forma local. Para OpenAI:

```text
NEXUS_AI_PROVIDER=OpenAI
NEXUS_AI_URL=https://api.openai.com/v1/chat/completions
NEXUS_AI_KEY=clave local válida
```

No publicar la clave. Después de editar el archivo local, recrear únicamente la API:

```sh
docker compose --env-file "$HOME/.config/nexusai/real.env" -f compose.real.yml up -d --no-deps --force-recreate api
```

El backend usa Pollinations como respaldo cuando falta una clave personalizada. No interpretar una respuesta genérica o HTTP 200 como prueba de que Gemini/OpenAI funcionó.

Una vez configurado/autorizado el envío externo:

```sh
npm run test:real -- --ai
```

Ese comando sí envía una consulta y el contexto de FAQs al proveedor del backend, y deja el intercambio de prueba persistido en PostgreSQL. Usar solo datos sintéticos.

## Detener sin borrar datos

```sh
docker compose --env-file "$HOME/.config/nexusai/real.env" -f compose.real.yml stop
```

No usar `down -v` salvo que se quiera eliminar explícitamente toda la base de desarrollo.

## Resultados de esta ejecución

Entorno arrancado y accesible en **http://localhost:5080**, con la API publicada solo en loopback y PostgreSQL en la red interna de Compose.

| Comprobación ejecutada | Resultado |
|---|---|
| Compilación .NET 8 con `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.10 dentro de Docker | Correcto |
| Arranque de PostgreSQL 17 | Healthy |
| Migración `20261120160314_InitialCreate` aplicada automáticamente | Correcta |
| Seeder sobre PostgreSQL | 2 usuarios, 5 preguntas, 5 respuestas, 0 conversaciones |
| `npm run test:real` | **20 verificaciones aprobadas** |
| `npm run test:real:browser` | **Flujo completo aprobado**, sin excepciones JavaScript |
| `npm test` (navegador + unitarias, con API simulada) | **33/33 aprobadas** |
| Paquete `database/supabase/` cargado en un PostgreSQL 17 limpio | **Correcto** |
| API apuntando a esa base importada | 5 FAQs servidas, login Admin 200, sin duplicar el seeder |
| `git diff --check` y sintaxis de scripts | Sin errores |
| Proveedor IA real / envío válido de mensajes | **No ejecutado**, por decisión del usuario |

Cobertura HTTP real: frontend y bibliotecas servidos por ASP.NET, FAQs públicas activas, login inválido 401, login Admin/User, registro 201 y duplicado 409, imposibilidad de escalar a Admin mediante registro, mutación anónima 401/User 403, CRUD Admin, exclusión de FAQs inactivas para visitante/User y validación 400 de mensajes mayores de 1500 caracteres sin invocar IA. Se comprobó también el historial vacío de una sesión nueva.

Cobertura del navegador real: modo `api` (no demo), JWT en memoria y ausente de localStorage, login/logout, alta/edición/eliminación persistida de FAQ y exclusión de inactivas en ayuda pública. Solo se interceptaron fuentes opcionales, nunca `/api`. Capturas en `/tmp/opencode/nexus-real-browser/real-chat.png` y `real-admin-faq.png`.

Estado de la base tras las pruebas:

- Base `NexusAI_Real_Dev`, PostgreSQL 17.11.
- Migración aplicada: `20261120160314_InitialCreate`, versión de producto 8.0.10.
- Usuarios: 2 del seeder más las cuentas `@example.test` creadas por las pruebas HTTP.
- Preguntas: 5; respuestas: 5. Las FAQs temporales de las pruebas se eliminaron.
- Conversaciones: 0. La validación no envió mensajes al proveedor.

La persistencia se comprobó por lectura real de API y consulta directa con `psql`. El volumen está configurado; no se hizo una prueba de reinicio completo de la máquina. Tampoco se validó TLS/producción, carga, expiración temporal real de JWT ni disponibilidad de proveedores IA. Los resultados de la suite con API simulada no se presentan como pruebas del servidor.

## Cambios respecto a la etapa SQL Server

- `ChatbotApi.csproj`: `Microsoft.EntityFrameworkCore.SqlServer` → `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.10.
- `Program.cs`: `UseSqlServer` → `UseNpgsql`.
- `Data/ApplicationDbContext.cs`: valores por defecto `GETUTCDATE()` → `now()` (PostgreSQL).
- `Migrations/`: nueva migración `20261120160314_InitialCreate` para Npgsql; se retiró la de SQL Server.
- `compose.real.yml`: servicio `sql` (SQL Server) → `db` (PostgreSQL 17), volumen `pg-data`.
- `appsettings.json`: cadena de conexión de ejemplo en formato Npgsql.
- No se modificaron controladores, DTO, servicios, reglas de autorización, JWT ni la integración de IA.

El volumen anterior `nexusai-real-dev_sql-data` se conserva intacto; no se borró. La base SQL Server antigua puede eliminarse cuando ya no se necesite.

## Supabase

`database/supabase/` contiene el esquema y los datos iniciales en PostgreSQL para cargar en Supabase (SQL Editor o `psql`), además de la cadena de conexión que debe usarse en Railway. Ver `database/supabase/README.md`.
