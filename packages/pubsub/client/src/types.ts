import { PublishOptions } from '@google-cloud/pubsub';

// TODO: Get types from onionfi-api codebase
export enum PubSubDomain {
  OrionSSE = 'orion-sse-messages',
}

export const TopicPublishOptions: Partial<
  Record<PubSubDomain, PublishOptions>
> = {
  [PubSubDomain.OrionSSE]: {
    batching: {
      maxMessages: 10_000,
    },
  },
};
