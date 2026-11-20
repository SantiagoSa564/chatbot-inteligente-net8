# Base de datos NexusAI para Supabase

Copia de la base **SQL Server** del proyecto (`NexusAI_Real_Dev`) convertida a **PostgreSQL**, lista para cargarse en Supabase. El esquema es equivalente al de `Migrations/20261110000000_InitialCreate.cs` y los datos provienen del entorno real local del 20/11/2026.

## Contenido

| Archivo | Qué hace |
|---|---|
| `01_esquema.sql` | Crea las tablas `Usuarios`, `Preguntas`, `Respuestas` y `Conversaciones`, con claves, índices y relaciones. **Borra las tablas si ya existen.** |
| `02_datos.sql` | Inserta las filas exportadas y sincroniza las secuencias de identidad. |
| `03_verificacion.sql` | Consultas de conteo para comprobar la carga. |

Filas incluidas: **4 usuarios, 5 preguntas, 5 respuestas y 2 conversaciones**.

## Cómo cargarlo en Supabase

### Opción A · SQL Editor (recomendada)

1. Entra al proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Pega el contenido completo de `01_esquema.sql` y pulsa **Run**.
3. Repite con `02_datos.sql`.
4. Ejecuta `03_verificacion.sql` para confirmar los conteos.

### Opción B · psql

En Supabase: **Project Settings → Database → Connection string → URI**.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/supabase/01_esquema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/supabase/02_datos.sql
psql "$DATABASE_URL" -f database/supabase/03_verificacion.sql
```

La contraseña de la base y la cadena de conexión **no deben guardarse en el repositorio**. Este paquete no contiene credenciales.

## Verificación esperada

```
usuarios | preguntas | respuestas | conversaciones
---------+-----------+------------+----------------
       4 |         5 |          5 |              2
```

También puedes comprobar en **Table Editor** que:
- `Usuarios` conserva los roles `Admin` y `User`.
- `Respuestas` mantiene tildes, `¿?`, comillas escapadas y el texto de varias líneas de `Conversaciones`.
- `Conversaciones.SessionId` es `uuid` y `Timestamp` está en UTC.

## Datos que puedes descartar

- **Usuarios 3 y 4** (`integration-...@example.test`): cuentas creadas por las pruebas automáticas de integración. Se pueden eliminar.
- **Conversaciones**: 2 mensajes reales generados durante las pruebas del chat. Si quieres iniciar limpio:

```sql
truncate table "Conversaciones" restart identity;
```

Las contraseñas se conservan como hash **BCrypt**, el mismo formato que usa .NET, así que las cuentas `admin@chatbot.com` (`Admin123!`) y `usuario@chatbot.com` (`User123!`) siguen siendo válidas si la API llega a usar esta base.

## Importante: cargar los datos no conecta la API a Supabase

El backend actual (`ChatbotApi.csproj`) usa **Entity Framework Core con el proveedor SQL Server**:

```xml
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" ... />
```

Cargar este paquete en Supabase **no cambia el comportamiento de la aplicación**: la API seguirá leyendo y escribiendo en SQL Server. Para que NexusAI use Supabase de verdad hay que cambiar el proveedor de EF a **Npgsql** (paquete, cadena de conexión y regenerar las migraciones), lo que implica modificar el backend. Ese cambio **no se ha hecho** porque el alcance acordado excluye tocar el backend; queda pendiente de tu aprobación explícita.

## Seguridad en Supabase

- Si expones estas tablas por la **API REST de Supabase** con la clave `anon`, activa **Row Level Security** y define políticas. Con RLS desactivado, cualquiera con la clave pública puede leer `Usuarios`, incluidos los hashes de contraseña.
- La API .NET se conecta por cadena de conexión con el rol de base de datos y no pasa por RLS; la clave `service_role` también las omite y **nunca** debe usarse en el frontend.
- Estas tablas son datos de **desarrollo**, no de producción.

## Origen y método

- Origen: contenedor `nexusai-real-dev-sql-1` (SQL Server 2022 Developer), base `NexusAI_Real_Dev`.
- Exportación: `sqlcmd` generando `INSERT` con comillas simples escapadas; fechas convertidas a ISO y fijadas como UTC (`set time zone 'UTC'`).
- Validación: los dos scripts se ejecutaron sobre **PostgreSQL 17** real. Se comprobó el conteo de filas, las tildes, las comillas escapadas, los saltos de línea, los `uuid`, las fechas UTC, el avance de las secuencias de identidad y el borrado en cascada de `Respuestas`.
