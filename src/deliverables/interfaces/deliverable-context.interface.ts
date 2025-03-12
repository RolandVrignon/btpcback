import { DeliverableType } from '@prisma/client';

export interface DeliverableContext {
  id: string;
  type: DeliverableType;
  projectId: string;
  documentIds: string[];
}
