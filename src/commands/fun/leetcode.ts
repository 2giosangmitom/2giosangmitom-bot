import { Command } from "@sapphire/framework";
import { EmbedBuilder } from "discord.js";
import type { ProblemFilter } from "../../services/leetcode.service.js";
import {
  getRandomProblem,
  loadFromFile,
  refreshProblems,
} from "../../services/leetcode.service.js";
import { searchCategories } from "../../utils/leetcode-category-fuse.js";
import { WaifuService } from "../../services/waifu.service.js";

export class LeetCodeCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "leetcode",
      description: "Get a random free LeetCode problem",
    });
  }

  public override registerApplicationCommands(
    registry: Command.Registry,
  ): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((opt) =>
          opt
            .setName("difficulty")
            .setDescription("Filter by difficulty level")
            .setRequired(false)
            .addChoices(
              { name: "Easy", value: "Easy" },
              { name: "Medium", value: "Medium" },
              { name: "Hard", value: "Hard" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("category")
            .setDescription("Filter by topic tag (e.g., Array, Tree)")
            .setRequired(false)
            .setAutocomplete(true),
        ),
    );
  }

  public override async autocompleteRun(
    interaction: Command.AutocompleteInteraction,
  ): Promise<void> {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "category") {
      const query = focused.value;
      const matches = searchCategories(query);

      await interaction.respond(
        matches.map((category) => ({
          name: category,
          value: category,
        })),
      );
    }
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<void> {
    const difficulty = interaction.options.getString("difficulty") as
      | "Easy"
      | "Medium"
      | "Hard"
      | null;
    const category = interaction.options.getString("category");

    this.container.logger.info(
      `[LeetCodeCommand] Execution - User: ${interaction.user.tag}, Difficulty: ${difficulty ?? "any"}, Category: ${category ?? "any"}`,
    );

    await interaction.deferReply();

    const filter: ProblemFilter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (category) filter.category = category;

    // Try to get from cache with filter
    let problem = getRandomProblem(filter);

    // If cache is empty, try to load from file
    if (!problem) {
      this.container.logger.info(
        "[LeetCodeCommand] Cache empty or no matches, loading from file...",
      );
      await loadFromFile();
      problem = getRandomProblem(filter);
    }

    // If still no problem, fetch from API
    if (!problem) {
      this.container.logger.info(
        "[LeetCodeCommand] No data file, fetching from API...",
      );
      try {
        await refreshProblems();
        problem = getRandomProblem(filter);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await interaction.editReply({
          content: `❌ Failed to fetch LeetCode problems: ${errorMessage}`,
        });
        return;
      }
    }

    // If still no problem after fetch, return error
    if (!problem) {
      const filterDesc = [
        difficulty ? `difficulty=${difficulty}` : null,
        category ? `category="${category}"` : null,
      ]
        .filter(Boolean)
        .join(", ");

      await interaction.editReply({
        content: filterDesc
          ? `❌ No LeetCode problems found matching: ${filterDesc}`
          : "❌ No LeetCode problems available. Please try again later.",
      });
      return;
    }

    const difficultyColors: Record<string, number> = {
      easy: 0x00b8a3,
      medium: 0xffc01e,
      hard: 0xff375f,
    };

    const difficultyKey = problem.difficulty.toLowerCase();

    const tagsDisplay =
      problem.tags.length > 0
        ? problem.tags.slice(0, 5).join(", ") +
          (problem.tags.length > 5 ? "..." : "")
        : "None";

    const embed = new EmbedBuilder()
      .setTitle("🧠 LeetCode Random Problem")
      .setDescription(
        `**[${problem.frontendId}] ${problem.title}**\n` +
          `Difficulty: **${problem.difficulty}**\n` +
          `Acceptance: **${problem.acRate}%**`,
      )
      .addFields({ name: "Tags", value: tagsDisplay, inline: false })
      .setURL(`https://leetcode.com/problems/${problem.titleSlug}`)
      .setFooter({
        text: "Powered by LeetCode",
        iconURL:
          "https://assets.leetcode.com/static_assets/public/icons/favicon-160x160.png",
      })
      .setColor(difficultyColors[difficultyKey] ?? 0x808080);

    const embeds = [embed];

    // If Hard problem, fetch a waifu image for motivation
    if (difficultyKey === "hard") {
      try {
        const waifuService = new WaifuService();
        const waifuResult = await waifuService.fetchImage("waifu");
        const motivationEmbed = new EmbedBuilder()
          .setTitle("💪 Hard Problem? Here's some motivation!")
          .setImage(waifuResult.imageUrl)
          .setColor(0xff375f)
          .setFooter({ text: "You've got this! Gambatte!" });

        embeds.push(motivationEmbed);
        this.container.logger.info(
          "[LeetCodeCommand] Hard problem - added waifu motivation",
        );
      } catch {
        // Silently skip waifu if it fails
        this.container.logger.warn(
          "[LeetCodeCommand] Failed to fetch waifu motivation image",
        );
      }
    }

    await interaction.editReply({ embeds });

    this.container.logger.info(
      `[LeetCodeCommand] Served problem: ${problem.frontendId} - ${problem.title}`,
    );
  }
}
