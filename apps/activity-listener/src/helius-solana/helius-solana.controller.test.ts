import {
  EnrichedTransactionDto,
  HeliusSolanaProcessor,
} from '@onionfi-internal/on-chain-activity-processors';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Source, TransactionType } from 'helius-sdk';
import request from 'supertest';
import { OnChainActivityService } from '../on-chain-activity.service';
import { HeliusSolanaController } from './helius-solana.controller';
import { IN_APP_SWAP, SOL_TRANSFER, USDC_TRANSFER } from './test-data';

describe('HeliusSolanaController', () => {
  let app;
  let heliusSolanaProcessor: jest.Mocked<HeliusSolanaProcessor>;
  let configService: jest.Mocked<ConfigService>;

  const mockWebhookSecret = 'test-webhook-secret';
  const mockTransaction = {
    signature: 'test-signature',
    timestamp: 1234567890,
    slot: 12345,
    description: 'Test Transaction',
    type: TransactionType.TRANSFER,
    source: Source.SYSTEM_PROGRAM,
    fee: 5000,
    feePayer: 'fee-payer-address',
    tokenTransfers: null,
    nativeTransfers: null,
    accountData: [],
    instructions: [],
    transactionError: null,
    events: {
      nft: null,
      swap: null,
      compressed: null,
    },
  } as EnrichedTransactionDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeliusSolanaController],
      providers: [
        {
          provide: OnChainActivityService,
          useValue: { handleActivityBatch: jest.fn() },
        },
        {
          provide: HeliusSolanaProcessor,
          useValue: {
            process: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockWebhookSecret),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    heliusSolanaProcessor = module.get(HeliusSolanaProcessor);
    configService = module.get(ConfigService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should retrieve webhook secret from config service', () => {
    expect(configService.getOrThrow).toHaveBeenCalledWith(
      'helius.webhookSecret',
    );
  });

  describe('POST /webhooks/helius/enhanced-transaction', () => {
    it('should process transaction when webhook secret is valid', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .set('authorization', mockWebhookSecret)
        .send([mockTransaction])
        .expect(201);

      expect(heliusSolanaProcessor.process).toHaveBeenCalledWith({
        transactions: [
          expect.objectContaining({
            signature: mockTransaction.signature,
            timestamp: mockTransaction.timestamp,
          }),
        ],
      });
    });

    it.each([[IN_APP_SWAP], [SOL_TRANSFER], [USDC_TRANSFER]])(
      'should process real transaction',
      async (transaction) => {
        // Act & Assert
        await request(app.getHttpServer())
          .post('/webhooks/helius/enhanced-transaction')
          .set('authorization', mockWebhookSecret)
          .send(transaction)
          .expect(201);

        expect(heliusSolanaProcessor.process).toHaveBeenCalledWith({
          transactions: [
            expect.objectContaining({
              signature: transaction[0].signature,
              timestamp: transaction[0].timestamp,
            }),
          ],
        });
      },
    );

    it('should return 401 when webhook secret is missing', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .send([mockTransaction])
        .expect(401);

      expect(heliusSolanaProcessor.process).not.toHaveBeenCalled();
    });

    it('should return 401 when webhook secret is invalid', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .set('authorization', 'invalid-secret')
        .send([mockTransaction])
        .expect(401);

      expect(heliusSolanaProcessor.process).not.toHaveBeenCalled();
    });

    it('should return 400 when receiving incorrect payload data', async () => {
      const invalidTransaction = {
        // Missing required fields
        signature: 'test-signature',
        // Invalid type for a numeric field
        timestamp: 'not-a-number',
        // Missing most of the required properties
      };

      // Act & Assert
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .set('authorization', mockWebhookSecret)
        .send([invalidTransaction])
        .expect(400);

      expect(heliusSolanaProcessor.process).not.toHaveBeenCalled();
    });
  });
});
