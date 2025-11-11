/* eslint-disable camelcase */
import {
  buildTokenIdentifier,
  buildTransactionIdentifier,
  buildWalletIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { BaseOnChainActivityProcessor } from '../base-processor';
import { NETWORK } from '../networks';
import { ProcessorOnChainActivity } from '../types';
import { QuickNodeXrplTransactionDto } from './dtos';

// XRP & RLUSD
const DECIMALS = 6;

const XRP = buildTokenIdentifier({
  network: NETWORK.XRPL,
  address: 'native',
});

const RLUSD = buildTokenIdentifier({
  network: NETWORK.XRPL,
  address: `524C555344000000000000000000000000000000.rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`,
});

const SUPPORTED_CURRENCIES: string[] = [XRP, RLUSD];

@Injectable()
export class QuicknodeXrplProcessor extends BaseOnChainActivityProcessor<QuickNodeXrplTransactionDto> {
  constructor() {
    super(QuicknodeXrplProcessor.name);
  }

  public async process({
    transactions,
  }: {
    transactions: QuickNodeXrplTransactionDto[];
  }): Promise<ProcessorOnChainActivity[]> {
    this.logger.log(`Processing ${transactions.length} transactions`);

    const settled = await Promise.allSettled(
      transactions.map(async (transaction) => {
        const onChainActivity = await this.transformToOnChainActivity(
          transaction,
        );

        if (!onChainActivity || !this.isValidActivity(onChainActivity)) {
          this.logger.log('Skipping invalid/spam activity', {
            identifier: onChainActivity?.identifier,
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
        network: NETWORK.XRPL,
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
      network: NETWORK.XRPL,
    });
    return fulfilled;
  }

  private async transformToOnChainActivity({
    hash,
    Account,
    Destination,
    Fee,
    Amount,
    DeliverMax,
    TransactionType,
    timestamp,
  }: QuickNodeXrplTransactionDto): Promise<ProcessorOnChainActivity | null> {
    if (TransactionType !== 'Payment') {
      return null;
    }
    const from = buildWalletIdentifier({
      network: NETWORK.XRPL,
      address: Account,
    });

    const to = buildWalletIdentifier({
      network: NETWORK.XRPL,
      address: Destination,
    });

    const fromToken =
      typeof Amount === 'string'
        ? XRP
        : buildTokenIdentifier({
            network: NETWORK.XRPL,
            address: `${Amount.currency}.${Amount.issuer}`,
          });

    const toToken =
      typeof DeliverMax === 'string'
        ? XRP
        : buildTokenIdentifier({
            network: NETWORK.XRPL,
            address: `${DeliverMax.currency}.${DeliverMax.issuer}`,
          });

    if (
      !SUPPORTED_CURRENCIES.includes(fromToken) ||
      !SUPPORTED_CURRENCIES.includes(toToken) ||
      // Not supporting swaps yet
      fromToken !== toToken
    ) {
      return null;
    }

    const fromAmount =
      typeof Amount === 'string'
        ? Amount
        : new BigNumber(Amount.value).multipliedBy(10 ** DECIMALS).toFixed(0);

    const toAmount =
      typeof DeliverMax === 'string'
        ? DeliverMax
        : new BigNumber(DeliverMax.value)
            .multipliedBy(10 ** DECIMALS)
            .toFixed(0);

    return {
      status: 'success',
      identifier: buildTransactionIdentifier({
        network: NETWORK.XRPL,
        hash,
      }),
      completedAtTimestamp: new Date(timestamp).getTime(),
      fee: {
        amount: Number(Fee),
        feePayer: [from],
      },
      tokenIdentifiers: [
        fromToken,
        ...(fromToken !== toToken ? [toToken] : []),
      ],
      transfers: [
        {
          token: fromToken,
          amount: fromAmount,
          from,
          to,
        },
      ],
      balanceChanges: [
        {
          wallet: from,
          changes: [
            {
              token: XRP,
              amount: `-${Fee}`,
            },
          ],
        },
        {
          wallet: from,
          changes: [
            {
              token: fromToken,
              amount: `-${fromAmount}`,
            },
          ],
        },
        {
          wallet: to,
          changes: [
            {
              token: toToken,
              amount: toAmount,
            },
          ],
        },
      ],
      metadata: {
        ledgerIndex: 0, // Add an empty object or populate as needed
        transactionType: TransactionType,
        date: new Date(timestamp).getTime(),
      },
    };
  }

  protected isValidActivity(activity: ProcessorOnChainActivity): boolean {
    return activity !== null;
  }
}
