import { OnChainActivityProcessorsModule } from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { CacheModule, Module } from '@nestjs/common';
import { OnChainActivityService } from '../on-chain-activity.service';
import { QuickNodeEvmController } from './quicknode-evm.controller';

@Module({
  controllers: [QuickNodeEvmController],
  providers: [OnChainActivityService, PubSubClient],
  imports: [
    CacheModule.register({ isGlobal: true }),
    OnChainActivityProcessorsModule,
  ],
})
export class QuickNodeEvmModule {}
