using System.Diagnostics;

namespace ScriptSnap.API.Services;

public class HttpLoggingHandler(ILogger<HttpLoggingHandler> logger) : DelegatingHandler
{
    private const int BodyPreviewLimit = 2000;

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken ct)
    {
        var uri = request.RequestUri!;
        // Strip query string to avoid leaking API keys
        var safeUrl = $"{uri.Scheme}://{uri.Host}{uri.AbsolutePath}";
        var requestBody = await ReadBodyAsync(request.Content);

        var sw = Stopwatch.StartNew();
        HttpResponseMessage? response = null;
        try
        {
            response = await base.SendAsync(request, ct);
            sw.Stop();

            var responseBody = await PeekBodyAsync(response.Content);
            var status = (int)response.StatusCode;

            if (response.IsSuccessStatusCode)
                logger.LogInformation(
                    "OUT {Method} {Url} → {Status} {Duration}ms | req={RequestBody} | res={ResponseBody}",
                    request.Method, safeUrl, status, sw.ElapsedMilliseconds, requestBody, responseBody);
            else
                logger.LogWarning(
                    "OUT {Method} {Url} → {Status} {Duration}ms | req={RequestBody} | res={ResponseBody}",
                    request.Method, safeUrl, status, sw.ElapsedMilliseconds, requestBody, responseBody);

            return response;
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogError(ex,
                "OUT {Method} {Url} failed after {Duration}ms | req={RequestBody}",
                request.Method, safeUrl, sw.ElapsedMilliseconds, requestBody);
            throw;
        }
    }

    private static async Task<string> ReadBodyAsync(HttpContent? content)
    {
        if (content is null) return "(no body)";

        var mime = content.Headers.ContentType?.MediaType ?? "";

        if (mime.Contains("multipart") || mime.Contains("octet-stream"))
        {
            var bytes = content.Headers.ContentLength ?? -1;
            return bytes >= 0 ? $"[binary {bytes:N0} bytes]" : "[binary]";
        }

        var text = await content.ReadAsStringAsync();
        return text.Length > BodyPreviewLimit
            ? text[..BodyPreviewLimit] + " …[truncated]"
            : text;
    }

    // Reads without consuming — HttpResponseMessage content can be re-read
    private static async Task<string> PeekBodyAsync(HttpContent content)
    {
        var mime = content.Headers.ContentType?.MediaType ?? "";

        if (mime.Contains("octet-stream"))
        {
            var bytes = content.Headers.ContentLength ?? -1;
            return bytes >= 0 ? $"[binary {bytes:N0} bytes]" : "[binary]";
        }

        var text = await content.ReadAsStringAsync();
        return text.Length > BodyPreviewLimit
            ? text[..BodyPreviewLimit] + " …[truncated]"
            : text;
    }
}
