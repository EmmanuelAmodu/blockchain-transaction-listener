import { faker } from '@faker-js/faker';
import { PubSubClient } from './client';
import { ListMessagesMode } from './types';
import { ackMessages, nackMessages, siftMessages } from './utils';

jest.mock('./utils');

describe('PubSubClient', () => {
  let client: PubSubClient;

  beforeEach(() => {
    client = new PubSubClient();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('listTopics', () => {
    let prefix: string;
    let suffix: string;
    let sources: string[];
    let spyGetTopics: jest.SpyInstance;

    beforeEach(() => {
      prefix = faker.string.alphanumeric(10);
      suffix = faker.string.alphanumeric(10);
      sources = Array.from({ length: 10 }, () => faker.string.alphanumeric(4))
        .concat(
          Array.from(
            { length: 10 },
            () => `${prefix}${faker.string.alphanumeric(4)}`,
          ),
        )
        .concat(
          Array.from(
            { length: 10 },
            () => `${faker.string.alphanumeric(4)}${suffix}`,
          ),
        )
        .concat(
          Array.from(
            { length: 10 },
            () => `${prefix}${faker.string.alphanumeric(4)}${suffix}`,
          ),
        );

      spyGetTopics = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(client['pubsub'], 'getTopics')
        .mockResolvedValue([sources.map((name) => ({ name }))]);
    });

    it('should return list of topics', async () => {
      const topics = await client.listTopics();

      expect(spyGetTopics).toBeCalledTimes(1);
      expect(topics.length).toBe(40);
      expect(topics).toEqual(
        expect.arrayContaining(
          sources.map((name) => expect.objectContaining({ name })),
        ),
      );
    });

    it('should return list of topics with prefix', async () => {
      const topics = await client.listTopics({ prefix });

      expect(spyGetTopics).toBeCalledTimes(1);
      expect(topics.length).toBe(20);
      expect(topics).toEqual(
        expect.arrayContaining(
          sources
            .filter((name) => name.startsWith(prefix))
            .map((name) => expect.objectContaining({ name })),
        ),
      );
    });

    it('should return list of topics with suffix', async () => {
      const topics = await client.listTopics({ suffix });

      expect(spyGetTopics).toBeCalledTimes(1);
      expect(topics.length).toBe(20);
      expect(topics).toEqual(
        expect.arrayContaining(
          sources
            .filter((name) => name.endsWith(suffix))
            .map((name) => expect.objectContaining({ name })),
        ),
      );
    });

    it('should return list of topics with prefix and suffix', async () => {
      const topics = await client.listTopics({ prefix, suffix });

      expect(spyGetTopics).toBeCalledTimes(1);
      expect(topics.length).toBe(10);
      expect(topics).toEqual(
        expect.arrayContaining(
          sources
            .filter((name) => name.startsWith(prefix) && name.endsWith(suffix))
            .map((name) => expect.objectContaining({ name })),
        ),
      );
    });
  });

  describe('publishMessages', () => {
    let spyTopic: jest.SpyInstance;
    let spyPublishMessage: jest.Mock;

    beforeEach(() => {
      spyPublishMessage = jest.fn(() => Promise.resolve());

      spyTopic = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(client['pubsub'], 'topic')
        .mockImplementation(() => ({
          publishMessage: spyPublishMessage,
        }));
    });

    it('should publish messages', async () => {
      const topicName = faker.string.alphanumeric();
      const messages = Array.from({ length: 10 }, () => ({
        data: Buffer.from(faker.string.alphanumeric()),
        attributes: {
          [faker.string.alphanumeric()]: faker.string.alphanumeric(),
          [faker.string.alphanumeric()]: faker.string.alphanumeric(),
        },
      }));

      await client.publishMessages({
        topicName,
        messages,
      });

      expect(spyTopic).toBeCalledTimes(1);
      expect(spyTopic).toBeCalledWith(topicName);

      expect(spyPublishMessage).toBeCalledTimes(10);
      messages.forEach((message) =>
        expect(spyPublishMessage).toBeCalledWith(message),
      );
    });
  });

  describe('listMessages', () => {
    let spySubscription: jest.SpyInstance;
    let mockSubscription: jest.Mock;
    let mockSiftMessages: jest.Mock;
    let mockNackMessages: jest.Mock;
    let mockAckMessages: jest.Mock;

    const fakeMessage = () => ({
      id: faker.string.alphanumeric(),
      ackId: faker.string.alphanumeric(),
      data: Buffer.from(faker.string.alphanumeric()),
      attributes: {
        [faker.string.alphanumeric()]: faker.string.alphanumeric(),
        [faker.string.alphanumeric()]: faker.string.alphanumeric(),
      },
      received: faker.date.past(),
      publishTime: new Date(),
    });

    beforeEach(() => {
      mockSubscription = jest.fn();
      mockSiftMessages = siftMessages as jest.Mock;
      mockNackMessages = nackMessages as jest.Mock;
      mockAckMessages = ackMessages as jest.Mock;

      spySubscription = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(client['pubsub'], 'subscription')
        .mockImplementation(() => mockSubscription);
    });

    it('should return list of messages in ack mode', async () => {
      const subscriptionName = faker.string.alphanumeric();

      const included = Array.from({ length: 10 }, fakeMessage);
      const excluded = Array.from({ length: 5 }, fakeMessage);
      mockSiftMessages.mockImplementation(() => ({
        included,
        excluded,
      }));

      const messages = await client.listMessages({
        subscriptionName,
        mode: ListMessagesMode.ack,
      });

      expect(spySubscription).toBeCalledTimes(1);
      expect(spySubscription).toBeCalledWith(subscriptionName);

      expect(mockSiftMessages).toBeCalledTimes(1);
      expect(mockSiftMessages).toBeCalledWith({
        subscription: mockSubscription,
        limit: 100,
        collectPeriod: 3_000,
        filter: {},
      });

      expect(mockNackMessages).toBeCalledTimes(1);
      expect(mockNackMessages).toBeCalledWith({
        subscription: mockSubscription,
        ackIds: excluded.map(({ ackId }) => ackId),
      });

      expect(mockAckMessages).toBeCalledTimes(1);
      expect(mockAckMessages).toBeCalledWith({
        subscription: mockSubscription,
        ackIds: included.map(({ ackId }) => ackId),
      });

      expect(messages).toEqual(included);
    });

    it('should return list of messages in nack mode', async () => {
      const subscriptionName = faker.string.alphanumeric();

      const included = Array.from({ length: 10 }, fakeMessage);
      const excluded = Array.from({ length: 5 }, fakeMessage);
      mockSiftMessages.mockImplementation(() => ({
        included,
        excluded,
      }));

      const messages = await client.listMessages({
        subscriptionName,
        mode: ListMessagesMode.nack,
      });

      expect(spySubscription).toBeCalledTimes(1);
      expect(spySubscription).toBeCalledWith(subscriptionName);

      expect(mockSiftMessages).toBeCalledTimes(1);
      expect(mockSiftMessages).toBeCalledWith({
        subscription: mockSubscription,
        limit: 100,
        collectPeriod: 3_000,
        filter: {},
      });

      expect(mockNackMessages).toBeCalledTimes(2);
      expect(mockNackMessages).toBeCalledWith({
        subscription: mockSubscription,
        ackIds: excluded.map(({ ackId }) => ackId),
      });
      expect(mockNackMessages).toBeCalledWith({
        subscription: mockSubscription,
        ackIds: included.map(({ ackId }) => ackId),
      });

      expect(messages).toEqual(included);
    });

    it('should return list of messages in hold mode', async () => {
      const subscriptionName = faker.string.alphanumeric();

      const included = Array.from({ length: 10 }, fakeMessage);
      const excluded = Array.from({ length: 5 }, fakeMessage);
      mockSiftMessages.mockImplementation(() => ({
        included,
        excluded,
      }));

      const messages = await client.listMessages({
        subscriptionName,
        mode: ListMessagesMode.hold,
      });

      expect(spySubscription).toBeCalledTimes(1);
      expect(spySubscription).toBeCalledWith(subscriptionName);

      expect(mockSiftMessages).toBeCalledTimes(1);
      expect(mockSiftMessages).toBeCalledWith({
        subscription: mockSubscription,
        limit: 100,
        collectPeriod: 3_000,
        filter: {},
      });

      expect(mockNackMessages).toBeCalledTimes(1);
      expect(mockNackMessages).toBeCalledWith({
        subscription: mockSubscription,
        ackIds: excluded.map(({ ackId }) => ackId),
      });

      expect(mockAckMessages).toBeCalledTimes(0);

      expect(messages).toEqual(included);
    });
  });
});
