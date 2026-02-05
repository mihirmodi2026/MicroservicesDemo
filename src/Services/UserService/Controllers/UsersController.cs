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
public class UsersController : ControllerBase
{
    private readonly UserDbContext _context;
    private readonly ILogger<UsersController> _logger;

    public UsersController(UserDbContext context, ILogger<UsersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<UserResponseDto>>>> GetUsers([FromHeader(Name = "X-User-Id")] int? requestUserId)
    {
        var requestingUser = requestUserId.HasValue ? await _context.Users.FindAsync(requestUserId.Value) : null;

        // Only admins or users with ViewUsers permission can see all users
        if (requestingUser == null || (!requestingUser.HasPermission(Permission.ViewUsers) && requestingUser.Role != UserRole.Admin))
        {
            return Unauthorized(ApiResponse<IEnumerable<UserResponseDto>>.Fail("Permission denied. You need ViewUsers permission."));
        }

        var users = await _context.Users
            .Select(u => new UserResponseDto
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                IsActive = u.IsActive,
                EmailVerified = u.EmailVerified,
                Role = u.Role,
                Permissions = u.Permissions,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt
            })
            .ToListAsync();

        return Ok(ApiResponse<IEnumerable<UserResponseDto>>.Ok(users));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<UserResponseDto>>> GetUser(int id, [FromHeader(Name = "X-User-Id")] int? requestUserId)
    {
        var requestingUser = requestUserId.HasValue ? await _context.Users.FindAsync(requestUserId.Value) : null;

        // Users can view their own profile, admins/users with ViewUsers can view any
        if (requestingUser == null || (requestUserId != id && !requestingUser.HasPermission(Permission.ViewUsers) && requestingUser.Role != UserRole.Admin))
        {
            return Unauthorized(ApiResponse<UserResponseDto>.Fail("Permission denied"));
        }

        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(ApiResponse<UserResponseDto>.Fail("User not found"));
        }

        var response = new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            EmailVerified = user.EmailVerified,
            Role = user.Role,
            Permissions = user.Permissions,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };

        return Ok(ApiResponse<UserResponseDto>.Ok(response));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserResponseDto>>> CreateUser(CreateUserDto dto, [FromHeader(Name = "X-User-Id")] int? requestUserId)
    {
        var requestingUser = requestUserId.HasValue ? await _context.Users.FindAsync(requestUserId.Value) : null;

        // Only admins or users with EditUsers permission can create users
        if (requestingUser == null || (!requestingUser.HasPermission(Permission.EditUsers) && requestingUser.Role != UserRole.Admin))
        {
            return Unauthorized(ApiResponse<UserResponseDto>.Fail("Permission denied. You need EditUsers permission."));
        }

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
        {
            return BadRequest(ApiResponse<UserResponseDto>.Fail("Email already exists"));
        }

        var user = new User
        {
            Email = dto.Email.ToLower(),
            PasswordHash = HashPassword(dto.Password),
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            EmailVerified = true, // Admin-created users are pre-verified
            Role = dto.Role,
            Permissions = Permission.None
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created user {UserId} with email {Email} by admin {AdminId}", user.Id, user.Email, requestUserId);

        var response = new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            EmailVerified = user.EmailVerified,
            Role = user.Role,
            Permissions = user.Permissions,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, ApiResponse<UserResponseDto>.Ok(response, "User created successfully"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<UserResponseDto>>> UpdateUser(int id, UpdateUserDto dto, [FromHeader(Name = "X-User-Id")] int? requestUserId)
    {
        var requestingUser = requestUserId.HasValue ? await _context.Users.FindAsync(requestUserId.Value) : null;

        // Users can edit their own profile (limited), admins/users with EditUsers can edit any
        bool isSelfEdit = requestUserId == id;
        bool hasEditPermission = requestingUser?.HasPermission(Permission.EditUsers) == true || requestingUser?.Role == UserRole.Admin;

        if (requestingUser == null || (!isSelfEdit && !hasEditPermission))
        {
            return Unauthorized(ApiResponse<UserResponseDto>.Fail("Permission denied. You need EditUsers permission."));
        }

        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(ApiResponse<UserResponseDto>.Fail("User not found"));
        }

        // Regular users can only edit their own name
        if (isSelfEdit && !hasEditPermission)
        {
            if (dto.FirstName != null) user.FirstName = dto.FirstName;
            if (dto.LastName != null) user.LastName = dto.LastName;
        }
        else
        {
            // Admins can edit everything
            if (dto.Email != null && dto.Email.ToLower() != user.Email)
            {
                if (await _context.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
                {
                    return BadRequest(ApiResponse<UserResponseDto>.Fail("Email already exists"));
                }
                user.Email = dto.Email.ToLower();
                user.EmailVerified = false;
            }

            if (dto.FirstName != null) user.FirstName = dto.FirstName;
            if (dto.LastName != null) user.LastName = dto.LastName;
            if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;
            if (dto.Role.HasValue) user.Role = dto.Role.Value;
            if (dto.Permissions.HasValue) user.Permissions = dto.Permissions.Value;
        }

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated user {UserId} by {RequesterId}", user.Id, requestUserId);

        var response = new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            IsActive = user.IsActive,
            EmailVerified = user.EmailVerified,
            Role = user.Role,
            Permissions = user.Permissions,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        };

        return Ok(ApiResponse<UserResponseDto>.Ok(response, "User updated successfully"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(int id, [FromHeader(Name = "X-User-Id")] int? requestUserId)
    {
        var requestingUser = requestUserId.HasValue ? await _context.Users.FindAsync(requestUserId.Value) : null;

        // Only admins or users with DeleteUsers permission can delete users
        if (requestingUser == null || (!requestingUser.HasPermission(Permission.DeleteUsers) && requestingUser.Role != UserRole.Admin))
        {
            return Unauthorized(ApiResponse<bool>.Fail("Permission denied. You need DeleteUsers permission."));
        }

        // Cannot delete yourself
        if (requestUserId == id)
        {
            return BadRequest(ApiResponse<bool>.Fail("You cannot delete your own account"));
        }

        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted user {UserId} by admin {AdminId}", id, requestUserId);

        return Ok(ApiResponse<bool>.Ok(true, "User deleted successfully"));
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password + "MicroservicesDemo_Salt_2024"));
        return Convert.ToBase64String(hashedBytes);
    }
}
