import {
  buildTokenIdentifier,
  buildTransactionIdentifier,
  buildWalletIdentifier,
  extractAddress,
} from '@onionfi-internal/blockchain-identifier-utils';
import { Injectable } from '@nestjs/common';
import { BaseOnChainActivityProcessor } from '../base-processor';
import { SOLANA_SIGNERS_BLOCKLIST } from '../constants';
import { NETWORK } from '../networks';
import {
  ProcessorOnChainActivity,
  Transfer,
  WalletBalanceChanges,
} from '../types';
import type { EnrichedTransactionDto } from './dtos';

@Injectable()
export class HeliusSolanaProcessor extends BaseOnChainActivityProcessor<EnrichedTransactionDto> {
  constructor() {
    super(HeliusSolanaProcessor.name);
  }

  public async process({
    transactions,
  }: {
    transactions: EnrichedTransactionDto[];
  }): Promise<ProcessorOnChainActivity[]> {
    this.logger.log('Processing Helius transaction', { payload: transactions });
    const settled = await Promise.allSettled(
      transactions.map(async (transaction) => {
        const onChainActivity = await this.transformToOnChainActivity(
          transaction,
        );

        if (!this.isValidActivity(onChainActivity)) {
          this.logger.log('Skipping invalid/spam activity', {
            identifier: onChainActivity.identifier,
          });

          return null;
        }

        return onChainActivity;
      }),
    );

    const failures = settled.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(`${failures.length} transactions failed to process`, {
        count: failures.length,
        network: NETWORK.SOLANA,
        transactions,
      });
    }
    const fulfilled = settled
      .filter(
        (r): r is PromiseFulfilledResult<ProcessorOnChainActivity | null> =>
          r.status === 'fulfilled',
      )
      .map((r) => r.value)
      .filter((e): e is ProcessorOnChainActivity => e !== null);

    this.logger.log(`Processed ${fulfilled.length} transactions successfully`, {
      count: fulfilled.length,
      network: NETWORK.SOLANA,
    });
    return fulfilled;
  }

  private async transformToOnChainActivity(
    transaction: EnrichedTransactionDto,
  ): Promise<ProcessorOnChainActivity> {
    const allTokenMintsInvolved = new Set<string>(
      transaction.tokenTransfers?.map((transfer) => transfer.mint),
    );

    // Include native SOL if there are native balance changes
    const hasNativeBalanceChanges = transaction.accountData?.some(
      (account) => account.nativeBalanceChange !== 0,
    );

    const tokenIdentifiers = [
      ...Array.from(allTokenMintsInvolved).map((mint) =>
        buildTokenIdentifier({
          network: NETWORK.SOLANA,
          address: mint,
        }),
      ),
      ...(hasNativeBalanceChanges ||
      (transaction.nativeTransfers?.length ?? 0) > 0
        ? [
            buildTokenIdentifier({
              network: NETWORK.SOLANA,
              address: 'native',
            }),
          ]
        : []),
    ];

    return {
      identifier: buildTransactionIdentifier({
        network: NETWORK.SOLANA,
        hash: transaction.signature,
      }),
      metadata: {
        slot: transaction.slot,
      },
      completedAtTimestamp: transaction.timestamp * 1000, // Helius returns timestamp in seconds whereas we store in milliseconds
      status: 'success',
      description: transaction.description,
      fee: {
        amount: transaction.fee,
        feePayer: [
          buildWalletIdentifier({
            network: NETWORK.SOLANA,
            address: transaction.feePayer,
          }),
        ],
      },
      tokenIdentifiers,
      transfers: this.getTransfers(transaction),
      balanceChanges: this.getBalanceChanges(transaction),
    };
  }

  private getTransfers(body: EnrichedTransactionDto): Transfer[] {
    return [
      ...(body.tokenTransfers?.map((transfer): Transfer => {
        return {
          from: buildWalletIdentifier({
            network: NETWORK.SOLANA,
            address: `${transfer.fromUserAccount}`,
          }),
          to: buildWalletIdentifier({
            network: NETWORK.SOLANA,
            address: `${transfer.toUserAccount}`,
          }),
          amount: transfer.tokenAmount.toString(),
          token: buildTokenIdentifier({
            network: NETWORK.SOLANA,
            address: transfer.mint,
          }),
        };
      }) ?? []),
      ...(body.nativeTransfers?.map(
        (transfer): Transfer => ({
          from: buildWalletIdentifier({
            network: NETWORK.SOLANA,
            address: `${transfer.fromUserAccount}`,
          }),
          to: buildWalletIdentifier({
            network: NETWORK.SOLANA,
            address: `${transfer.toUserAccount}`,
          }),
          // Helius returns the amount in lamports, so we don't need to shift it
          amount: transfer.amount.toString(),
          token: buildTokenIdentifier({
            network: NETWORK.SOLANA,
            address: 'native',
          }),
        }),
      ) ?? []),
    ];
  }

  private getBalanceChanges(
    body: EnrichedTransactionDto,
  ): WalletBalanceChanges[] {
    const balanceChanges: Record<string, WalletBalanceChanges['changes']> = {};

    for (const account of body.accountData) {
      for (const change of account.tokenBalanceChanges ?? []) {
        balanceChanges[change.userAccount] ??= [];
        balanceChanges[change.userAccount].push({
          token: buildTokenIdentifier({
            network: NETWORK.SOLANA,
            address: change.mint,
          }),
          amount: change.rawTokenAmount.tokenAmount,
        });
      }
      if (account.nativeBalanceChange) {
        balanceChanges[account.account] ??= [];
        balanceChanges[account.account].push({
          token: buildTokenIdentifier({
            network: NETWORK.SOLANA,
            address: 'native',
          }),
          amount: account.nativeBalanceChange.toString(),
        });
      }
    }

    return Object.entries(balanceChanges).map(([wallet, changes]) => ({
      wallet: buildWalletIdentifier({
        network: NETWORK.SOLANA,
        address: wallet,
      }),
      changes,
    }));
  }

  /**
   * Filter out spam activities (eg. advertisements with a lot of micro SOL transfers)
   */
  protected isValidActivity(body: ProcessorOnChainActivity): boolean {
    // The rules and numbers below are based on observation and gut feeling. Feel free to adjust.
    // Treat transactions as spam if signer is blocklisted OR many tiny native-only transfers.
    const isSpam =
      SOLANA_SIGNERS_BLOCKLIST.has(extractAddress(body.fee.feePayer[0])) ||
      (body.transfers.length > 6 &&
        body.transfers.every((transfer) => Number(transfer.amount) < 10) &&
        body.transfers.every((transfer) => transfer.token.endsWith(':native')));
    return !isSpam;
  }
}
