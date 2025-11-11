import {
  QuickNodeTronDto,
  QuickNodeTronProcessor,
} from '@onionfi-internal/on-chain-activity-processors';
import {
  BadRequestException,
  Body,
  Controller,
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

@Controller('webhooks/quicknode/tron')
export class QuickNodeTronController {
  private readonly webhookSecret: string;

  constructor(
    private readonly onChainActivityService: OnChainActivityService,
    private readonly quickNodeTronProcessor: QuickNodeTronProcessor,
    configService: ConfigService,
  ) {
    this.webhookSecret = configService.getOrThrow(
      'quickNode.tronWebhookSecret',
    );
  }

  @Post()
  public async processTransaction(
    @Body(new ParseArrayPipe({ items: QuickNodeTronDto }))
    body: QuickNodeTronDto[],
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

      const result = await this.quickNodeTronProcessor.process({
        transactions: body,
      });
      await this.onChainActivityService.handleActivityBatch(result);
      return 'Webhook received and verified';
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Error processing webhook');
    }
  }
}
