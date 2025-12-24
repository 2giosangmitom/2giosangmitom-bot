import { createTimer } from "../utils/timer.js";

export interface OllamaResponse {
  content: string;
  model: string;
  elapsedMs: number;
}

interface OllamaApiResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface Logger {
  debug: (...args: unknown[]) => void;
}

export interface OllamaServiceOptions {
  baseUrl: string;
  model?: string;
  logger?: Logger;
}

export class OllamaService {
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: Logger | undefined;

  constructor(options: OllamaServiceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.defaultModel = options.model ?? "llama3.2:3b";
    this.logger = options.logger;
  }

  /**
   * Sends a chat message to Ollama and returns the response with timing.
   */
  async chat(prompt: string, model?: string): Promise<OllamaResponse> {
    const useModel = model ?? this.defaultModel;
    const timer = createTimer();

    this.logger?.debug(`[OllamaService] Sending request to model: ${useModel}`);

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaApiResponse;
    const elapsedMs = timer.elapsed();

    this.logger?.debug(`[OllamaService] Response received in ${elapsedMs}ms`);

    return {
      content: data.message.content,
      model: data.model,
      elapsedMs,
    };
  }
}
