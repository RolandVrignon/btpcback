import { JSONValue } from 'ai';

export interface WebhookPayload {
  projectId: string;
  deliverableType: string;
  deliverableId: string;
  projectSummary: string | null;
  documents: {
    id: string;
    filename: string;
    ai_metadata: JSONValue;
  }[];
  userPrompt: string;
  webhookUrl: string | null;
}
