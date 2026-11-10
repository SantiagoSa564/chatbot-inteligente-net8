using System.Security.Claims;
using ChatbotApi.Data;
using ChatbotApi.DTOs.Chat;
using ChatbotApi.Models.Entities;
using ChatbotApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatbotApi.Controllers
{
    [ApiController]
    [Route("api/chat")]
    public class ChatController : ControllerBase
    {
        private readonly IAiIntegrationService _aiService;
        private readonly ApplicationDbContext _context;

        public ChatController(IAiIntegrationService aiService, ApplicationDbContext context)
        {
            _aiService = aiService;
            _context = context;
        }

        /// <summary>
        /// Envía un mensaje al Chatbot, consulta el LLM con el contexto de FAQs y guarda el historial en BD.
        /// Soporta tanto usuarios autenticados (vía JWT) como usuarios anónimos (vía SessionId).
        /// </summary>
        [HttpPost("send")]
        [AllowAnonymous]
        public async Task<IActionResult> SendMessage([FromBody] ChatRequestDto requestDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 1. Determinar SessionId (usar el enviado o generar uno nuevo si es el primer mensaje)
            Guid sessionId = (requestDto.SessionId.HasValue && requestDto.SessionId.Value != Guid.Empty)
                ? requestDto.SessionId.Value
                : Guid.NewGuid();

            // 2. Extraer el UsuarioId del token JWT si el usuario está autenticado
            int? usuarioId = null;
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int parsedUserId))
            {
                usuarioId = parsedUserId;
            }

            // 3. Llamar al servicio de IA para generar la respuesta basada en FAQs activas
            string preguntaLimpia = requestDto.Mensaje.Trim();
            string respuestaBot = await _aiService.GenerateResponseAsync(preguntaLimpia);

            // 4. Registrar la interacción en la tabla Conversaciones
            var nuevaConversacion = new Conversacion
            {
                SessionId = sessionId,
                UsuarioId = usuarioId,
                PreguntaUsuario = preguntaLimpia,
                RespuestaBot = respuestaBot,
                Timestamp = DateTime.UtcNow
            };

            _context.Conversaciones.Add(nuevaConversacion);
            await _context.SaveChangesAsync();

            // 5. Retornar el DTO al cliente
            var responseDto = new ChatResponseDto
            {
                ConversacionId = nuevaConversacion.Id,
                SessionId = nuevaConversacion.SessionId,
                UsuarioId = nuevaConversacion.UsuarioId,
                PreguntaUsuario = nuevaConversacion.PreguntaUsuario,
                RespuestaBot = nuevaConversacion.RespuestaBot,
                Timestamp = nuevaConversacion.Timestamp
            };

            return Ok(responseDto);
        }

        /// <summary>
        /// Obtiene el historial de mensajes de una sesión específica ordenado cronológicamente.
        /// </summary>
        [HttpGet("history/{sessionId:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetHistoryBySession(Guid sessionId)
        {
            var historial = await _context.Conversaciones
                .AsNoTracking()
                .Where(c => c.SessionId == sessionId)
                .OrderBy(c => c.Timestamp)
                .Select(c => new ChatResponseDto
                {
                    ConversacionId = c.Id,
                    SessionId = c.SessionId,
                    UsuarioId = c.UsuarioId,
                    PreguntaUsuario = c.PreguntaUsuario,
                    RespuestaBot = c.RespuestaBot,
                    Timestamp = c.Timestamp
                })
                .ToListAsync();

            return Ok(historial);
        }
    }
}
