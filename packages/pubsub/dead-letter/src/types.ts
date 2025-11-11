export interface DeadLetterSubscription {
  name: string;
  unackedMessages: number;
}

export interface DeadLetterMessage {
  id: string;
  ackId: string;
  attributes: Record<string, string>;
  data: Buffer;
  receivedAt: number;
  publishedAt: number;
}
