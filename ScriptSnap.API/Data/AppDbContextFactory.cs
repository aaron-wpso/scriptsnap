using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ScriptSnap.API.Data;

// Used only by EF Core tooling (dotnet ef migrations add) — not used at runtime.
// Reads connection string from user-secrets or environment variables.
// Local setup: dotnet user-secrets set "ConnectionStrings:DefaultConnection" "your-connection-string"
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var config = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddUserSecrets<AppDbContextFactory>(optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                "No connection string found. Run: " +
                "dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"your-connection-string\"");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new AppDbContext(options);
    }
}
