using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace UserService.Models;

public enum UserRole
{
    User = 0,
    Admin = 1
}

[Flags]
public enum Permission
{
    None = 0,
    ViewUsers = 1,
    EditUsers = 2,
    DeleteUsers = 4,
    ViewProducts = 8,
    EditProducts = 16,
    DeleteProducts = 32,
    All = ViewUsers | EditUsers | DeleteUsers | ViewProducts | EditProducts | DeleteProducts
}

public class User
{
    public int Id { get; set; }

    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [JsonIgnore]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    public bool IsActive { get; set; } = true;

    public bool EmailVerified { get; set; } = false;

    public UserRole Role { get; set; } = UserRole.User;

    public Permission Permissions { get; set; } = Permission.None;

    [JsonIgnore]
    public string? EmailVerificationToken { get; set; }

    [JsonIgnore]
    public DateTime? EmailVerificationExpiry { get; set; }

    [JsonIgnore]
    public string? PasswordResetToken { get; set; }

    [JsonIgnore]
    public DateTime? PasswordResetExpiry { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public virtual ICollection<LoginActivity> LoginActivities { get; set; } = new List<LoginActivity>();

    public bool HasPermission(Permission permission)
    {
        if (Role == UserRole.Admin) return true;
        return (Permissions & permission) == permission;
    }
}

public class LoginActivity
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public DateTime LoginTime { get; set; } = DateTime.UtcNow;

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    public bool IsSuccessful { get; set; }

    [MaxLength(255)]
    public string? FailureReason { get; set; }

    [JsonIgnore]
    public virtual User? User { get; set; }
}

// DTOs for Authentication
public class RegisterDto
{
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [Compare("Password")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }
}

public class LoginDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class ChangePasswordDto
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class UpdatePermissionsDto
{
    [Required]
    public int UserId { get; set; }

    public Permission Permissions { get; set; }
}

public class AuthResponse
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool EmailVerified { get; set; }
    public UserRole Role { get; set; }
    public Permission Permissions { get; set; }
}

// Existing DTOs
public class CreateUserDto
{
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    public UserRole Role { get; set; } = UserRole.User;
}

public class UpdateUserDto
{
    [EmailAddress]
    [MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    public bool? IsActive { get; set; }

    public UserRole? Role { get; set; }

    public Permission? Permissions { get; set; }
}

public class UserResponseDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public bool IsActive { get; set; }
    public bool EmailVerified { get; set; }
    public UserRole Role { get; set; }
    public Permission Permissions { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}
