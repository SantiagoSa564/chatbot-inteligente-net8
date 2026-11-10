using ChatbotApi.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatbotApi.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(ApplicationDbContext context)
        {
            // Asegura que la base de datos y las migraciones estén aplicadas
            await context.Database.MigrateAsync();

            // 1. Seed de Usuarios (Admin y Usuario de prueba)
            if (!await context.Usuarios.AnyAsync())
            {
                var usuariosIniciales = new List<Usuario>
                {
                    new Usuario
                    {
                        Nombre = "Administrador Principal",
                        Email = "admin@chatbot.com",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                        Rol = "Admin",
                        FechaCreacion = DateTime.UtcNow
                    },
                    new Usuario
                    {
                        Nombre = "Usuario Demo",
                        Email = "usuario@chatbot.com",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("User123!"),
                        Rol = "User",
                        FechaCreacion = DateTime.UtcNow
                    }
                };

                await context.Usuarios.AddRangeAsync(usuariosIniciales);
                await context.SaveChangesAsync();
            }

            // 2. Seed de Preguntas Frecuentes (FAQs) y sus Respuestas
            if (!await context.Preguntas.AnyAsync())
            {
                var faqsIniciales = new List<Pregunta>
                {
                    new Pregunta
                    {
                        TextoPregunta = "¿Cuáles son los horarios de atención al cliente?",
                        Categoria = "Información General",
                        EstadoActivo = true,
                        Respuestas = new List<Respuesta>
                        {
                            new Respuesta
                            {
                                TextoRespuesta = "Nuestro horario de atención con asesores humanos es de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Nuestro asistente virtual está disponible las 24 horas del día.",
                                UltimaActualizacion = DateTime.UtcNow
                            }
                        }
                    },
                    new Pregunta
                    {
                        TextoPregunta = "¿Cómo puedo restablecer mi contraseña?",
                        Categoria = "Cuenta y Acceso",
                        EstadoActivo = true,
                        Respuestas = new List<Respuesta>
                        {
                            new Respuesta
                            {
                                TextoRespuesta = "Para restablecer su contraseña, diríjase a la pantalla de inicio de sesión, seleccione '¿Olvidó su contraseña?' e ingrese su correo electrónico registrado. Recibirá un enlace temporal para crear una nueva clave.",
                                UltimaActualizacion = DateTime.UtcNow
                            }
                        }
                    },
                    new Pregunta
                    {
                        TextoPregunta = "¿Cuáles son los medios de pago aceptados?",
                        Categoria = "Pagos y Facturación",
                        EstadoActivo = true,
                        Respuestas = new List<Respuesta>
                        {
                            new Respuesta
                            {
                                TextoRespuesta = "Aceptamos tarjetas de crédito (Visa, MasterCard, American Express), tarjetas débito a través de PSE y transferencias bancarias directas.",
                                UltimaActualizacion = DateTime.UtcNow
                            }
                        }
                    },
                    new Pregunta
                    {
                        TextoPregunta = "¿En cuánto tiempo se procesa un reembolso?",
                        Categoria = "Pagos y Facturación",
                        EstadoActivo = true,
                        Respuestas = new List<Respuesta>
                        {
                            new Respuesta
                            {
                                TextoRespuesta = "Una vez aprobada la solicitud de reembolso, el reintegro del dinero toma entre 5 y 10 días hábiles dependiendo de su entidad financiera.",
                                UltimaActualizacion = DateTime.UtcNow
                            }
                        }
                    },
                    new Pregunta
                    {
                        TextoPregunta = "¿Cómo puedo radicar una petición, queja o reclamo (PQR)?",
                        Categoria = "Soporte y PQR",
                        EstadoActivo = true,
                        Respuestas = new List<Respuesta>
                        {
                            new Respuesta
                            {
                                TextoRespuesta = "Puede radicar una PQR desde la sección 'Centro de Ayuda -> Radicar PQR' en nuestro portal web, o enviando un correo electrónico detallado a soporte@chatbot.com. Recibirá un número de radicado con respuesta en un plazo máximo de 15 días hábiles.",
                                UltimaActualizacion = DateTime.UtcNow
                            }
                        }
                    }
                };

                await context.Preguntas.AddRangeAsync(faqsIniciales);
                await context.SaveChangesAsync();
            }
        }
    }
}
