using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Sinks.PostgreSQL.ColumnWriters;
using NpgsqlTypes;
using ScriptSnap.API.Data;
using ScriptSnap.API.Endpoints;
using ScriptSnap.API.Services;
using Telegram.Bot;

var builder = WebApplication.CreateBuilder(args);

// Development: secrets from dotnet user-secrets. Production (Railway): environment variables.
if (builder.Environment.IsDevelopment())
    builder.Configuration.AddUserSecrets<Program>();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;

// Serilog — console + Supabase Postgres
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore", Serilog.Events.LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore.HttpLogging", Serilog.Events.LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.PostgreSQL(
        connectionString: connectionString,
        tableName: "logs",
        columnOptions: new Dictionary<string, ColumnWriterBase>
        {
            { "id",         new IdAutoIncrementColumnWriter() },
            { "timestamp",  new TimestampColumnWriter(NpgsqlDbType.TimestampTz) },
            { "level",      new LevelColumnWriter(renderAsText: true, dbType: NpgsqlDbType.Text) },
            { "message",    new RenderedMessageColumnWriter(NpgsqlDbType.Text) },
            { "exception",  new ExceptionColumnWriter(NpgsqlDbType.Text) },
            { "properties", new PropertiesColumnWriter(NpgsqlDbType.Jsonb) },
        },
        needAutoCreateTable: true,
        schemaName: "public",
        period: TimeSpan.FromSeconds(5))
    .CreateLogger();

builder.Host.UseSerilog();

// Database
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(connectionString, npgsql => npgsql.CommandTimeout(60)));

// Supabase JWT auth via JWKS — handles ECC P-256 keys and auto-rotates
var supabaseUrl = builder.Configuration["Supabase:Url"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.Authority = $"{supabaseUrl}/auth/v1";
        opts.MetadataAddress = $"{supabaseUrl}/auth/v1/.well-known/openid-configuration";
        opts.RequireHttpsMetadata = true;
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddOpenApi();

// Incoming request/response logging
builder.Services.AddHttpLogging(o =>
{
    o.LoggingFields =
        HttpLoggingFields.RequestMethod |
        HttpLoggingFields.RequestPath |
        HttpLoggingFields.RequestQuery |
        HttpLoggingFields.RequestBody |
        HttpLoggingFields.ResponseStatusCode |
        HttpLoggingFields.ResponseBody |
        HttpLoggingFields.Duration;
    o.RequestBodyLogLimit  = 4096;
    o.ResponseBodyLogLimit = 4096;
    o.CombineLogs = true;
});

// HTTP logging handler for outgoing calls
builder.Services.AddTransient<HttpLoggingHandler>();

// Gemini
builder.Services.AddHttpClient("gemini", c =>
{
    c.BaseAddress = new Uri("https://generativelanguage.googleapis.com");
    c.DefaultRequestHeaders.Add("x-goog-api-key", builder.Configuration["Gemini:ApiKey"]);
    c.Timeout = TimeSpan.FromSeconds(120);
}).AddHttpMessageHandler<HttpLoggingHandler>();

// Telegram Bot — optional, gracefully skipped if BotToken is not configured
var telegramToken = builder.Configuration["Telegram:BotToken"];
if (!string.IsNullOrEmpty(telegramToken))
{
    builder.Services.AddSingleton<ITelegramBotClient>(new TelegramBotClient(telegramToken));
    builder.Services.AddScoped<TelegramBotService>();
}

// TikWM
builder.Services.AddHttpClient("tikwm", c =>
{
    c.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36");
    c.Timeout = TimeSpan.FromSeconds(30);
}).AddHttpMessageHandler<HttpLoggingHandler>();

// Transcription
builder.Services.AddScoped<ITranscriptionService, TranscriptionService>();

// CORS
builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(policy =>
        policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                           ?? ["http://localhost:3000"])
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// Register Telegram webhook (skipped locally unless BotToken + WebhookUrl are both set)
var webhookUrl = builder.Configuration["Telegram:WebhookUrl"];
if (!string.IsNullOrEmpty(telegramToken) && !string.IsNullOrEmpty(webhookUrl))
{
    var bot = app.Services.GetRequiredService<ITelegramBotClient>();
    await bot.SetWebhook($"{webhookUrl}/api/telegram/webhook");
}

app.UseHttpLogging();

app.MapOpenApi();
app.MapScalarApiReference();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapTranscribeEndpoints();
app.MapTelegramEndpoints(telegramEnabled: !string.IsNullOrEmpty(telegramToken));

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();
