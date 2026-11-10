using ChatbotApi.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatbotApi.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Pregunta> Preguntas { get; set; }
        public DbSet<Respuesta> Respuestas { get; set; }
        public DbSet<Conversacion> Conversaciones { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Configuración de Usuarios
            modelBuilder.Entity<Usuario>(entity =>
            {
                entity.ToTable("Usuarios");
                entity.HasKey(u => u.Id);
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.Rol).HasDefaultValue("User");
                entity.Property(u => u.FechaCreacion).HasDefaultValueSql("GETUTCDATE()");
            });

            // 2. Configuración de Preguntas
            modelBuilder.Entity<Pregunta>(entity =>
            {
                entity.ToTable("Preguntas");
                entity.HasKey(p => p.Id);
                entity.Property(p => p.EstadoActivo).HasDefaultValue(true);

                // Relación 1:N con Respuestas (Eliminación en cascada)
                entity.HasMany(p => p.Respuestas)
                      .WithOne(r => r.Pregunta)
                      .HasForeignKey(r => r.PreguntaId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // 3. Configuración de Respuestas
            modelBuilder.Entity<Respuesta>(entity =>
            {
                entity.ToTable("Respuestas");
                entity.HasKey(r => r.Id);
                entity.Property(r => r.UltimaActualizacion).HasDefaultValueSql("GETUTCDATE()");
            });

            // 4. Configuración de Conversaciones
            modelBuilder.Entity<Conversacion>(entity =>
            {
                entity.ToTable("Conversaciones");
                entity.HasKey(c => c.Id);
                entity.HasIndex(c => c.SessionId);
                entity.Property(c => c.Timestamp).HasDefaultValueSql("GETUTCDATE()");

                // Relación opcional con Usuario
                entity.HasOne(c => c.Usuario)
                      .WithMany(u => u.Conversaciones)
                      .HasForeignKey(c => c.UsuarioId)
                      .IsRequired(false)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
