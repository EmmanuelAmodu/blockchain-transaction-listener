import { QueryServiceClient } from '@google-cloud/monitoring';
import { TimeSeriesData } from './types';

export class MonitoringClient {
  private readonly queryClient: QueryServiceClient;

  constructor() {
    this.queryClient = new QueryServiceClient();
  }

  public async queryMetric(query: string): Promise<TimeSeriesData[]> {
    const projectId = await this.queryClient.getProjectId();
    const [data] = await this.queryClient.queryTimeSeries({
      query,
      name: `projects/${projectId}`,
    });
    return data;
  }
}
