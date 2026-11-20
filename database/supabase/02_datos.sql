-- ============================================================================
-- NexusAI · Datos iniciales para PostgreSQL (Supabase)
-- Origen : base PostgreSQL 17 del entorno Docker (NexusAI_Real_Dev), ya migrada
--          por EF Core y sembrada por Data/DbInitializer.cs
-- Destino: PostgreSQL 17 (Supabase)
-- Fecha  : 2026-11-20
--
-- Uso: ejecutar completo en el SQL Editor de Supabase DESPUÉS de 01_esquema.sql.
-- Contenido: 2 usuarios del seeder, 5 preguntas, 5 respuestas y 0 conversaciones.
-- Las cuentas @example.test de las pruebas automáticas se excluyeron a propósito.
-- Las fechas son UTC.
-- ============================================================================

set time zone 'UTC';

begin;

-- Usuarios
INSERT INTO "Usuarios" ("Id","Nombre","Email","PasswordHash","Rol","FechaCreacion") VALUES (1, 'Administrador Principal', 'admin@chatbot.com', '$2a$11$f4IBJGZNuKG/65A0ZOk5LewJ6rO3xM2rkq.RL9/coLT/lGbjZREQq', 'Admin', '2026-11-20 16:11:00');
INSERT INTO "Usuarios" ("Id","Nombre","Email","PasswordHash","Rol","FechaCreacion") VALUES (2, 'Usuario Demo', 'usuario@chatbot.com', '$2a$11$W7aZ.hGA84f5s9kzPGZa/.vBAisDSPyjStggUdYbb8c/nzg2mLAMO', 'User', '2026-11-20 16:11:01');
-- Preguntas
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (1, '¿Cuáles son los horarios de atención al cliente?', 'Información General', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (2, '¿Cómo puedo restablecer mi contraseña?', 'Cuenta y Acceso', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (3, '¿Cuáles son los medios de pago aceptados?', 'Pagos y Facturación', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (4, '¿En cuánto tiempo se procesa un reembolso?', 'Pagos y Facturación', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (5, '¿Cómo puedo radicar una petición, queja o reclamo (PQR)?', 'Soporte y PQR', true);
-- Respuestas
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (1, 1, 'Nuestro horario de atención con asesores humanos es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Nuestro asistente virtual está disponible las 24 horas del día.', '2026-11-20 16:11:01');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (2, 2, 'Para restablecer su contraseña, diríjase a la pantalla de inicio de sesión, seleccione ''¿Olvidó su contraseña?'' e ingrese su correo electrónico registrado. Recibirá un enlace temporal para crear una nueva clave.', '2026-11-20 16:11:01');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (3, 3, 'Aceptamos tarjetas de crédito (Visa, MasterCard, American Express), tarjetas débito a través de PSE y transferencias bancarias directas.', '2026-11-20 16:11:01');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (4, 4, 'Una vez aprobada la solicitud de reembolso, el reintegro del dinero toma entre 5 y 10 días hábiles dependiendo de su entidad financiera.', '2026-11-20 16:11:01');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (5, 5, 'Puede radicar una PQR desde la sección ''Centro de Ayuda -> Radicar PQR'' en nuestro portal web, o enviando un correo electrónico detallado a soporte@chatbot.com. Recibirá un número de radicado con respuesta en un plazo máximo de 15 días hábiles.', '2026-11-20 16:11:01');
-- Conversaciones

-- ---------------------------------------------------------------------------
-- Marca la migración de EF Core como aplicada: la API arranca sin intentar
-- volver a crear las tablas (el Id debe coincidir con Migrations/).
-- ---------------------------------------------------------------------------
insert into "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
values ('20261120160314_InitialCreate', '8.0.10')
on conflict ("MigrationId") do nothing;

-- ---------------------------------------------------------------------------
-- Sincroniza las secuencias de identidad con los Id importados
-- ---------------------------------------------------------------------------
select setval(pg_get_serial_sequence('"Usuarios"', 'Id'),
              coalesce((select max("Id") from "Usuarios"), 1),
              (select max("Id") from "Usuarios") is not null);

select setval(pg_get_serial_sequence('"Preguntas"', 'Id'),
              coalesce((select max("Id") from "Preguntas"), 1),
              (select max("Id") from "Preguntas") is not null);

select setval(pg_get_serial_sequence('"Respuestas"', 'Id'),
              coalesce((select max("Id") from "Respuestas"), 1),
              (select max("Id") from "Respuestas") is not null);

select setval(pg_get_serial_sequence('"Conversaciones"', 'Id'),
              coalesce((select max("Id") from "Conversaciones"), 1),
              (select max("Id") from "Conversaciones") is not null);

commit;
