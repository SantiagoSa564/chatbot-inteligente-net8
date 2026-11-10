using ChatbotApi.DTOs.Faqs;

namespace ChatbotApi.Services.Interfaces
{
    public interface IFaqService
    {
        Task<IEnumerable<FaqResponseDto>> GetAllAsync(bool onlyActive = false);
        Task<FaqResponseDto?> GetByIdAsync(int id);
        Task<FaqResponseDto> CreateAsync(CreateFaqDto createDto);
        Task<FaqResponseDto?> UpdateAsync(int id, UpdateFaqDto updateDto);
        Task<bool> DeleteAsync(int id);
    }
}
