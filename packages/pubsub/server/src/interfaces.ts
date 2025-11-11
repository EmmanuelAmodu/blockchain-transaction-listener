import { Message, SubscriptionOptions } from '@google-cloud/pubsub';
import { Observable } from 'rxjs';

export interface PubSubMetadata {
  subscriptionName: string;
  skipAck?: boolean;
  subscriptionOptions?: Partial<SubscriptionOptions>;
}

export { Message as PubSubMessageClass } from '@google-cloud/pubsub';

export interface PubSubHandler {
  subscriptionName: string;
  skipAck?: boolean;
  subscriptionOptions?: Partial<SubscriptionOptions>;
  callback: (
    messageBody: Record<string, any>,
    message: Message,
  ) => Promise<Observable<void>>;
}
