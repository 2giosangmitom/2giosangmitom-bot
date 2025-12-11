import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  MessageFlags
} from 'discord.js';
import OllamaService from '../services/ollama';
import { createLogger } from '../lib/logger';
import { isAppError } from '../lib/errors';

const logger = createLogger('Command:Ollama');

const ollama = {
  data: new SlashCommandBuilder()
    .setName('ollama')
    .setDescription('Ask AI a question using Ollama (llama3.2 model)')
    .addStringOption((option) =>
      option.setName('question').setDescription('Your question for the AI').setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const question = interaction.options.getString('question', true);

    try {
      // Check if Ollama is available
      const isAvailable = await OllamaService.isAvailable();
      if (!isAvailable) {
        await interaction.followUp({
          content: `Ollama is not available. Please ensure Ollama is running on \`${process.env['OLLAMA_BASE_URL']}\``,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const result = await OllamaService.generate(question);

      // Discord embed description limit is 2048 chars
      const maxLength = 2048;
      const response = result.response;

      if (response.length > maxLength) {
        // Split response into chunks that fit in embed descriptions
        const parts: string[] = [];
        let remaining = response;

        while (remaining.length > 0) {
          parts.push(remaining.substring(0, maxLength));
          remaining = remaining.substring(maxLength);
        }

        // Send first embed
        const firstEmbed = new EmbedBuilder()
          .setColor(0x7b68ee)
          .setTitle('AI Response')
          .setDescription(parts[0])
          .setFooter({
            text: `Model: ${result.model} | Processing time: ${(result.totalDuration / 1e9).toFixed(2)}s | Part 1/${parts.length}`
          })
          .setTimestamp();

        await interaction.followUp({ embeds: [firstEmbed] });

        // Send remaining parts
        for (let i = 1; i < parts.length; i++) {
          const embed = new EmbedBuilder()
            .setColor(0x7b68ee)
            .setTitle('AI Response (continued)')
            .setDescription(parts[i])
            .setFooter({ text: `Part ${i + 1}/${parts.length}` })
            .setTimestamp();

          await interaction.followUp({ embeds: [embed] });
        }
      } else {
        const aiEmbed = new EmbedBuilder()
          .setColor(0x7b68ee)
          .setTitle('AI Response')
          .setDescription(response)
          .setFooter({
            text: `Model: ${result.model} | Processing time: ${(result.totalDuration / 1e9).toFixed(2)}s`
          })
          .setTimestamp();

        await interaction.followUp({ embeds: [aiEmbed] });
      }

      logger.info('AI query processed', {
        userId: interaction.user.id,
        questionLength: question.length,
        model: result.model,
        processingTime: result.totalDuration
      });
    } catch (error) {
      logger.error('Failed to process AI query', error, {
        userId: interaction.user.id,
        question: question.substring(0, 100)
      });

      const message = isAppError(error)
        ? error.message
        : 'Failed to get response from AI. Please check if Ollama is running and the llama3.2 model is available.';

      await interaction.followUp({
        content: message,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default ollama;
