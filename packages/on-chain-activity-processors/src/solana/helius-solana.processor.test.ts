import { Test, TestingModule } from '@nestjs/testing';
import { Source, TokenStandard, TransactionType } from 'helius-sdk';
import type { EnrichedTransactionDto } from './dtos';
import { HeliusSolanaProcessor } from './helius-solana.processor';

describe('HeliusSolanaProcessor', () => {
  let heliusSolanaProcessor: HeliusSolanaProcessor;

  // Common properties needed for EnrichedTransaction mock
  const baseTransactionProps = {
    type: TransactionType.TRANSFER,
    source: Source.SYSTEM_PROGRAM,
    fee: 5000,
    feePayer: 'fee-payer-address',
    instructions: [],
    accountData: [
      {
        account: 'fee-payer-address',
        nativeBalanceChange: 0,
        tokenBalanceChanges: [
          {
            mint: 'token-mint-address',
            rawTokenAmount: {
              decimals: 6,
              tokenAmount: '100',
            },
            userAccount: 'from-token-address',
            tokenAccount: 'token-account-address',
          },
        ],
      },
    ],
    events: {
      nft: null,
      swap: null,
      compressed: null,
    },
    transactionError: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HeliusSolanaProcessor],
    }).compile();

    heliusSolanaProcessor = module.get<HeliusSolanaProcessor>(
      HeliusSolanaProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should transform and process complete data with usdc token transfer (full schema)', async () => {
      // Arrange real payload copied from Logs
      const mockTransaction = {
        instructions: [
          {
            data: '3dmkZdMRLKLs',
            programId: 'ComputeBudget111111111111111111111111111111',
          },
          {
            data: 'GhToxb',
            programId: 'ComputeBudget111111111111111111111111111111',
          },
          {
            data: 'gWoDtHMZwkJVs',
            accounts: [
              '4CfWTH88FgU43FW6YhicRjBMPdETAnfJ26StXoVnqgGu',
              'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
              'AdSopk3v6PGgrKv1o9qZsXnkruDaA41aT63DTeEaQpUx',
              'fromUserWallet',
              'fromUserWallet',
            ],
            programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          },
        ],
        feePayer: 'fromUserWallet',
        signature:
          'wB8pXtQePtBQpwCE9te82WuD8NaDyLzkKRqCEnWiKaP2db2LNLinrQgREBQcq1owAom86G3YUAfERQSCP3W9Rnb',
        fee: 79994,
        tokenTransfers: [
          {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            toUserAccount: 'toUserWallet',
            tokenStandard: 'Fungible',
            fromTokenAccount: '4CfWTH88FgU43FW6YhicRjBMPdETAnfJ26StXoVnqgGu',
            tokenAmount: 0.02,
            fromUserAccount: 'fromUserWallet',
            toTokenAccount: 'AdSopk3v6PGgrKv1o9qZsXnkruDaA41aT63DTeEaQpUx',
          },
        ],
        description: 'fromUserWallet transferred 0.02 USDC to toUserWallet.',
        slot: 338016928,
        source: 'SOLANA_PROGRAM_LIBRARY',
        type: 'TRANSFER',
        accountData: [
          {
            nativeBalanceChange: -79994,
            account: 'fromUserWallet',
          },
          {
            nativeBalanceChange: 0,
            tokenBalanceChanges: [
              {
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                tokenAccount: '4CfWTH88FgU43FW6YhicRjBMPdETAnfJ26StXoVnqgGu',
                rawTokenAmount: { decimals: 6, tokenAmount: '-20000' },
                userAccount: 'fromUserWallet',
              },
            ],
            account: '4CfWTH88FgU43FW6YhicRjBMPdETAnfJ26StXoVnqgGu',
          },
          {
            nativeBalanceChange: 0,
            tokenBalanceChanges: [
              {
                mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                tokenAccount: 'AdSopk3v6PGgrKv1o9qZsXnkruDaA41aT63DTeEaQpUx',
                rawTokenAmount: { decimals: 6, tokenAmount: '20000' },
                userAccount: 'toUserWallet',
              },
            ],
            account: 'AdSopk3v6PGgrKv1o9qZsXnkruDaA41aT63DTeEaQpUx',
          },
          {
            nativeBalanceChange: 0,
            account: 'ComputeBudget111111111111111111111111111111',
          },
          {
            nativeBalanceChange: 0,
            account: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
          {
            nativeBalanceChange: 0,
            account: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          },
        ],
        timestamp: 1746457806,
      } as EnrichedTransactionDto;

      // Act
      const acts = await heliusSolanaProcessor.process({
        transactions: [mockTransaction],
      });
      expect(acts[0]).toEqual({
        identifier:
          'transaction:solana:wB8pXtQePtBQpwCE9te82WuD8NaDyLzkKRqCEnWiKaP2db2LNLinrQgREBQcq1owAom86G3YUAfERQSCP3W9Rnb',
        metadata: {
          slot: 338016928,
        },
        completedAtTimestamp: 1746457806000,
        status: 'success',
        description: 'fromUserWallet transferred 0.02 USDC to toUserWallet.',
        fee: {
          amount: 79994,
          feePayer: ['wallet:solana:fromUserWallet'],
        },
        tokenIdentifiers: [
          'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          'token:solana:native',
        ],
        transfers: [
          {
            from: 'wallet:solana:fromUserWallet',
            to: 'wallet:solana:toUserWallet',
            amount: '0.02',
            token: 'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
        ],
        balanceChanges: [
          {
            wallet: 'wallet:solana:fromUserWallet',
            changes: [
              {
                token: 'token:solana:native',
                amount: '-79994',
              },
              {
                token:
                  'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: '-20000',
              },
            ],
          },
          {
            wallet: 'wallet:solana:toUserWallet',
            changes: [
              {
                token:
                  'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: '20000',
              },
            ],
          },
        ],
      });
    });

    it('should handle transactions with only token transfers', async () => {
      // Arrange
      const mockTransaction: EnrichedTransactionDto = {
        ...baseTransactionProps,
        signature: 'token-only-signature',
        timestamp: 1234567890,
        slot: 12345,
        description: 'Token Only Transaction',
        tokenTransfers: [
          {
            fromUserAccount: 'from-token-address',
            toUserAccount: 'to-token-address',
            fromTokenAccount: 'from-token-account',
            toTokenAccount: 'to-token-account',
            mint: 'token-mint-address',
            tokenAmount: 0.1,
            tokenStandard: TokenStandard.FUNGIBLE,
          },
        ],
        nativeTransfers: [],
        accountData: [
          {
            account: 'from-token-address',
            nativeBalanceChange: 0,
            tokenBalanceChanges: [
              {
                mint: 'token-mint-address',
                rawTokenAmount: {
                  decimals: 6,
                  tokenAmount: '100000',
                },
                userAccount: 'from-token-address',
                tokenAccount: 'token-account-address',
              },
            ],
          },
        ],
      };

      // Act
      const acts = await heliusSolanaProcessor.process({
        transactions: [mockTransaction],
      });
      expect(acts[0]).toEqual({
        identifier: 'transaction:solana:token-only-signature',
        metadata: {
          slot: 12345,
        },
        completedAtTimestamp: 1234567890000,
        status: 'success',
        description: 'Token Only Transaction',
        fee: {
          amount: 5000,
          feePayer: ['wallet:solana:fee-payer-address'],
        },
        tokenIdentifiers: ['token:solana:token-mint-address'],
        transfers: [
          {
            from: 'wallet:solana:from-token-address',
            to: 'wallet:solana:to-token-address',
            amount: '0.1',
            token: 'token:solana:token-mint-address',
          },
        ],
        balanceChanges: [
          {
            wallet: 'wallet:solana:from-token-address',
            changes: [
              {
                token: 'token:solana:token-mint-address',
                amount: '100000',
              },
            ],
          },
        ],
      });
    });

    it('should transform and process complete data with native token transfer', async () => {
      // Arrange real payload copied from Logs
      const mockTransaction = {
        nativeTransfers: [
          {
            amount: 1500000,
            toUserAccount: 'toUserWallet',
            fromUserAccount: 'fromUserWallet',
          },
        ],
        instructions: [
          {
            data: '3b1H8Rq1T3d1',
            programId: 'ComputeBudget111111111111111111111111111111',
          },
          {
            data: 'LKoyXd',
            programId: 'ComputeBudget111111111111111111111111111111',
          },
          {
            data: '3Bxs4H4awr2vpcxP',
            accounts: ['fromUserWallet', 'toUserWallet'],
            programId: '11111111111111111111111111111111',
          },
        ],
        feePayer: 'fromUserWallet',
        signature:
          '2TsJDrMTVbcSA4XDkN9rRq1S1pinQtwUz58NDCVuQtXcY4VTPxFRA5pYHirVFCic6wfyrcmB7reqr6zwWvUdwhJy',
        fee: 80000,
        description: 'fromUserWallet transferred 0.0015 SOL to toUserWallet.',
        slot: 338194436,
        source: 'SYSTEM_PROGRAM',
        type: 'TRANSFER',
        accountData: [
          {
            nativeBalanceChange: -1580000,
            account: 'fromUserWallet',
          },
          {
            nativeBalanceChange: 1500000,
            account: 'toUserWallet',
          },
          {
            nativeBalanceChange: 0,
            account: '11111111111111111111111111111111',
          },
          {
            nativeBalanceChange: 0,
            account: 'ComputeBudget111111111111111111111111111111',
          },
        ],
        timestamp: 1746527738,
      } as EnrichedTransactionDto;

      // Act
      const acts = await heliusSolanaProcessor.process({
        transactions: [mockTransaction],
      });
      expect(acts[0]).toEqual({
        identifier:
          'transaction:solana:2TsJDrMTVbcSA4XDkN9rRq1S1pinQtwUz58NDCVuQtXcY4VTPxFRA5pYHirVFCic6wfyrcmB7reqr6zwWvUdwhJy',
        metadata: {
          slot: 338194436,
        },
        completedAtTimestamp: 1746527738000,
        status: 'success',
        description: 'fromUserWallet transferred 0.0015 SOL to toUserWallet.',
        fee: {
          amount: 80000,
          feePayer: ['wallet:solana:fromUserWallet'],
        },
        tokenIdentifiers: ['token:solana:native'],
        transfers: [
          {
            from: 'wallet:solana:fromUserWallet',
            to: 'wallet:solana:toUserWallet',
            amount: '1500000',
            token: 'token:solana:native',
          },
        ],
        balanceChanges: [
          {
            wallet: 'wallet:solana:fromUserWallet',
            changes: [
              {
                token: 'token:solana:native',
                amount: '-1580000',
              },
            ],
          },
          {
            wallet: 'wallet:solana:toUserWallet',
            changes: [
              {
                token: 'token:solana:native',
                amount: '1500000',
              },
            ],
          },
        ],
      });
    });

    it('should handle transactions with no transfers', async () => {
      // Arrange
      const mockTransaction: EnrichedTransactionDto = {
        ...baseTransactionProps,
        signature: 'no-transfers-signature',
        timestamp: 1234567890,
        slot: 12345,
        description: 'No Transfers Transaction',
        tokenTransfers: [],
        nativeTransfers: [],
        accountData: [],
      };

      // Act
      const acts = await heliusSolanaProcessor.process({
        transactions: [mockTransaction],
      });
      expect(acts[0]).toEqual({
        identifier: 'transaction:solana:no-transfers-signature',
        metadata: {
          slot: 12345,
        },
        completedAtTimestamp: 1234567890000,
        status: 'success',
        description: 'No Transfers Transaction',
        transfers: [],
        balanceChanges: [],
        fee: {
          amount: 5000,
          feePayer: ['wallet:solana:fee-payer-address'],
        },
        tokenIdentifiers: [],
      });
    });

    it('should handle transactions with empty transfer arrays', async () => {
      // Arrange
      const mockTransaction: EnrichedTransactionDto = {
        ...baseTransactionProps,
        signature: 'empty-transfers-signature',
        timestamp: 1234567890,
        slot: 12345,
        description: 'Empty Transfers Transaction',
        tokenTransfers: [],
        nativeTransfers: [],
        accountData: [],
      };

      // Act
      const acts = await heliusSolanaProcessor.process({
        transactions: [mockTransaction],
      });
      expect(acts[0]).toEqual({
        identifier: 'transaction:solana:empty-transfers-signature',
        metadata: {
          slot: 12345,
        },
        completedAtTimestamp: 1234567890000,
        status: 'success',
        description: 'Empty Transfers Transaction',
        transfers: [],
        balanceChanges: [],
        fee: {
          amount: 5000,
          feePayer: ['wallet:solana:fee-payer-address'],
        },
        tokenIdentifiers: [],
      });
    });

    // removed obsolete error propagation test dependent on handleActivity
  });
});
