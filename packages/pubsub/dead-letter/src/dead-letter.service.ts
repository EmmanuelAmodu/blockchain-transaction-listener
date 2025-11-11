import { Message } from '@google-cloud/pubsub';
import { MonitoringClient } from './monitoring';
import { ListMessagesMode, PubSubClient } from './pubsub';
import { DeadLetterMessage, DeadLetterSubscription } from './types';
import {
  dlSubscriptionsUndeliveredMessagesMQL,
  parseTimeSeriesData,
} from './utils';

export class PubSubDeadLetterService {
  private readonly monitoring: MonitoringClient;

  private readonly pubsub: PubSubClient;

  constructor() {
    this.monitoring = new MonitoringClient();
    this.pubsub = new PubSubClient();
  }

  private async readMetrics(subscriptionNames: string[]) {
    const query = dlSubscriptionsUndeliveredMessagesMQL(subscriptionNames);
    const data = await this.monitoring.queryMetric(query);
    return parseTimeSeriesData(data);
  }

  public async getDeadLetterSubscriptions(): Promise<DeadLetterSubscription[]> {
    // our DL topics a suffixed with `-dl`
    const topics = await this.pubsub.listTopics({ suffix: '-dl' });
    // we also are sure that DL subscriptions have same names as topics
    const names = topics.map((topic) => topic.name.split('/').pop() ?? '');
    const metrics = await this.readMetrics(names);
    return names.map((name) => ({
      name,
      unackedMessages: metrics[name] ?? 0,
    }));
  }

  public async previewMessages({
    subscriptionName,
  }: {
    subscriptionName: string;
  }): Promise<DeadLetterMessage[]> {
    const messages = await this.pubsub.listMessages({
      subscriptionName,
      mode: ListMessagesMode.nack,
    });
    return messages.map((message) => ({
      id: message.id,
      data: message.data,
      ackId: message.ackId,
      attributes: message.attributes,
      receivedAt: message.received,
      publishedAt: message.publishTime.getTime(),
    }));
  }

  public async purgeMessages({
    messageIds,
    subscriptionName,
  }: {
    messageIds: string[];
    subscriptionName: string;
  }): Promise<Message[]> {
    // at this point we should pull same messages and ack them
    // to be removed from subscription
    return this.pubsub.listMessages({
      subscriptionName,
      filter: { id: messageIds },
      mode: ListMessagesMode.ack,
    });
  }

  public async purgeAll({
    subscriptionName,
  }: {
    subscriptionName: string;
  }): Promise<Message[]> {
    return this.pubsub.listMessages({
      subscriptionName,
      limit: 5000,
      collectPeriod: 24_000,
      mode: ListMessagesMode.ack,
    });
  }

  public async redeliverMessages({
    messageIds,
    subscriptionName,
  }: {
    messageIds: string[];
    subscriptionName: string;
  }) {
    const messages = await this.purgeMessages({
      messageIds,
      subscriptionName,
    });
    await this.pubsub.publishMessages({
      messages,
      topicName: subscriptionName.replace(/-dl$/, ''),
    });
  }

  public async redeliverAll({
    subscriptionName,
  }: {
    subscriptionName: string;
  }) {
    for (let i = 0; i < 3; i += 1) {
      const messages = await this.pubsub.listMessages({
        subscriptionName,
        limit: 500,
        collectPeriod: 8_000,
        mode: ListMessagesMode.ack,
      });

      await this.pubsub.publishMessages({
        messages,
        topicName: subscriptionName.replace(/-dl$/, ''),
      });
    }
  }
}
