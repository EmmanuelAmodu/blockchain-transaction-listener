import { Message } from '@google-cloud/pubsub';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const getMessageBody = (
  _key: string | undefined,
  ctx: ExecutionContext,
): Record<string, string> => {
  const message: Message = ctx.getArgByIndex(1);

  const rawBody = message.data.toString();
  const jsonBody = JSON.parse(rawBody);

  return jsonBody;
};

export const PubSubMessageBody = createParamDecorator<string | undefined>(
  getMessageBody,
);
