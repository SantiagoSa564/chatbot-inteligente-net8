using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ChatbotApi.Data;
using ChatbotApi.DTOs.Auth;
using ChatbotApi.Models.Entities;
using ChatbotApi.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace ChatbotApi.Services.Implementations
{
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            var emailNormalized = registerDto.Email.Trim().ToLowerInvariant();

            bool emailExists = await _context.Usuarios.AnyAsync(u => u.Email.ToLower() == emailNormalized);
            if (emailExists)
            {
                throw new InvalidOperationException("El correo electrónico ya se encuentra registrado.");
            }

            // El registro público nunca concede permisos administrativos.
            // Los administradores se provisionan mediante el seeder o un canal protegido.
            const string rolAsignado = "User";

            var nuevoUsuario = new Usuario
            {
                Nombre = registerDto.Nombre.Trim(),
                Email = emailNormalized,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                Rol = rolAsignado,
                FechaCreacion = DateTime.UtcNow
            };

            _context.Usuarios.Add(nuevoUsuario);
            await _context.SaveChangesAsync();

            return GenerateJwtResponse(nuevoUsuario);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var emailNormalized = loginDto.Email.Trim().ToLowerInvariant();

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailNormalized);

            if (usuario == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, usuario.PasswordHash))
            {
                throw new UnauthorizedAccessException("Credenciales inválidas (correo o contraseña incorrectos).");
            }

            return GenerateJwtResponse(usuario);
        }

        private AuthResponseDto GenerateJwtResponse(Usuario usuario)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"]
                ?? throw new InvalidOperationException("JwtSettings:SecretKey no está configurado.");
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expirationMinutes = int.TryParse(jwtSettings["ExpirationInMinutes"], out int mins) ? mins : 120;

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name, usuario.Nombre),
                new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
                new Claim(ClaimTypes.Role, usuario.Rol),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var expiration = DateTime.UtcNow.AddMinutes(expirationMinutes);

            var tokenDescriptor = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expiration,
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);

            return new AuthResponseDto
            {
                UsuarioId = usuario.Id,
                Nombre = usuario.Nombre,
                Email = usuario.Email,
                Rol = usuario.Rol,
                Token = tokenString,
                Expiracion = expiration
            };
        }
    }
}
