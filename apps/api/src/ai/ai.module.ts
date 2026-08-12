import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AnthropicService } from './anthropic.service';
import { RagService } from './rag.service';
import { ChatService } from './chat.service';
import { WritingAssistantService } from './writing-assistant.service';
import { ConsistencyService } from './consistency.service';

@Module({
  controllers: [AiController],
  providers: [AnthropicService, RagService, ChatService, WritingAssistantService, ConsistencyService],
  exports: [RagService, AnthropicService],
})
export class AiModule {}
