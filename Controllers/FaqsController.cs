using ChatbotApi.DTOs.Faqs;
using ChatbotApi.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatbotApi.Controllers
{
    [ApiController]
    [Route("api/faqs")]
    public class FaqsController : ControllerBase
    {
        private readonly IFaqService _faqService;

        public FaqsController(IFaqService faqService)
        {
            _faqService = faqService;
        }

        /// <summary>
        /// Obtiene todas las preguntas frecuentes con sus respuestas.
        /// Puede filtrarse solo por activas (?onlyActive=true).
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll([FromQuery] bool onlyActive = false)
        {
            var faqs = await _faqService.GetAllAsync(onlyActive);
            return Ok(faqs);
        }

        /// <summary>
        /// Obtiene una pregunta frecuente por su ID junto con sus respuestas.
        /// </summary>
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var faq = await _faqService.GetByIdAsync(id);
            if (faq == null)
                return NotFound(new { mensaje = $"No se encontró la FAQ con ID {id}." });

            return Ok(faq);
        }

        /// <summary>
        /// Crea una nueva pregunta frecuente y su respuesta asociada (Solo Admin).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateFaqDto createDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var createdFaq = await _faqService.CreateAsync(createDto);
            return CreatedAtAction(nameof(GetById), new { id = createdFaq.Id }, createdFaq);
        }

        /// <summary>
        /// Actualiza una pregunta frecuente y su respuesta asociada (Solo Admin).
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateFaqDto updateDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updatedFaq = await _faqService.UpdateAsync(id, updateDto);
            if (updatedFaq == null)
                return NotFound(new { mensaje = $"No se encontró la FAQ con ID {id} para actualizar." });

            return Ok(updatedFaq);
        }

        /// <summary>
        /// Elimina una pregunta frecuente y sus respuestas en cascada (Solo Admin).
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _faqService.DeleteAsync(id);
            if (!deleted)
                return NotFound(new { mensaje = $"No se encontró la FAQ con ID {id} para eliminar." });

            return NoContent();
        }
    }
}
