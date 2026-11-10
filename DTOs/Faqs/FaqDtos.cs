using System.ComponentModel.DataAnnotations;

namespace ChatbotApi.DTOs.Faqs
{
    public class RespuestaDto
    {
        public int Id { get; set; }
        public int PreguntaId { get; set; }
        public string TextoRespuesta { get; set; } = string.Empty;
        public DateTime UltimaActualizacion { get; set; }
    }

    public class FaqResponseDto
    {
        public int Id { get; set; }
        public string TextoPregunta { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public bool EstadoActivo { get; set; }
        public List<RespuestaDto> Respuestas { get; set; } = new();
    }

    public class CreateFaqDto
    {
        [Required(ErrorMessage = "El texto de la pregunta es obligatorio.")]
        [MaxLength(500)]
        public string TextoPregunta { get; set; } = string.Empty;

        [Required(ErrorMessage = "La categoría es obligatoria.")]
        [MaxLength(100)]
        public string Categoria { get; set; } = string.Empty;

        public bool EstadoActivo { get; set; } = true;

        [Required(ErrorMessage = "El texto de la respuesta inicial es obligatorio.")]
        public string TextoRespuesta { get; set; } = string.Empty;
    }

    public class UpdateFaqDto
    {
        [Required(ErrorMessage = "El texto de la pregunta es obligatorio.")]
        [MaxLength(500)]
        public string TextoPregunta { get; set; } = string.Empty;

        [Required(ErrorMessage = "La categoría es obligatoria.")]
        [MaxLength(100)]
        public string Categoria { get; set; } = string.Empty;

        public bool EstadoActivo { get; set; } = true;

        [Required(ErrorMessage = "El texto de la respuesta es obligatorio.")]
        public string TextoRespuesta { get; set; } = string.Empty;
    }
}
