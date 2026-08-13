import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { GeminiService } from './gemini.service';
import { RagService } from './rag.service';
import { ChatService } from './chat.service';
import { WritingAssistantService } from './writing-assistant.service';
import { ConsistencyService } from './consistency.service';

@Module({
  controllers: [AiController],
  providers: [GeminiService, RagService, ChatService, WritingAssistantService, ConsistencyService],
  exports: [RagService, GeminiService],
})
export class AiModule {}
