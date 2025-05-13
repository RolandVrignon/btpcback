import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

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
  openrouter: {
    ...createOpenRouter({
      apiKey: process.env.OPEN_ROUTER_API_KEY,
    }),
    textEmbeddingModel: () => {
      throw new Error('OpenRouter does not support embeddings');
    },
  },
});

export interface ModelInterface {
  sdk: LanguageModelV1;
  provider: AI_Provider;
  model: string;
  type: UsageType;
}

// List of available OpenRouter models
export enum AI_MODEL {
  DEEPSEEK_R1 = 'deepseek/deepseek-r1',
  DEEPSEEK_R1_DISTILL_LLAMA_70B = 'deepseek/deepseek-r1-distill-llama-70b',
  ANTHROPIC_CLAUDE_3_7_SONNET_THINKING = 'anthropic/claude-3.7-sonnet:thinking',
  ANTHROPIC_CLAUDE_3_5_SONNET = 'anthropic/claude-3.5-sonnet',
  OPENAI_GPT_4_1 = 'openai/gpt-4.1',
  OPENAI_GPT_4O_MINI = 'openai/gpt-4o-mini',
  PERPLEXITY_SONAR_DEEP_RESEARCH = 'perplexity/sonar-deep-research',
  GOOGLE_GEMINI_2_5_PRO_PREVIEW = 'google/gemini-2.5-pro-preview',
  GOOGLE_GEMINI_2_5_FLASH_PREVIEW = 'google/gemini-2.5-flash-preview',
  X_AI_GROK_3_BETA = 'x-ai/grok-3-beta',
  MISTRAL_MEDIUM_3 = 'mistralai/mistral-medium-3',
  QWEN_QWEN3_30B_A3B = 'qwen/qwen3-30b-a3b',
  QWEN_QWEN3_32B = 'qwen/qwen3-32b',
}

/**
 * Generate model configurations for OpenRouter
 */
export function getOpenRouterModels() {
  if (!process.env.OPEN_ROUTER_API_KEY) return [];
  return Object.values(AI_MODEL).map((modelName) => ({
    sdk: wrapLanguageModel({
      model: registry.languageModel(`openrouter:${modelName}`),
      middleware: [],
    }),
    provider: AI_Provider.OPENROUTER,
    model: modelName,
    type: UsageType.TEXT_TO_TEXT,
  }));
}

export const model: ModelInterface = (() => {
  if (process.env.OPEN_ROUTER_API_KEY) {
    // Default to the first OpenRouter model
    const openRouterModels = getOpenRouterModels();
    if (openRouterModels.length > 0) {
      return openRouterModels[0];
    }
    throw new Error('No OpenRouter models available');
  } else if (process.env.ANTHROPIC_API_KEY) {
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

export function getModelConfig(modelName: AI_MODEL): ModelInterface {
  console.log('getModelConfig modelName:', modelName);
  return {
    sdk: wrapLanguageModel({
      model: registry.languageModel(`openrouter:${modelName}`),
      middleware: [],
    }),
    provider: AI_Provider.OPENROUTER,
    model: modelName,
    type: UsageType.TEXT_TO_TEXT,
  };
}
