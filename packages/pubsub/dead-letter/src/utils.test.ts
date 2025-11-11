import { faker } from '@faker-js/faker';
import { TimeSeriesData } from './monitoring';
import {
  dlSubscriptionsUndeliveredMessagesMQL,
  parseTimeSeriesData,
} from './utils';

describe('dead-letter.utils', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('dlSubscriptionsUndeliveredMessagesMQL', () => {
    it('returns MQL query', () => {
      const subscriptionNames = Array.from({ length: 10 }, () =>
        faker.string.alphanumeric(10),
      );

      const query = dlSubscriptionsUndeliveredMessagesMQL(subscriptionNames);

      expect(query).toEqual(`
    fetch pubsub_subscription
      | metric 'pubsub.googleapis.com/subscription/num_undelivered_messages'
      | filter (resource.subscription_id =~ '${subscriptionNames.join('|')}')
      | group_by 3m,
          [value_num_undelivered_messages_mean: mean(value.num_undelivered_messages)]
      | every 3m
      | group_by [resource.subscription_id],
          [value_num_undelivered_messages_mean_mean:
            mean(value_num_undelivered_messages_mean)]`);
    });
  });

  describe('parseTimeSeriesData', () => {
    it('returns parsed data', () => {
      const labels = [
        faker.string.alphanumeric(10),
        faker.string.alphanumeric(10),
        faker.string.alphanumeric(10),
      ];
      const values = [
        faker.number.float(),
        faker.number.int(),
        faker.number.int(),
      ];

      const sample: TimeSeriesData[] = [
        {
          labelValues: [
            { stringValue: labels[0] },
            { int64Value: faker.number.int() },
            { stringValue: labels[1] },
          ],
          pointData: [
            { values: [{ doubleValue: values[0] }] },
            { values: [{ int64Value: faker.number.int() }] },
            { values: [{ int64Value: values[1] }] },
          ],
        },
        {
          labelValues: [{ stringValue: labels[2] }],
          pointData: [{ values: [{ doubleValue: values[2] }] }],
        },
      ];

      const result = parseTimeSeriesData(sample);

      expect(result).toEqual({
        [labels[0]]: values[0],
        [labels[1]]: values[1],
        [labels[2]]: values[2],
      });
    });
  });
});
