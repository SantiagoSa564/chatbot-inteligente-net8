using System.ComponentModel.DataAnnotations;

namespace ChatbotApi.DTOs.Chat
{
    public class ChatRequestDto
    {
        /// <summary>
        /// Identificador de la sesión de conversación. Si no se envía, el servidor generará uno nuevo.
        /// </summary>
        public Guid? SessionId { get; set; }

        [Required(ErrorMessage = "El mensaje no puede estar vacío.")]
        [MaxLength(1500, ErrorMessage = "El mensaje no puede exceder los 1500 caracteres.")]
        public string Mensaje { get; set; } = string.Empty;
    }

    public class ChatResponseDto
    {
        public int ConversacionId { get; set; }
        public Guid SessionId { get; set; }
        public int? UsuarioId { get; set; }
        public string PreguntaUsuario { get; set; } = string.Empty;
        public string RespuestaBot { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
