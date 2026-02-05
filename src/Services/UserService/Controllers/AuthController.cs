using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared;
using System.Security.Cryptography;
using System.Text;
using UserService.Data;
using UserService.Models;
using UserService.Services;

namespace UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _config;

    public AuthController(UserDbContext context, ILogger<AuthController> logger, IEmailService emailService, IConfiguration config)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
        {
            return BadRequest(ApiResponse<AuthResponse>.Fail("Email already registered"));
        }

        var verificationToken = GenerateToken();
        var isFirstUser = !await _context.Users.AnyAsync();

        var user = new User
        {
            Email = dto.Email.ToLower(),
            PasswordHash = HashPassword(dto.Password),
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            EmailVerificationToken = verificationToken,
            EmailVerificationExpiry = DateTime.UtcNow.AddHours(24),
            EmailVerified = false,
            Role = isFirstUser ? UserRole.Admin : UserRole.User,
            Permissions = isFirstUser ? Permission.All : Permission.None
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Send verification email
        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:5000";
        var verificationLink = $"{baseUrl}?verify={verificationToken}";

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email, user.FirstName, verificationLink);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email");
        }

        _logger.LogInformation("New user registered: {Email} (Role: {Role})", user.Email, user.Role);

        var response = new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            EmailVerified = user.EmailVerified,
            Role = user.Role,
            Permissions = user.Permissions
        };

        var message = isFirstUser
            ? "Registration successful! You are the first user and have been granted Admin access. Please check your email to verify your account."
            : "Registration successful! Please check your email to verify your account.";

        return Ok(ApiResponse<AuthResponse>.Ok(response, message));
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login(LoginDto dto)
    {
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null)
        {
            await LogLoginAttempt(null, ipAddress, userAgent, false, "User not found");
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Invalid email or password"));
        }

        if (!VerifyPassword(dto.Password, user.PasswordHash))
        {
            await LogLoginAttempt(user.Id, ipAddress, userAgent, false, "Invalid password");
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Invalid email or password"));
        }

        if (!user.IsActive)
        {
            await LogLoginAttempt(user.Id, ipAddress, userAgent, false, "Account deactivated");
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Account is deactivated"));
        }

        if (!user.EmailVerified)
        {
            await LogLoginAttempt(user.Id, ipAddress, userAgent, false, "Email not verified");
            return Unauthorized(ApiResponse<AuthResponse>.Fail("Please verify your email before logging in"));
        }

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await LogLoginAttempt(user.Id, ipAddress, userAgent, true, null);

        _logger.LogInformation("User logged in: {Email}", user.Email);

        var response = new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            EmailVerified = user.EmailVerified,
            Role = user.Role,
            Permissions = user.Permissions
        };

        return Ok(ApiResponse<AuthResponse>.Ok(response, "Login successful"));
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ForgotPassword(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null)
        {
            return Ok(ApiResponse<bool>.Ok(true, "If the email exists, a password reset link has been sent"));
        }

        user.PasswordResetToken = GenerateToken();
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
        await _context.SaveChangesAsync();

        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:5000";
        var resetLink = $"{baseUrl}?reset={user.PasswordResetToken}";

        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.FirstName, resetLink);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email");
        }

        _logger.LogInformation("Password reset requested for: {Email}", user.Email);

        return Ok(ApiResponse<bool>.Ok(true, "If the email exists, a password reset link has been sent"));
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<bool>>> ResetPassword(ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.PasswordResetToken == dto.Token &&
            u.PasswordResetExpiry > DateTime.UtcNow);

        if (user == null)
        {
            return BadRequest(ApiResponse<bool>.Fail("Invalid or expired reset token"));
        }

        user.PasswordHash = HashPassword(dto.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Password reset completed for: {Email}", user.Email);

        return Ok(ApiResponse<bool>.Ok(true, "Password has been reset successfully"));
    }

    [HttpGet("verify-email")]
    public async Task<ActionResult<ApiResponse<bool>>> VerifyEmail([FromQuery] string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u =>
            u.EmailVerificationToken == token &&
            u.EmailVerificationExpiry > DateTime.UtcNow);

        if (user == null)
        {
            return BadRequest(ApiResponse<bool>.Fail("Invalid or expired verification token"));
        }

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationExpiry = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Email verified for: {Email}", user.Email);

        return Ok(ApiResponse<bool>.Ok(true, "Email verified successfully! You can now log in."));
    }

    [HttpPost("resend-verification")]
    public async Task<ActionResult<ApiResponse<bool>>> ResendVerification(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null)
        {
            return Ok(ApiResponse<bool>.Ok(true, "If the email exists, a verification link has been sent"));
        }

        if (user.EmailVerified)
        {
            return BadRequest(ApiResponse<bool>.Fail("Email is already verified"));
        }

        user.EmailVerificationToken = GenerateToken();
        user.EmailVerificationExpiry = DateTime.UtcNow.AddHours(24);
        await _context.SaveChangesAsync();

        var baseUrl = _config["App:BaseUrl"] ?? "http://localhost:5000";
        var verificationLink = $"{baseUrl}?verify={user.EmailVerificationToken}";

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email, user.FirstName, verificationLink);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email");
        }

        return Ok(ApiResponse<bool>.Ok(true, "Verification email has been sent"));
    }

    [HttpGet("login-activity/{userId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<LoginActivity>>>> GetLoginActivity(int userId)
    {
        var activities = await _context.LoginActivities
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.LoginTime)
            .Take(20)
            .ToListAsync();

        return Ok(ApiResponse<IEnumerable<LoginActivity>>.Ok(activities));
    }

    [HttpPost("change-password/{userId}")]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword(int userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        if (!VerifyPassword(dto.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(ApiResponse<bool>.Fail("Current password is incorrect"));
        }

        user.PasswordHash = HashPassword(dto.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Password changed for user: {UserId}", userId);

        return Ok(ApiResponse<bool>.Ok(true, "Password changed successfully"));
    }

    // Admin-only: Update user permissions
    [HttpPost("update-permissions")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdatePermissions([FromHeader(Name = "X-User-Id")] int adminUserId, UpdatePermissionsDto dto)
    {
        var admin = await _context.Users.FindAsync(adminUserId);
        if (admin == null || admin.Role != UserRole.Admin)
        {
            return Unauthorized(ApiResponse<bool>.Fail("Admin access required"));
        }

        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        user.Permissions = dto.Permissions;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Permissions updated for user {UserId} by admin {AdminId}", dto.UserId, adminUserId);

        return Ok(ApiResponse<bool>.Ok(true, "Permissions updated successfully"));
    }

    // Admin-only: Make user admin
    [HttpPost("make-admin/{userId}")]
    public async Task<ActionResult<ApiResponse<bool>>> MakeAdmin([FromHeader(Name = "X-User-Id")] int adminUserId, int userId)
    {
        var admin = await _context.Users.FindAsync(adminUserId);
        if (admin == null || admin.Role != UserRole.Admin)
        {
            return Unauthorized(ApiResponse<bool>.Fail("Admin access required"));
        }

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        user.Role = UserRole.Admin;
        user.Permissions = Permission.All;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} promoted to Admin by {AdminId}", userId, adminUserId);

        return Ok(ApiResponse<bool>.Ok(true, "User is now an Admin"));
    }

    private async Task LogLoginAttempt(int? userId, string? ipAddress, string? userAgent, bool isSuccessful, string? failureReason)
    {
        if (userId.HasValue)
        {
            var activity = new LoginActivity
            {
                UserId = userId.Value,
                IpAddress = ipAddress,
                UserAgent = userAgent?.Length > 500 ? userAgent.Substring(0, 500) : userAgent,
                IsSuccessful = isSuccessful,
                FailureReason = failureReason
            };

            _context.LoginActivities.Add(activity);
            await _context.SaveChangesAsync();
        }
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "MicroservicesDemo_Salt_2024"));
        return Convert.ToBase64String(hashedBytes);
    }

    private static bool VerifyPassword(string password, string hash)
    {
        return HashPassword(password) == hash;
    }
}
