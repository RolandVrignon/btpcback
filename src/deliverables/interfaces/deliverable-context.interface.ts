import { DeliverableType } from '@prisma/client';

export interface DeliverableContext {
  id: number;
  type: DeliverableType;
  projectId: string;
  documentIds: string[];
}
