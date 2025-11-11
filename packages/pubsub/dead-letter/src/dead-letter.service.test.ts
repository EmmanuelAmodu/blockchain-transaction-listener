import { faker } from '@faker-js/faker';
import { Message } from '@google-cloud/pubsub';
import { PubSubDeadLetterService } from './dead-letter.service';
import { ListMessagesMode } from './pubsub';
import {
  dlSubscriptionsUndeliveredMessagesMQL,
  parseTimeSeriesData,
} from './utils';

jest.mock('./utils');

describe('PubSubDeadLetterService', () => {
  let service: PubSubDeadLetterService;

  beforeEach(() => {
    service = new PubSubDeadLetterService();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getDeadLetterSubscriptions', () => {
    let spyMQL: jest.Mock;
    let spyParseTimeSeriesData: jest.Mock;

    beforeAll(() => {
      spyMQL = dlSubscriptionsUndeliveredMessagesMQL as jest.Mock;
      spyParseTimeSeriesData = parseTimeSeriesData as jest.Mock;
    });

    it('should return list of dead letter subscriptions', async () => {
      const topics = Array.from({ length: 10 }, () => ({
        name: `${faker.string.alphanumeric(10)}-dl`,
      }));

      const spyListTopics = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(service['pubsub'], 'listTopics')
        .mockResolvedValue(topics);

      const metricData = Array.from({ length: 10 }, () => ({
        labelValues: [
          { stringValue: faker.string.alphanumeric(10) },
          { stringValue: faker.string.alphanumeric(10) },
        ],
        pointData: [
          { values: [{ doubleValue: faker.number.float() }] },
          { values: [{ int64Value: faker.number.int() }] },
        ],
      }));

      const parsedMetricData = topics.reduce((acc, { name }) => {
        acc[name] = faker.number.int();
        return acc;
      }, {} as Record<string, number>);

      const spyQueryMetric = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(service['monitoring'], 'queryMetric')
        .mockResolvedValue(metricData);

      spyMQL.mockReturnValue('test-mql');
      spyParseTimeSeriesData.mockReturnValue(parsedMetricData);

      const result = await service.getDeadLetterSubscriptions();

      expect(spyListTopics).toBeCalledTimes(1);
      expect(spyListTopics).toBeCalledWith({ suffix: '-dl' });
      expect(spyMQL).toBeCalledTimes(1);
      expect(spyMQL).toBeCalledWith(topics.map(({ name }) => name));
      expect(spyQueryMetric).toBeCalledTimes(1);
      expect(spyQueryMetric).toBeCalledWith('test-mql');
      expect(spyParseTimeSeriesData).toBeCalledTimes(1);
      expect(spyParseTimeSeriesData).toBeCalledWith(metricData);
      expect(result).toEqual(
        Object.entries(parsedMetricData).map(([name, value]) => ({
          name,
          unackedMessages: value,
        })),
      );
    });
  });

  describe('working with messages', () => {
    let messages: Pick<
      Message,
      'id' | 'data' | 'ackId' | 'attributes' | 'received' | 'publishTime'
    >[];
    let subscriptionName: string;

    beforeEach(() => {
      subscriptionName = `${faker.string.alphanumeric(10)}-dl`;
      messages = Array.from({ length: 10 }, () => ({
        id: faker.string.alphanumeric(10),
        data: Buffer.from(faker.string.alphanumeric(10)),
        ackId: faker.string.alphanumeric(10),
        attributes: {
          [faker.string.alphanumeric(10)]: faker.string.alphanumeric(10),
        },
        received: faker.date.recent().getTime(),
        publishTime: faker.date.recent() as any,
      }));
    });

    describe('previewMessages', () => {
      it('should return list of dead letter messages', async () => {
        const spyListMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'listMessages')
          .mockResolvedValue(messages);

        const result = await service.previewMessages({
          subscriptionName,
        });

        expect(spyListMessages).toBeCalledTimes(1);
        expect(spyListMessages).toBeCalledWith({
          subscriptionName,
          mode: ListMessagesMode.nack,
        });
        expect(result).toEqual(
          messages.map((message) => ({
            id: message.id,
            data: message.data,
            ackId: message.ackId,
            attributes: message.attributes,
            receivedAt: message.received,
            publishedAt: message.publishTime.getTime(),
          })),
        );
      });
    });

    describe('purgeMessages', () => {
      it('should return list of purged messages', async () => {
        const messageIds = messages.map(({ id }) => id);

        const spyListMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'listMessages')
          .mockResolvedValue(messages);

        const result = await service.purgeMessages({
          messageIds,
          subscriptionName,
        });

        expect(spyListMessages).toBeCalledTimes(1);
        expect(spyListMessages).toBeCalledWith({
          subscriptionName,
          filter: { id: messageIds },
          mode: ListMessagesMode.ack,
        });
        expect(result).toEqual(messages);
      });
    });

    describe('purgeAll', () => {
      it('should return list of purged messages', async () => {
        const spyListMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'listMessages')
          .mockResolvedValue(messages);

        const result = await service.purgeAll({
          subscriptionName,
        });

        expect(spyListMessages).toBeCalledTimes(1);
        expect(spyListMessages).toBeCalledWith({
          subscriptionName,
          limit: 5000,
          collectPeriod: 24_000,
          mode: ListMessagesMode.ack,
        });
        expect(result).toEqual(messages);
      });
    });

    describe('redeliverMessages', () => {
      it('should redeliver the messages', async () => {
        const messageIds = messages.map(({ id }) => id);

        const spyListMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'listMessages')
          .mockResolvedValue(messages);

        const spyPublishMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'publishMessages')
          .mockResolvedValue(undefined);

        await service.redeliverMessages({
          messageIds,
          subscriptionName,
        });

        expect(spyListMessages).toBeCalledTimes(1);
        expect(spyListMessages).toBeCalledWith({
          subscriptionName,
          filter: { id: messageIds },
          mode: ListMessagesMode.ack,
        });
        expect(spyPublishMessages).toBeCalledTimes(1);
        expect(spyPublishMessages).toBeCalledWith({
          messages,
          topicName: subscriptionName.replace(/-dl$/, ''),
        });
      });
    });

    describe('redeliverAll', () => {
      it('should redeliver all messages', async () => {
        const spyListMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'listMessages')
          .mockResolvedValue(messages);

        const spyPublishMessages = jest
          // eslint-disable-next-line dot-notation
          .spyOn<any, any>(service['pubsub'], 'publishMessages')
          .mockResolvedValue(undefined);

        await service.redeliverAll({
          subscriptionName,
        });

        expect(spyListMessages).toBeCalledTimes(3);
        expect(spyListMessages).toBeCalledWith({
          subscriptionName,
          limit: 500,
          collectPeriod: 8_000,
          mode: ListMessagesMode.ack,
        });
        expect(spyPublishMessages).toBeCalledTimes(3);
        expect(spyPublishMessages).toBeCalledWith({
          messages,
          topicName: subscriptionName.replace(/-dl$/, ''),
        });
      });
    });
  });
});
