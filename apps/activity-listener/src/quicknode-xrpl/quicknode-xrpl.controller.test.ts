import { QuicknodeXrplProcessor } from '@onionfi-internal/on-chain-activity-processors';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { OnChainActivityService } from '../on-chain-activity.service';
import { verifySignature } from '../utils/utils';
import { QuicknodeXrplController } from './quicknode-xrpl.controller';
import { QNRLUSDSEND, QNXRPSend } from './test/QuickNodeXRPSample';

// Mock the utils module
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  verifySignature: jest.fn(),
}));

describe('QuickNodeXrplController', () => {
  let app;
  let service: jest.Mocked<QuicknodeXrplProcessor>;
  let configService: jest.Mocked<ConfigService>;
  const mockVerifySignature = jest.mocked(verifySignature);

  const mockWebhookSecret = 'test-webhook-secret';

  const mockHeaders = {
    'x-qn-nonce': 'test-nonce',
    'x-qn-timestamp': '1633072800',
    'x-qn-signature': 'test-signature',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuicknodeXrplController],
      providers: [
        {
          provide: OnChainActivityService,
          useValue: { handleActivityBatch: jest.fn() },
        },
        {
          provide: QuicknodeXrplProcessor,
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

    service = module.get(QuicknodeXrplProcessor);
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
      'quickNode.xrplWebhookSecret',
    );
  });

  describe('POST /webhooks/quicknode/xrpl', () => {
    beforeEach(() => {
      // Clear mock calls before each test
      mockVerifySignature.mockClear();
      service.process.mockClear();
    });

    it('should process transaction when signature verification succeeds', async () => {
      mockVerifySignature.mockReturnValue(true);

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(mockHeaders)
        .send([QNXRPSend])
        .expect(200)
        .expect('Webhook received and verified');

      expect(mockVerifySignature).toHaveBeenCalledWith(
        mockWebhookSecret,
        JSON.stringify([QNXRPSend]),
        mockHeaders['x-qn-nonce'],
        mockHeaders['x-qn-timestamp'],
        mockHeaders['x-qn-signature'],
      );

      expect(service.process).toHaveBeenCalledWith({
        transactions: [QNXRPSend],
      });
    });

    it('should return 400 when x-qn-nonce header is missing', async () => {
      const headersWithoutNonce = {
        'x-qn-timestamp': mockHeaders['x-qn-timestamp'],
        'x-qn-signature': mockHeaders['x-qn-signature'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(headersWithoutNonce)
        .send([QNXRPSend])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(service.process).not.toHaveBeenCalled();
    });

    it('should return 400 when x-qn-timestamp header is missing', async () => {
      const headersWithoutTimestamp = {
        'x-qn-nonce': mockHeaders['x-qn-nonce'],
        'x-qn-signature': mockHeaders['x-qn-signature'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(headersWithoutTimestamp)
        .send([QNXRPSend])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(service.process).not.toHaveBeenCalled();
    });

    it('should return 400 when x-qn-signature header is missing', async () => {
      const headersWithoutSignature = {
        'x-qn-nonce': mockHeaders['x-qn-nonce'],
        'x-qn-timestamp': mockHeaders['x-qn-timestamp'],
      };

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(headersWithoutSignature)
        .send([QNXRPSend])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(service.process).not.toHaveBeenCalled();
    });

    it('should return 401 when signature verification fails', async () => {
      mockVerifySignature.mockReturnValue(false);

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(mockHeaders)
        .send([QNXRPSend])
        .expect(401);

      expect(mockVerifySignature).toHaveBeenCalledWith(
        mockWebhookSecret,
        JSON.stringify([QNXRPSend]),
        mockHeaders['x-qn-nonce'],
        mockHeaders['x-qn-timestamp'],
        mockHeaders['x-qn-signature'],
      );
      expect(service.process).not.toHaveBeenCalled();
    });

    it('should return 500 when verifySignature throws an error', async () => {
      mockVerifySignature.mockImplementation(() => {
        throw new Error('Signature verification error');
      });

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(mockHeaders)
        .send([QNXRPSend])
        .expect(500);

      expect(service.process).not.toHaveBeenCalled();
    });

    it('should return 500 when service.process throws an error', async () => {
      mockVerifySignature.mockReturnValue(true);
      service.process.mockRejectedValue(new Error('Service processing error'));

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(mockHeaders)
        .send([QNXRPSend])
        .expect(500);

      expect(mockVerifySignature).toHaveBeenCalled();
      expect(service.process).toHaveBeenCalledWith({
        transactions: [QNXRPSend],
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
        .post('/webhooks/quicknode/xrpl')
        .set(mockHeaders)
        .send([invalidTransaction])
        .expect(400);

      expect(mockVerifySignature).not.toHaveBeenCalled();
      expect(service.process).not.toHaveBeenCalled();
    });

    it('should process multiple transactions in one request', async () => {
      mockVerifySignature.mockReturnValue(true);

      const transactions = [QNXRPSend, QNRLUSDSEND];

      await request(app.getHttpServer())
        .post('/webhooks/quicknode/xrpl')
        .set(mockHeaders)
        .send(transactions)
        .expect(200)
        .expect('Webhook received and verified');

      expect(mockVerifySignature).toHaveBeenCalledWith(
        mockWebhookSecret,
        JSON.stringify(transactions),
        mockHeaders['x-qn-nonce'],
        mockHeaders['x-qn-timestamp'],
        mockHeaders['x-qn-signature'],
      );
      expect(service.process).toHaveBeenCalledWith({ transactions });
    });
  });
});
