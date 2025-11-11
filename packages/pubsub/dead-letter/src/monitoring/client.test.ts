import { faker } from '@faker-js/faker';
import { MonitoringClient } from './client';
import { TimeSeriesData } from './types';

describe('MonitoringClient', () => {
  let client: MonitoringClient;

  beforeEach(() => {
    client = new MonitoringClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('queryMetric', () => {
    let spyGetProjectId: jest.SpyInstance;
    let spyQueryTimeSeries: jest.SpyInstance;

    let projectId: string;
    let timeSeries: TimeSeriesData[];

    beforeEach(() => {
      projectId = faker.string.alphanumeric(10);
      timeSeries = Array.from({ length: 10 }, () => ({
        labelValues: [
          {
            stringValue: faker.string.alphanumeric(10),
          },
        ],
        pointData: [
          {
            values: Array.from({ length: 10 }, () => ({
              doubleValue: faker.number.float(),
            })),
          },
        ],
      }));

      spyGetProjectId = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(client['queryClient'], 'getProjectId')
        .mockResolvedValue(projectId);
      spyQueryTimeSeries = jest
        // eslint-disable-next-line dot-notation
        .spyOn<any, any>(client['queryClient'], 'queryTimeSeries')
        .mockResolvedValue([timeSeries]);
    });

    it('queries metric', async () => {
      const query = faker.string.alphanumeric(10);
      const data = await client.queryMetric(query);

      expect(spyGetProjectId).toHaveBeenCalledTimes(1);
      expect(spyQueryTimeSeries).toHaveBeenCalledTimes(1);
      expect(spyQueryTimeSeries).toHaveBeenCalledWith({
        query,
        name: `projects/${projectId}`,
      });
      expect(data).toEqual(timeSeries);
    });
  });
});
