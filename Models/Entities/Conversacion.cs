using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatbotApi.Models.Entities
{
    public class Conversacion
    {
        public int Id { get; set; }

        [Required]
        public Guid SessionId { get; set; }

        // FK Opcional (permite usuarios anónimos o autenticados)
        public int? UsuarioId { get; set; }

        [Required]
        public string PreguntaUsuario { get; set; } = string.Empty;

        [Required]
        public string RespuestaBot { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        // Propiedad de navegación opcional
        [ForeignKey(nameof(UsuarioId))]
        public Usuario? Usuario { get; set; }
    }
}
