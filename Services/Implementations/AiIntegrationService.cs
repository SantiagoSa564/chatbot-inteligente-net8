using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ChatbotApi.Data;
using ChatbotApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatbotApi.Services.Implementations
{
    public class AiIntegrationService : IAiIntegrationService
    {
        private readonly HttpClient _httpClient;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiIntegrationService> _logger;

        public AiIntegrationService(
            HttpClient httpClient,
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<AiIntegrationService> logger)
        {
            _httpClient = httpClient;
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<string> GenerateResponseAsync(string userQuestion)
        {
            // 1. Recuperar las FAQs activas de la BD con sus respuestas para armar el contexto (RAG ligero)
            var activeFaqs = await _context.Preguntas
                .AsNoTracking()
                .Include(p => p.Respuestas)
                .Where(p => p.EstadoActivo)
                .ToListAsync();

            var faqContextBuilder = new StringBuilder();
            if (activeFaqs.Any())
            {
                foreach (var faq in activeFaqs)
                {
                    var respuestaTexto = faq.Respuestas.FirstOrDefault()?.TextoRespuesta ?? "Sin respuesta registrada.";
                    faqContextBuilder.AppendLine($"- Categoría: [{faq.Categoria}]");
                    faqContextBuilder.AppendLine($"  Pregunta: {faq.TextoPregunta}");
                    faqContextBuilder.AppendLine($"  Respuesta Oficial: {respuestaTexto}");
                    faqContextBuilder.AppendLine();
                }
            }
            else
            {
                faqContextBuilder.AppendLine("Actualmente no hay preguntas frecuentes registradas en la base de conocimiento.");
            }

            // 2. Construir el System Prompt institucional y conversacional
            string systemPrompt = $@"Eres NexusAI, el Asistente Virtual Inteligente de Atención al Usuario. Tu tono es profesional, empático, resolutivo, natural y conversacional.

Tienes dos funciones principales:
A) Responder con exactitud las consultas sobre la empresa/institución utilizando la siguiente BASE DE CONOCIMIENTO OFICIAL (FAQs):
{faqContextBuilder}

B) Mantener una conversación fluida y natural con el usuario e interactuar sobre cualquier pregunta general:
1. Si el usuario te saluda ('hola', 'buenos días', 'qué tal', 'cómo estás'), agradécele, salúdalo cordialmente, preséntate y pregúntale en qué le puedes colaborar.
2. Si la pregunta trata sobre horarios, pagos, contraseñas, reembolsos o PQR de la entidad, responde basándote estrictamente en la BASE DE CONOCIMIENTO OFICIAL.
3. Si el usuario hace una pregunta de cultura general, tecnología, redacción, matemáticas o conversación cotidiana, respóndele de manera útil, clara e inteligente, y al final recuérdale amablemente que también estás disponible para ayudarle con los servicios de atención al usuario.
4. Responde siempre en español con formato claro y agradable de leer.";

            // 3. Leer configuración del proveedor LLM (Gemini u OpenAI)
            var aiSettings = _configuration.GetSection("AiSettings");
            string provider = aiSettings["Provider"] ?? "Gemini";
            string apiKey = aiSettings["ApiKey"] ?? string.Empty;
            string apiUrl = aiSettings["ApiUrl"] ?? string.Empty;

            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "TU_API_KEY_DE_GEMINI_O_OPENAI")
            {
                _logger.LogInformation("Usando proveedor LLM gratuito de respaldo (Pollinations OpenAI-compatible) al no haber API Key personalizada.");
                return await CallFreeFallbackLlmAsync(systemPrompt, userQuestion);
            }

            try
            {
                if (provider.Equals("OpenAI", StringComparison.OrdinalIgnoreCase))
                {
                    return await CallOpenAiApiAsync(apiUrl, apiKey, systemPrompt, userQuestion);
                }
                else
                {
                    return await CallGeminiApiAsync(apiUrl, apiKey, systemPrompt, userQuestion);
                }
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Error de comunicación HTTP al invocar la API de IA ({Provider}).", provider);
                return "Lo sentimos, en este momento nuestro asistente automático presenta intermitencias de conexión. Por favor, intente nuevamente en unos minutos.";
            }
            catch (TaskCanceledException timeoutEx)
            {
                _logger.LogError(timeoutEx, "Tiempo de espera agotado al invocar la API de IA ({Provider}).", provider);
                return "La solicitud tardó más tiempo del esperado en ser procesada. Por favor, intente nuevamente.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inesperado en AiIntegrationService.");
                return "Ocurrió un inconveniente técnico al procesar su consulta. Nuestro equipo ha sido notificado.";
            }
        }

        private async Task<string> CallGeminiApiAsync(string apiUrl, string apiKey, string systemPrompt, string userQuestion)
        {
            string requestUrl = apiUrl.Contains("?key=") ? apiUrl : $"{apiUrl}?key={apiKey}";

            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userQuestion } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.2,
                    maxOutputTokens = 800
                }
            };

            var jsonContent = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            using var response = await _httpClient.PostAsync(requestUrl, jsonContent);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Error de Gemini API ({StatusCode}): {Response}", response.StatusCode, responseString);
                throw new HttpRequestException($"La API de Gemini devolvió el código de estado {response.StatusCode}");
            }

            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;

            if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
            {
                var firstCandidate = candidates[0];
                if (firstCandidate.TryGetProperty("content", out var content) &&
                    content.TryGetProperty("parts", out var parts) &&
                    parts.GetArrayLength() > 0 &&
                    parts[0].TryGetProperty("text", out var textElement))
                {
                    return textElement.GetString()?.Trim()
                        ?? "No fue posible generar una respuesta en este momento.";
                }
            }

            return "No fue posible obtener una respuesta clara del asistente.";
        }

        private async Task<string> CallOpenAiApiAsync(string apiUrl, string apiKey, string systemPrompt, string userQuestion)
        {
            var payload = new
            {
                model = "gpt-4o-mini",
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userQuestion }
                },
                temperature = 0.2,
                max_tokens = 800
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, apiUrl);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            request.Content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            using var response = await _httpClient.SendAsync(request);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Error de OpenAI API ({StatusCode}): {Response}", response.StatusCode, responseString);
                throw new HttpRequestException($"La API de OpenAI devolvió el código de estado {response.StatusCode}");
            }

            using var doc = JsonDocument.Parse(responseString);
            var root = doc.RootElement;

            if (root.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
            {
                var message = choices[0].GetProperty("message");
                if (message.TryGetProperty("content", out var contentElement))
                {
                    return contentElement.GetString()?.Trim()
                        ?? "No fue posible generar una respuesta en este momento.";
                }
            }

            return "No fue posible obtener una respuesta clara del asistente.";
        }

        private async Task<string> CallFreeFallbackLlmAsync(string systemPrompt, string userQuestion)
        {
            var payload = new
            {
                model = "openai",
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userQuestion }
                },
                temperature = 0.4
            };

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            using var response = await _httpClient.PostAsync("https://text.pollinations.ai/openai", content);
            var responseString = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                using var doc = JsonDocument.Parse(responseString);
                if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                {
                    var text = choices[0].GetProperty("message").GetProperty("content").GetString();
                    if (!string.IsNullOrWhiteSpace(text))
                        return text.Trim();
                }
            }

            return "Hola, estoy disponible para atender sus inquietudes. ¿En qué puedo colaborarle hoy?";
        }
    }
}
