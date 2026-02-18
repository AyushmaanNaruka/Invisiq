import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  ModelConfig,
  ValidationResult,
  ProviderID,
} from '@shared/types';

export type { ChatMessage, ChatRequest, ChatResponse, StreamChunk, ModelConfig, ValidationResult, ProviderID };

export interface AIProvider {
  readonly name: string;
  readonly id: ProviderID;
  readonly models: ModelConfig[];

  initialize(apiKey: string): void;
  validateKey(): Promise<ValidationResult>;
  chat(request: ChatRequest): AsyncGenerator<StreamChunk, ChatResponse>;
  abort(): void;
}
