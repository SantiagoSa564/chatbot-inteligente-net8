using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChatbotApi.Models.Entities
{
    public class Respuesta
    {
        public int Id { get; set; }

        [Required]
        public int PreguntaId { get; set; }

        [Required]
        public string TextoRespuesta { get; set; } = string.Empty;

        public DateTime UltimaActualizacion { get; set; } = DateTime.UtcNow;

        // Propiedad de navegación hacia la tabla padre
        [ForeignKey(nameof(PreguntaId))]
        public Pregunta Pregunta { get; set; } = null!;
    }
}
