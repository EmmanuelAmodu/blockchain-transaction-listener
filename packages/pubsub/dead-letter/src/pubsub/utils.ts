import { Message, Subscription } from '@google-cloud/pubsub';
import { ListMessagesFilter, SubscriptionMethod } from './types';

export async function sendSubscriptionRequest({
  payload,
  subscription,
  method,
}: {
  subscription: Subscription;
  payload: object;
  method: SubscriptionMethod;
}) {
  return new Promise((resolve, reject) => {
    subscription.request(
      {
        method,
        reqOpts: payload,
        client: 'SubscriberClient',
      },
      (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      },
    );
  });
}

export async function nackMessages({
  ackIds,
  subscription,
}: {
  ackIds: string[];
  subscription: Subscription;
}) {
  if (!ackIds.length) {
    return;
  }

  await sendSubscriptionRequest({
    subscription,
    method: 'modifyAckDeadline',
    payload: {
      ackIds,
      subscription: subscription.name,
      ackDeadlineSeconds: 0,
    },
  });
}

export async function ackMessages({
  ackIds,
  subscription,
}: {
  ackIds: string[];
  subscription: Subscription;
}) {
  if (!ackIds.length) {
    return;
  }

  await sendSubscriptionRequest({
    subscription,
    method: 'acknowledge',
    payload: {
      ackIds,
      subscription: subscription.name,
    },
  });
}

export async function siftMessages({
  filter,
  subscription,
  collectPeriod,
  limit,
}: {
  filter?: ListMessagesFilter;
  subscription: Subscription;
  collectPeriod?: number;
  limit?: number;
}): Promise<{ included: Message[]; excluded: Message[] }> {
  return new Promise((resolve, reject) => {
    const ac = new AbortController();

    const included: Message[] = [];
    const excluded: Message[] = [];
    const onMessage = (message: Message) => {
      if (filter) {
        if (filter.id) {
          if (typeof filter.id === 'string' && message.id !== filter.id) {
            excluded.push(message);
            return;
          }
          if (Array.isArray(filter.id) && !filter.id.includes(message.id)) {
            excluded.push(message);
            return;
          }
        }
      }
      if (limit && included.length >= limit) {
        excluded.push(message);
        ac.abort();
        return;
      }
      included.push(message);
    };

    const timeout = setTimeout(() => ac.abort(), collectPeriod);
    ac.signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timeout);
        subscription.removeListener('message', onMessage);
        resolve({ included, excluded });
      },
      { once: true },
    );

    subscription.on('error', reject);
    subscription.on('message', onMessage);
  });
}
