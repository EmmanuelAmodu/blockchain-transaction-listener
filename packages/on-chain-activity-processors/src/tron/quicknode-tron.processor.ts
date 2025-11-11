import {
  buildTokenIdentifier,
  buildTransactionIdentifier,
  buildWalletIdentifier,
  TokenIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { TronWeb } from 'tronweb';
import { BaseOnChainActivityProcessor } from '../base-processor';
import { NETWORK } from '../networks';
import {
  ProcessorOnChainActivity,
  Transfer,
  WalletBalanceChanges,
} from '../types';
import { QuickNodeTronDto } from './dtos';

const TRX_TOKEN_ID = buildTokenIdentifier({
  network: NETWORK.TRON,
  address: 'native',
});

@Injectable()
export class QuickNodeTronProcessor extends BaseOnChainActivityProcessor<QuickNodeTronDto> {
  constructor() {
    super(QuickNodeTronProcessor.name);
  }

  public async process({
    transactions,
  }: {
    transactions: QuickNodeTronDto[];
  }): Promise<ProcessorOnChainActivity[]> {
    this.logger.log('Processing QuickNode transaction', {
      payload: transactions,
    });

    const settled = await Promise.allSettled(
      transactions.map(async (transaction) => {
        const onChainActivity = await this.transformToOnChainActivity(
          transaction,
        );

        // Filter transactions related to bandwidth/energy delegation that do not impact balances
        if (onChainActivity.balanceChanges.length === 0) {
          this.logger.log(
            'Skipping TRON tx with no balance changes (likely energy/bandwidth only)',
            {
              identifier: onChainActivity.identifier,
            },
          );
          return null;
        }

        return onChainActivity;
      }),
    );

    const failures = settled.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(`${failures.length} transactions failed to process`, {
        count: failures.length,
        network: NETWORK.TRON,
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
      network: NETWORK.TRON,
    });
    return fulfilled;
  }

  protected async transformToOnChainActivity(
    transaction: QuickNodeTronDto,
  ): Promise<ProcessorOnChainActivity> {
    this.convertTransactionAddresses(transaction);
    const transfers = this.extractTransfers(transaction);
    const tokenIdentifiers = await this.extractUniqueTokenIdentifiers(
      transaction,
    );
    const gasFeeBN = this.calculateGasFee(transaction);
    const transferBalanceChanges = transfers.flatMap((transfer) =>
      this.getTransferBalanceChanges({ transfer }),
    );
    const feeBalanceChanges = this.getFeeBalanceChanges({
      transaction,
      gasFeeBN,
    });

    return {
      identifier: buildTransactionIdentifier({
        network: NETWORK.TRON,
        hash: transaction.transactionHash,
      }),
      completedAtTimestamp: transaction.timestamp,
      metadata: {
        nonce: this.hexToDecimal(transaction.nonce),
      },
      status: transaction.status === '0x1' ? 'success' : 'failed',
      transfers,
      tokenIdentifiers,
      fee: {
        amount: gasFeeBN.toNumber(),
        feePayer: [
          buildWalletIdentifier({
            network: NETWORK.TRON,
            address: transaction.from,
          }),
        ],
      },
      balanceChanges: [...transferBalanceChanges, ...feeBalanceChanges],
    };
  }

  private hexToDecimal(hex: string): number {
    return parseInt(hex, 16);
  }

  private hexToBigNumber(hex: string): BigNumber {
    return new BigNumber(hex, 16);
  }

  private calculateGasFee(transaction: QuickNodeTronDto): BigNumber {
    const gasUsed = this.hexToBigNumber(transaction.gasUsed);
    const effectiveGasPrice = this.hexToBigNumber(
      transaction.effectiveGasPrice,
    );
    return gasUsed.multipliedBy(effectiveGasPrice);
  }

  private extractTransfers(transaction: QuickNodeTronDto): Transfer[] {
    const transfers: Transfer[] = [];

    // trc20 transfers
    if (transaction.decodedLogs) {
      for (const decodedLog of transaction.decodedLogs) {
        if (
          decodedLog.name === 'Transfer' &&
          decodedLog.from &&
          decodedLog.to &&
          decodedLog.value &&
          decodedLog.value !== '0'
        ) {
          transfers.push({
            from: buildWalletIdentifier({
              network: NETWORK.TRON,
              address: decodedLog.from,
            }),
            to: buildWalletIdentifier({
              network: NETWORK.TRON,
              address: decodedLog.to,
            }),
            amount: decodedLog.value,
            token: buildTokenIdentifier({
              network: NETWORK.TRON,
              address: decodedLog.address,
            }),
          });
        }
      }
    }

    // native trx transfers
    const nativeValue = this.hexToBigNumber(transaction.value);
    if (nativeValue.gt(0)) {
      transfers.push({
        from: buildWalletIdentifier({
          network: NETWORK.TRON,
          address: transaction.from,
        }),
        to: buildWalletIdentifier({
          network: NETWORK.TRON,
          address: transaction.to,
        }),
        amount: nativeValue.toString(),
        token: TRX_TOKEN_ID,
      });
    }

    return transfers;
  }

  private async extractUniqueTokenIdentifiers(
    transaction: QuickNodeTronDto,
  ): Promise<TokenIdentifier[]> {
    const tokenAddresses = new Set<string>();

    if (transaction.decodedLogs) {
      for (const decodedLog of transaction.decodedLogs) {
        if (decodedLog.address) {
          tokenAddresses.add(decodedLog.address);
        }
      }
    }

    const tokenIdentifiers = Array.from(tokenAddresses).map((address) =>
      buildTokenIdentifier({
        network: NETWORK.TRON,
        address,
      }),
    );

    // Include native TRX if there's a value transfer
    if (this.hexToBigNumber(transaction.value).gt(0)) {
      tokenIdentifiers.push(TRX_TOKEN_ID);
    }

    return tokenIdentifiers;
  }

  private getTransferBalanceChanges({
    transfer,
  }: {
    transfer: Transfer;
  }): WalletBalanceChanges[] {
    if (transfer.amount === '0') {
      return [];
    }

    return [
      {
        wallet: transfer.from,
        changes: [
          {
            token: transfer.token,
            amount: new BigNumber(transfer.amount).negated().toString(),
          },
        ],
      },
      {
        wallet: transfer.to,
        changes: [
          {
            token: transfer.token,
            amount: transfer.amount,
          },
        ],
      },
    ];
  }

  private getFeeBalanceChanges({
    transaction,
    gasFeeBN,
  }: {
    transaction: QuickNodeTronDto;
    gasFeeBN: BigNumber;
  }): WalletBalanceChanges[] {
    // Zero gas fee can happen when fee is paid with available bandwidth/energy
    if (gasFeeBN.isZero()) {
      return [];
    }

    return [
      {
        wallet: buildWalletIdentifier({
          network: NETWORK.TRON,
          address: transaction.from,
        }),
        changes: [
          {
            token: TRX_TOKEN_ID,
            amount: gasFeeBN.negated().toString(),
          },
        ],
      },
    ];
  }

  private convertTransactionAddresses(transaction: QuickNodeTronDto): void {
    if (transaction.from) {
      transaction.from = TronWeb.address.fromHex(transaction.from);
    }
    if (transaction.to) {
      transaction.to = TronWeb.address.fromHex(transaction.to);
    }

    if (transaction.decodedLogs) {
      for (const log of transaction.decodedLogs) {
        if (log.address) {
          log.address = TronWeb.address.fromHex(log.address);
        }
        if (log.from) {
          log.from = TronWeb.address.fromHex(log.from);
        }
        if (log.to) {
          log.to = TronWeb.address.fromHex(log.to);
        }
      }
    }
  }
}
