import {
  QuickNodeBitcoinProcessor,
  QuickNodeBitcoinWebhookDto,
} from '@onionfi-internal/on-chain-activity-processors';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { OnChainActivityService } from '../on-chain-activity.service';
import { verifySignature } from '../utils/utils';
import { QuickNodeBitcoinController } from './quicknode-bitcoin.controller';

// Mock the utils module
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  verifySignature: jest.fn(),
}));

describe('QuickNodeBitcoinController', () => {
  let app;
  let quicknodeBitcoinService: jest.Mocked<QuickNodeBitcoinProcessor>;
  let configService: jest.Mocked<ConfigService>;
  const mockVerifySignature = jest.mocked(verifySignature);

  const mockWebhookSecret = 'test-webhook-secret';
  const mockTransaction: QuickNodeBitcoinWebhookDto = {
    blockHash:
      '0000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
    blockHeight: 909_696,
    blockTime: 1_755_006_030,
    confirmations: 18,
    fees: '2000',
    txid: '720ec430c80cdc2da6944d91259ded8edadd59b2441e7b7212dbf984a173a0cd',
    value: '8523438',
    valueIn: '8525438',
    vin: [
      {
        addresses: ['bc1qujepl0k5n0ga2e86yskvxa6auehpf6dlf84dx0'],
        isAddress: true,
        n: 0,
        value: '8525438',
      },
    ],
    vout: [
      {
        addresses: ['bc1qh585gtmfal6a2wnstextcd5qralhr6v78pv6zs'],
        isAddress: true,
        n: 0,
        spent: true,
        value: '19212',
      },
      {
        addresses: ['bc1qujepl0k5n0ga2e86yskvxa6auehpf6dlf84dx0'],
        isAddress: true,
        n: 1,
        value: '8504226',
      },
    ],
  };

  const mockHeaders = {
    'x-qn-nonce': 'test-nonce',
    'x-qn-timestamp': '1633072800',
    'x-qn-signature': 'test-signature',
  };

  beforeEach(async () => {
    // Clear mocks before creating new module
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickNodeBitcoinController],
      providers: [
        {
          provide: OnChainActivityService,
          useValue: { handleActivityBatch: jest.fn() },
        },
        {
          provide: QuickNodeBitcoinProcessor,
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

    quicknodeBitcoinService = module.get(QuickNodeBitcoinProcessor);
    configService = module.get(ConfigService);

    // Set default mock behavior
    mockVerifySignature.mockReturnValue(true);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should retrieve webhook secret from config service', () => {
    // The configService.getOrThrow is called during controller instantiation
    expect(configService.getOrThrow).toHaveBeenCalledWith(
      'quickNode.btcWebhookSecret',
    );
  });

  describe('POST /webhooks/quicknode/bitcoin', () => {
    beforeEach(() => {
      // Clear mock calls before each test
      mockVerifySignature.mockClear();
      quicknodeBitcoinService.process.mockClear();
    });

    it('should process transaction when signature verification succeeds', async () => {
      mockVerifySignature.mockReturnValue(true);

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(mockHeaders)
        .send([mockTransaction])
        .expect(201)
        .expect('Webhook received and verified');

      expect(mockVerifySignature).toHaveBeenCalledWith(
        mockWebhookSecret,
        JSON.stringify([mockTransaction]),
        mockHeaders['x-qn-nonce'],
        mockHeaders['x-qn-timestamp'],
        mockHeaders['x-qn-signature'],
      );
      expect(quicknodeBitcoinService.process).toHaveBeenCalledWith({
        transactions: [mockTransaction],
      });
    });

    it('should return 400 when x-qn-nonce header is missing', async () => {
      const headersWithoutNonce = {
        'x-qn-timestamp': mockHeaders['x-qn-timestamp'],
        'x-qn-signature': mockHeaders['x-qn-signature'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(headersWithoutNonce)
        .send([mockTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeBitcoinService.process).not.toHaveBeenCalled();
    });

    it('should return 400 when x-qn-timestamp header is missing', async () => {
      const headersWithoutTimestamp = {
        'x-qn-nonce': mockHeaders['x-qn-nonce'],
        'x-qn-signature': mockHeaders['x-qn-signature'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(headersWithoutTimestamp)
        .send([mockTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeBitcoinService.process).not.toHaveBeenCalled();
    });

    it('should return 400 when x-qn-signature header is missing', async () => {
      const headersWithoutSignature = {
        'x-qn-nonce': mockHeaders['x-qn-nonce'],
        'x-qn-timestamp': mockHeaders['x-qn-timestamp'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(headersWithoutSignature)
        .send([mockTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeBitcoinService.process).not.toHaveBeenCalled();
    });

    it('should return 401 when signature verification fails', async () => {
      mockVerifySignature.mockReturnValue(false);

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(mockHeaders)
        .send([mockTransaction])
        .expect(401);

      expect(mockVerifySignature).toHaveBeenCalledWith(
        mockWebhookSecret,
        JSON.stringify([mockTransaction]),
        mockHeaders['x-qn-nonce'],
        mockHeaders['x-qn-timestamp'],
        mockHeaders['x-qn-signature'],
      );
      expect(quicknodeBitcoinService.process).not.toHaveBeenCalled();
    });

    it('should return 500 when verifySignature throws an error', async () => {
      mockVerifySignature.mockImplementation(() => {
        throw new Error('Signature verification error');
      });

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(mockHeaders)
        .send([mockTransaction])
        .expect(500);

      expect(quicknodeBitcoinService.process).not.toHaveBeenCalled();
    });

    it('should return 500 when service.process throws an error', async () => {
      mockVerifySignature.mockReturnValue(true);
      quicknodeBitcoinService.process.mockRejectedValue(
        new Error('Service processing error'),
      );

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(mockHeaders)
        .send([mockTransaction])
        .expect(500);

      expect(mockVerifySignature).toHaveBeenCalled();
      expect(quicknodeBitcoinService.process).toHaveBeenCalledWith({
        transactions: [mockTransaction],
      });
    });

    it('should return 400 when receiving invalid payload data', async () => {
      const invalidTransaction = {
        // Invalid type for a numeric field
        blockHash: 'not-a-number',
        blockHeight: 'abc',
        confirmations: 'xyz',
        fees: 100,
        txid: 1,
        value: 10,
        valueIn: 0,
        // Missing most of the required properties
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(mockHeaders)
        .send([invalidTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeBitcoinService.process).not.toHaveBeenCalled();
    });

    it('should process multiple transactions in one request', async () => {
      mockVerifySignature.mockReturnValue(true);

      const secondTransaction: QuickNodeBitcoinWebhookDto = {
        ...mockTransaction,
        txid: 'second-txid',
        vin: [
          {
            addresses: ['sender-address'],
            value: '2100000',
            isAddress: true,
            n: 0,
          },
        ],
        vout: [
          {
            addresses: ['recipient-address'],
            value: '2000000',
            isAddress: true,
            n: 0,
            spent: true,
          },
          {
            addresses: ['sender-address'],
            value: '100000',
            isAddress: true,
            n: 1,
          },
        ],
      };

      const transactions = [mockTransaction, secondTransaction];

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/bitcoin')
        .set(mockHeaders)
        .send(transactions)
        .expect(201)
        .expect('Webhook received and verified');

      expect(mockVerifySignature).toHaveBeenCalledWith(
        mockWebhookSecret,
        JSON.stringify(transactions),
        mockHeaders['x-qn-nonce'],
        mockHeaders['x-qn-timestamp'],
        mockHeaders['x-qn-signature'],
      );
      expect(quicknodeBitcoinService.process).toHaveBeenCalledWith({
        transactions,
      });
    });
  });
});
