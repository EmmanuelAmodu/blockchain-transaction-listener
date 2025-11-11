import {
  ProcessorOnChainActivity,
  WalletBalanceChanges,
} from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { OnChainActivityService } from './on-chain-activity.service';

jest.mock('@onionfi-internal/pubsub-client');

// Constants for wallet names
const A = 'wallet:1:1' as const;
const B = 'wallet:2:2' as const;

describe('OnChainActivityService', () => {
  let service: OnChainActivityService;
  let pubSubClient: jest.Mocked<PubSubClient>;

  beforeEach(() => {
    pubSubClient = new PubSubClient() as jest.Mocked<PubSubClient>;
    service = new OnChainActivityService(pubSubClient);
  });

  it('should publish activity with pre-calculated balance changes', async () => {
    const balanceChanges: WalletBalanceChanges[] = [
      {
        wallet: A,
        changes: [{ token: 'token:bitcoin:native', amount: '-10' }],
      },
      {
        wallet: B,
        changes: [{ token: 'token:bitcoin:native', amount: '10' }],
      },
    ];

    const activity: ProcessorOnChainActivity = {
      identifier: 'transaction:bitcoin:1',
      completedAtTimestamp: 1,
      status: 'success',
      metadata: {
        blockHeight: 700000,
        blockTime: 1633072800,
      },
      tokenIdentifiers: [],
      fee: {
        amount: 0.0001,
        feePayer: [A],
      },
      transfers: [
        {
          from: A,
          to: B,
          token: 'token:bitcoin:native',
          amount: '10',
        },
      ],
      balanceChanges,
    };

    await service.handleActivityBatch([activity]);

    expect(pubSubClient.publishToTopic).toHaveBeenCalledWith(
      'on-chain-activity',
      expect.objectContaining({
        identifier: 'transaction:bitcoin:1',
        completedAtTimestamp: 1,
        status: 'success',
        metadata: {
          blockHeight: 700000,
          blockTime: 1633072800,
        },
        tokenIdentifiers: [],
        fee: {
          amount: 0.0001,
          feePayer: [A],
        },
        transfers: [
          {
            from: A,
            to: B,
            token: 'token:bitcoin:native',
            amount: '10',
          },
        ],
        balanceChanges,
      }),
    );
  });

  it('should publish activity with empty balance changes', async () => {
    const activity: ProcessorOnChainActivity = {
      identifier: 'transaction:solana:1',
      completedAtTimestamp: 1,
      status: 'success',
      metadata: {
        slot: 1,
      },
      tokenIdentifiers: [],
      fee: {
        amount: 0,
        feePayer: [A],
      },
      transfers: [],
      balanceChanges: [],
    };

    await service.handleActivityBatch([activity]);

    expect(pubSubClient.publishToTopic).toHaveBeenCalledWith(
      'on-chain-activity',
      expect.objectContaining({
        identifier: 'transaction:solana:1',
        completedAtTimestamp: 1,
        status: 'success',
        metadata: {
          slot: 1,
        },
        tokenIdentifiers: [],
        fee: {
          amount: 0,
          feePayer: [A],
        },
        transfers: [],
        balanceChanges: [],
      }),
    );
  });

  it('should publish activity with complex balance changes from modules', async () => {
    const balanceChanges: WalletBalanceChanges[] = [
      {
        wallet: A,
        changes: [
          { token: 'token:ethereum:native', amount: '-1.0' },
          { token: 'token:ethereum:0xa0b86a33e6776e0', amount: '100' },
        ],
      },
      {
        wallet: B,
        changes: [
          { token: 'token:ethereum:native', amount: '1.0' },
          { token: 'token:ethereum:0xa0b86a33e6776e0', amount: '-100' },
        ],
      },
    ];

    const activity: ProcessorOnChainActivity = {
      identifier: 'transaction:ethereum:1',
      completedAtTimestamp: 1,
      status: 'success',
      metadata: {
        nonce: 42,
      },
      tokenIdentifiers: [],
      fee: {
        amount: 0.001,
        feePayer: [A],
      },
      transfers: [
        {
          from: A,
          to: B,
          token: 'token:ethereum:native',
          amount: '1.0',
        },
        {
          from: B,
          to: A,
          token: 'token:ethereum:0xa0b86a33e6776e0',
          amount: '100',
        },
      ],
      balanceChanges,
    };

    await service.handleActivityBatch([activity]);

    expect(pubSubClient.publishToTopic).toHaveBeenCalledWith(
      'on-chain-activity',
      expect.objectContaining({
        identifier: 'transaction:ethereum:1',
        completedAtTimestamp: 1,
        status: 'success',
        metadata: {
          nonce: 42,
        },
        tokenIdentifiers: [],
        fee: {
          amount: 0.001,
          feePayer: [A],
        },
        transfers: [
          {
            from: A,
            to: B,
            token: 'token:ethereum:native',
            amount: '1.0',
          },
          {
            from: B,
            to: A,
            token: 'token:ethereum:0xa0b86a33e6776e0',
            amount: '100',
          },
        ],
        balanceChanges,
      }),
    );
  });
});
