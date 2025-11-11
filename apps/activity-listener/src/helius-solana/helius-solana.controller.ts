import {
  EnrichedTransactionDto,
  HeliusSolanaProcessor,
} from '@onionfi-internal/on-chain-activity-processors';
import {
  Body,
  Controller,
  ParseArrayPipe,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnChainActivityService } from '../on-chain-activity.service';

@Controller('webhooks/helius')
export class HeliusSolanaController {
  private readonly webhookSecret: string;

  constructor(
    private readonly onChainActivityService: OnChainActivityService,
    private readonly heliusSolanaProcessor: HeliusSolanaProcessor,
    configService: ConfigService,
  ) {
    this.webhookSecret = configService.getOrThrow('helius.webhookSecret');
  }

  @Post('enhanced-transaction')
  public async enhancedTransaction(
    @Body(new ParseArrayPipe({ items: EnrichedTransactionDto }))
    body: EnrichedTransactionDto[],
    @Request() request: Request,
  ) {
    // eslint-disable-next-line dot-notation
    const authHeader = request.headers['authorization'];

    if (!authHeader || authHeader !== this.webhookSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    const result = await this.heliusSolanaProcessor.process({
      transactions: body,
    });

    await this.onChainActivityService.handleActivityBatch(result);
  }
}
