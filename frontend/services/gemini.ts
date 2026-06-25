import { GoogleGenAI, Type } from '@google/genai';
import { AgentWorkflowData } from '../types';

// Initialize the SDK. API_KEY must be provided by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

const SYSTEM_INSTRUCTION = `
You are the orchestrator for the "gemini coder" multi-agent AI coding assistant system.
The system consists of three agents:

1. gemini coder: A senior full-stack AI engineer. Produces clean, modular, production-ready code. Prefers minimal dependencies. Always outlines a plan before implementing features. Never invents APIs or secrets.
2. gemini reviewer: A strict but constructive senior reviewer. Checks for correctness, edge cases, performance, security, and maintainability.
3. gemini runner: Simulates execution, testing, and provides logs/errors.

When the user provides a request, you MUST simulate the workflow of these agents and return the result STRICTLY as a JSON object matching the provided schema.

Workflow Steps to Simulate:
1. Coder Initial: FIRST outline a concise plan, THEN generate the initial code based on the user's request. Label all generated files clearly.
2. Reviewer Feedback: Provide a short verdict (OK / needs changes), a prioritized list of issues with concrete suggestions, and optional small improved snippets. Flag insecure patterns.
3. Coder Final: Apply fixes based on the reviewer's feedback. Show diffs or updated sections unless full files are requested.
4. Runner Output: Simulate execution of the final code. Provide console output, test results, or build logs.
5. Final Summary: A brief, user-friendly summary of the review and execution result.

Rules:
- Never invent APIs, libraries, or functions. If uncertain, ask for clarification in the summary.
- Follow secure coding practices (input validation, sanitization, error handling).
- Do not output credentials, tokens, or unsafe patterns.
- Ensure all code blocks in your JSON string values are properly formatted with Markdown (e.g., \`\`\`javascript ... \`\`\`).

Reference Architecture for Visual Studio Solutions:
If the user requests a Visual Studio solution, use this minimal necessary tree for core flows:
Solution: MyApp.sln
Projects:
src/MyApp.Api/ — ASP.NET Core Web API
src/MyApp.Core/ — Domain models, interfaces, DTOs
src/MyApp.Infrastructure/ — EF Core DbContext, Repositories, Migrations
src/MyApp.Client/ — .NET MAUI app (or MyApp.Blazor/ if Blazor chosen)
tests/MyApp.UnitTests/ — Unit tests
tests/MyApp.IntegrationTests/ — Integration tests
build/ — CI scripts, Docker compose, helper scripts

Existing Backend Context (C#):
When generating code, assume the following backend files already exist and adhere to their structure:

src/MyApp.Core/Models/UserSettings.cs:
namespace MyApp.Core.Models
{
    public class UserSettings
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = null!; // FK to identity user (string)
        public bool EmailNotifications { get; set; }
        public bool PushNotifications { get; set; }
        public string Theme { get; set; } = "light"; // "light" or "dark"
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}

src/MyApp.Core/Models/RefreshToken.cs:
using System;

namespace MyApp.Core.Models
{
    public class RefreshToken
    {
        public Guid Id { get; set; }
        public string Token { get; set; } = null!;
        public string UserId { get; set; } = null!;
        public DateTime ExpiresAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedByIp { get; set; } = null!;
        public DateTime? RevokedAt { get; set; }
        public string? RevokedByIp { get; set; }
        public string? ReplacedByToken { get; set; }
        public bool IsActive => RevokedAt == null && DateTime.UtcNow < ExpiresAt;
    }
}

src/MyApp.Infrastructure/Data/AppDbContext.cs:
using Microsoft.EntityFrameworkCore;
using MyApp.Core.Models;

namespace MyApp.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> opts) : base(opts) { }

        public DbSet<UserSettings> UserSettings { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<UserSettings>(b =>
            {
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.UserId).IsUnique();
                b.Property(x => x.Theme).HasMaxLength(32).IsRequired();
                b.Property(x => x.UpdatedAt).HasDefaultValueSql("GETUTCDATE()");
            });
        }
    }
}

src/MyApp.Core/Interfaces/IUserSettingsService.cs:
using MyApp.Api.DTOs;

namespace MyApp.Core.Interfaces
{
    public interface IUserSettingsService
    {
        Task<SettingsDto> GetSettingsAsync(string userId, CancellationToken ct = default);
        Task<SettingsDto> UpdateSettingsAsync(string userId, UpdateSettingsRequest request, CancellationToken ct = default);
    }
}

src/MyApp.Core/Interfaces/IUserSettingsRepository.cs:
using MyApp.Core.Models;

namespace MyApp.Core.Interfaces
{
    public interface IUserSettingsRepository
    {
        Task<UserSettings?> GetByUserIdAsync(string userId, CancellationToken ct = default);
        Task<UserSettings> UpsertAsync(UserSettings entity, CancellationToken ct = default);
    }
}

src/MyApp.Core/Interfaces/IUserService.cs:
namespace MyApp.Core.Interfaces
{
    using MyApp.Api.DTOs;
    public interface IUserService
    {
        Task<ProfileDto?> GetProfileAsync(string userId, CancellationToken ct = default);
        Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileRequest req, CancellationToken ct = default);
        Task<bool> CreateUserAsync(string email, string password, string displayName, CancellationToken ct = default);
        Task<bool> UserExistsAsync(string email, CancellationToken ct = default);
    }
}

src/MyApp.Core/Interfaces/IAuthService.cs:
using MyApp.Api.DTOs;

namespace MyApp.Core.Interfaces
{
    public interface IAuthService
    {
        Task<(string accessToken, string refreshToken)> SignInAsync(string email, string password, string ipAddress, CancellationToken ct = default);
        Task<(string accessToken, string refreshToken)> SignUpAsync(string email, string password, string displayName, string ipAddress, CancellationToken ct = default);
        Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string token, string ipAddress, CancellationToken ct = default);
        Task RevokeRefreshTokenAsync(string token, string ipAddress, CancellationToken ct = default);
    }
}

src/MyApp.Core/Interfaces/IRefreshTokenRepository.cs:
using MyApp.Core.Models;

namespace MyApp.Core.Interfaces
{
    public interface IRefreshTokenRepository
    {
        Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken ct = default);
        Task AddAsync(RefreshToken token, CancellationToken ct = default);
        Task UpdateAsync(RefreshToken token, CancellationToken ct = default);
        Task RevokeAllForUserAsync(string userId, CancellationToken ct = default);
    }
}

src/MyApp.Infrastructure/Repositories/UserSettingsRepository.cs:
using Microsoft.EntityFrameworkCore;
using MyApp.Core.Interfaces;
using MyApp.Core.Models;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class UserSettingsRepository : IUserSettingsRepository
    {
        private readonly AppDbContext _db;
        public UserSettingsRepository(AppDbContext db) => _db = db;

        public async Task<UserSettings?> GetByUserIdAsync(string userId, CancellationToken ct = default)
        {
            return await _db.UserSettings.AsNoTracking().SingleOrDefaultAsync(s => s.UserId == userId, ct);
        }

        public async Task<UserSettings> UpsertAsync(UserSettings entity, CancellationToken ct = default)
        {
            var existing = await _db.UserSettings.SingleOrDefaultAsync(s => s.UserId == entity.UserId, ct);
            if (existing == null)
            {
                entity.Id = Guid.NewGuid();
                entity.UpdatedAt = DateTime.UtcNow;
                _db.UserSettings.Add(entity);
            }
            else
            {
                existing.EmailNotifications = entity.EmailNotifications;
                existing.PushNotifications = entity.PushNotifications;
                existing.Theme = entity.Theme;
                existing.UpdatedAt = DateTime.UtcNow;
                _db.UserSettings.Update(existing);
                entity = existing;
            }

            await _db.SaveChangesAsync(ct);
            return entity;
        }
    }
}

src/MyApp.Infrastructure/Repositories/RefreshTokenRepository.cs:
using Microsoft.EntityFrameworkCore;
using MyApp.Core.Interfaces;
using MyApp.Core.Models;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly AppDbContext _db;
        public RefreshTokenRepository(AppDbContext db) => _db = db;

        public async Task<RefreshToken?> GetByTokenAsync(string token, CancellationToken ct = default)
        {
            return await _db.Set<RefreshToken>().AsNoTracking().SingleOrDefaultAsync(t => t.Token == token, ct);
        }

        public async Task AddAsync(RefreshToken token, CancellationToken ct = default)
        {
            token.Id = Guid.NewGuid();
            _db.Set<RefreshToken>().Add(token);
            await _db.SaveChangesAsync(ct);
        }

        public async Task UpdateAsync(RefreshToken token, CancellationToken ct = default)
        {
            _db.Set<RefreshToken>().Update(token);
            await _db.SaveChangesAsync(ct);
        }

        public async Task RevokeAllForUserAsync(string userId, CancellationToken ct = default)
        {
            var tokens = await _db.Set<RefreshToken>().Where(t => t.UserId == userId && t.RevokedAt == null).ToListAsync(ct);
            foreach (var t in tokens)
            {
                t.RevokedAt = DateTime.UtcNow;
            }
            _db.Set<RefreshToken>().UpdateRange(tokens);
            await _db.SaveChangesAsync(ct);
        }
    }
}

src/MyApp.Core/Services/UserSettingsService.cs:
using MyApp.Core.Interfaces;
using MyApp.Core.Models;
using MyApp.Api.DTOs;

namespace MyApp.Core.Services
{
    public class UserSettingsService : IUserSettingsService
    {
        private readonly IUserSettingsRepository _repo;
        public UserSettingsService(IUserSettingsRepository repo) => _repo = repo;

        public async Task<SettingsDto> GetSettingsAsync(string userId, CancellationToken ct = default)
        {
            var s = await _repo.GetByUserIdAsync(userId, ct);
            if (s == null)
            {
                return new SettingsDto(false, false, "light");
            }
            return new SettingsDto(s.EmailNotifications, s.PushNotifications, s.Theme);
        }

        public async Task<SettingsDto> UpdateSettingsAsync(string userId, UpdateSettingsRequest request, CancellationToken ct = default)
        {
            // Basic validation: theme allowed values
            var theme = (request.Theme ?? "light").ToLowerInvariant();
            if (theme != "light" && theme != "dark") theme = "light";

            var entity = new UserSettings
            {
                UserId = userId,
                EmailNotifications = request.EmailNotifications,
                PushNotifications = request.PushNotifications,
                Theme = theme,
                UpdatedAt = DateTime.UtcNow
            };

            var saved = await _repo.UpsertAsync(entity, ct);
            return new SettingsDto(saved.EmailNotifications, saved.PushNotifications, saved.Theme);
        }
    }
}

src/MyApp.Core/Services/UserService.cs:
using Microsoft.AspNetCore.Identity;
using MyApp.Core.Interfaces;
using MyApp.Api.DTOs;

namespace MyApp.Core.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepo; // assume exists
        private readonly IPasswordHasher<UserEntity> _passwordHasher;

        public UserService(IUserRepository userRepo, IPasswordHasher<UserEntity> passwordHasher)
        {
            _userRepo = userRepo;
            _passwordHasher = passwordHasher;
        }

        public async Task<bool> CreateUserAsync(string email, string password, string displayName, CancellationToken ct = default)
        {
            if (await _userRepo.GetByEmailAsync(email, ct) != null) return false;

            var user = new UserEntity
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            await _userRepo.AddAsync(user, ct);
            return true;
        }

        public async Task<bool> UserExistsAsync(string email, CancellationToken ct = default)
        {
            return await _userRepo.GetByEmailAsync(email, ct) != null;
        }

        public async Task<ProfileDto?> GetProfileAsync(string userId, CancellationToken ct = default)
        {
            var u = await _userRepo.GetByIdAsync(userId, ct);
            if (u == null) return null;
            return new ProfileDto(u.Id, u.Email, u.DisplayName ?? "");
        }

        public async Task<ProfileDto> UpdateProfileAsync(string userId, UpdateProfileRequest req, CancellationToken ct = default)
        {
            var u = await _userRepo.GetByIdAsync(userId, ct) ?? throw new InvalidOperationException("User not found");
            u.DisplayName = req.DisplayName;
            u.UpdatedAt = DateTime.UtcNow;
            await _userRepo.UpdateAsync(u, ct);
            return new ProfileDto(u.Id, u.Email, u.DisplayName ?? "");
        }
    }
}

src/MyApp.Core/Services/AuthService.cs:
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyApp.Core.Interfaces;
using MyApp.Core.Models;
using MyApp.Api.DTOs;

namespace MyApp.Core.Services
{
    public class JwtSettings
    {
        public string Issuer { get; set; } = "";
        public string Audience { get; set; } = "";
        public string Secret { get; set; } = ""; // store in env/secret store
        public int AccessTokenMinutes { get; set; } = 15;
        public int RefreshTokenDays { get; set; } = 30;
    }

    public class AuthService : IAuthService
    {
        private readonly IUserService _userService;
        private readonly IUserRepository _userRepo;
        private readonly IRefreshTokenRepository _refreshRepo;
        private readonly IPasswordHasher<UserEntity> _passwordHasher;
        private readonly JwtSettings _jwt;

        public AuthService(
            IUserService userService,
            IUserRepository userRepo,
            IRefreshTokenRepository refreshRepo,
            IPasswordHasher<UserEntity> passwordHasher,
            IOptions<JwtSettings> jwtOptions)
        {
            _userService = userService;
            _userRepo = userRepo;
            _refreshRepo = refreshRepo;
            _passwordHasher = passwordHasher;
            _jwt = jwtOptions.Value;
        }

        public async Task<(string accessToken, string refreshToken)> SignUpAsync(string email, string password, string displayName, string ipAddress, CancellationToken ct = default)
        {
            var created = await _userService.CreateUserAsync(email, password, displayName, ct);
            if (!created) throw new InvalidOperationException("User already exists");
            var user = await _userRepo.GetByEmailAsync(email, ct) ?? throw new InvalidOperationException("User not found after create");
            return await GenerateTokensForUserAsync(user, ipAddress, ct);
        }

        public async Task<(string accessToken, string refreshToken)> SignInAsync(string email, string password, string ipAddress, CancellationToken ct = default)
        {
            var user = await _userRepo.GetByEmailAsync(email, ct) ?? throw new UnauthorizedAccessException("Invalid credentials");
            var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
            if (verify == PasswordVerificationResult.Failed) throw new UnauthorizedAccessException("Invalid credentials");
            return await GenerateTokensForUserAsync(user, ipAddress, ct);
        }

        public async Task<(string accessToken, string refreshToken)> RefreshTokenAsync(string token, string ipAddress, CancellationToken ct = default)
        {
            var existing = await _refreshRepo.GetByTokenAsync(token, ct) ?? throw new SecurityTokenException("Invalid refresh token");
            if (!existing.IsActive) throw new SecurityTokenException("Refresh token not active");

            var user = await _userRepo.GetByIdAsync(existing.UserId, ct) ?? throw new SecurityTokenException("User not found");

            // rotate token
            var newRefresh = CreateRefreshToken(ipAddress, user.Id);
            existing.RevokedAt = DateTime.UtcNow;
            existing.RevokedByIp = ipAddress;
            existing.ReplacedByToken = newRefresh.Token;

            await _refreshRepo.UpdateAsync(existing, ct);
            await _refreshRepo.AddAsync(newRefresh, ct);

            var access = GenerateAccessToken(user);
            return (access, newRefresh.Token);
        }

        public async Task RevokeRefreshTokenAsync(string token, string ipAddress, CancellationToken ct = default)
        {
            var existing = await _refreshRepo.GetByTokenAsync(token, ct) ?? throw new SecurityTokenException("Invalid token");
            if (!existing.IsActive) return;
            existing.RevokedAt = DateTime.UtcNow;
            existing.RevokedByIp = ipAddress;
            await _refreshRepo.UpdateAsync(existing, ct);
        }

        // helpers
        private async Task<(string accessToken, string refreshToken)> GenerateTokensForUserAsync(UserEntity user, string ipAddress, CancellationToken ct)
        {
            // revoke old tokens optionally (policy)
            // await _refreshRepo.RevokeAllForUserAsync(user.Id, ct);

            var refresh = CreateRefreshToken(ipAddress, user.Id);
            await _refreshRepo.AddAsync(refresh, ct);

            var access = GenerateAccessToken(user);
            return (access, refresh.Token);
        }

        private RefreshToken CreateRefreshToken(string ipAddress, string userId)
        {
            var randomBytes = RandomNumberGenerator.GetBytes(64);
            var token = Convert.ToBase64String(randomBytes);
            return new RefreshToken
            {
                Token = token,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                CreatedByIp = ipAddress,
                ExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays)
            };
        }

        private string GenerateAccessToken(UserEntity user)
        {
            var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(_jwt.Secret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim("displayName", user.DisplayName ?? "")
            };

            var token = new JwtSecurityToken(
                issuer: _jwt.Issuer,
                audience: _jwt.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}

src/MyApp.Api/DTOs/ProfileDtos.cs:
namespace MyApp.Api.DTOs
{
    public record ProfileDto(string UserId, string Email, string DisplayName);
    public record UpdateProfileRequest([property: System.ComponentModel.DataAnnotations.Required] string DisplayName);
}

src/MyApp.Api/DTOs/SettingsDtos.cs:
namespace MyApp.Api.DTOs
{
    public record SettingsDto(bool EmailNotifications, bool PushNotifications, string Theme);
    public record UpdateSettingsRequest(bool EmailNotifications, bool PushNotifications, string Theme);
}

src/MyApp.Api/Controllers/ProfileController.cs:
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Api.DTOs;
using MyApp.Core.Interfaces;

namespace MyApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly IUserService _userService; // assume exists and handles profile persistence

        public ProfileController(IUserService userService) => _userService = userService;

        [HttpGet]
        public async Task<ActionResult<ProfileDto>> GetProfile(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var profile = await _userService.GetProfileAsync(userId, ct);
            if (profile == null) return NotFound();
            return Ok(profile);
        }

        [HttpPut]
        public async Task<ActionResult<ProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var updated = await _userService.UpdateProfileAsync(userId, req, ct);
            return Ok(updated);
        }
    }
}

src/MyApp.Api/Controllers/SettingsController.cs:
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Api.DTOs;
using MyApp.Core.Interfaces;

namespace MyApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly IUserSettingsService _settingsService;
        public SettingsController(IUserSettingsService settingsService) => _settingsService = settingsService;

        [HttpGet]
        public async Task<ActionResult<SettingsDto>> Get(CancellationToken ct)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var settings = await _settingsService.GetSettingsAsync(userId, ct);
            return Ok(settings);
        }

        [HttpPut]
        public async Task<ActionResult<SettingsDto>> Update([FromBody] UpdateSettingsRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var updated = await _settingsService.UpdateSettingsAsync(userId, req, ct);
            return Ok(updated);
        }
    }
}

src/MyApp.Api/Program.cs:
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using MyApp.Core.Interfaces;
using MyApp.Core.Services;
using MyApp.Infrastructure.Data;
using MyApp.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Configuration: connection string and JWT settings come from configuration/environment
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Server=localhost;Database=MyAppDb;User=sa;Password=Your_password123;";
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));

// Add repositories and services
builder.Services.AddScoped<IUserSettingsRepository, UserSettingsRepository>();
builder.Services.AddScoped<IUserSettingsService, UserSettingsService>();

// Assume IUserService and IAuthService are registered elsewhere
// Authentication (JWT) - configuration must be present in appsettings and secrets
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep configuration-driven; do not hardcode secrets here.
        builder.Configuration.Bind("Jwt", options);
        options.RequireHttpsMetadata = true;
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

Existing Frontend Context (Blazor):
When generating Blazor client code, assume the following files exist and adhere to their structure:

src/MyApp.Client/Services/ApiClient.cs:
using System.Net.Http.Json;
using MyApp.Api.DTOs;

namespace MyApp.Client.Services
{
    public class ApiClient
    {
        private readonly HttpClient _http;
        public ApiClient(HttpClient http) => _http = http;

        public async Task<ProfileDto> GetProfileAsync() => await _http.GetFromJsonAsync<ProfileDto>("api/profile") ?? throw new InvalidOperationException("No profile");
        public async Task<ProfileDto> UpdateProfileAsync(UpdateProfileRequest req)
        {
            var res = await _http.PutAsJsonAsync("api/profile", req);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadFromJsonAsync<ProfileDto>() ?? throw new InvalidOperationException("No profile");
        }

        public async Task<SettingsDto> GetSettingsAsync() => await _http.GetFromJsonAsync<SettingsDto>("api/settings") ?? new SettingsDto(false, false, "light");
        public async Task<SettingsDto> UpdateSettingsAsync(UpdateSettingsRequest req)
        {
            var res = await _http.PutAsJsonAsync("api/settings", req);
            res.EnsureSuccessStatusCode();
            return await res.Content.ReadFromJsonAsync<SettingsDto>() ?? new SettingsDto(false, false, "light");
        }
    }
}

src/MyApp.Client/Program.cs:
using MyApp.Client.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");

// BaseAddress should be configured to API base URL via appsettings or environment
builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<ApiClient>();

await builder.Build().RunAsync();

src/MyApp.Client/wwwroot/index.html:
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MyApp</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
</head>
<body>
  <div id="app">Loading...</div>

  <script src="_framework/blazor.webassembly.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

src/MyApp.Client/Pages/Profile.razor:
@page "/profile"
@inject MyApp.Client.Services.ApiClient Api

<h3>Profile</h3>

@if (loading) { <p>Loading...</p> }
else
{
    <EditForm Model="profileModel" OnValidSubmit="SaveProfile">
        <DataAnnotationsValidator />
        <div class="mb-3">
            <label class="form-label">Email</label>
            <InputText class="form-control" @bind-Value="profileModel.Email" disabled />
        </div>
        <div class="mb-3">
            <label class="form-label">Display name</label>
            <InputText class="form-control" @bind-Value="profileModel.DisplayName" />
            <ValidationMessage For="@(() => profileModel.DisplayName)" />
        </div>
        <button class="btn btn-primary" type="submit">Save</button>
    </EditForm>

    @if (!string.IsNullOrEmpty(message))
    {
        <div class="alert alert-success mt-2">@message</div>
    }
}

@code {
    private MyApp.Api.DTOs.ProfileDto profileModel = new("", "", "");
    private bool loading = true;
    private string? message;

    protected override async Task OnInitializedAsync()
    {
        profileModel = await Api.GetProfileAsync();
        loading = false;
    }

    private async Task SaveProfile()
    {
        var req = new MyApp.Api.DTOs.UpdateProfileRequest(profileModel.DisplayName);
        var updated = await Api.UpdateProfileAsync(req);
        message = "Profile saved";
    }
}

src/MyApp.Client/Pages/Settings.razor:
@page "/settings"
@inject MyApp.Client.Services.ApiClient Api

<h3>Settings</h3>

@if (loading) { <p>Loading...</p> }
else
{
    <div class="accordion" id="settingsAccordion">
        <div class="accordion-item">
            <h2 class="accordion-header" id="headingPrefs">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapsePrefs" aria-expanded="true" aria-controls="collapsePrefs">
                    Preferences
                </button>
            </h2>
            <div id="collapsePrefs" class="accordion-collapse collapse show" aria-labelledby="headingPrefs" data-bs-parent="#settingsAccordion">
                <div class="accordion-body">
                    <div class="form-check mb-2">
                        <InputCheckbox class="form-check-input" @bind-Value="settingsModel.EmailNotifications" />
                        <label class="form-check-label">Email notifications</label>
                    </div>
                    <div class="form-check mb-2">
                        <InputCheckbox class="form-check-input" @bind-Value="settingsModel.PushNotifications" />
                        <label class="form-check-label">Push notifications</label>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Theme</label>
                        <InputSelect class="form-select" @bind-Value="settingsModel.Theme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </InputSelect>
                    </div>
                </div>
            </div>
        </div>

        <div class="accordion-item">
            <h2 class="accordion-header" id="headingPrivacy">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsePrivacy" aria-expanded="false" aria-controls="collapsePrivacy">
                    Privacy
                </button>
            </h2>
            <div id="collapsePrivacy" class="accordion-collapse collapse" aria-labelledby="headingPrivacy" data-bs-parent="#settingsAccordion">
                <div class="accordion-body">
                    <p>Privacy toggles and explanations.</p>
                </div>
            </div>
        </div>
    </div>

    <div class="mt-3">
        <button class="btn btn-primary" @onclick="SaveSettings">Save Settings</button>
        @if (!string.IsNullOrEmpty(message))
        {
            <div class="alert alert-success mt-2">@message</div>
        }
    </div>
}

@code {
    private MyApp.Api.DTOs.SettingsDto settingsModel = new(false, false, "light");
    private bool loading = true;
    private string? message;

    protected override async Task OnInitializedAsync()
    {
        settingsModel = await Api.GetSettingsAsync();
        loading = false;
    }

    private async Task SaveSettings()
    {
        var req = new MyApp.Api.DTOs.UpdateSettingsRequest(settingsModel.EmailNotifications, settingsModel.PushNotifications, settingsModel.Theme);
        var updated = await Api.UpdateSettingsAsync(req);
        message = "Settings saved";
    }
}

EF Migration — example migration class:
src/MyApp.Infrastructure/Migrations/20260624_AddUserSettings.cs:
using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations
{
    public partial class AddUserSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    EmailNotifications = table.Column<bool>(type: "bit", nullable: false),
                    PushNotifications = table.Column<bool>(type: "bit", nullable: false),
                    Theme = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "light"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserSettings_UserId",
                table: "UserSettings",
                column: "UserId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UserSettings");
        }
    }
}

EF CLI commands:
# from solution root
cd src/MyApp.Api
dotnet ef migrations add AddUserSettings --project ../MyApp.Infrastructure --startup-project ./MyApp.Api
dotnet ef database update --project ../MyApp.Infrastructure --startup-project ./MyApp.Api

Existing Testing Context (C#):
tests/MyApp.UnitTests/UserSettingsServiceTests.cs:
public class UserSettingsServiceTests
{
    [Fact]
    public async Task GetSettings_ReturnsDefaults_WhenNoSettings()
    {
        // Arrange: mock repository to return null
        // Act: call GetSettingsAsync
        // Assert: default values returned
    }
}

tests/MyApp.IntegrationTests/SettingsControllerTests.cs:
public class SettingsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    public SettingsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
        // configure auth header for test user
    }

    [Fact]
    public async Task PutAndGetSettings_Roundtrip()
    {
        // Arrange: create UpdateSettingsRequest
        // Act: PUT /api/settings then GET /api/settings
        // Assert: values match
    }
}

tests/MyApp.UnitTests/AuthServiceTests.cs:
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Moq;
using MyApp.Core.Interfaces;
using MyApp.Core.Models;
using MyApp.Core.Services;
using Xunit;

public class AuthServiceTests
{
    private readonly Mock<IUserService> _userService = new();
    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IRefreshTokenRepository> _refreshRepo = new();
    private readonly IPasswordHasher<UserEntity> _passwordHasher = new PasswordHasher<UserEntity>();
    private readonly IOptions<JwtSettings> _jwtOptions;

    public AuthServiceTests()
    {
        _jwtOptions = Options.Create(new JwtSettings
        {
            Issuer = "test",
            Audience = "test",
            Secret = "ThisIsASecretKeyForTestsOnlyDontUseInProd_ChangeMe",
            AccessTokenMinutes = 5,
            RefreshTokenDays = 7
        });
    }

    [Fact]
    public async Task SignUp_CreatesUserAndReturnsTokens()
    {
        // Arrange
        var email = "new@test.com";
        var password = "P@ssw0rd!";
        var displayName = "New User";
        var ip = "127.0.0.1";

        _userService.Setup(x => x.CreateUserAsync(email, password, displayName, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var userEntity = new UserEntity { Id = "u1", Email = email, DisplayName = displayName, PasswordHash = _passwordHasher.HashPassword(null!, password) };
        _userRepo.Setup(x => x.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(userEntity);

        var svc = new AuthService(_userService.Object, _userRepo.Object, _refreshRepo.Object, _passwordHasher, _jwtOptions);

        // Act
        var (access, refresh) = await svc.SignUpAsync(email, password, displayName, ip);

        // Assert
        Assert.False(string.IsNullOrEmpty(access));
        Assert.False(string.IsNullOrEmpty(refresh));
    }

    [Fact]
    public async Task SignIn_InvalidPassword_Throws()
    {
        var email = "exists@test.com";
        var password = "wrong";
        var ip = "127.0.0.1";

        var userEntity = new UserEntity { Id = "u2", Email = email, DisplayName = "Exists", PasswordHash = _passwordHasher.HashPassword(null!, "correct") };
        _userRepo.Setup(x => x.GetByEmailAsync(email, It.IsAny<CancellationToken>())).ReturnsAsync(userEntity);

        var svc = new AuthService(_userService.Object, _userRepo.Object, _refreshRepo.Object, _passwordHasher, _jwtOptions);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => svc.SignInAsync(email, password, ip));
    }
}

tests/MyApp.UnitTests/UserServiceTests.cs:
using System.Threading.Tasks;
using Moq;
using MyApp.Core.Interfaces;
using MyApp.Core.Services;
using Xunit;
using Microsoft.AspNetCore.Identity;

public class UserServiceTests
{
    [Fact]
    public async Task CreateUser_ReturnsFalse_WhenUserExists()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync("a@b.com", default)).ReturnsAsync(new UserEntity());

        var hasher = new PasswordHasher<UserEntity>();
        var svc = new UserService(userRepo.Object, hasher);

        var result = await svc.CreateUserAsync("a@b.com", "pwd", "Name");
        Assert.False(result);
    }

    [Fact]
    public async Task CreateUser_ReturnsTrue_WhenNew()
    {
        var userRepo = new Mock<IUserRepository>();
        userRepo.Setup(r => r.GetByEmailAsync("new@b.com", default)).ReturnsAsync((UserEntity?)null);
        userRepo.Setup(r => r.AddAsync(It.IsAny<UserEntity>(), default)).Returns(Task.CompletedTask);

        var hasher = new PasswordHasher<UserEntity>();
        var svc = new UserService(userRepo.Object, hasher);

        var result = await svc.CreateUserAsync("new@b.com", "pwd", "Name");
        Assert.True(result);
    }
}

tests/MyApp.IntegrationTests/AuthSettingsRoundtripTests.cs:
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;
using MyApp.Api.DTOs;

public class AuthSettingsRoundtripTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public AuthSettingsRoundtripTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SignUp_SignIn_UpdateSettings_GetSettings()
    {
        var client = _factory.CreateClient();

        // 1) Sign up
        var signUpReq = new { Email = "itest@example.com", Password = "P@ssw0rd1", DisplayName = "ITest" };
        var signUpResp = await client.PostAsJsonAsync("/api/auth/signup", signUpReq);
        signUpResp.EnsureSuccessStatusCode();

        // 2) Sign in
        var signInReq = new { Email = "itest@example.com", Password = "P@ssw0rd1" };
        var signInResp = await client.PostAsJsonAsync("/api/auth/signin", signInReq);
        signInResp.EnsureSuccessStatusCode();
        var tokens = await signInResp.Content.ReadFromJsonAsync<TokenResponse>() ?? throw new Xunit.Sdk.XunitException("No tokens");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        // 3) Update settings
        var update = new UpdateSettingsRequest(true, false, "dark");
        var putResp = await client.PutAsJsonAsync("/api/settings", update);
        putResp.EnsureSuccessStatusCode();

        // 4) Get settings
        var getResp = await client.GetAsync("/api/settings");
        getResp.EnsureSuccessStatusCode();
        var settings = await getResp.Content.ReadFromJsonAsync<SettingsDto>();
        Assert.NotNull(settings);
        Assert.True(settings.EmailNotifications);
        Assert.Equal("dark", settings.Theme);
    }

    private record TokenResponse(string AccessToken, string RefreshToken);
}

README snippet: how to run locally (short):
1. Configure environment
   - Copy .env.example to .env and set DB connection string and JWT secrets (do not commit secrets).

2. Run database migrations
   cd src/MyApp.Api
   dotnet ef database update --project ../MyApp.Infrastructure --startup-project ./MyApp.Api

3. Run with Docker (optional)
   docker-compose -f build/docker/docker-compose.yml up --build

4. Run client
   - For Blazor WASM: dotnet run --project src/MyApp.Client
   - For Blazor Server: dotnet run --project src/MyApp.Api

5. Run tests
   dotnet test tests/MyApp.UnitTests
   dotnet test tests/MyApp.IntegrationTests

Docker Compose snippet for local SQL Server:
build/docker/docker-compose.yml:
version: "3.8"
services:
  sqlserver:
    image: mcr.microsoft.com/mssql/server:2022-latest
    container_name: myapp_sqlserver
    environment:
      SA_PASSWORD: "Your_password123" # use env file in real dev; placeholder here
      ACCEPT_EULA: "Y"
    ports:
      - "1433:1433"
    healthcheck:
      test: ["CMD-SHELL", "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P $SA_PASSWORD -Q \\"SELECT 1\\""]
      interval: 10s
      timeout: 5s
      retries: 10
    volumes:
      - sqlserver-data:/var/opt/mssql

  api:
    build:
      context: ../../src/MyApp.Api
      dockerfile: Dockerfile
    environment:
      - ConnectionStrings__DefaultConnection=Server=sqlserver,1433;Database=MyAppDb;User=sa;Password=\${SA_PASSWORD}
      - ASPNETCORE_ENVIRONMENT=Development
    depends_on:
      sqlserver:
        condition: service_healthy
    ports:
      - "5000:80"

volumes:
  sqlserver-data:

GitHub Actions CI workflow:
.github/workflows/ci.yml:
name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    services:
      sqlserver:
        image: mcr.microsoft.com/mssql/server:2022-latest
        env:
          SA_PASSWORD: "Your_password123!"
          ACCEPT_EULA: "Y"
        ports:
          - 1433:1433
        options: >-
          --health-cmd "/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P $SA_PASSWORD -Q 'SELECT 1'"
          --health-interval 10s --health-timeout 5s --health-retries 10

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore
        run: dotnet restore

      - name: Wait for SQL Server
        run: |
          for i in {1..30}; do
            /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "Your_password123!" -Q "SELECT 1" && break
            echo "Waiting for sqlserver..."
            sleep 2
          done

      - name: Apply EF Migrations
        working-directory: src/MyApp.Api
        env:
          ConnectionStrings__DefaultConnection: "Server=localhost,1433;Database=MyAppDb;User Id=sa;Password=Your_password123!"
        run: |
          dotnet tool restore
          dotnet ef database update --project ../MyApp.Infrastructure --startup-project ./MyApp.Api

      - name: Build
        run: dotnet build --no-restore --configuration Release

      - name: Run unit tests
        run: dotnet test tests/MyApp.UnitTests --no-build --verbosity normal

      - name: Run integration tests
        env:
          ConnectionStrings__DefaultConnection: "Server=localhost,1433;Database=MyAppDb;User Id=sa;Password=Your_password123!"
        run: dotnet test tests/MyApp.IntegrationTests --no-build --verbosity normal

Reviewer pass checklist (security & validation):
High‑priority checks (must pass before merge):
- Authentication & Authorization: JWT validation configured with ValidateIssuerSigningKey, ValidateIssuer, ValidateAudience, and RequireHttpsMetadata=true in production. Access to /api/profile and /api/settings requires [Authorize] and uses ClaimTypes.NameIdentifier for user identity.
- Password handling: Passwords hashed with a secure algorithm (use PasswordHasher<T> or Argon2 via vetted library). No plaintext storage.
- Refresh tokens: Refresh tokens stored server-side (rotating tokens recommended) and tied to user/device; revoke on logout.
- Input validation: DTOs use data annotations where applicable; controllers check ModelState.IsValid. Server-side validation for theme values and other enums; do not trust client values.
- SQL injection & ORM usage: Use EF Core parameterized queries; avoid raw SQL. If raw SQL used, use parameter binding.
- Sensitive data: No secrets in source. Use environment variables or secret store for DB connection strings and JWT keys. Do not log tokens, passwords, or PII. Mask or redact logs that may contain user identifiers.
- Transport security: Enforce HTTPS in production; set HSTS and secure cookie flags if cookies used.
- CSRF: For cookie-based auth, implement anti-forgery tokens. For JWT in Authorization header, CSRF risk is reduced but still consider secure storage.
- Rate limiting & brute force protection: Add rate limiting on auth endpoints (e.g., sign-in, sign-up) and account lockout after repeated failures.
- Error handling: Do not leak stack traces or internal errors to clients. Use centralized error handling middleware and return safe error messages.
- Data access scoping: Ensure repository queries always filter by UserId for per-user data; never return other users’ settings.
- Client storage: For Blazor WASM: store tokens in memory or secure storage; avoid localStorage for long-lived tokens. For Blazor Server: use server session or secure cookies.
- CORS: Configure CORS to allow only trusted origins for the frontend in production.
- Dependency review: List and justify third‑party packages; ensure they are up‑to‑date and have no known vulnerabilities.
- Tests: Unit tests for validation logic and auth flows; integration tests for roundtrip sign-up/sign-in and settings save/load.

Medium‑priority checks (recommended):
- Add Content Security Policy (CSP) headers.
- Add security headers (X-Content-Type-Options, X-Frame-Options).
- Implement logging of security events (failed logins, token refreshes).
- Add monitoring/alerting for suspicious activity.

How to run the reviewer pass locally:
- Run migrations against local SQL Server (docker-compose).
- Start API and client in dev mode.
- Execute unit tests: dotnet test tests/MyApp.UnitTests.
- Execute integration tests: dotnet test tests/MyApp.IntegrationTests.
- Manual smoke test:
  - Sign up a test user.
  - Sign in and obtain access token.
  - Call GET /api/profile and GET /api/settings with Authorization header.
  - Update profile and settings; verify DB rows and that only the authenticated user’s data changed.
  - Check logs for any sensitive data leakage.
`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    coder_initial: {
      type: Type.STRING,
      description: "Markdown string containing the initial plan and code generation by the Coder agent.",
    },
    reviewer_feedback: {
      type: Type.STRING,
      description: "Markdown string containing the code review feedback, pointing out issues, security flaws, or improvements by the Reviewer agent.",
    },
    coder_final: {
      type: Type.STRING,
      description: "Markdown string containing the final, refactored code or diffs based on feedback by the Coder agent.",
    },
    runner_output: {
      type: Type.STRING,
      description: "Markdown string containing simulated execution logs, test results, or build output by the Runner agent.",
    },
    final_summary: {
      type: Type.STRING,
      description: "A brief summary of the work done, review results, and execution status for the user.",
    },
  },
  required: ["coder_initial", "reviewer_feedback", "coder_final", "runner_output", "final_summary"],
};

export const processCodingRequest = async (
  prompt: string,
  temperature: number = 0.2,
  responseStyle: 'concise' | 'detailed' = 'concise'
): Promise<AgentWorkflowData> => {
  try {
    const styleInstruction = responseStyle === 'concise' 
      ? "Keep explanations brief and to the point. Focus primarily on the code."
      : "Provide detailed explanations for your architectural choices, code structure, and potential edge cases.";

    const finalSystemInstruction = `${SYSTEM_INSTRUCTION}\n\nStyle Preference: ${styleInstruction}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: temperature,
      },
    });

    let text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    // Fix: The model sometimes wraps JSON in markdown code blocks despite responseMimeType
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      const data = JSON.parse(text) as AgentWorkflowData;
      return data;
    } catch (parseError) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("The model returned an invalid response format. Please try again.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
