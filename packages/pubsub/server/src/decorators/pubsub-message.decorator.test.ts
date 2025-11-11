import { Message } from '@google-cloud/pubsub';
import { getMessage } from '.';
import { createExecutionContext } from '../testing/utils';

describe('Message Decorator', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should get the message', () => {
    const message: Partial<Message> = { attributes: { test: 'test' } };

    const msgData = getMessage(
      undefined,
      createExecutionContext([null, message]),
    );

    expect(msgData).toEqual(message);
  });
});
