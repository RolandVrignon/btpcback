import { DeliverableContext } from './deliverable-context.interface';

export interface DeliverableStrategy {
  /**
   * Generate a deliverable based on the provided context
   * @param context The context containing all necessary information to generate the deliverable
   */
  generate(context: DeliverableContext): Promise<void>;
}
