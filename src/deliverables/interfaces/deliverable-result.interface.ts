export interface DeliverableResult {
  success: boolean;
  data: {
    status: string;
    message: string;
  } | null;
  metadata?: Record<string, any>;
  error?: string;
}

export interface DeliverableContext {
  projectId: string;
  documentIds: string[];
  metadata?: Record<string, any>;
}
