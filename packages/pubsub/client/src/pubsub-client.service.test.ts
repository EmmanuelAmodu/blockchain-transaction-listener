import { PubSub } from '@google-cloud/pubsub';
import { PubSubClient } from '.';

jest.mock('@google-cloud/pubsub');

describe('PubSubClient', () => {
  let pubSubClient: PubSubClient;

  beforeAll(() => {
    pubSubClient = new PubSubClient();
    // Force-initialize the pubsub instance
    // This is necessary because PubSub is lazy-loaded
    pubSubClient.getPubSub();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('publishToTopic', () => {
    it('should return pubsub instance', () => {
      jest.clearAllMocks();
      const pubSub = new PubSubClient().getPubSub();
      expect(pubSub).toBeDefined();
      expect(PubSub).toHaveBeenCalledTimes(1);
    });

    it('should return pubsub from cache', () => {
      const pubSub = pubSubClient.getPubSub();
      expect(pubSub).toBeDefined();
      expect(PubSub).toBeCalledTimes(0);
    });

    it('should return parsed JSON object', async () => {
      const topicName = 'my_topic';
      const message = { test: 'test1' };
      const attributes = { attr1: 'attr1', 'request-id': '' };
      const publishMessageSpy = jest.fn();

      const topicSpy = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(pubSubClient['pubSub'], 'topic')
        .mockImplementationOnce(() => ({
          publishMessage: publishMessageSpy,
        }));

      await pubSubClient.publishToTopic(topicName, message, attributes);

      expect(topicSpy).toBeCalledWith(topicName, {
        batching: { maxMessages: 1 },
      });

      expect(publishMessageSpy).toBeCalledTimes(1);
      expect(publishMessageSpy).toBeCalledWith({ json: message, attributes });
    });

    it('reuse cached topic after publishing a message', async () => {
      const topicName = 'my_topic_2';
      const message = { test: 'test1' };
      const attributes = { attr1: 'attr1', 'request-id': '' };
      const publishMessageSpy = jest.fn();

      const topicSpy = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(pubSubClient['pubSub'], 'topic')
        .mockImplementationOnce(() => ({
          publishMessage: publishMessageSpy,
        }));

      await pubSubClient.publishToTopic(topicName, message, attributes);

      expect(topicSpy).toBeCalledTimes(1);
      expect(topicSpy).toBeCalledWith(topicName, {
        batching: { maxMessages: 1 },
      });

      expect(publishMessageSpy).toBeCalledTimes(1);
      expect(publishMessageSpy).toBeCalledWith({ json: message, attributes });

      // should pass since we don't call pubsub.topic and take it from cache
      await pubSubClient.publishToTopic(topicName, message, attributes);

      expect(topicSpy).toBeCalledTimes(1);
      expect(topicSpy).toBeCalledWith(topicName, {
        batching: { maxMessages: 1 },
      });

      expect(publishMessageSpy).toBeCalledTimes(2);
      expect(publishMessageSpy).toBeCalledWith({ json: message, attributes });
    });
  });
});
