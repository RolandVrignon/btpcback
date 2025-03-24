import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { experimental_createProviderRegistry as createProviderRegistry } from 'ai';

export const registry = createProviderRegistry({
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  google: createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
  }),
});

export interface ProviderRegistry {
  anthropic: any;
  openai: any;
  google: any;
}

/**
 * Types de configuration du streaming
 */
export interface StreamConfig {
  delayInMs?: number;
  chunking?: 'word' | 'line';
  _internal?: {
    delay?: (delayInMs: number) => Promise<void>;
  };
}

/**
 * Valeurs par défaut pour la configuration du streaming
 */
export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  delayInMs: 20,
  chunking: 'word',
};
