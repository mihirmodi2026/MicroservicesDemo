using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Shared;
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
    public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetUsers()
    {
        var users = await _context.Users.ToListAsync();
        return Ok(ApiResponse<IEnumerable<User>>.Ok(users));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<User>>> GetUser(int id)
    {
        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(ApiResponse<User>.Fail("User not found"));
        }

        return Ok(ApiResponse<User>.Ok(user));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<User>>> CreateUser(CreateUserDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
        {
            return BadRequest(ApiResponse<User>.Fail("Username already exists"));
        }

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(ApiResponse<User>.Fail("Email already exists"));
        }

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created user {UserId} with username {Username}", user.Id, user.Username);

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, ApiResponse<User>.Ok(user, "User created successfully"));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<User>>> UpdateUser(int id, UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(ApiResponse<User>.Fail("User not found"));
        }

        if (dto.Username != null && dto.Username != user.Username)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            {
                return BadRequest(ApiResponse<User>.Fail("Username already exists"));
            }
            user.Username = dto.Username;
        }

        if (dto.Email != null && dto.Email != user.Email)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest(ApiResponse<User>.Fail("Email already exists"));
            }
            user.Email = dto.Email;
        }

        if (dto.FirstName != null) user.FirstName = dto.FirstName;
        if (dto.LastName != null) user.LastName = dto.LastName;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated user {UserId}", user.Id);

        return Ok(ApiResponse<User>.Ok(user, "User updated successfully"));
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(ApiResponse<bool>.Fail("User not found"));
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Deleted user {UserId}", id);

        return Ok(ApiResponse<bool>.Ok(true, "User deleted successfully"));
    }
}
