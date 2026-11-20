# Base de datos NexusAI para Supabase

NexusAI usa ahora **PostgreSQL** (EF Core + Npgsql). Esta carpeta contiene el esquema y los datos iniciales para crear la base en **Supabase**, listos para pegar en el SQL Editor.

El esquema corresponde a la migración `Migrations/20261120160314_InitialCreate.cs`, generada por EF Core 8.0.10 para Npgsql, y los datos son los del seeder `Data/DbInitializer.cs` ejecutado contra PostgreSQL 17.

## Contenido

| Archivo | Qué hace |
|---|---|
| `01_esquema.sql` | Crea `Usuarios`, `Preguntas`, `Respuestas`, `Conversaciones` y la tabla de historial de EF, con claves, índices y relaciones. **Borra las tablas si ya existen.** |
| `02_datos.sql` | Inserta las filas iniciales, marca la migración como aplicada y sincroniza las secuencias de identidad. |
| `03_verificacion.sql` | Consultas de conteo e integridad para comprobar la carga. |

Filas incluidas: **2 usuarios, 5 preguntas, 5 respuestas y 0 conversaciones**. Se excluyeron las cuentas `@example.test` que crean las pruebas automáticas.

## Cargar en Supabase

### Opción A · SQL Editor (recomendada)

1. Entra al proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Pega el contenido completo de `01_esquema.sql` y pulsa **Run**.
3. Repite con `02_datos.sql`.
4. Ejecuta `03_verificacion.sql` y comprueba los conteos.

### Opción B · psql

En Supabase: **Project Settings → Database → Connection string → URI**.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/supabase/01_esquema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/supabase/02_datos.sql
psql "$DATABASE_URL" -f database/supabase/03_verificacion.sql
```

La contraseña y la cadena de conexión **no deben guardarse en el repositorio**.

## Verificación esperada

```
usuarios | preguntas | respuestas | conversaciones
---------+-----------+------------+----------------
       2 |         5 |          5 |              0
```

Además:
- `__EFMigrationsHistory` debe tener 1 fila: `20261120160314_InitialCreate`.
- `Usuarios` conserva los roles `Admin` y `User`.
- `Respuestas` mantiene tildes, `¿?` y comillas escapadas.
- `Conversaciones` está vacía (inicio limpio).

## Conectar la API a Supabase

El backend ya usa Npgsql, así que **solo hay que cambiar la cadena de conexión** mediante la variable de entorno `ConnectionStrings__DefaultConnection` (en Railway: *Variables*; en local: archivo de entorno o `appsettings.Development.json`).

Npgsql **no acepta el formato URI** de Supabase (`postgresql://...`); hay que usar pares `clave=valor`:

```text
Host=db.<proyecto>.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=<contraseña>;SSL Mode=Require
```

Si usas el *pooler* de Supabase (puerto `6543`), el usuario incluye el proyecto:

```text
Host=aws-0-<región>.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.<proyecto>;Password=<contraseña>;SSL Mode=Require
```

Notas:
- La base de Supabase se llama `postgres` y el esquema es `public`; no cambies `Database=postgres`.
- `SSL Mode=Require` es obligatorio: Supabase no acepta conexiones sin TLS.
- Al arrancar, la API aplica `Database.MigrateAsync()`. Como `02_datos.sql` registra la migración en `__EFMigrationsHistory`, **no intentará recrear tablas**; si la base está vacía, la crea y siembra sola.
- El destino recomendado en producción es la conexión directa o el *session pooler* (puerto `5432`). El *transaction pooler* (`6543`) puede fallar con EF si se habilitan sentencias preparadas.

## Seguridad en Supabase

- Si expones estas tablas por la API REST de Supabase con la clave `anon`, activa **Row Level Security** y define políticas. Sin RLS, cualquiera con la clave pública puede leer `Usuarios`, incluidos los hashes de contraseña.
- La API .NET se conecta con la cadena de Postgres y no pasa por RLS; la clave `service_role` también las omite y **nunca** debe usarse en el frontend.
- No subas la cadena de conexión ni la contraseña al repositorio.
- Estas tablas son datos de **desarrollo**, no de producción.

## Origen y validación

- Esquema: migración EF Core 8.0.10 generada para `Npgsql.EntityFrameworkCore.PostgreSQL`.
- Datos: PostgreSQL 17 del entorno Docker (`NexusAI_Real_Dev`), tras migrar y sembrar con la API.
- Validado sobre un **PostgreSQL 17 limpio**: carga de `01` + `02`, conteos, integridad referencial, `uuid`, fechas UTC y secuencias de identidad.
- Validado también de extremo a extremo: una instancia de la API apuntando a esa base importada sirvió las 5 FAQs, permitió el login de `admin@chatbot.com` y **no duplicó** el seeder ni recreó tablas.
