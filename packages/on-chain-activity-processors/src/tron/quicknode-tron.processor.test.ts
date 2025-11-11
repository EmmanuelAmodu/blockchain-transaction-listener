import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { QuickNodeTronDto, TronDecodedLog } from './dtos';
import { QuickNodeTronProcessor } from './quicknode-tron.processor';

const buildDto = ({
  sender,
  recipient,
  transactionHash = '0x123abc456def789012345678901234567890abcdef123456789012345678901234',
  blockNumber = '0xdf740',
  timestamp = 1_755_006_030_000,
  gasUsed = '0x2710', // 10000 in hex
  effectiveGasPrice = '0x2540BE400', // 10000000000 in hex
  nativeValue = '0x0',
  decodedLogs = [],
}: {
  sender?: string;
  recipient?: string;
  transactionHash?: string;
  blockNumber?: string;
  timestamp?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  nativeValue?: string;
  decodedLogs?: TronDecodedLog[];
}): QuickNodeTronDto => ({
  blockHash:
    '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
  blockNumber,
  contractAddress: null,
  cumulativeGasUsed: gasUsed,
  decodedLogs,
  effectiveGasPrice,
  from: sender || '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A27',
  gasUsed,
  logs: [],
  logsBloom:
    '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  nonce: '0x1',
  status: '0x1',
  to: recipient || '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A28',
  transactionHash,
  transactionIndex: '0x0',
  type: '0x0',
  timestamp,
  value: nativeValue,
});

describe('QuickNodeTronProcessor', () => {
  let service: QuickNodeTronProcessor;

  const sender = 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH';
  const recipient = 'TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9';
  const usdtContract = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  const trc20Transfer: QuickNodeTronDto = buildDto({
    sender,
    recipient,
    decodedLogs: [
      {
        address: usdtContract,
        blockHash:
          '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
        blockNumber: '0xdf740',
        from: sender,
        logIndex: '0x0',
        name: 'Transfer',
        to: recipient,
        transactionHash:
          '0x123abc456def789012345678901234567890abcdef123456789012345678901234',
        value: '1000000',
      },
    ],
  });

  const nativeTrxTransfer: QuickNodeTronDto = buildDto({
    sender,
    recipient,
    nativeValue: '0xf4240', // 1000000 in hex
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickNodeTronProcessor],
    }).compile();

    service = module.get<QuickNodeTronProcessor>(QuickNodeTronProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process btc transactions', () => {
    it('should process a TRC-20 token transfer successfully (full schema)', async () => {
      const acts = await service.process({ transactions: [trc20Transfer] });
      expect(acts).toHaveLength(1);
      expect(acts[0]).toEqual({
        identifier:
          'transaction:tron:0x123abc456def789012345678901234567890abcdef123456789012345678901234',
        completedAtTimestamp: 1_755_006_030_000,
        metadata: {
          nonce: 1,
        },
        status: 'success',
        transfers: [
          {
            from: `wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`,
            to: `wallet:tron:TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9`,
            amount: '1000000',
            token: `token:tron:${usdtContract}`,
          },
        ],
        tokenIdentifiers: [`token:tron:${usdtContract}`],
        fee: {
          amount: 100_000_000_000_000,
          feePayer: [`wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`],
        },
        balanceChanges: [
          {
            wallet: `wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`,
            changes: [
              {
                token: `token:tron:${usdtContract}`,
                amount: '-1000000',
              },
            ],
          },
          {
            wallet: `wallet:tron:TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9`,
            changes: [
              {
                token: `token:tron:${usdtContract}`,
                amount: '1000000',
              },
            ],
          },
          {
            wallet: `wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`,
            changes: [
              {
                token: 'token:tron:native',
                amount: '-100000000000000',
              },
            ],
          },
        ],
      });
    });

    it('should process a native TRX transfer successfully', async () => {
      const acts = await service.process({ transactions: [nativeTrxTransfer] });
      expect(acts).toHaveLength(1);
      expect(acts[0]).toEqual({
        identifier:
          'transaction:tron:0x123abc456def789012345678901234567890abcdef123456789012345678901234',
        completedAtTimestamp: 1_755_006_030_000,
        metadata: {
          nonce: 1,
        },
        status: 'success',
        transfers: [
          {
            from: `wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`,
            to: `wallet:tron:TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9`,
            amount: '1000000',
            token: 'token:tron:native',
          },
        ],
        tokenIdentifiers: ['token:tron:native'],
        fee: {
          amount: 100_000_000_000_000,
          feePayer: [`wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`],
        },
        balanceChanges: [
          {
            wallet: `wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`,
            changes: [
              {
                token: 'token:tron:native',
                amount: '-1000000',
              },
            ],
          },
          {
            wallet: `wallet:tron:TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9`,
            changes: [
              {
                token: 'token:tron:native',
                amount: '1000000',
              },
            ],
          },
          {
            wallet: `wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH`,
            changes: [
              {
                token: 'token:tron:native',
                amount: '-100000000000000',
              },
            ],
          },
        ],
      });
    });

    it('should create balance changes for both sender and receiver wallets', async () => {
      // Use TRC-20 transfer to assert both sides get corresponding balance changes
      const acts = await service.process({ transactions: [trc20Transfer] });
      expect(acts).toHaveLength(1);
      const { balanceChanges } = acts[0];

      // Both participants present
      expect(
        balanceChanges.some((bc) => bc.wallet === `wallet:tron:${sender}`),
      ).toBe(true);
      expect(
        balanceChanges.some((bc) => bc.wallet === `wallet:tron:${recipient}`),
      ).toBe(true);

      // Correct signs and amounts
      const senderChange = balanceChanges.find(
        (bc) => bc.wallet === `wallet:tron:${sender}`,
      );
      const receiverChange = balanceChanges.find(
        (bc) => bc.wallet === `wallet:tron:${recipient}`,
      );
      expect(senderChange?.changes[0]).toEqual(
        expect.objectContaining({ amount: '-1000000' }),
      );
      expect(receiverChange?.changes[0]).toEqual(
        expect.objectContaining({ amount: '1000000' }),
      );
    });

    it('should process multiple transactions successfully', async () => {
      const tx2 = buildDto({
        transactionHash:
          '0x456def789abc012345678901234567890abcdef456789012345678901234567890',
        sender: 'TTestSender1',
        recipient: 'TTestReceiver1',
        decodedLogs: [
          {
            address: usdtContract,
            blockHash:
              '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
            blockNumber: '0xdf740',
            from: 'TTestSender1',
            logIndex: '0x0',
            name: 'Transfer',
            to: 'TTestReceiver1',
            transactionHash:
              '0x456def789abc012345678901234567890abcdef456789012345678901234567890',
            value: '2000000',
          },
        ],
      });

      const acts = await service.process({
        transactions: [trc20Transfer, tx2],
      });
      expect(acts).toHaveLength(2);
      expect(acts[0]).toEqual({
        identifier:
          'transaction:tron:0x123abc456def789012345678901234567890abcdef123456789012345678901234',
        completedAtTimestamp: 1_755_006_030_000,
        metadata: {
          nonce: 1,
        },
        status: 'success',
        transfers: [
          {
            from: `wallet:tron:${sender}`,
            to: `wallet:tron:${recipient}`,
            amount: '1000000',
            token: `token:tron:${usdtContract}`,
          },
        ],
        tokenIdentifiers: [`token:tron:${usdtContract}`],
        fee: {
          amount: 100_000_000_000_000,
          feePayer: [`wallet:tron:${sender}`],
        },
        balanceChanges: [
          {
            wallet: `wallet:tron:${sender}`,
            changes: [
              {
                token: `token:tron:${usdtContract}`,
                amount: '-1000000',
              },
            ],
          },
          {
            wallet: `wallet:tron:${recipient}`,
            changes: [
              {
                token: `token:tron:${usdtContract}`,
                amount: '1000000',
              },
            ],
          },
          {
            wallet: `wallet:tron:${sender}`,
            changes: [
              {
                token: 'token:tron:native',
                amount: '-100000000000000',
              },
            ],
          },
        ],
      });
      expect(acts[1]).toEqual({
        identifier:
          'transaction:tron:0x456def789abc012345678901234567890abcdef456789012345678901234567890',
        completedAtTimestamp: 1_755_006_030_000,
        metadata: {
          nonce: 1,
        },
        status: 'success',
        transfers: [
          {
            from: 'wallet:tron:TTestSender1',
            to: 'wallet:tron:TTestReceiver1',
            amount: '2000000',
            token: `token:tron:${usdtContract}`,
          },
        ],
        tokenIdentifiers: [`token:tron:${usdtContract}`],
        fee: {
          amount: 100_000_000_000_000,
          feePayer: ['wallet:tron:TTestSender1'],
        },
        balanceChanges: [
          {
            wallet: 'wallet:tron:TTestSender1',
            changes: [
              {
                token: `token:tron:${usdtContract}`,
                amount: '-2000000',
              },
            ],
          },
          {
            wallet: 'wallet:tron:TTestReceiver1',
            changes: [
              {
                token: `token:tron:${usdtContract}`,
                amount: '2000000',
              },
            ],
          },
          {
            wallet: 'wallet:tron:TTestSender1',
            changes: [
              {
                token: 'token:tron:native',
                amount: '-100000000000000',
              },
            ],
          },
        ],
      });
    });

    it('should handle service errors gracefully with Promise.allSettled', async () => {
      await expect(
        service.process({ transactions: [trc20Transfer] }),
      ).resolves.not.toThrow();
    });

    it('should always use correct token identifiers', async () => {
      const call = (
        await service.process({ transactions: [trc20Transfer] })
      )[0];
      expect(call.tokenIdentifiers).toEqual([`token:tron:${usdtContract}`]);
      expect(call.transfers[0].token).toBe(`token:tron:${usdtContract}`);
    });

    it('should set fee payer as transaction sender and use calculated gas fee', async () => {
      const tx = buildDto({
        gasUsed: '0x0',
        effectiveGasPrice: '0x0',
        sender: 'TTestSender',
        recipient: 'TTestReceiver',
        decodedLogs: [
          {
            address: usdtContract,
            blockHash:
              '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
            blockNumber: '0xdf740',
            from: 'TTestSender',
            logIndex: '0x0',
            name: 'Transfer',
            to: 'TTestReceiver',
            transactionHash:
              '0x123abc456def789012345678901234567890abcdef123456789012345678901234',
            value: '1000000',
          },
        ],
      });

      const activity = (await service.process({ transactions: [tx] }))[0];
      expect(activity.fee).toEqual({
        amount: 0,
        feePayer: ['wallet:tron:TTestSender'],
      });
      expect(activity.balanceChanges).toHaveLength(2); // Only transfer balance changes, no fee balance changes
    });

    it('should handle failed transactions with status 0x0', async () => {
      const failedTx = buildDto({
        ...trc20Transfer,
        decodedLogs: trc20Transfer.decodedLogs
          ? [
              {
                ...trc20Transfer.decodedLogs[0],
              },
            ]
          : [],
      });
      (failedTx as any).status = '0x0';

      const activity = (await service.process({ transactions: [failedTx] }))[0];
      expect(activity.status).toBe('failed');
    });

    it('should handle zero gas fee when using bandwidth/energy', async () => {
      const tx = buildDto({
        gasUsed: '0x0',
        effectiveGasPrice: '0x0',
        sender,
        recipient,
        decodedLogs: [
          {
            address: usdtContract,
            blockHash:
              '0x000000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
            blockNumber: '0xdf740',
            from: sender,
            logIndex: '0x0',
            name: 'Transfer',
            to: recipient,
            transactionHash:
              '0x123abc456def789012345678901234567890abcdef123456789012345678901234',
            value: '1000000',
          },
        ],
      });

      const activity = (await service.process({ transactions: [tx] }))[0];
      expect(activity.fee.amount).toBe(0);
      expect(activity.balanceChanges).toHaveLength(2); // Only transfer balance changes
    });

    it('should process real TRON transaction correctly', async () => {
      const realTx: QuickNodeTronDto = {
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
        effectiveGasPrice: '0x2540BE400', // 10000000000 in hex
        from: '0x41D1C7FEF74B31436E1F7F3EA4C03A3A85C24A5A27',
        gasUsed: '0x2710', // 10000 in hex
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

      const realActs = await service.process({ transactions: [realTx] });
      expect(realActs).toHaveLength(1);
      expect(realActs[0]).toEqual(
        expect.objectContaining({
          identifier:
            'transaction:tron:0x123abc456def789012345678901234567890abcdef123456789012345678901234',
          completedAtTimestamp: 1_755_006_030_000,
          metadata: {
            nonce: 1,
          },
          status: 'success',
          fee: {
            amount: 100_000_000_000_000,
            feePayer: ['wallet:tron:2zu5BQ51VaytQf2LQQKSSUM8MZg5jTWaBjWh'],
          },
          transfers: [
            {
              from: 'wallet:tron:TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
              to: 'wallet:tron:TMuA6YqfCeX8EhbfYEg5y7S4DqzSJireY9',
              amount: '1000000',
              token: 'token:tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            },
          ],
        }),
      );
    });

    it('skips transactions without balance changes (energy/bandwidth only)', async () => {
      const txWithoutBalanceChanges = buildDto({
        sender,
        recipient,
        nativeValue: '0x0',
        gasUsed: '0x0', // No gas used
        effectiveGasPrice: '0x0', // No gas price
        decodedLogs: [],
      });

      const acts = await service.process({
        transactions: [txWithoutBalanceChanges],
      });

      expect(acts).toHaveLength(0);
    });

    it('should create correct balance changes for TRC-20 transfer', () => {
      const transfer = {
        from: 'wallet:tron:TTestSender123',
        to: 'wallet:tron:TTestRecipient456',
        amount: '5000000',
        token: 'token:tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      } as any;

      const balanceChanges = (service as any).getTransferBalanceChanges({
        transfer,
      });

      expect(balanceChanges).toEqual([
        {
          wallet: 'wallet:tron:TTestSender123',
          changes: [
            {
              token: 'token:tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
              amount: '-5000000',
            },
          ],
        },
        {
          wallet: 'wallet:tron:TTestRecipient456',
          changes: [
            {
              token: 'token:tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
              amount: '5000000',
            },
          ],
        },
      ]);
    });

    it('should handle zero amounts correctly', () => {
      const transfer = {
        from: 'wallet:tron:TTestSender123',
        to: 'wallet:tron:TTestRecipient456',
        amount: '0',
        token: 'token:tron:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges({
        transfer,
      });
      expect(balanceChanges).toEqual([]);
    });

    it('should handle large amounts correctly', () => {
      const transfer = {
        from: 'wallet:tron:TTestSender123',
        to: 'wallet:tron:TTestRecipient456',
        amount: '1000000000000',
        token: 'token:tron:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges({
        transfer,
      });
      const senderChange = balanceChanges.find(
        (bc) => bc.wallet === 'wallet:tron:TTestSender123',
      );
      const receiverChange = balanceChanges.find(
        (bc) => bc.wallet === 'wallet:tron:TTestRecipient456',
      );
      expect(senderChange.changes[0].amount).toBe('-1000000000000');
      expect(receiverChange.changes[0].amount).toBe('1000000000000');
    });

    it('should always use correct token identifiers (transfer helper)', () => {
      const transfer = {
        from: 'wallet:tron:TTestSender123',
        to: 'wallet:tron:TTestRecipient456',
        amount: '1500000',
        token: 'token:tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges({
        transfer,
      });
      balanceChanges.forEach((change) => {
        expect(change.changes[0].token).toBe(
          'token:tron:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        );
      });
    });
  });

  describe('getFeeBalanceChanges (private)', () => {
    it('should apply full fee as negative change to the transaction sender', () => {
      const transaction = {
        from: 'TTestSender',
      } as any;
      const gasFeeBN = new BigNumber('100000000000000');

      const feeChanges = (service as any).getFeeBalanceChanges({
        transaction,
        gasFeeBN,
      });

      expect(feeChanges).toEqual([
        {
          wallet: 'wallet:tron:TTestSender',
          changes: [{ token: 'token:tron:native', amount: '-100000000000000' }],
        },
      ]);
    });

    it('should return empty array when gas fee is zero', () => {
      const transaction = {
        from: 'TTestSender',
      } as any;
      const gasFeeBN = new BigNumber('0');

      const feeChanges = (service as any).getFeeBalanceChanges({
        transaction,
        gasFeeBN,
      });

      expect(feeChanges).toEqual([]);
    });

    it('should handle large gas fees correctly', () => {
      const transaction = {
        from: 'TTestSender',
      } as any;
      const gasFeeBN = new BigNumber('1000000000000000000');

      const feeChanges = (service as any).getFeeBalanceChanges({
        transaction,
        gasFeeBN,
      });

      expect(feeChanges).toEqual([
        {
          wallet: 'wallet:tron:TTestSender',
          changes: [
            { token: 'token:tron:native', amount: '-1000000000000000000' },
          ],
        },
      ]);
    });

    it('should always use TRX native token for fees', () => {
      const transaction = {
        from: 'TTestSender',
      } as any;
      const gasFeeBN = new BigNumber('50000000000000');

      const feeChanges = (service as any).getFeeBalanceChanges({
        transaction,
        gasFeeBN,
      });

      expect(feeChanges[0].changes[0].token).toBe('token:tron:native');
    });
  });
});
