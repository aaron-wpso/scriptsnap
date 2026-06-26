using Microsoft.EntityFrameworkCore;
using ScriptSnap.API.Data;
using ScriptSnap.API.Models;
using Telegram.Bot;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;

namespace ScriptSnap.API.Services;

public class TelegramBotService(
    ITelegramBotClient bot,
    IServiceScopeFactory scopeFactory,
    ILogger<TelegramBotService> logger)
{
    private static readonly string[] TikTokHosts = ["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"];

    public async Task HandleUpdateAsync(Update update, CancellationToken ct = default)
    {
        if (update.Message is not { Text: { } text } message) return;

        var chatId = message.Chat.Id;
        var telegramUserId = message.From!.Id;

        if (text.StartsWith("/start"))
        {
            await bot.SendMessage(chatId,
                "Welcome to ScriptSnap!\n\nSend me a TikTok URL to transcribe it.\n\n" +
                "Make sure your Telegram account is linked at scriptsnap.app/settings first.",
                cancellationToken: ct);
            return;
        }

        if (!IsTikTokUrl(text))
        {
            await bot.SendMessage(chatId, "Please send a valid TikTok URL.", cancellationToken: ct);
            return;
        }

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var transcriptionSvc = scope.ServiceProvider.GetRequiredService<ITranscriptionService>();

        var linked = await db.TelegramUsers.FirstOrDefaultAsync(t => t.TelegramId == telegramUserId, ct);
        if (linked is null)
        {
            await bot.SendMessage(chatId,
                "Your Telegram account isn't linked yet.\n\nVisit scriptsnap.app/settings to link it.",
                cancellationToken: ct);
            return;
        }

        var record = new Transcription
        {
            UserId = linked.UserId,
            TikTokUrl = text
        };

        db.Transcriptions.Add(record);
        await db.SaveChangesAsync(ct);

        await bot.SendMessage(chatId, "Got it! Transcribing your video...", cancellationToken: ct);

        _ = Task.Run(async () =>
        {
            try
            {
                await transcriptionSvc.ProcessAsync(record.Id, text, TranscriptionService.DefaultModel);

                using var innerScope = scopeFactory.CreateScope();
                var innerDb = innerScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var completed = await innerDb.Transcriptions.FindAsync(record.Id);

                if (completed?.Status == TranscriptionStatus.Completed)
                    await bot.SendMessage(chatId, $"Transcript:\n\n{completed.Transcript}");
                else
                    await bot.SendMessage(chatId, "Transcription failed. Please try again.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Telegram transcription failed for chat {ChatId}", chatId);
                await bot.SendMessage(chatId, "Something went wrong. Please try again.");
            }
        }, ct);
    }

    private static bool IsTikTokUrl(string text)
    {
        return Uri.TryCreate(text.Trim(), UriKind.Absolute, out var uri)
            && TikTokHosts.Any(h => uri.Host.EndsWith(h));
    }
}
