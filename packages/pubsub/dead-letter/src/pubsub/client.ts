import { ClientConfig, Message, PubSub, Topic } from '@google-cloud/pubsub';
import { ListMessagesFilter, ListMessagesMode } from './types';
import { ackMessages, nackMessages, siftMessages } from './utils';

export class PubSubClient {
  private readonly pubsub: PubSub;

  constructor(options?: ClientConfig) {
    this.pubsub = new PubSub(options);
  }

  /**
   * Lists all topics available in the current project
   *
   * @param params
   * @param params.prefix filter topics by prefix in name
   * @param params.suffix filter topics by suffix in name
   * @returns list of topic objects
   */
  public async listTopics({
    prefix,
    suffix,
  }: {
    prefix?: string;
    suffix?: string;
  } = {}): Promise<Topic[]> {
    return this.pubsub
      .getTopics({
        pageSize: 1000,
        autoPaginate: true,
      })
      .then(([topics]) =>
        topics.filter((topic) => {
          if (
            (!!prefix && !topic.name.startsWith(prefix)) ||
            (!!suffix && !topic.name.endsWith(suffix))
          ) {
            return false;
          }
          return true;
        }),
      );
  }

  /**
   * Lists all messages in a subscription
   *
   * Will pull messages up to a `limit` or `collectPeriod` timeout
   *
   * @param {object} params
   * @param {ListMessagesMode} params.mode allows to configure in which mode to pull messages
   * @param {ListMessagesFilter} params.filter allows to sift through messages while pulling them
   * @param {string} params.subscriptionName subscription to list messages from
   * @param {number} params.collectPeriod time in ms to collect messages
   * @param {number} params.limit max number of messages to pull
   * @returns list of messages
   */
  public async listMessages({
    mode,
    subscriptionName,
    filter = {},
    collectPeriod = 3000,
    limit = 100,
  }: {
    mode: ListMessagesMode;
    filter?: ListMessagesFilter;
    subscriptionName: string;
    collectPeriod?: number;
    limit?: number;
  }): Promise<Message[]> {
    const subscription = this.pubsub.subscription(subscriptionName);

    const { included, excluded } = await siftMessages({
      limit,
      filter,
      subscription,
      collectPeriod,
    });

    const promises = [
      nackMessages({
        subscription,
        ackIds: excluded.map(({ ackId }) => ackId),
      }),
    ];
    switch (mode) {
      case ListMessagesMode.nack:
        promises.push(
          nackMessages({
            subscription,
            ackIds: included.map(({ ackId }) => ackId),
          }),
        );
        break;
      case ListMessagesMode.ack:
        promises.push(
          ackMessages({
            subscription,
            ackIds: included.map(({ ackId }) => ackId),
          }),
        );
        break;
      case ListMessagesMode.hold:
      default:
        break;
    }

    await Promise.all(promises);

    return included;
  }

  public async publishMessages({
    topicName,
    messages,
  }: {
    topicName: string;
    messages: Pick<Message, 'data' | 'attributes'>[];
  }) {
    const topic = this.pubsub.topic(topicName);
    return Promise.all(
      messages.map(({ data, attributes }) =>
        topic.publishMessage({ data, attributes }),
      ),
    );
  }
}
