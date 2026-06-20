using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScriptSnap.API.Migrations
{
    /// <inheritdoc />
    public partial class AddThumbnailUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                table: "Transcriptions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThumbnailUrl",
                table: "Transcriptions");
        }
    }
}
