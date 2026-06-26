using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ScriptSnap.API.Data;
using ScriptSnap.API.Models;
using ScriptSnap.API.Services;

namespace ScriptSnap.API.Endpoints;

public static class TranscribeEndpoints
{
    private static readonly HashSet<string> ValidModels =
        TranscriptionService.AvailableModels.Select(m => m.Id).ToHashSet();

    public static void MapTranscribeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/transcriptions").RequireAuthorization();

        group.MapGet("/models", () =>
            Results.Ok(TranscriptionService.AvailableModels.Select(m => new { id = m.Id, label = m.Label })));

        group.MapPost("/", async (
            TranscribeRequest req,
            AppDbContext db,
            IServiceScopeFactory scopeFactory,
            ClaimsPrincipal user) =>
        {
            if (!Uri.TryCreate(req.Url, UriKind.Absolute, out _))
                return Results.BadRequest(new { error = "Invalid URL." });

            var model = req.Model ?? TranscriptionService.DefaultModel;
            if (!ValidModels.Contains(model))
                return Results.BadRequest(new { error = "Invalid model." });

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var record = new Transcription { UserId = userId, TikTokUrl = req.Url, ModelUsed = model };
            db.Transcriptions.Add(record);
            await db.SaveChangesAsync();

            _ = Task.Run(async () =>
            {
                using var scope = scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<ITranscriptionService>();
                await svc.ProcessAsync(record.Id, req.Url, model);
            });

            return Results.Accepted($"/api/transcriptions/{record.Id}", record);
        });

        group.MapPost("/{id:guid}/retry", async (
            Guid id,
            RetryRequest req,
            AppDbContext db,
            IServiceScopeFactory scopeFactory,
            ClaimsPrincipal user) =>
        {
            var model = req.Model ?? TranscriptionService.DefaultModel;
            if (!ValidModels.Contains(model))
                return Results.BadRequest(new { error = "Invalid model." });

            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var record = await db.Transcriptions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (record is null) return Results.NotFound();
            if (record.Status != TranscriptionStatus.Failed)
                return Results.BadRequest(new { error = "Only failed transcriptions can be retried." });

            record.Status = TranscriptionStatus.Pending;
            record.ErrorMessage = null;
            record.ModelUsed = model;
            await db.SaveChangesAsync();

            var url = record.TikTokUrl;
            _ = Task.Run(async () =>
            {
                using var scope = scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<ITranscriptionService>();
                await svc.ProcessAsync(id, url, model);
            });

            return Results.Accepted($"/api/transcriptions/{id}", record);
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

public record TranscribeRequest(string Url, string? Model = null);
public record RetryRequest(string? Model = null);
