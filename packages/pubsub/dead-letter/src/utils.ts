import { TimeSeriesData } from './monitoring';

export function parseTimeSeriesData(
  data: TimeSeriesData[],
): Record<string, number> {
  const result: Record<string, number> = {};
  return data.reduce((acc, curr) => {
    curr.labelValues?.forEach((label, idx) => {
      if (label.stringValue && curr.pointData) {
        const value = curr.pointData[idx].values?.[0];
        acc[label.stringValue] = Number(
          value?.doubleValue ?? value?.int64Value ?? 0,
        );
      }
    });
    return acc;
  }, result);
}

export function dlSubscriptionsUndeliveredMessagesMQL(
  subscriptionNames: string[],
): string {
  return `
    fetch pubsub_subscription
      | metric 'pubsub.googleapis.com/subscription/num_undelivered_messages'
      | filter (resource.subscription_id =~ '${subscriptionNames.join('|')}')
      | group_by 3m,
          [value_num_undelivered_messages_mean: mean(value.num_undelivered_messages)]
      | every 3m
      | group_by [resource.subscription_id],
          [value_num_undelivered_messages_mean_mean:
            mean(value_num_undelivered_messages_mean)]`;
}
