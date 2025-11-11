import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { QuickNodeBitcoinProcessor } from './bitcoin/quicknode-bitcoin.processor';
import { QuickNodeEvmProcessor } from './evm/quicknode-evm.processor';
import { HeliusSolanaProcessor } from './solana/helius-solana.processor';
import { QuickNodeTronProcessor } from './tron/quicknode-tron.processor';
import { QuicknodeXrplProcessor } from './xrpl/quicknode-xrpl.processor';

@Module({
  imports: [CacheModule.register()],
  providers: [
    QuickNodeBitcoinProcessor,
    QuickNodeEvmProcessor,
    QuickNodeTronProcessor,
    QuicknodeXrplProcessor,
    HeliusSolanaProcessor,
  ],
  exports: [
    QuickNodeBitcoinProcessor,
    QuickNodeEvmProcessor,
    QuickNodeTronProcessor,
    QuicknodeXrplProcessor,
    HeliusSolanaProcessor,
  ],
})
export class OnChainActivityProcessorsModule {}
