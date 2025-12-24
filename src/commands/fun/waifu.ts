import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import {
  WaifuService,
  getAllowedCategories,
} from "../../services/waifu.service.js";

export class WaifuCommand extends Command {
  private readonly waifuService: WaifuService;

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "waifu",
      description: "Get a random SFW anime image",
    });

    this.waifuService = new WaifuService();
  }

  public override registerApplicationCommands(
    registry: Command.Registry,
  ): void {
    const categories = getAllowedCategories();

    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Image category (default: waifu)")
            .setRequired(false)
            .addChoices(
              ...categories.map((cat) => ({
                name: cat.charAt(0).toUpperCase() + cat.slice(1),
                value: cat,
              })),
            ),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<void> {
    const category = interaction.options.getString("category") ?? undefined;

    this.container.logger.info(
      `[WaifuCommand] Execution - User: ${interaction.user.tag}, Category: ${category ?? "default"}`,
    );

    await interaction.deferReply();

    try {
      const result = await this.waifuService.fetchImage(category);

      const embed = new EmbedBuilder()
        .setTitle("🎨 Random Waifu")
        .setDescription(`Category: **${result.category}**`)
        .setImage(result.imageUrl)
        .setFooter({ text: "Powered by waifu.pics" })
        .setColor(0xff69b4);

      await interaction.editReply({ embeds: [embed] });

      this.container.logger.info(
        `[WaifuCommand] Completed - Category: ${result.category}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.container.logger.error(`[WaifuCommand] Error: ${errorMessage}`);

      await interaction.editReply({
        content: `❌ Failed to fetch image: ${errorMessage}`,
      });
    }
  }
}
