export interface ProcessedEventRepository {
  hasBeenProcessed(eventId: string, handler: string): Promise<boolean>;
  markAsProcessed(eventId: string, handler: string): Promise<void>;
}
