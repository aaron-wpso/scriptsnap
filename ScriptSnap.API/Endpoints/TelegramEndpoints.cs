using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using ScriptSnap.API.Data;
using ScriptSnap.API.Models;
using ScriptSnap.API.Services;
using Telegram.Bot.Types;

namespace ScriptSnap.API.Endpoints;

public static class TelegramEndpoints
{
    public static void MapTelegramEndpoints(this WebApplication app, bool telegramEnabled)
    {
        if (telegramEnabled)
        {
            app.MapPost("/api/telegram/webhook", async (
                Update update,
                TelegramBotService botService,
                CancellationToken ct) =>
            {
                await botService.HandleUpdateAsync(update, ct);
                return Results.Ok();
            });
        }

        // Link Telegram ID to the authenticated Supabase user
        app.MapPost("/api/telegram/link", async (
            LinkTelegramRequest req,
            AppDbContext db,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var existing = await db.TelegramUsers.FirstOrDefaultAsync(
                t => t.TelegramId == req.TelegramId, ct);

            if (existing is not null)
            {
                existing.UserId = userId;
                existing.Username = req.Username;
            }
            else
            {
                db.TelegramUsers.Add(new TelegramUser
                {
                    TelegramId = req.TelegramId,
                    UserId = userId,
                    Username = req.Username
                });
            }

            await db.SaveChangesAsync(ct);
            return Results.Ok(new { linked = true });
        }).RequireAuthorization();

        app.MapDelete("/api/telegram/link", async (
            AppDbContext db,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var linked = await db.TelegramUsers.FirstOrDefaultAsync(
                t => t.UserId == userId, ct);

            if (linked is not null)
            {
                db.TelegramUsers.Remove(linked);
                await db.SaveChangesAsync(ct);
            }

            return Results.Ok(new { unlinked = true });
        }).RequireAuthorization();
    }
}

public record LinkTelegramRequest(long TelegramId, string? Username);
