using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ScriptSnap.API.Data;
using ScriptSnap.API.Models;

namespace ScriptSnap.API.Services;

public interface ITranscriptionService
{
    Task ProcessAsync(Guid transcriptionId, string url, CancellationToken ct = default);
}

public class TranscriptionService(
    AppDbContext db,
    IHttpClientFactory httpClientFactory,
    ILogger<TranscriptionService> logger) : ITranscriptionService
{

    public async Task ProcessAsync(Guid transcriptionId, string url, CancellationToken ct = default)
    {
        var record = await db.Transcriptions.FindAsync([transcriptionId], ct);
        if (record is null) return;

        try
        {
            record.Status = TranscriptionStatus.Processing;
            await db.SaveChangesAsync(ct);

            var media = await GetTikTokMediaAsync(url, ct);
            record.AudioUrl = media.AudioUrl;
            record.ThumbnailUrl = media.ThumbnailUrl;
            await db.SaveChangesAsync(ct);

            record.Transcript = await TranscribeWithGeminiAsync(media.AudioUrl, ct);
            record.Status = TranscriptionStatus.Completed;
            record.CompletedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Transcription {Id} failed", transcriptionId);
            record.Status = TranscriptionStatus.Failed;
            record.ErrorMessage = ex.Message;
        }

        await db.SaveChangesAsync(ct);
    }

    private record TikTokMedia(string AudioUrl, string? ThumbnailUrl);

    private async Task<TikTokMedia> GetTikTokMediaAsync(string tiktokUrl, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("tikwm");

        var response = await client.PostAsync("https://www.tikwm.com/api/",
            new FormUrlEncodedContent([
                new KeyValuePair<string, string>("url", tiktokUrl),
                new KeyValuePair<string, string>("hd", "0"),
            ]), ct);

        response.EnsureSuccessStatusCode();

        var root = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct)).RootElement;

        if (root.GetProperty("code").GetInt32() != 0)
            throw new InvalidOperationException($"TikWM error: {root.GetProperty("msg").GetString()}");

        var data = root.GetProperty("data");

        // play = full video audio (contains speech); music = background music only
        string? audioUrl = null;
        if (data.TryGetProperty("play", out var play) && play.GetString() is { Length: > 0 } playUrl)
            audioUrl = playUrl;
        else if (data.TryGetProperty("music", out var music) && music.GetString() is { Length: > 0 } musicUrl)
            audioUrl = musicUrl;

        if (audioUrl is null)
            throw new InvalidOperationException("TikWM returned no usable media URL.");

        string? thumbnailUrl = null;
        if (data.TryGetProperty("cover", out var cover) && cover.GetString() is { Length: > 0 } coverUrl)
            thumbnailUrl = coverUrl;

        return new TikTokMedia(audioUrl, thumbnailUrl);
    }

    private async Task<string> TranscribeWithGeminiAsync(string audioUrl, CancellationToken ct)
    {
        var tikwmClient = httpClientFactory.CreateClient("tikwm");
        var audioBytes = await tikwmClient.GetByteArrayAsync(audioUrl, ct);

        var geminiClient = httpClientFactory.CreateClient("gemini");

        // Upload to Gemini File API using multipart/related
        var fileUri = await UploadFileAsync(geminiClient, audioBytes, ct);

        // Generate transcript
        var body = JsonSerializer.Serialize(new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = "Transcribe all speech in this audio accurately. Return only the transcript text with no labels, timestamps, or commentary." },
                        new { fileData = new { mimeType = "audio/mp4", fileUri } }
                    }
                }
            }
        });

        var generateResponse = await geminiClient.PostAsync(
            "/v1beta/models/gemini-3.5-flash:generateContent",
            new StringContent(body, Encoding.UTF8, "application/json"),
            ct);

        generateResponse.EnsureSuccessStatusCode();

        var resultRoot = JsonDocument.Parse(
            await generateResponse.Content.ReadAsStringAsync(ct)).RootElement;

        return resultRoot
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()
            ?? throw new InvalidOperationException("Gemini returned an empty transcript.");
    }

    private async Task<string> UploadFileAsync(HttpClient client, byte[] audioBytes, CancellationToken ct)
    {
        var boundary = $"boundary_{Guid.NewGuid():N}";

        var metadata = """{"file":{"displayName":"audio"}}""";
        var metadataBytes = Encoding.UTF8.GetBytes(metadata);

        // Build multipart/related body manually — Gemini File API requires this specific format
        using var body = new MemoryStream();
        var nl = "\r\n"u8.ToArray();

        void Write(string s) => body.Write(Encoding.UTF8.GetBytes(s));

        Write($"--{boundary}\r\n");
        Write("Content-Type: application/json; charset=UTF-8\r\n\r\n");
        body.Write(metadataBytes);
        Write($"\r\n--{boundary}\r\n");
        Write("Content-Type: audio/mp4\r\n\r\n");
        body.Write(audioBytes);
        Write($"\r\n--{boundary}--");

        var bodyBytes = body.ToArray();

        var request = new HttpRequestMessage(HttpMethod.Post, "/upload/v1beta/files");
        request.Content = new ByteArrayContent(bodyBytes);
        request.Content.Headers.ContentType =
            MediaTypeHeaderValue.Parse($"multipart/related; boundary={boundary}");
        request.Headers.Add("X-Goog-Upload-Protocol", "multipart");

        var uploadResponse = await client.SendAsync(request, ct);
        uploadResponse.EnsureSuccessStatusCode();

        var uploadRoot = JsonDocument.Parse(
            await uploadResponse.Content.ReadAsStringAsync(ct)).RootElement;

        return uploadRoot.GetProperty("file").GetProperty("uri").GetString()
            ?? throw new InvalidOperationException("Gemini File API returned no URI.");
    }
}
