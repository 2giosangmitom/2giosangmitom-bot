import { Ollama } from 'ollama';
import { createLogger } from '../lib/logger';
import { env } from '../lib/env';

const logger = createLogger('Service:Ollama');

export interface GenerateAIResponse {
  response: string;
  model: string;
  totalDuration: number;
}

class OllamaService {
  private ollama: Ollama;
  private model = 'llama3.2';

  constructor() {
    this.ollama = new Ollama({
      host: env.OLLAMA_BASE_URL
    });

    logger.info('Ollama service initialized', {
      baseUrl: env.OLLAMA_BASE_URL,
      model: this.model
    });
  }

  /**
   * Generate a response from Ollama using llama3.2 model
   * @param prompt - The prompt to send to the model
   * @returns The generated response with metadata
   */
  async generate(prompt: string): Promise<GenerateAIResponse> {
    try {
      logger.debug('Generating response from Ollama', {
        promptLength: prompt.length,
        model: this.model
      });

      const response = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: false
      });

      if (!response.response) {
        throw new Error('Empty response from Ollama model');
      }

      logger.debug('Ollama response received', {
        responseLength: response.response.length,
        totalDuration: response.total_duration
      });

      return {
        response: response.response.trim(),
        model: this.model,
        totalDuration: response.total_duration || 0
      };
    } catch (error) {
      logger.error('Failed to generate response from Ollama', error, {
        prompt: prompt.substring(0, 100),
        model: this.model
      });
      throw error;
    }
  }

  /**
   * Check if Ollama is available and the model is loaded
   * @returns True if Ollama is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ollama.list();
      return true;
    } catch (error) {
      logger.warn('Ollama is not available', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get the currently configured model
   * @returns The model name
   */
  getModel(): string {
    return this.model;
  }
}

export default new OllamaService();
