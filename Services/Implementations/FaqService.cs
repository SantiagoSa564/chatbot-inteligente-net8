using ChatbotApi.Data;
using ChatbotApi.DTOs.Faqs;
using ChatbotApi.Models.Entities;
using ChatbotApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatbotApi.Services.Implementations
{
    public class FaqService : IFaqService
    {
        private readonly ApplicationDbContext _context;

        public FaqService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<FaqResponseDto>> GetAllAsync(bool onlyActive = false)
        {
            var query = _context.Preguntas
                .AsNoTracking()
                .Include(p => p.Respuestas)
                .AsQueryable();

            if (onlyActive)
            {
                query = query.Where(p => p.EstadoActivo);
            }

            var preguntas = await query
                .OrderBy(p => p.Categoria)
                .ThenBy(p => p.Id)
                .ToListAsync();

            return preguntas.Select(MapToDto);
        }

        public async Task<FaqResponseDto?> GetByIdAsync(int id)
        {
            var pregunta = await _context.Preguntas
                .AsNoTracking()
                .Include(p => p.Respuestas)
                .FirstOrDefaultAsync(p => p.Id == id);

            return pregunta == null ? null : MapToDto(pregunta);
        }

        public async Task<FaqResponseDto> CreateAsync(CreateFaqDto createDto)
        {
            var nuevaPregunta = new Pregunta
            {
                TextoPregunta = createDto.TextoPregunta.Trim(),
                Categoria = createDto.Categoria.Trim(),
                EstadoActivo = createDto.EstadoActivo,
                Respuestas = new List<Respuesta>
                {
                    new Respuesta
                    {
                        TextoRespuesta = createDto.TextoRespuesta.Trim(),
                        UltimaActualizacion = DateTime.UtcNow
                    }
                }
            };

            _context.Preguntas.Add(nuevaPregunta);
            await _context.SaveChangesAsync();

            return MapToDto(nuevaPregunta);
        }

        public async Task<FaqResponseDto?> UpdateAsync(int id, UpdateFaqDto updateDto)
        {
            var pregunta = await _context.Preguntas
                .Include(p => p.Respuestas)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pregunta == null)
                return null;

            pregunta.TextoPregunta = updateDto.TextoPregunta.Trim();
            pregunta.Categoria = updateDto.Categoria.Trim();
            pregunta.EstadoActivo = updateDto.EstadoActivo;

            var respuestaPrincipal = pregunta.Respuestas.FirstOrDefault();
            if (respuestaPrincipal != null)
            {
                respuestaPrincipal.TextoRespuesta = updateDto.TextoRespuesta.Trim();
                respuestaPrincipal.UltimaActualizacion = DateTime.UtcNow;
            }
            else
            {
                pregunta.Respuestas.Add(new Respuesta
                {
                    PreguntaId = pregunta.Id,
                    TextoRespuesta = updateDto.TextoRespuesta.Trim(),
                    UltimaActualizacion = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return MapToDto(pregunta);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var pregunta = await _context.Preguntas.FindAsync(id);
            if (pregunta == null)
                return false;

            _context.Preguntas.Remove(pregunta);
            await _context.SaveChangesAsync();
            return true;
        }

        private static FaqResponseDto MapToDto(Pregunta p)
        {
            return new FaqResponseDto
            {
                Id = p.Id,
                TextoPregunta = p.TextoPregunta,
                Categoria = p.Categoria,
                EstadoActivo = p.EstadoActivo,
                Respuestas = p.Respuestas.Select(r => new RespuestaDto
                {
                    Id = r.Id,
                    PreguntaId = r.PreguntaId,
                    TextoRespuesta = r.TextoRespuesta,
                    UltimaActualizacion = r.UltimaActualizacion
                }).ToList()
            };
        }
    }
}
