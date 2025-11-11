import { EventPattern } from '@nestjs/microservices';
import { pubSubDecoratorExtras } from '../constants';
import { PubSubMetadata } from '../interfaces';

/**
 * Creates a subscription based on a subscriptionName provided
 * @param {string} subscriptionName - Name of the subscription you want to subscribe to.
 * @param {boolean=} skipAck - Optional param that disables auto acknowledge.
 * @param {Partial<SubscriptionOptions>=} subscriptionOptions - Optional subscription options for this specific handler.
 *   These options are merged with global subscriptionOptionsOverrides using shallow merging.
 *   For nested objects (like flowControl, batching), the per-handler options completely replace
 *   the global options. To preserve global nested properties, spread them manually.
 *
 * Available param decorators:
 * @PubSubMessage - Returns the PubSub message class (🚨 NOT body) - can be used to acknowledge the message for example
 * @PubSubMessageBody - Returns the body of the message
 * @PubSubMessageAttributes - Returns the attributes
 */
export function PubSubMessageHandler(
  metadata: PubSubMetadata,
): MethodDecorator {
  return EventPattern(
    JSON.stringify(metadata),
    undefined,
    pubSubDecoratorExtras,
  );
}
