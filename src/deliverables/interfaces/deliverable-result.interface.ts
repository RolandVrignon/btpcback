export interface DeliverableResult {
  success: boolean;
  data: {
    id: number;
    status: string;
    message: string;
  };
  metadata?: Record<string, any>;
  error?: string;
}

export interface DeliverableContext {
  projectId: string;
  documentIds: string[];
  metadata?: Record<string, any>;
}
