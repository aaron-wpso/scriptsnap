using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScriptSnap.API.Migrations
{
    /// <inheritdoc />
    public partial class AddModelUsed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ModelUsed",
                table: "Transcriptions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModelUsed",
                table: "Transcriptions");
        }
    }
}
