import { DeliverableType } from '@prisma/client';

export interface DeliverableContext {
  id: string;
  deliverableId: string;
  type: DeliverableType;
  projectId: string;
  documentIds: string[];
  user_prompt?: string;
}
