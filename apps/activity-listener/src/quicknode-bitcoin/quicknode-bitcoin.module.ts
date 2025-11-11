import { OnChainActivityProcessorsModule } from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { Module } from '@nestjs/common';
import { OnChainActivityService } from '../on-chain-activity.service';
import { QuickNodeBitcoinController } from './quicknode-bitcoin.controller';

@Module({
  controllers: [QuickNodeBitcoinController],
  providers: [OnChainActivityService, PubSubClient],
  imports: [OnChainActivityProcessorsModule],
})
export class QuickNodeBitcoinModule {}
