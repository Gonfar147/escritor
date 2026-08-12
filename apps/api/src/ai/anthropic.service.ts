import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CompleteOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Wrapper delgado sobre POST /v1/messages de la API de Anthropic. Claude se usa
 * acá para todo el razonamiento/generación (chat, continuar escritura, reescribir,
 * brainstorm, detección de inconsistencias) — Voyage AI es quien resuelve los
 * embeddings (ver EmbeddingsService), Anthropic no ofrece ese endpoint.
 */
@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    this.model = this.config.get<string>('ANTHROPIC_MODEL') ?? 'claude-sonnet-5';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(messages: AnthropicMessage[], opts: CompleteOptions = {}): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'ANTHROPIC_API_KEY no configurada en el servidor. Definila en las variables de entorno.',
      );
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 1,
        system: opts.system,
        messages,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Anthropic respondió ${res.status}: ${body}`);
      throw new InternalServerErrorException('El asistente de IA no pudo responder en este momento.');
    }

    const data = (await res.json()) as {
      content: { type: string; text?: string }[];
    };

    return data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n')
      .trim();
  }
}
