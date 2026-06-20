using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ScriptSnap.API.Data;
using ScriptSnap.API.Models;
using ScriptSnap.API.Services;

namespace ScriptSnap.API.Endpoints;

public static class TranscribeEndpoints
{
    public static void MapTranscribeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transcriptions").RequireAuthorization();

        group.MapPost("/", async (
            TranscribeRequest req,
            AppDbContext db,
            IServiceScopeFactory scopeFactory,
            ClaimsPrincipal user) =>
        {
            if (!Uri.TryCreate(req.Url, UriKind.Absolute, out _))
                return Results.BadRequest(new { error = "Invalid URL." });

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var record = new Transcription { UserId = userId, TikTokUrl = req.Url };
            db.Transcriptions.Add(record);
            await db.SaveChangesAsync();

            _ = Task.Run(async () =>
            {
                using var scope = scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<ITranscriptionService>();
                await svc.ProcessAsync(record.Id, req.Url);
            });

            return Results.Accepted($"/api/transcriptions/{record.Id}", record);
        });

        group.MapGet("/", async (AppDbContext db, ClaimsPrincipal user, int page = 1, int pageSize = 10) =>
        {
            page     = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var query  = db.Transcriptions.Where(t => t.UserId == userId);
            var total  = await query.CountAsync();
            var items  = await query
                .OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
            return Results.Ok(new { items, total, page, pageSize });
        });

        group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, ClaimsPrincipal user) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var record = await db.Transcriptions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
            return record is null ? Results.NotFound() : Results.Ok(record);
        });
    }
}

public record TranscribeRequest(string Url);
