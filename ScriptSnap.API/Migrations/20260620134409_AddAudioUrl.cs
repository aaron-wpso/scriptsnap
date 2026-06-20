using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScriptSnap.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAudioUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AudioUrl",
                table: "Transcriptions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AudioUrl",
                table: "Transcriptions");
        }
    }
}
