-- ============================================================================
-- NexusAI · Verificación de la carga en Supabase
-- Ejecutar después de 01_esquema.sql y 02_datos.sql.
-- Resultado esperado: 4 usuarios, 5 preguntas, 5 respuestas, 2 conversaciones.
-- ============================================================================

select
    (select count(*) from "Usuarios")       as usuarios,
    (select count(*) from "Preguntas")      as preguntas,
    (select count(*) from "Respuestas")     as respuestas,
    (select count(*) from "Conversaciones") as conversaciones;

-- Cada pregunta debe tener exactamente una respuesta en este conjunto
select p."Id", p."Categoria", p."EstadoActivo", count(r."Id") as respuestas
from "Preguntas" p
left join "Respuestas" r on r."PreguntaId" = p."Id"
group by p."Id", p."Categoria", p."EstadoActivo"
order by p."Id";

-- Roles conservados
select "Rol", count(*) as cuentas from "Usuarios" group by "Rol" order by "Rol";

-- Integridad referencial
select count(*) as respuestas_huerfanas
from "Respuestas" r
left join "Preguntas" p on p."Id" = r."PreguntaId"
where p."Id" is null;

select count(*) as conversaciones_huerfanas
from "Conversaciones" c
left join "Usuarios" u on u."Id" = c."UsuarioId"
where c."UsuarioId" is not null and u."Id" is null;
