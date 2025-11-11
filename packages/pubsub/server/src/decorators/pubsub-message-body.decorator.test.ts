import { Message } from '@google-cloud/pubsub';
import { getMessageBody } from '.';
import { createExecutionContext } from '../testing/utils';

describe('Message Body Decorator', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should get the message body from the message', () => {
    const data = {
      prop1: 'prop1',
      prop2: 'prop2',
    };
    const dataBuffer = Buffer.from(JSON.stringify(data));
    const message: Partial<Message> = { data: dataBuffer };

    const msgData = getMessageBody(
      undefined,
      createExecutionContext([null, message]),
    );

    expect(msgData).toEqual(data);
  });
});
