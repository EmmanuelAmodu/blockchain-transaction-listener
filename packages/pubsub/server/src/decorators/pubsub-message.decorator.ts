import { Message } from '@google-cloud/pubsub';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PubSubMessageClass } from '..';

export const getMessage = (
  _key: string | undefined,
  ctx: ExecutionContext,
): PubSubMessageClass => {
  const message: Message = ctx.getArgByIndex(1);

  return message;
};

export const PubSubMessage = createParamDecorator<string | undefined>(
  getMessage,
);
