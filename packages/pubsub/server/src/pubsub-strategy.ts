import { Message, PubSub, SubscriptionOptions } from '@google-cloud/pubsub';
import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { PubSubMetadata } from '.';
import { pubSubDecoratorExtras } from './constants';
import { InvalidMetadataException } from './errors/invalid-metadata-exception';
import { PubSubHandler } from './interfaces';

export class PubSubStrategy extends Server implements CustomTransportStrategy {
  /**
   * Google PubSub client handle
   */
  private pubSub?: PubSub;

  private subscriptionOptionsOverrides?: Partial<SubscriptionOptions>;

  private subscriptions: Array<ReturnType<PubSub['subscription']>> = [];

  /**
   * Creates a new PubSubStrategy instance
   * @param data Configuration options
   * @param data.pubsub Optional PubSub client instance
   * @param data.subscriptionOptionsOverrides Global subscription options that apply to all handlers.
   *   These are merged with per-handler subscriptionOptions using shallow merging.
   *   For nested objects (flowControl, batching), per-handler options completely replace global options.
   */
  constructor(data?: {
    pubsub?: PubSub;
    subscriptionOptionsOverrides?: Partial<SubscriptionOptions>;
  }) {
    super();

    if (data?.pubsub) {
      this.pubSub = data.pubsub;
    }
    this.subscriptionOptionsOverrides =
      data?.subscriptionOptionsOverrides || {};
  }

  /**
   * Get or initialize the PubSub client
   */
  private getPubSub(): PubSub {
    if (!this.pubSub) {
      this.pubSub = new PubSub();
    }
    return this.pubSub;
  }

  /**
   * This method is triggered when you run "app.listen()".
   */
  public async listen(callback: () => void) {
    const defaultSubscriptionOptions: Partial<SubscriptionOptions> = {
      batching: {
        maxMessages: 1,
      },
    };

    const handlers = this.getPubSubHandlers();
    handlers.forEach((handler) => {
      const subscriptionOptions = {
        ...defaultSubscriptionOptions,
        ...this.subscriptionOptionsOverrides,
        ...handler.subscriptionOptions,
      };

      const subscription = this.getPubSub().subscription(
        handler.subscriptionName,
        subscriptionOptions,
      );

      this.subscriptions.push(subscription);

      subscription.on('message', async (message: Message) =>
        this.handleMessage(message, handler),
      );
    });

    callback();
  }

  /**
   * This method is triggered on application shutdown.
   */
  public async close(): Promise<void> {
    // First, close all subscriptions
    await Promise.all(
      this.subscriptions.map((subscription) => subscription.close()),
    );
    this.subscriptions = [];

    // Then close the PubSub client if it was initialized
    if (this.pubSub) {
      await this.pubSub.close();
    }
  }

  /**
   * Required by Server interface - handles subscription to events
   */
  public on(pattern: any, callback: Function): void {
    // This implementation is not needed for PubSub strategy
    // as we handle subscriptions through the listen method
  }

  /**
   * Required by Server interface - unwraps the handler
   */
  public unwrap<T>(): T {
    return this as any;
  }

  /**
   * This method is triggered when we receive a message
   */
  private async handleMessage(message: Message, handler: PubSubHandler) {
    const parsedMessage = JSON.parse(message.data.toString());

    const callbackSubscription = await handler.callback(parsedMessage, message);

    callbackSubscription.subscribe({
      error() {
        if (!handler.skipAck) {
          message.nack();
        }
      },
      complete() {
        if (!handler.skipAck) {
          message.ack();
        }
      },
    });
  }

  /**
   * This method filters event message handlers
   * getHandlers is provided by nest.js and returns all methods that have EventPattern, in our case the decorator
   */
  private getPubSubHandlers() {
    const allHandlers = this.getHandlers();

    const filteredHandlers: PubSubHandler[] = [];

    allHandlers.forEach((value: any, key: any) => {
      if (value?.extras?.name === pubSubDecoratorExtras.name) {
        const metadata = this.parsePattern(key);

        filteredHandlers.push({
          subscriptionName: metadata.subscriptionName,
          skipAck: metadata.skipAck,
          subscriptionOptions: metadata.subscriptionOptions,
          callback: value,
        });
      }
    });

    return filteredHandlers;
  }

  /**
   * Parse a metadata pattern, throwing an exception if it cannot be parsed.
   *
   * @throws InvalidPatternMetadataException
   * Thrown if the JSON pattern cannot be parsed.
   */
  private parsePattern = (pattern: string): PubSubMetadata => {
    try {
      return JSON.parse(pattern);
    } catch (error) {
      throw new InvalidMetadataException(pattern);
    }
  };
}
