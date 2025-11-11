import {
  QuickNodeXrplTransactionDto,
  QuicknodeXrplProcessor,
} from '@onionfi-internal/on-chain-activity-processors';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  InternalServerErrorException,
  ParseArrayPipe,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnChainActivityService } from '../on-chain-activity.service';
import { verifySignature } from '../utils/utils';

@Controller('webhooks/quicknode/xrpl')
export class QuicknodeXrplController {
  private readonly webhookSecret: string;

  constructor(
    private readonly onChainActivityService: OnChainActivityService,
    private readonly quicknodeXrplProcessor: QuicknodeXrplProcessor,
    configService: ConfigService,
  ) {
    this.webhookSecret = configService.getOrThrow(
      'quickNode.xrplWebhookSecret',
    );
  }

  @Post()
  @HttpCode(200)
  public async processTransaction(
    @Body(new ParseArrayPipe({ items: QuickNodeXrplTransactionDto }))
    body: QuickNodeXrplTransactionDto[],
    @Request() request: Request,
  ) {
    const nonce = request.headers['x-qn-nonce'];
    const timestamp = request.headers['x-qn-timestamp'];
    const givenSignature = request.headers['x-qn-signature'];

    if (!nonce || !timestamp || !givenSignature) {
      throw new BadRequestException(
        'Missing required headers: nonce, timestamp, or signature',
      );
    }

    try {
      const payloadString = JSON.stringify(body);
      const isValid = verifySignature(
        this.webhookSecret,
        payloadString,
        nonce,
        timestamp,
        givenSignature,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }

      const result = await this.quicknodeXrplProcessor.process({
        transactions: body,
      });

      await this.onChainActivityService.handleActivityBatch(result);
      return 'Webhook received and verified';
    } catch (error) {
      // Re-throw HTTP exceptions as-is
      if (error instanceof HttpException) {
        throw error;
      }
      // Only convert unexpected errors to 500
      throw new InternalServerErrorException('Error processing webhook');
    }
  }
}
