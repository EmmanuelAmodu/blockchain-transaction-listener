import { Message } from '@google-cloud/pubsub';
import { getMessageAttrs } from '.';
import { createExecutionContext } from '../testing/utils';

describe('Message Attributes Decorator', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should get the message attributes from the message', () => {
    const attributes = {
      prop1: 'prop1',
      prop2: 'prop2',
    };
    const message: Partial<Message> = { attributes };

    const response = getMessageAttrs(
      undefined,
      createExecutionContext([null, message]),
    );

    expect(response).toEqual(attributes);
  });
});
