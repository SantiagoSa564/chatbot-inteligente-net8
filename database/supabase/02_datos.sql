-- ============================================================================
-- NexusAI · Datos exportados del entorno real local
-- Origen : SQL Server 2022 (NexusAI_Real_Dev), volcado con sqlcmd
-- Destino: PostgreSQL 17 (Supabase)
-- Fecha  : 2026-11-20
--
-- Uso: ejecutar completo en el SQL Editor de Supabase DESPUÉS de 01_esquema.sql.
-- Los literales de fecha se interpretan como UTC porque así se guardaron en el
-- backend (DateTime.UtcNow).
-- ============================================================================

set time zone 'UTC';

begin;

-- Usuarios
INSERT INTO "Usuarios" ("Id","Nombre","Email","PasswordHash","Rol","FechaCreacion") VALUES (1, 'Administrador Principal', 'admin@chatbot.com', '$2a$11$98iVUdcPEwWjUnR4oFSjsub02CJFzhWf1iRVXZNd7b83HCpcIHN9G', 'Admin', '2026-11-20 14:34:47');
INSERT INTO "Usuarios" ("Id","Nombre","Email","PasswordHash","Rol","FechaCreacion") VALUES (2, 'Usuario Demo', 'usuario@chatbot.com', '$2a$11$HzkyTkTXWDiJlmz23BzhOu0J/o.k4WAXYJztuT7O1qb5Munv7gKCa', 'User', '2026-11-20 14:34:47');
INSERT INTO "Usuarios" ("Id","Nombre","Email","PasswordHash","Rol","FechaCreacion") VALUES (3, 'Prueba integración local', 'integration-83fd08d2-1205-4edb-9489-c3d58f796be3@example.test', '$2a$11$r0PAEtuwM4GxiE7Id7uWk.gb7yt9B4K5dWJ2K7rKx5x5vbV8j88Rq', 'User', '2026-11-20 14:34:51');
INSERT INTO "Usuarios" ("Id","Nombre","Email","PasswordHash","Rol","FechaCreacion") VALUES (4, 'Prueba integración local', 'integration-caa885ec-2095-467d-b64f-38d9c758a429@example.test', '$2a$11$t.7Cu/dwqUHWn0Io8Njv0OqyMRC.XtnK.qw1EcQVEiUAS84GtQZtq', 'User', '2026-11-20 14:35:28');
-- Preguntas
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (1, '¿Cuáles son los horarios de atención al cliente?', 'Información General', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (2, '¿Cómo puedo restablecer mi contraseña?', 'Cuenta y Acceso', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (3, '¿Cuáles son los medios de pago aceptados?', 'Pagos y Facturación', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (4, '¿En cuánto tiempo se procesa un reembolso?', 'Pagos y Facturación', true);
INSERT INTO "Preguntas" ("Id","TextoPregunta","Categoria","EstadoActivo") VALUES (5, '¿Cómo puedo radicar una petición, queja o reclamo (PQR)?', 'Soporte y PQR', true);
-- Respuestas
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (1, 1, 'Nuestro horario de atención con asesores humanos es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Nuestro asistente virtual está disponible las 24 horas del día.', '2026-11-20 14:34:48');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (2, 2, 'Para restablecer su contraseña, diríjase a la pantalla de inicio de sesión, seleccione ''¿Olvidó su contraseña?'' e ingrese su correo electrónico registrado. Recibirá un enlace temporal para crear una nueva clave.', '2026-11-20 14:34:48');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (3, 3, 'Aceptamos tarjetas de crédito (Visa, MasterCard, American Express), tarjetas débito a través de PSE y transferencias bancarias directas.', '2026-11-20 14:34:48');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (4, 4, 'Una vez aprobada la solicitud de reembolso, el reintegro del dinero toma entre 5 y 10 días hábiles dependiendo de su entidad financiera.', '2026-11-20 14:34:48');
INSERT INTO "Respuestas" ("Id","PreguntaId","TextoRespuesta","UltimaActualizacion") VALUES (5, 5, 'Puede radicar una PQR desde la sección ''Centro de Ayuda -> Radicar PQR'' en nuestro portal web, o enviando un correo electrónico detallado a soporte@chatbot.com. Recibirá un número de radicado con respuesta en un plazo máximo de 15 días hábiles.', '2026-11-20 14:34:48');
-- Conversaciones
INSERT INTO "Conversaciones" ("Id","SessionId","UsuarioId","PreguntaUsuario","RespuestaBot","Timestamp") VALUES (1, '314AD89C-89B3-4C17-A2C3-D96524EDA29F', NULL, E'¿Cuáles son los medios de pago aceptados?', E'¡Hola! 👋  \nLos medios de pago que aceptamos son:\n\n- **Tarjetas de crédito**: Visa, MasterCard, American Express  \n- **Tarjetas de débito** a través de PSE  \n- **Transferencias bancarias directas**\n\nSi necesitas más información o ayuda con algún proceso de pago, no dudes en decirme. También estoy aquí para asistirte con cualquier otra consulta sobre nuestros servicios.', '2026-11-20 14:41:15');
INSERT INTO "Conversaciones" ("Id","SessionId","UsuarioId","PreguntaUsuario","RespuestaBot","Timestamp") VALUES (2, '6E6DC1EA-0324-43EB-B874-46FB365403C4', NULL, E'¿Cuáles son los horarios de atención al cliente?', E'Hola, estoy disponible para atender sus inquietudes. ¿En qué puedo colaborarle hoy?', '2026-11-20 14:41:25');

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
