namespace ScriptSnap.API.Models;

public class Transcription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string TikTokUrl { get; set; } = string.Empty;
    public string? AudioUrl { get; set; }
    public string? Transcript { get; set; }
    public TranscriptionStatus Status { get; set; } = TranscriptionStatus.Pending;
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}

public enum TranscriptionStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
