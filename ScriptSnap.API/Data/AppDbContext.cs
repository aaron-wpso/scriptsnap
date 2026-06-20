using Microsoft.EntityFrameworkCore;
using ScriptSnap.API.Models;

namespace ScriptSnap.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Transcription> Transcriptions => Set<Transcription>();
    public DbSet<TelegramUser> TelegramUsers => Set<TelegramUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Transcription>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Status).HasConversion<string>();
            e.HasIndex(t => t.UserId);
        });

        modelBuilder.Entity<TelegramUser>(e =>
        {
            e.HasKey(t => t.TelegramId);
        });
    }
}
