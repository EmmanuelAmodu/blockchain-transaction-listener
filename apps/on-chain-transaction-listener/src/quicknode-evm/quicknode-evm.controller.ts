import {
  NETWORK,
  QuickNodeEvmProcessor,
  TxWithLogsAndTracesDTO,
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

@Controller('webhooks/quicknode/evm')
export class QuickNodeEvmController {
  private readonly ethWebhookSecret: string;

  private readonly polygonWebhookSecret: string;

  private readonly arbitrumWebhookSecret: string;

  private readonly optimismWebhookSecret: string;

  private readonly baseWebhookSecret: string;

  private readonly bscWebhookSecret: string;

  constructor(
    private readonly onChainActivityService: OnChainActivityService,
    private readonly quickNodeEvmProcessor: QuickNodeEvmProcessor,
    configService: ConfigService,
  ) {
    this.ethWebhookSecret = configService.getOrThrow(
      'quickNode.ethWebhookSecret',
    );
    this.polygonWebhookSecret = configService.getOrThrow(
      'quickNode.polygonWebhookSecret',
    );
    this.arbitrumWebhookSecret = configService.getOrThrow(
      'quickNode.arbitrumWebhookSecret',
    );
    this.optimismWebhookSecret = configService.getOrThrow(
      'quickNode.optimismWebhookSecret',
    );
    this.baseWebhookSecret = configService.getOrThrow(
      'quickNode.baseWebhookSecret',
    );
    this.bscWebhookSecret = configService.getOrThrow(
      'quickNode.bscWebhookSecret',
    );
  }

  @Post('/ethereum')
  public async processEth(
    @Body(new ParseArrayPipe({ items: TxWithLogsAndTracesDTO }))
    body: TxWithLogsAndTracesDTO[],
    @Request() request: Request,
  ) {
    return this.processor({
      nonce: request.headers['x-qn-nonce'],
      timestamp: request.headers['x-qn-timestamp'],
      givenSignature: request.headers['x-qn-signature'],
      body,
      network: NETWORK.ETHEREUM,
      webhookSecret: this.ethWebhookSecret,
    });
  }

  @Post('/polygon')
  public async processPolygon(
    @Body(new ParseArrayPipe({ items: TxWithLogsAndTracesDTO }))
    body: TxWithLogsAndTracesDTO[],
    @Request() request: Request,
  ) {
    return this.processor({
      nonce: request.headers['x-qn-nonce'],
      timestamp: request.headers['x-qn-timestamp'],
      givenSignature: request.headers['x-qn-signature'],
      body,
      network: NETWORK.POLYGON,
      webhookSecret: this.polygonWebhookSecret,
    });
  }

  @Post('/arbitrum')
  public async processArbitrum(
    @Body(new ParseArrayPipe({ items: TxWithLogsAndTracesDTO }))
    body: TxWithLogsAndTracesDTO[],
    @Request() request: Request,
  ) {
    return this.processor({
      nonce: request.headers['x-qn-nonce'],
      timestamp: request.headers['x-qn-timestamp'],
      givenSignature: request.headers['x-qn-signature'],
      body,
      network: NETWORK.ARBITRUM,
      webhookSecret: this.arbitrumWebhookSecret,
    });
  }

  @Post('/optimism')
  public async processOptimism(
    @Body(new ParseArrayPipe({ items: TxWithLogsAndTracesDTO }))
    body: TxWithLogsAndTracesDTO[],
    @Request() request: Request,
  ) {
    return this.processor({
      nonce: request.headers['x-qn-nonce'],
      timestamp: request.headers['x-qn-timestamp'],
      givenSignature: request.headers['x-qn-signature'],
      body,
      network: NETWORK.OPTIMISM,
      webhookSecret: this.optimismWebhookSecret,
    });
  }

  @Post('/base')
  public async processBase(
    @Body(new ParseArrayPipe({ items: TxWithLogsAndTracesDTO }))
    body: TxWithLogsAndTracesDTO[],
    @Request() request: Request,
  ) {
    return this.processor({
      nonce: request.headers['x-qn-nonce'],
      timestamp: request.headers['x-qn-timestamp'],
      givenSignature: request.headers['x-qn-signature'],
      body,
      network: NETWORK.BASE,
      webhookSecret: this.baseWebhookSecret,
    });
  }

  @Post('/bsc')
  public async processBsc(
    @Body(new ParseArrayPipe({ items: TxWithLogsAndTracesDTO }))
    body: TxWithLogsAndTracesDTO[],
    @Request() request: Request,
  ) {
    return this.processor({
      nonce: request.headers['x-qn-nonce'],
      timestamp: request.headers['x-qn-timestamp'],
      givenSignature: request.headers['x-qn-signature'],
      body,
      network: NETWORK.BSC,
      webhookSecret: this.bscWebhookSecret,
    });
  }

  private async processor({
    nonce,
    timestamp,
    givenSignature,
    body,
    network,
    webhookSecret,
  }: {
    nonce: string;
    timestamp: string;
    givenSignature: string;
    body: TxWithLogsAndTracesDTO[];
    network: NETWORK;
    webhookSecret: string;
  }) {
    if (!nonce || !timestamp || !givenSignature) {
      throw new BadRequestException(
        'Missing required headers: nonce, timestamp, or signature',
      );
    }

    try {
      const payloadString = JSON.stringify(body);
      const isValid = verifySignature(
        webhookSecret,
        payloadString,
        nonce,
        timestamp,
        givenSignature,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }

      const result = await this.quickNodeEvmProcessor.process({
        transactions: body,
        network,
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
