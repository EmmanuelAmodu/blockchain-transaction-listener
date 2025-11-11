import { Test, TestingModule } from '@nestjs/testing';
import { QuicknodeXrplProcessor } from './quicknode-xrpl.processor';
import {
  QNIgnoredPayment,
  QNIgnoredType,
  QNRLUSDSEND,
  QNXRPSend,
} from './test/QuickNodeXRPSample';

describe('QuickNodeXRPLProcessor', () => {
  let service: QuicknodeXrplProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuicknodeXrplProcessor],
    }).compile();

    service = module.get<QuicknodeXrplProcessor>(QuicknodeXrplProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('Should process an XRP transaction (full schema)', async () => {
      const acts = await service.process({ transactions: [QNXRPSend] } as any);
      expect(acts).toHaveLength(1);
      expect(acts[0]).toEqual({
        status: 'success',
        identifier:
          'transaction:xrpl:18948ACE327F124962FB8DAC0000A10680A646862E4346069EF90E565243E624',
        metadata: {
          ledgerIndex: 0,
          transactionType: 'Payment',
          date: 1756280231000,
        },
        completedAtTimestamp: 1756280231000,
        fee: {
          amount: 12,
          feePayer: ['wallet:xrpl:rP4xfxoUTCHsec6TerwDtJr2TLbbBvo4BY'],
        },
        tokenIdentifiers: ['token:xrpl:native'],
        transfers: [
          {
            token: 'token:xrpl:native',
            amount: '692264',
            from: 'wallet:xrpl:rP4xfxoUTCHsec6TerwDtJr2TLbbBvo4BY',
            to: 'wallet:xrpl:rPoFesGDwPAi2GHzv7tqWtLNKdazU82nBg',
          },
        ],
        balanceChanges: [
          {
            wallet: 'wallet:xrpl:rP4xfxoUTCHsec6TerwDtJr2TLbbBvo4BY',
            changes: [
              {
                token: 'token:xrpl:native',
                amount: '-12',
              },
            ],
          },
          {
            wallet: 'wallet:xrpl:rP4xfxoUTCHsec6TerwDtJr2TLbbBvo4BY',
            changes: [
              {
                token: 'token:xrpl:native',
                amount: '-692264',
              },
            ],
          },
          {
            wallet: 'wallet:xrpl:rPoFesGDwPAi2GHzv7tqWtLNKdazU82nBg',
            changes: [
              {
                token: 'token:xrpl:native',
                amount: '692264',
              },
            ],
          },
        ],
      });
    });

    it('Should process an RLUSD transaction', async () => {
      const acts = await service.process({
        transactions: [QNRLUSDSEND],
      } as any);
      expect(acts).toHaveLength(1);
      expect(acts[0]).toEqual({
        status: 'success',
        identifier:
          'transaction:xrpl:363E0606F7339A649D89841E6CD7E46591865FEFA650D07F0D7A6EEFB7B6EFAF',
        metadata: {
          ledgerIndex: 0,
          transactionType: 'Payment',
          date: 1756280231000,
        },
        completedAtTimestamp: 1756280231000,
        fee: {
          amount: 10,
          feePayer: ['wallet:xrpl:rogue5HnPRSszD9CWGSUz8UGHMVwSSKF6'],
        },
        tokenIdentifiers: [
          'token:xrpl:524C555344000000000000000000000000000000.rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
        ],
        transfers: [
          {
            token:
              'token:xrpl:524C555344000000000000000000000000000000.rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
            amount: '53447',
            from: 'wallet:xrpl:rogue5HnPRSszD9CWGSUz8UGHMVwSSKF6',
            to: 'wallet:xrpl:rogue5HnPRSszD9CWGSUz8UGHMVwSSKF6',
          },
        ],
        balanceChanges: [
          {
            wallet: 'wallet:xrpl:rogue5HnPRSszD9CWGSUz8UGHMVwSSKF6',
            changes: [
              {
                token: 'token:xrpl:native',
                amount: '-10',
              },
            ],
          },
          {
            wallet: 'wallet:xrpl:rogue5HnPRSszD9CWGSUz8UGHMVwSSKF6',
            changes: [
              {
                token:
                  'token:xrpl:524C555344000000000000000000000000000000.rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
                amount: '-53447',
              },
            ],
          },
          {
            wallet: 'wallet:xrpl:rogue5HnPRSszD9CWGSUz8UGHMVwSSKF6',
            changes: [
              {
                token:
                  'token:xrpl:524C555344000000000000000000000000000000.rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De',
                amount: '53447',
              },
            ],
          },
        ],
      });
    });

    it('Should ignore transactions for other currencies', async () => {
      const acts = await service.process({
        transactions: [QNIgnoredPayment],
      } as any);
      expect(acts).toHaveLength(0);
    });

    it('Should ignore other transaction types', async () => {
      const acts = await service.process({
        transactions: [QNIgnoredType],
      } as any);
      expect(acts).toHaveLength(0);
    });
  });
});
