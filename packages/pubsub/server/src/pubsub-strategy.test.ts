import { Message, PubSub } from '@google-cloud/pubsub';
import { of, throwError } from 'rxjs';
import { PubSubHandler, PubSubStrategy } from '.';
import { InvalidMetadataException } from './errors/invalid-metadata-exception';

jest.mock('@google-cloud/pubsub');

describe('PubSubStrategy', () => {
  let pubSubStrategy: PubSubStrategy;

  beforeAll(() => {
    pubSubStrategy = new PubSubStrategy();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('listen', () => {
    let pubsubMock: PubSub;
    let subscriptionMock;

    beforeEach(() => {
      const subscriptionMockValue = () => ({ on: jest.fn() });

      pubsubMock = { subscription: subscriptionMockValue } as unknown as PubSub;

      subscriptionMock = jest.spyOn<any, any>(pubsubMock, 'subscription');
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should callback', async () => {
      const callback = jest.fn();

      await pubSubStrategy.listen(callback);

      expect(callback).toBeCalledTimes(1);
    });

    it('should call the subscription without any overrides', async () => {
      const callback = jest.fn();
      // init class
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
      });

      // mock the handlers
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([{ subscriptionName: 'test_sub' }]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toBeCalledWith('test_sub', {
        batching: { maxMessages: 1 },
      });
    });

    it('should call the subscription with overrides', async () => {
      const callback = jest.fn();
      // init class
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
        subscriptionOptionsOverrides: { batching: { maxMessages: 2 } },
      });

      // mock the handlers
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([{ subscriptionName: 'test_sub' }]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toBeCalledWith('test_sub', {
        batching: { maxMessages: 2 },
      });
    });

    it('should call the subscription with other overrides', async () => {
      const callback = jest.fn();
      // init class
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
        subscriptionOptionsOverrides: {
          flowControl: {
            maxMessages: 5,
          },
        },
      });

      // mock the handlers
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([{ subscriptionName: 'test_sub' }]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toBeCalledWith('test_sub', {
        batching: { maxMessages: 1 },
        flowControl: {
          maxMessages: 5,
        },
      });
    });

    it('should call the subscription with per-handler subscription options', async () => {
      const callback = jest.fn();
      // init class
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
      });

      // mock the handlers with per-handler subscription options
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([
          {
            subscriptionName: 'test_sub',
            subscriptionOptions: {
              flowControl: {
                maxMessages: 10,
                maxBytes: 1024 * 1024,
              },
            },
          },
        ]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toBeCalledWith('test_sub', {
        batching: { maxMessages: 1 },
        flowControl: {
          maxMessages: 10,
          maxBytes: 1024 * 1024,
        },
      });
    });

    it('should merge global and per-handler subscription options with per-handler taking precedence (shallow merge)', async () => {
      const callback = jest.fn();
      // init class with global overrides
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
        subscriptionOptionsOverrides: {
          flowControl: {
            maxMessages: 5,
            allowExcessMessages: true,
          },
          batching: {
            maxMilliseconds: 1000,
          },
        },
      });

      // mock the handlers with per-handler subscription options
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([
          {
            subscriptionName: 'test_sub',
            subscriptionOptions: {
              flowControl: {
                maxBytes: 1024 * 1024, // This completely replaces global flowControl
              },
              batching: {
                maxMessages: 2, // This completely replaces global batching
              },
            },
          },
        ]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toBeCalledWith('test_sub', {
        batching: {
          maxMessages: 2, // From per-handler (completely replaces global batching)
        },
        flowControl: {
          maxBytes: 1024 * 1024, // From per-handler (completely replaces global flowControl)
        },
      });
    });

    it('should demonstrate how to achieve deep merging by spreading nested objects', async () => {
      const callback = jest.fn();
      // init class with global overrides
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
        subscriptionOptionsOverrides: {
          flowControl: {
            maxMessages: 5,
            allowExcessMessages: true,
          },
        },
      });

      // mock the handlers with per-handler subscription options that spread nested objects
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([
          {
            subscriptionName: 'test_sub',
            subscriptionOptions: {
              flowControl: {
                ...(pubSubStrategyClass as any).subscriptionOptionsOverrides
                  ?.flowControl, // Spread global flowControl
                maxBytes: 1024 * 1024, // Add new property
                maxMessages: 10, // Override maxMessages
              },
            },
          },
        ]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toBeCalledWith('test_sub', {
        batching: { maxMessages: 1 },
        flowControl: {
          maxMessages: 10, // From per-handler (overrides global)
          allowExcessMessages: true, // From global (preserved by spreading)
          maxBytes: 1024 * 1024, // From per-handler (new property)
        },
      });
    });

    it('should handle multiple handlers with different subscription options', async () => {
      const callback = jest.fn();
      // init class
      const pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
      });

      // mock multiple handlers with different subscription options
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([
          {
            subscriptionName: 'high_throughput_sub',
            subscriptionOptions: {
              flowControl: {
                maxMessages: 100,
                maxBytes: 10 * 1024 * 1024,
              },
            },
          },
          {
            subscriptionName: 'low_throughput_sub',
            subscriptionOptions: {
              flowControl: {
                maxMessages: 5,
                maxBytes: 1024 * 1024,
              },
              batching: {
                maxMilliseconds: 2000,
              },
            },
          },
          {
            subscriptionName: 'default_sub',
            // No subscription options - should use defaults
          },
        ]);

      await pubSubStrategyClass.listen(callback);

      expect(callback).toBeCalledTimes(1);
      expect(subscriptionMock).toHaveBeenCalledTimes(3);

      expect(subscriptionMock).toHaveBeenNthCalledWith(
        1,
        'high_throughput_sub',
        {
          batching: { maxMessages: 1 },
          flowControl: {
            maxMessages: 100,
            maxBytes: 10 * 1024 * 1024,
          },
        },
      );

      expect(subscriptionMock).toHaveBeenNthCalledWith(
        2,
        'low_throughput_sub',
        {
          batching: {
            maxMilliseconds: 2000, // Per-handler batching completely replaces global
          },
          flowControl: {
            maxMessages: 5,
            maxBytes: 1024 * 1024,
          },
        },
      );

      expect(subscriptionMock).toHaveBeenNthCalledWith(3, 'default_sub', {
        batching: { maxMessages: 1 },
      });
    });
  });

  describe('handleMessage', () => {
    const body = { test: 'test' };
    let message: Message;
    let handler: PubSubHandler;

    beforeEach(() => {
      message = {
        ack: jest.fn() as unknown,
        nack: jest.fn() as unknown,
        data: Buffer.from(JSON.stringify(body)),
      } as Message;

      handler = {
        subscriptionName: 'test_sub',
        skipAck: false,
        callback: jest.fn().mockReturnValue(of(true)),
      };
    });

    it('should acknowledge when skipAck is false', async () => {
      // eslint-disable-next-line dot-notation
      await pubSubStrategy['handleMessage'](message, handler);

      expect(handler.callback).toBeCalledTimes(1);
      expect(handler.callback).toBeCalledWith(body, message);

      expect(message.ack).toBeCalledTimes(1);
      expect(message.nack).toBeCalledTimes(0);
    });

    it('should NOT acknowledge when skipAck is true', async () => {
      // eslint-disable-next-line dot-notation
      await pubSubStrategy['handleMessage'](message, {
        ...handler,
        skipAck: true,
      });

      expect(handler.callback).toBeCalledTimes(1);
      expect(handler.callback).toBeCalledWith(body, message);

      expect(message.ack).toBeCalledTimes(0);
      expect(message.nack).toBeCalledTimes(0);
    });

    it('should call nack when skipAck is false and handler callback throws', async () => {
      const callbackWithError = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Any error')));

      // eslint-disable-next-line dot-notation
      await pubSubStrategy['handleMessage'](message, {
        ...handler,
        callback: callbackWithError,
      });

      expect(callbackWithError).toBeCalledTimes(1);
      expect(callbackWithError).toBeCalledWith(body, message);

      expect(message.ack).toBeCalledTimes(0);
      expect(message.nack).toBeCalledTimes(1);
    });

    it('should NOT call nack when skipAck is true and handler callback throws', async () => {
      const callbackWithError = jest
        .fn()
        .mockReturnValue(throwError(() => new Error('Any error')));

      // eslint-disable-next-line dot-notation
      await pubSubStrategy['handleMessage'](message, {
        ...handler,
        skipAck: true,
        callback: callbackWithError,
      });

      expect(callbackWithError).toBeCalledTimes(1);
      expect(callbackWithError).toBeCalledWith(body, message);

      expect(message.ack).toBeCalledTimes(0);
      expect(message.nack).toBeCalledTimes(0);
    });
  });

  describe('getPubSubHandlers', () => {
    it('should return pubsub filtered handlers', () => {
      // THIS IS HOW NESTJS RETURNS THE HANDLERS:
      // Map(1) {
      //   '{"subscriptionName":"blockchain-risk-screening"}' => [Function: eventHandler] {
      //     isEventHandler: true,
      //     extras: { name: 'pubsub' }
      //   }
      // }

      const pubsubFunction = jest.fn();
      // eslint-disable-next-line dot-notation
      pubsubFunction['extras'] = { name: 'pubsub' };

      const notPubsubFunction = jest.fn();
      // eslint-disable-next-line dot-notation
      notPubsubFunction['extras'] = {};

      const handlers: Map<string, any> = new Map([
        ['{"subscriptionName":"blockchain-risk-screening"}', pubsubFunction],
        ['{"subscriptionName":"blockchain-risk-screening2"}', pubsubFunction],
        [
          '{"subscriptionName":"blockchain-risk-screening3"}',
          notPubsubFunction,
        ],
        ['test', notPubsubFunction],
      ]);

      jest
        .spyOn<any, any>(pubSubStrategy, 'getHandlers')
        .mockReturnValueOnce(handlers);

      // eslint-disable-next-line dot-notation
      const response = pubSubStrategy['getPubSubHandlers']();

      expect(response).toStrictEqual([
        {
          subscriptionName: 'blockchain-risk-screening',
          skipAck: undefined,
          subscriptionOptions: undefined,
          callback: pubsubFunction,
        },
        {
          subscriptionName: 'blockchain-risk-screening2',
          skipAck: undefined,
          subscriptionOptions: undefined,
          callback: pubsubFunction,
        },
      ]);
    });
  });

  describe('parsePattern', () => {
    it('should return parsed JSON object', () => {
      const pattern = '{"subscriptionName":"blockchain-risk-screening"}';

      // eslint-disable-next-line dot-notation
      const response = pubSubStrategy['parsePattern'](pattern);

      expect(response).toStrictEqual({
        subscriptionName: 'blockchain-risk-screening',
      });
    });

    it('should return parsed JSON object with subscription options', () => {
      const pattern =
        '{"subscriptionName":"test-sub","subscriptionOptions":{"flowControl":{"maxMessages":10}}}';

      // eslint-disable-next-line dot-notation
      const response = pubSubStrategy['parsePattern'](pattern);

      expect(response).toStrictEqual({
        subscriptionName: 'test-sub',
        subscriptionOptions: {
          flowControl: {
            maxMessages: 10,
          },
        },
      });
    });

    it('should throw when pattern is invalid', () => {
      const pattern = 'test';

      // eslint-disable-next-line dot-notation
      expect(() => pubSubStrategy['parsePattern'](pattern)).toThrow(
        new InvalidMetadataException(pattern),
      );
    });
  });

  describe('close', () => {
    let pubsubMock: PubSub;
    let subscriptionMock1;
    let subscriptionMock2;
    let pubSubStrategyClass: PubSubStrategy;

    beforeEach(() => {
      subscriptionMock1 = {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      subscriptionMock2 = {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };

      pubsubMock = {
        subscription: jest
          .fn()
          .mockReturnValueOnce(subscriptionMock1)
          .mockReturnValueOnce(subscriptionMock2),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as PubSub;

      pubSubStrategyClass = new PubSubStrategy({
        pubsub: pubsubMock,
      });

      // Set up subscriptions in the strategy
      jest
        .spyOn<any, any>(pubSubStrategyClass, 'getPubSubHandlers')
        .mockReturnValueOnce([
          { subscriptionName: 'test_sub1' },
          { subscriptionName: 'test_sub2' },
        ]);
    });

    it('should remove all listeners, close each subscription, clear subscriptions array, and close the PubSub client', async () => {
      // First listen to set up subscriptions
      await pubSubStrategyClass.listen(jest.fn());

      // Verify subscriptions were created
      expect(pubsubMock.subscription).toHaveBeenCalledTimes(2);

      // Now close
      await pubSubStrategyClass.close();

      // Verify close was called on each subscription
      expect(subscriptionMock1.close).toHaveBeenCalledTimes(1);
      expect(subscriptionMock2.close).toHaveBeenCalledTimes(1);

      // Verify subscriptions array was cleared
      expect((pubSubStrategyClass as any).subscriptions).toEqual([]);

      // Verify PubSub client was closed
      expect(pubsubMock.close).toHaveBeenCalledTimes(1);
    });

    it('should handle close when no subscriptions exist', async () => {
      // Create a new strategy without setting up subscriptions
      const emptyStrategy = new PubSubStrategy({
        pubsub: pubsubMock,
      });

      // Close without having called listen
      await emptyStrategy.close();

      // Verify PubSub client was still closed
      expect(pubsubMock.close).toHaveBeenCalledTimes(1);
    });
  });
});
