import { Command } from "@sapphire/framework";
import { OllamaService } from "../../services/ollama.service.js";
import { config } from "../../config.js";
import { createTimer } from "../../utils/timer.js";
import { splitMessage, DISCORD_MESSAGE_LIMIT } from "../../utils/message.js";

const ALLOWED_MODELS = [
  { name: "Llama 3.2 (3B)", value: "llama3.2:3b" },
  { name: "Qwen 2.5 (3B)", value: "qwen2.5:3b" },
] as const;

const DEFAULT_MODEL = "llama3.2:3b";

export class ChatCommand extends Command {
  private readonly ollamaService: OllamaService;

  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "chat",
      description: "Chat with AI using Ollama",
    });

    this.ollamaService = new OllamaService({
      baseUrl: config.ollamaBaseUrl,
      logger: this.container.logger,
    });
  }

  public override registerApplicationCommands(
    registry: Command.Registry,
  ): void {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName("prompt")
            .setDescription("Your message to the AI")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("model")
            .setDescription(`AI model to use (default: ${DEFAULT_MODEL})`)
            .setRequired(false)
            .addChoices(...ALLOWED_MODELS),
        ),
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ): Promise<void> {
    const commandTimer = createTimer();
    const prompt = interaction.options.getString("prompt", true);
    const model = interaction.options.getString("model") ?? DEFAULT_MODEL;

    this.container.logger.info(
      `[ChatCommand] Execution started - User: ${interaction.user.tag}, Prompt: "${prompt.substring(0, 50)}..."`,
    );

    await interaction.deferReply();

    try {
      const response = await this.ollamaService.chat(prompt, model);

      const header = `🧠 **AI Response** (${response.model})\n⏱️ Response time: ${response.elapsedMs} ms\n\n`;
      const chunks = this.formatReplyChunks(header, response.content);

      // Send first chunk as edit reply
      await interaction.editReply(chunks[0]!);

      // Send remaining chunks as follow-up messages
      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp(chunks[i]!);
      }

      const totalElapsed = commandTimer.elapsed();
      this.container.logger.info(
        `[ChatCommand] Execution completed - Ollama: ${response.elapsedMs}ms, Total: ${totalElapsed}ms, Chunks: ${chunks.length}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.container.logger.error(`[ChatCommand] Error: ${errorMessage}`);

      await interaction.editReply({
        content: `❌ Failed to get AI response: ${errorMessage}`,
      });
    }
  }

  private formatReplyChunks(header: string, content: string): string[] {
    const headerLength = header.length;
    const firstChunkContentLimit = DISCORD_MESSAGE_LIMIT - headerLength;

    if (content.length <= firstChunkContentLimit) {
      return [header + content];
    }

    // Split content into chunks
    const contentChunks = splitMessage(content, DISCORD_MESSAGE_LIMIT - 50); // Leave room for continuation markers

    // First chunk includes header
    const result: string[] = [header + contentChunks[0]!];

    // Remaining chunks with continuation indicator
    for (let i = 1; i < contentChunks.length; i++) {
      result.push(
        `*(continued ${i + 1}/${contentChunks.length})*\n\n${contentChunks[i]!}`,
      );
    }

    return result;
  }
}
