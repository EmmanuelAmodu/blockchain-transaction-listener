import {
  QuickNodeTronDto,
  QuickNodeTronProcessor,
} from '@onionfi-internal/on-chain-activity-processors';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { OnChainActivityService } from '../on-chain-activity.service';
import { verifySignature } from '../utils/utils';
import { QuickNodeTronController } from './quicknode-tron.controller';

// Mock the utils module
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  verifySignature: jest.fn(),
}));

describe('QuickNodeTronController', () => {
  let app;
  let quicknodeTronService: jest.Mocked<QuickNodeTronProcessor>;
  let configService: jest.Mocked<ConfigService>;
  const mockVerifySignature = jest.mocked(verifySignature);

  const mockWebhookSecret = 'test-webhook-secret';
  const mockTransaction: QuickNodeTronDto = {
    blockHash:
      '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
    blockNumber: '0xdf740',
    contractAddress: null,
    cumulativeGasUsed: '0x5208',
    decodedLogs: [
      {
        address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        blockHash:
          '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
        blockNumber: '0xdf740',
        from: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
        logIndex: '0x0',
        name: 'Transfer',
        to: 'TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9',
        transactionHash:
          '0x123abc456def789012345678901234567890abcdef123456789012345678901234',
        value: '1000000',
      },
    ],
    effectiveGasPrice: '0x174876e800',
    from: '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A27',
    gasUsed: '0x5208',
    logs: [],
    logsBloom:
      '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    nonce: '0x1',
    status: '0x1',
    to: '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A27',
    transactionHash:
      '0x123abc456def789012345678901234567890abcdef123456789012345678901234',
    transactionIndex: '0x0',
    type: '0x0',
    timestamp: 1_755_006_030_000,
    value: '0x0',
  };

  const mockHeaders = {
    'x-qn-nonce': 'test-nonce',
    'x-qn-timestamp': '1633072800',
    'x-qn-signature': 'test-signature',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuickNodeTronController],
      providers: [
        {
          provide: OnChainActivityService,
          useValue: { handleActivityBatch: jest.fn() },
        },
        {
          provide: QuickNodeTronProcessor,
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

    quicknodeTronService = module.get(QuickNodeTronProcessor);
    configService = module.get(ConfigService);

    mockVerifySignature.mockReturnValue(true);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should retrieve webhook secret from config service', () => {
    expect(configService.getOrThrow).toHaveBeenCalledWith(
      'quickNode.tronWebhookSecret',
    );
  });

  describe('POST /webhooks/quicknode/tron', () => {
    beforeEach(() => {
      mockVerifySignature.mockClear();
      quicknodeTronService.process.mockClear();
    });

    it('should process transaction when signature verification succeeds', async () => {
      mockVerifySignature.mockReturnValue(true);

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
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
      expect(quicknodeTronService.process).toHaveBeenCalledWith({
        transactions: [mockTransaction],
      });
    });

    it('should return 400 when x-qn-nonce header is missing', async () => {
      const headersWithoutNonce = {
        'x-qn-timestamp': mockHeaders['x-qn-timestamp'],
        'x-qn-signature': mockHeaders['x-qn-signature'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
        .set(headersWithoutNonce)
        .send([mockTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeTronService.process).not.toHaveBeenCalled();
    });

    it('should return 400 when x-qn-timestamp header is missing', async () => {
      const headersWithoutTimestamp = {
        'x-qn-nonce': mockHeaders['x-qn-nonce'],
        'x-qn-signature': mockHeaders['x-qn-signature'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
        .set(headersWithoutTimestamp)
        .send([mockTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeTronService.process).not.toHaveBeenCalled();
    });

    it('should return 400 when x-qn-signature header is missing', async () => {
      const headersWithoutSignature = {
        'x-qn-nonce': mockHeaders['x-qn-nonce'],
        'x-qn-timestamp': mockHeaders['x-qn-timestamp'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
        .set(headersWithoutSignature)
        .send([mockTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeTronService.process).not.toHaveBeenCalled();
    });

    it('should return 401 when signature verification fails', async () => {
      mockVerifySignature.mockReturnValue(false);

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
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
      expect(quicknodeTronService.process).not.toHaveBeenCalled();
    });

    it('should return 500 when verifySignature throws an error', async () => {
      mockVerifySignature.mockImplementation(() => {
        throw new Error('Signature verification error');
      });

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
        .set(mockHeaders)
        .send([mockTransaction])
        .expect(500);

      expect(quicknodeTronService.process).not.toHaveBeenCalled();
    });

    it('should return 500 when service.process throws an error', async () => {
      mockVerifySignature.mockReturnValue(true);
      quicknodeTronService.process.mockRejectedValue(
        new Error('Service processing error'),
      );

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
        .set(mockHeaders)
        .send([mockTransaction])
        .expect(500);

      expect(mockVerifySignature).toHaveBeenCalled();
      expect(quicknodeTronService.process).toHaveBeenCalledWith({
        transactions: [mockTransaction],
      });
    });

    it('should return 400 when receiving invalid payload data', async () => {
      const invalidTransaction = {
        blockHash: 123,
        blockNumber: 'not-a-hex',
        effectiveGasPrice: 'invalid',
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
        .set(mockHeaders)
        .send([invalidTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(quicknodeTronService.process).not.toHaveBeenCalled();
    });

    it('should process multiple transactions in one request', async () => {
      mockVerifySignature.mockReturnValue(true);

      const secondTransaction: QuickNodeTronDto = {
        ...mockTransaction,
        transactionHash:
          '0x456def789abc012345678901234567890abcdef456789012345678901234567890',
        from: '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A28',
        to: '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A29',
        value: '0x16345785d8a0000',
        decodedLogs: [
          {
            address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            blockHash:
              '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
            blockNumber: '0xdf740',
            from: 'TTestSender',
            logIndex: '0x0',
            name: 'Transfer',
            to: 'TTestReceiver',
            transactionHash:
              '0x456def789abc012345678901234567890abcdef456789012345678901234567890',
            value: '2000000',
          },
        ],
      };

      const transactions = [mockTransaction, secondTransaction];

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/tron')
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
      expect(quicknodeTronService.process).toHaveBeenCalledWith({
        transactions,
      });
    });
  });
});
