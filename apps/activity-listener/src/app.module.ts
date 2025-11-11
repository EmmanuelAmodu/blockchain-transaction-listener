import { DataDogModule } from '@onionfi-internal/dd';
import { LoggerModule, onionfiModule } from '@onionfi-internal/nestjs';
import { OnChainActivityProcessorsModule } from '@onionfi-internal/on-chain-activity-processors';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import loadConfig from './configuration';
import { HeliusSolanaModule } from './helius-solana/helius-solana.module';
import { QuickNodeBitcoinModule } from './quicknode-bitcoin/quicknode-bitcoin.module';
import { QuickNodeEvmModule } from './quicknode-evm/quicknode-evm.module';
import { QuickNodeTronModule } from './quicknode-tron/quicknode-tron.module';
import { QuicknodeXrplModule } from './quicknode-xrpl/quicknode-xrpl.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      ignoreEnvFile: true,
      load: loadConfig,
    }),
    onionfiModule,
    DataDogModule.forRoot(),
    LoggerModule.forRoot(),
    OnChainActivityProcessorsModule,
    HeliusSolanaModule,
    QuickNodeBitcoinModule,
    QuickNodeEvmModule,
    QuickNodeTronModule,
    QuicknodeXrplModule,
  ],
})
export class AppModule {}
