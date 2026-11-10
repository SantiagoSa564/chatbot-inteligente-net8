namespace ChatbotApi.Services.Interfaces
{
    public interface IAiIntegrationService
    {
        Task<string> GenerateResponseAsync(string userQuestion);
    }
}
