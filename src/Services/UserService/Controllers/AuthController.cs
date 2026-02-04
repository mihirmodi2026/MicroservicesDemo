using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared;
using System.Security.Cryptography;
using System.Text;
using UserService.Data;
using UserService.Models;

namespace UserService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserDbContext _context;
    private readonly ILogger<AuthController> _logger;

    public AuthController(UserDbContext context, ILogger<AuthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register(RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
        {
            return BadRequest(ApiResponse<AuthResponse>.Fail("Email already registered"));
        }

        var verificationToken = GenerateToken();

        var user = new User
        {
            Email = dto.Email.ToLower(),
            PasswordHash = HashPassword(dto.Password),
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            EmailVerificationToken = verificationToken,
            EmailVerified = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New user registered: {Email}", user.Email);

        // In production, send verification email here
        // For demo, we'll include the token in response
        var response = new AuthResponse
        {
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            EmailVerified = user.EmailVerified,
            Token = verificationToken // In production, this would be a JWT
        };

        return Ok(ApiResponse<AuthResponse>.Ok(response, $"Registration successful. Verification token: {verificationToken}"));
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

        // Update last login
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
            Token = GenerateToken() // In production, this would be a JWT
        };

        return Ok(ApiResponse<AuthResponse>.Ok(response, "Login successful"));
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<string>>> ForgotPassword(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null)
        {
            // Return success even if user not found (security best practice)
            return Ok(ApiResponse<string>.Ok(null, "If the email exists, a password reset link has been sent"));
        }

        user.PasswordResetToken = GenerateToken();
        user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Password reset requested for: {Email}", user.Email);

        // In production, send email with reset link
        // For demo, return the token
        return Ok(ApiResponse<string>.Ok(user.PasswordResetToken, $"Password reset token (valid for 1 hour): {user.PasswordResetToken}"));
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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);

        if (user == null)
        {
            return BadRequest(ApiResponse<bool>.Fail("Invalid verification token"));
        }

        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Email verified for: {Email}", user.Email);

        return Ok(ApiResponse<bool>.Ok(true, "Email verified successfully"));
    }

    [HttpPost("resend-verification")]
    public async Task<ActionResult<ApiResponse<string>>> ResendVerification(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null)
        {
            return Ok(ApiResponse<string>.Ok(null, "If the email exists, a verification link has been sent"));
        }

        if (user.EmailVerified)
        {
            return BadRequest(ApiResponse<string>.Fail("Email is already verified"));
        }

        user.EmailVerificationToken = GenerateToken();
        await _context.SaveChangesAsync();

        // In production, send verification email
        return Ok(ApiResponse<string>.Ok(user.EmailVerificationToken, $"Verification token: {user.EmailVerificationToken}"));
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
