using System.ComponentModel.DataAnnotations;

namespace ChatbotApi.Models.Entities
{
    public class Pregunta
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string TextoPregunta { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Categoria { get; set; } = string.Empty;

        public bool EstadoActivo { get; set; } = true;

        // Propiedad de navegación (1 Pregunta -> N Respuestas)
        public ICollection<Respuesta> Respuestas { get; set; } = new List<Respuesta>();
    }
}
