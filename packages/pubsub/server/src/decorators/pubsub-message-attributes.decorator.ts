import { Message } from '@google-cloud/pubsub';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const getMessageAttrs = (
  key: string | undefined,
  ctx: ExecutionContext,
): (string | undefined) | Record<string, string> => {
  const message: Message = ctx.getArgByIndex(1);

  const attrs = message.attributes;
  if (attrs != null && key != null) {
    return attrs[key];
  }
  return attrs;
};

export const PubSubMessageAttributes = createParamDecorator<string | undefined>(
  getMessageAttrs,
);
