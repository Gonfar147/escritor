import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CompleteOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Wrapper delgado sobre generativelanguage.googleapis.com (Gemini). Reemplaza a
 * AnthropicService como motor de razonamiento/generación para todo el sistema
 * (chat, continuar escritura, reescribir, brainstorm, Arquitectura, Notas).
 * Mismo contrato público (`complete`, `isConfigured`) que AnthropicService, así
 * que los consumidores solo cambian de qué clase inyectan, no cómo la usan.
 *
 * Voyage AI sigue resolviendo los embeddings (ver EmbeddingsService) — este
 * cambio es solo del modelo de generación de texto, no toca la indexación/RAG.
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string | undefined;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY');
    this.model = this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-pro';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async complete(messages: AiMessage[], opts: CompleteOptions = {}): Promise<string> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY no configurada en el servidor. Definila en las variables de entorno.',
      );
    }

    // Gemini usa 'model' donde nosotros usamos 'assistant' para el turno del asistente.
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 1500,
          temperature: opts.temperature ?? 1,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Gemini respondió ${res.status}: ${body}`);
      throw new InternalServerErrorException('El asistente de IA no pudo responder en este momento.');
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };

    if (!data.candidates?.length) {
      const reason = data.promptFeedback?.blockReason;
      this.logger.error(`Gemini no devolvió candidatos${reason ? ` (blockReason: ${reason})` : ''}`);
      throw new InternalServerErrorException('El asistente de IA no pudo responder en este momento.');
    }

    return (data.candidates[0].content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();
  }
}
