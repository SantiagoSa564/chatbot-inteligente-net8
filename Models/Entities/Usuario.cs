using System.ComponentModel.DataAnnotations;

namespace ChatbotApi.Models.Entities
{
    public class Usuario
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Rol { get; set; } = "User"; // "Admin" | "User"

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        // Propiedad de navegación (1 Usuario -> N Conversaciones)
        public ICollection<Conversacion> Conversaciones { get; set; } = new List<Conversacion>();
    }
}
