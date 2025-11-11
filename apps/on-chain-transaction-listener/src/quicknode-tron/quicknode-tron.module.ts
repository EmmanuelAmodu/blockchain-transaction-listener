import { OnChainActivityProcessorsModule } from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { Module } from '@nestjs/common';
import { OnChainActivityService } from '../on-chain-activity.service';
import { QuickNodeTronController } from './quicknode-tron.controller';

@Module({
  controllers: [QuickNodeTronController],
  providers: [OnChainActivityService, PubSubClient],
  imports: [OnChainActivityProcessorsModule],
})
export class QuickNodeTronModule {}
