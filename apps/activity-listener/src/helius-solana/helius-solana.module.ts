import { OnChainActivityProcessorsModule } from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { Module } from '@nestjs/common';
import { OnChainActivityService } from '../on-chain-activity.service';
import { HeliusSolanaController } from './helius-solana.controller';

@Module({
  controllers: [HeliusSolanaController],
  providers: [OnChainActivityService, PubSubClient],
  imports: [OnChainActivityProcessorsModule],
})
export class HeliusSolanaModule {}
