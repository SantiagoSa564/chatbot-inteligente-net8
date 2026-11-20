# Ejecución real local de NexusAI

Entorno de desarrollo aislado con Docker Compose: .NET 8 + SQL Server 2022 Developer. No es configuración de producción. No modifica el backend ni sus endpoints, EF o JWT.

## Archivos

- `deploy/Dockerfile`: compila con el SDK .NET 8 y publica en una imagen ASP.NET Core 8, ejecutada como usuario no root.
- `compose.real.yml`: SQL Server con volumen propio y API publicada exclusivamente en `127.0.0.1:5080`.
- `.dockerignore`: excluye Git, dependencias de Node, documentación y secretos del contexto de build.
- `scripts/verify-real.cjs`: prueba HTTP real de autenticación, roles y CRUD; IA opcional explícita.
- `scripts/verify-browser-real.cjs`: prueba Playwright contra el servidor real, sin interceptar `/api` ni activar demo.

La instancia SQL no publica su puerto al host. Base nueva: `NexusAI_Real_Dev`. Volumen de Compose: `nexusai-real-dev_sql-data`. No se usan ni modifican los demás contenedores del equipo.

## Secretos

Archivo local fuera del repositorio:

`/home/santiago/.config/nexusai/real.env`

Permisos `0600`. Contiene una contraseña SQL y firma JWT aleatorias; no copiarlo a Git, capturas ni chats. Mantenerlo junto con el volumen SQL si se reinician los contenedores: regenerar la contraseña no cambia la contraseña ya persistida en SQL Server.

Variables admitidas:

```text
NEXUS_SQL_PASSWORD=contraseña local de SQL
NEXUS_JWT_SECRET=secreto de firma local
NEXUS_HTTP_PORT=5080
NEXUS_AI_PROVIDER=Gemini
NEXUS_AI_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
NEXUS_AI_KEY=clave del proveedor
```

No copiar los valores descriptivos anteriores como credenciales. El archivo generado usa secretos aleatorios y conserva el placeholder de IA hasta que el usuario configure una clave válida. `docker inspect` o `docker compose config` sin `--quiet` pueden revelar variables: no publicar su salida. Para mayor aislamiento en producción hace falta un gestor de secretos y configuración específica; este despliegue es solo desarrollo local.

## Arrancar

Desde la raíz del proyecto:

```sh
docker compose --env-file "$HOME/.config/nexusai/real.env" -f compose.real.yml up --build -d --wait
```

Abrir **http://localhost:5080**. La interfaz y `/api` se sirven desde ASP.NET Core en el mismo origen. No iniciar el servidor estático de Python para las pruebas reales y no activar demo.

La primera ejecución aplica las migraciones/seeder existentes a la base nueva, tal como se autorizó. El seeder original crea cuentas de desarrollo conocidas (`admin@chatbot.com` y `usuario@chatbot.com`); consultar `Data/DbInitializer.cs` para sus contraseñas. No usar estos datos ni exponer este entorno como producción.

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

**Decisión actual del usuario: solo API y SQL por ahora.** No ejecutar la opción `--ai` ni enviar mensajes desde el chat hasta autorizar/configurar el proveedor. La integración de respaldo original permanece en el código, por lo que pulsar Enviar podría intentar llamar a Pollinations aunque no se haya configurado Gemini/OpenAI.

Falta que el usuario elija proveedor y configure su clave de forma local. Para Gemini se puede usar la URL/modelo de la configuración del entorno anterior; verificar que la cuenta y el modelo estén habilitados. Para OpenAI:

```text
NEXUS_AI_PROVIDER=OpenAI
NEXUS_AI_URL=https://api.openai.com/v1/chat/completions
NEXUS_AI_KEY=clave local válida
```

No publicar la clave. Después de editar el archivo local, recrear únicamente la API:

```sh
docker compose --env-file "$HOME/.config/nexusai/real.env" -f compose.real.yml up -d --no-deps --force-recreate api
```

El backend original usa Pollinations como respaldo cuando falta una clave personalizada. **No se ha cambiado esa integración.** No interpretar una respuesta genérica o HTTP 200 como prueba de que Gemini/OpenAI funcionó. Hasta configurar y autorizar el proveedor, no se envían consultas de prueba a terceros.

Una vez configurado/autorizado el envío externo:

```sh
npm run test:real -- --ai
```

Ese comando sí envía una consulta y el contexto de FAQs al proveedor del backend, y deja el intercambio de prueba persistido en SQL Server. Usar solo datos sintéticos. El contrato original puede devolver mensajes de error como HTTP 200; revisar la respuesta y la confirmación del proveedor antes de declarar la IA validada.

## Detener sin borrar datos

```sh
docker compose --env-file "$HOME/.config/nexusai/real.env" -f compose.real.yml stop
```

No usar `down -v` salvo que se quiera eliminar explícitamente toda la base de desarrollo.

## Resultados de esta ejecución

Entorno arrancado y accesible en **http://localhost:5080**, con la API publicada solo en loopback y SQL en la red interna de Compose.

| Comprobación ejecutada | Resultado |
|---|---|
| Descarga de imágenes, `dotnet restore` y `dotnet publish` Release dentro de Docker | Correcto, sin modificar código C# |
| Arranque SQL Server 2022 Developer | Healthy |
| Arranque API .NET 8 y lectura real `/api/faqs` | Correcto |
| `npm run test:real`, repetición final | **20 verificaciones aprobadas** |
| `npm run test:real:browser` | **Flujo completo aprobado**, sin excepciones JavaScript |
| Consulta directa mediante sqlcmd dentro del contenedor | Base, migración y tablas confirmadas |
| `npm run test:unit` en esta fase | **7/7 aprobadas** |
| Sintaxis de scripts, configuración Compose y `git diff --check` | Sin errores |
| Proveedor IA real / envío válido de mensajes | **No ejecutado**, por decisión del usuario |

La primera prueba HTTP se detuvo después del login de User porque el verificador asumía JSON en una respuesta 401 sin cuerpo. Se corrigió únicamente el script de pruebas para admitir desafíos JWT vacíos (401/403). La API no se modificó. La repetición completa pasó las 20 verificaciones.

Cobertura HTTP real: frontend y bibliotecas servidos por ASP.NET, FAQs públicas activas, login inválido 401, login Admin/User, registro 201 y duplicado 409, imposibilidad de escalar a Admin mediante registro, mutación anónima 401/User 403, CRUD Admin, exclusión de FAQs inactivas para visitante/User y validación 400 de mensajes mayores de 1500 caracteres sin invocar IA. Se comprobó también el historial vacío de una sesión nueva.

Cobertura del navegador real: modo `api` (no demo), JWT en memoria y ausente de localStorage, login/logout, alta/edición/eliminación persistida de FAQ y exclusión de inactivas en ayuda pública. Solo se interceptaron fuentes opcionales, nunca `/api`. Capturas revisadas en `/tmp/opencode/nexus-real-browser/real-chat.png` y `real-admin-sql.png`.

Consulta SQL final:

- Base: `NexusAI_Real_Dev`.
- Migración aplicada: `20261110000000_InitialCreate`.
- Usuarios: 4 (dos del seeder y dos cuentas de integración creadas en las dos ejecuciones HTTP).
- Preguntas: 5; respuestas: 5. Las FAQs temporales de las pruebas se eliminaron.
- Conversaciones: 0 en el momento de esta comprobación, porque la validación no envió mensajes. Después, al usar la aplicación, se generaron 2 conversaciones reales; no se auditó si las respondió el proveedor configurado o el respaldo del backend.

La persistencia se comprobó por lectura real de API y consulta directa a SQL. El volumen está configurado; no se hizo una prueba de reinicio completo de la máquina. Tampoco se validó TLS/producción, carga, expiración temporal real de JWT ni disponibilidad de proveedores IA. Los resultados de la suite de frontend con mocks de etapas anteriores no se presentan como pruebas del servidor.

## Exportación de la base a Supabase

`database/supabase/` contiene el volcado de esta base convertido a PostgreSQL: `01_esquema.sql` (DDL equivalente a la migración), `02_datos.sql` (4 usuarios, 5 preguntas, 5 respuestas y 2 conversaciones) y `03_verificacion.sql`. Los scripts se ejecutaron sobre un PostgreSQL 17 real: conteos, tildes, comillas escapadas, saltos de línea, `uuid`, fechas UTC, secuencias de identidad y borrado en cascada verificados. El paquete no incluye credenciales.

Cargarlo en Supabase **no conecta la API a Supabase**: el backend sigue usando el proveedor `Microsoft.EntityFrameworkCore.SqlServer`. Cambiarlo a Npgsql implicaría modificar el backend y no se ha hecho. Detalles y pasos en `database/supabase/README.md`.
