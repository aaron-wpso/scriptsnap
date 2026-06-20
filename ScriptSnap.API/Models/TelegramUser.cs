namespace ScriptSnap.API.Models;

public class TelegramUser
{
    public long TelegramId { get; set; }
    public Guid UserId { get; set; }
    public string? Username { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
