import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  experimental_createProviderRegistry as createProviderRegistry,
  LanguageModelV1,
  wrapLanguageModel,
} from 'ai';
import { AI_Provider, UsageType } from '@prisma/client';

export const registry = createProviderRegistry({
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    compatibility: 'strict',
  }),
  google: createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
});

export interface ModelInterface {
  sdk: LanguageModelV1;
  provider: AI_Provider;
  model: string;
  type: UsageType;
}

export const model: ModelInterface = (() => {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      sdk: wrapLanguageModel({
        model: registry.languageModel('anthropic:claude-3-7-sonnet-20250219'),
        middleware: [],
      }),
      provider: AI_Provider.ANTHROPIC,
      model: 'claude-3-7-sonnet-20250219',
      type: UsageType.TEXT_TO_TEXT,
    };
  } else if (process.env.OPENAI_API_KEY) {
    return {
      sdk: wrapLanguageModel({
        model: registry.languageModel('openai:o3-mini'),
        middleware: [],
      }),
      provider: AI_Provider.OPENAI,
      model: 'o3-mini',
      type: UsageType.TEXT_TO_TEXT,
    };
  } else if (process.env.GOOGLE_API_KEY) {
    return {
      sdk: wrapLanguageModel({
        model: registry.languageModel('google:gemini-2-0-flash'),
        middleware: [],
      }),
      provider: AI_Provider.GEMINI,
      model: 'gemini-2-0-flash',
      type: UsageType.TEXT_TO_TEXT,
    };
  } else {
    throw new Error('No valid API key found for any provider');
  }
})();

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
  delayInMs: 10,
  chunking: 'word',
};
