import { faker } from '@faker-js/faker';
import { PassThrough } from 'stream';
import { SubscriptionMethod } from './types';
import {
  ackMessages,
  nackMessages,
  sendSubscriptionRequest,
  siftMessages,
} from './utils';

describe('pubsub.utils', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('sendSubscriptionRequest', () => {
    test.each`
      method
      ${'acknowledge'}
      ${'modifyAckDeadline'}
    `(
      'sends $method request that resolves',
      async ({ method }: { method: SubscriptionMethod }) => {
        const mockRequest = jest
          .fn()
          .mockImplementation((_, cb) => cb(null, { success: true }));

        const result = await sendSubscriptionRequest({
          method,
          payload: { test: faker.string.alphanumeric(10) },
          subscription: {
            request: mockRequest,
          } as any,
        });

        expect(result).toEqual({ success: true });
        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toBeCalledWith(
          {
            method,
            reqOpts: { test: expect.any(String) },
            client: 'SubscriberClient',
          },
          expect.any(Function),
        );
      },
    );

    test.each`
      method
      ${'acknowledge'}
      ${'modifyAckDeadline'}
    `(
      'sends $method request that rejects',
      async ({ method }: { method: SubscriptionMethod }) => {
        const mockRequest = jest
          .fn()
          .mockImplementation((_, cb) => cb(new Error('!reject!'), null));

        expect.assertions(3);

        try {
          await sendSubscriptionRequest({
            method,
            payload: { test: faker.string.alphanumeric(10) },
            subscription: {
              request: mockRequest,
            } as any,
          });
        } catch (err) {
          expect(err).toEqual(new Error('!reject!'));
        }

        expect(mockRequest).toBeCalledTimes(1);
        expect(mockRequest).toBeCalledWith(
          {
            method,
            reqOpts: { test: expect.any(String) },
            client: 'SubscriberClient',
          },
          expect.any(Function),
        );
      },
    );
  });

  describe('nackMessages', () => {
    it('should not send request if no ackIds', async () => {
      const mockRequest = jest.fn();

      await nackMessages({
        ackIds: [],
        subscription: {
          request: mockRequest,
        } as any,
      });

      expect(mockRequest).toBeCalledTimes(0);
    });

    it('should send request if some ackIds', async () => {
      const ackIds = Array.from({ length: 10 }, () =>
        faker.string.alphanumeric(10),
      );

      const mockRequest = jest.fn().mockImplementation((_, cb) => cb(null, {}));
      const subscription = {
        name: faker.string.alphanumeric(10),
        request: mockRequest,
      } as any;

      await nackMessages({
        ackIds,
        subscription,
      });

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toBeCalledWith(
        {
          method: 'modifyAckDeadline',
          reqOpts: {
            ackIds,
            ackDeadlineSeconds: 0,
            subscription: subscription.name,
          },
          client: 'SubscriberClient',
        },
        expect.any(Function),
      );
    });
  });

  describe('ackMessages', () => {
    it('should not send request if no ackIds', async () => {
      const mockRequest = jest.fn();

      await ackMessages({
        ackIds: [],
        subscription: {
          request: mockRequest,
        } as any,
      });

      expect(mockRequest).toBeCalledTimes(0);
    });

    it('should send request if some ackIds', async () => {
      const ackIds = Array.from({ length: 10 }, () =>
        faker.string.alphanumeric(10),
      );

      const mockRequest = jest.fn().mockImplementation((_, cb) => cb(null, {}));
      const subscription = {
        name: faker.string.alphanumeric(10),
        request: mockRequest,
      } as any;

      await ackMessages({
        ackIds,
        subscription,
      });

      expect(mockRequest).toBeCalledTimes(1);
      expect(mockRequest).toBeCalledWith(
        {
          method: 'acknowledge',
          reqOpts: {
            ackIds,
            subscription: subscription.name,
          },
          client: 'SubscriberClient',
        },
        expect.any(Function),
      );
    });
  });

  describe('siftMessages', () => {
    let messages: { id: string; ackId: string; data: Buffer }[];

    beforeEach(() => {
      messages = Array.from({ length: 20 }, () => ({
        id: faker.string.alphanumeric(10),
        ackId: faker.string.alphanumeric(10),
        data: Buffer.from(faker.string.alphanumeric(10)),
      }));
    });

    it('should collect messages up to a limit', async () => {
      const stream = new PassThrough({ objectMode: true });
      const spyStreamOn = jest.spyOn(stream, 'on');
      const spyRemoveListener = jest.spyOn(stream, 'removeListener');

      const sifting = siftMessages({
        limit: 10,
        filter: {},
        collectPeriod: 3_000,
        subscription: stream as any,
      });

      messages.forEach((message) => stream.emit('message', message));

      const { included, excluded } = await sifting;

      expect(included).toHaveLength(10);
      expect(included).toEqual(messages.slice(0, 10));
      expect(excluded).toHaveLength(1);
      expect(excluded).toEqual(messages.slice(10, 11));

      expect(spyStreamOn).toBeCalledTimes(2);
      expect(spyStreamOn).toBeCalledWith('message', expect.any(Function));
      expect(spyStreamOn).toBeCalledWith('error', expect.any(Function));
      expect(spyRemoveListener).toBeCalledTimes(1);
      expect(spyRemoveListener).toBeCalledWith('message', expect.any(Function));
    });

    it('should collect messages with timeout', async () => {
      const stream = new PassThrough({ objectMode: true });
      const spyStreamOn = jest.spyOn(stream, 'on');
      const spyRemoveListener = jest.spyOn(stream, 'removeListener');

      const sifting = siftMessages({
        limit: 1_000,
        filter: {},
        collectPeriod: 500,
        subscription: stream as any,
      });

      messages.forEach((message) => stream.emit('message', message));

      const { included, excluded } = await sifting;

      expect(included).toHaveLength(messages.length);
      expect(included).toEqual(messages);
      expect(excluded).toHaveLength(0);

      expect(spyStreamOn).toBeCalledTimes(2);
      expect(spyStreamOn).toBeCalledWith('message', expect.any(Function));
      expect(spyStreamOn).toBeCalledWith('error', expect.any(Function));
      expect(spyRemoveListener).toBeCalledTimes(1);
      expect(spyRemoveListener).toBeCalledWith('message', expect.any(Function));
    });

    it('should collect messages with array filter', async () => {
      const stream = new PassThrough({ objectMode: true });
      const spyStreamOn = jest.spyOn(stream, 'on');
      const spyRemoveListener = jest.spyOn(stream, 'removeListener');

      const idsToLookFor = faker.helpers.arrayElements(
        messages.map(({ id }) => id),
      );

      const sifting = siftMessages({
        limit: 1_000,
        filter: {
          id: idsToLookFor,
        },
        collectPeriod: 500,
        subscription: stream as any,
      });

      messages.forEach((message) => stream.emit('message', message));

      const { included, excluded } = await sifting;

      expect(included).toHaveLength(idsToLookFor.length);
      expect(included).toEqual(
        messages.filter(({ id }) => idsToLookFor.includes(id)),
      );
      expect(excluded).toHaveLength(messages.length - idsToLookFor.length);
      expect(excluded).toEqual(
        messages.filter(({ id }) => !idsToLookFor.includes(id)),
      );

      expect(spyStreamOn).toBeCalledTimes(2);
      expect(spyStreamOn).toBeCalledWith('message', expect.any(Function));
      expect(spyStreamOn).toBeCalledWith('error', expect.any(Function));
      expect(spyRemoveListener).toBeCalledTimes(1);
      expect(spyRemoveListener).toBeCalledWith('message', expect.any(Function));
    });

    it('should collect messages with string filter', async () => {
      const stream = new PassThrough({ objectMode: true });
      const spyStreamOn = jest.spyOn(stream, 'on');
      const spyRemoveListener = jest.spyOn(stream, 'removeListener');

      const idToLookFor = faker.helpers.arrayElement(
        messages.map(({ id }) => id),
      );

      const sifting = siftMessages({
        limit: 1_000,
        filter: {
          id: idToLookFor,
        },
        collectPeriod: 500,
        subscription: stream as any,
      });

      messages.forEach((message) => stream.emit('message', message));

      const { included, excluded } = await sifting;

      expect(included).toHaveLength(1);
      expect(included).toEqual(messages.filter(({ id }) => id === idToLookFor));
      expect(excluded).toHaveLength(messages.length - 1);
      expect(excluded).toEqual(messages.filter(({ id }) => id !== idToLookFor));

      expect(spyStreamOn).toBeCalledTimes(2);
      expect(spyStreamOn).toBeCalledWith('message', expect.any(Function));
      expect(spyStreamOn).toBeCalledWith('error', expect.any(Function));
      expect(spyRemoveListener).toBeCalledTimes(1);
      expect(spyRemoveListener).toBeCalledWith('message', expect.any(Function));
    });
  });
});
