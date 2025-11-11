import { ProcessorOnChainActivity } from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { onChainActivityTopicName } from './constants';

@Injectable()
export class OnChainActivityService {
  private readonly logger = new Logger(OnChainActivityService.name);

  constructor(private pubSubClient: PubSubClient) {}

  public async handleActivityBatch(
    body: ProcessorOnChainActivity[],
  ): Promise<void> {
    await Promise.all(
      body.map(async (activity) => this.handleActivity(activity)),
    );
  }

  private async handleActivity(body: ProcessorOnChainActivity): Promise<void> {
    this.logger.log('Publishing on-chain activity to pubsub.', {
      payload: body,
    });

    if (process.env.NODE_ENV === 'development') {
      const json = JSON.stringify(body, null, 2);
      fs.mkdirSync('./output', { recursive: true });
      fs.writeFileSync(`./output/${body.identifier}.json`, json);
    } else {
      await this.pubSubClient.publishToTopic(onChainActivityTopicName, {
        ...body,
        balanceChanges: body.balanceChanges,
      });

      this.logger.log('Processed on-chain activity', {
        identifier: body.identifier,
      });
    }
  }
}
