import {
  buildTokenIdentifier,
  buildTransactionIdentifier,
  buildWalletIdentifier,
  type TokenIdentifier,
  type WalletIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { BaseOnChainActivityProcessor } from '../base-processor';
import { NETWORK } from '../networks';
import type {
  ProcessorOnChainActivity,
  Transfer,
  WalletBalanceChanges,
} from '../types';
import {
  BitcoinTransactionInputDto,
  BitcoinTransactionOutputDto,
  QuickNodeBitcoinWebhookDto,
} from './dtos';

interface AddressValuePair {
  address: string;
  value: BigNumber;
}

interface ProcessedSenders {
  senderAmounts: AddressValuePair[];
  sendersCount: number;
  senderAddrSet: Set<string>;
  totalIn: BigNumber;
}

interface ProcessedRecipients {
  recipients: AddressValuePair[];
  recipientsCount: number;
}

const BTC_TOKEN_ID = buildTokenIdentifier({
  network: NETWORK.BITCOIN,
  address: 'native',
});

@Injectable()
export class QuickNodeBitcoinProcessor extends BaseOnChainActivityProcessor<QuickNodeBitcoinWebhookDto> {
  constructor() {
    super(QuickNodeBitcoinProcessor.name);
  }

  public async process({
    transactions,
  }: {
    transactions: QuickNodeBitcoinWebhookDto[];
    network?: NETWORK;
  }): Promise<ProcessorOnChainActivity[]> {
    this.logger.log(`Processing ${transactions.length} transactions`);

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
        network: NETWORK.BITCOIN,
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
      network: NETWORK.BITCOIN,
    });
    return fulfilled;
  }

  protected async transformToOnChainActivity(
    transaction: QuickNodeBitcoinWebhookDto,
  ): Promise<ProcessorOnChainActivity> {
    const inputs = transaction.vin || [];
    const outputs = transaction.vout || [];

    const senderData = this.processSenders({ inputs });
    const recipientData = this.processRecipients({
      outputs,
      senderAddrSet: senderData?.senderAddrSet || new Set(),
    });
    const { recipients, recipientsCount } = recipientData;

    const transfers = this.buildTransfers({
      senderData,
      recipients,
      recipientsCount,
      tx: transaction,
    });

    return this.buildOnChainActivity({
      transaction,
      transfers,
      senderData,
    });
  }

  private buildTransfers({
    senderData,
    recipients,
    recipientsCount,
  }: {
    senderData: ProcessedSenders;
    recipients: AddressValuePair[];
    recipientsCount: number;
    tx: QuickNodeBitcoinWebhookDto;
  }): Transfer[] {
    const { senderAmounts, sendersCount, totalIn } = senderData;

    if (sendersCount === 1 && recipientsCount >= 1) {
      return this.generateOneToManyTransfers({
        senders: senderAmounts,
        recipients,
      });
    }
    if (sendersCount > 1 && recipientsCount === 1) {
      return this.generateManyToOneTransfers({
        senders: senderAmounts,
        recipients,
        totalIn,
      });
    }
    return this.generateManyToManyTransfers({
      senders: senderAmounts,
      recipients,
    });
  }

  private processRecipients({
    outputs,
    senderAddrSet,
  }: {
    outputs: BitcoinTransactionOutputDto[];
    senderAddrSet: Set<string>;
  }): ProcessedRecipients {
    const rawReceipts = outputs
      .filter(
        (o) => o.isAddress === true && o.addresses && o.addresses.length > 0,
      )
      .map((o) => ({
        address: o.addresses?.[0] || '',
        value: BigNumber(o.value || '0'),
      }))
      .filter((receipt) => receipt.address !== '');
    const receiptsMap = this.groupByAddress(rawReceipts);
    // Remove change outputs (addresses appearing in inputs)
    const recipients: AddressValuePair[] = [];
    for (const [address, value] of receiptsMap.entries()) {
      if (!senderAddrSet.has(address)) {
        recipients.push({ address, value });
      }
    }
    return {
      recipients,
      recipientsCount: recipients.length,
    };
  }

  private processSenders({
    inputs,
  }: {
    inputs: BitcoinTransactionInputDto[];
  }): ProcessedSenders {
    const senderInputs = inputs.filter(
      (i) => i.isAddress === true && i.addresses && i.addresses.length > 0,
    );

    const senderRaw = senderInputs
      .map((i) => ({
        address: i.addresses?.[0] || '',
        value: BigNumber(i.value || '0'),
      }))
      .filter((sender) => sender.address !== '');
    const senderAmountsMap = this.groupByAddress(senderRaw);
    const senderAmounts = Array.from(senderAmountsMap.entries()).map(
      ([address, value]) => ({
        address,
        value,
      }),
    );
    const senderAddrSet = new Set(senderAmountsMap.keys());
    const totalIn = senderAmounts.reduce(
      (sum, s) => sum.plus(s.value),
      BigNumber(0),
    );
    return {
      senderAmounts,
      sendersCount: senderAmounts.length,
      senderAddrSet,
      totalIn,
    };
  }

  private buildTransfer({
    from,
    to,
    amount,
  }: {
    from: string;
    to: string;
    amount: string;
  }): Transfer {
    return {
      from: buildWalletIdentifier({
        network: NETWORK.BITCOIN,
        address: from,
      }),
      to: buildWalletIdentifier({
        network: NETWORK.BITCOIN,
        address: to,
      }),
      amount,
      token: BTC_TOKEN_ID,
    };
  }

  private generateOneToManyTransfers({
    senders,
    recipients,
  }: {
    senders: AddressValuePair[];
    recipients: AddressValuePair[];
  }): Transfer[] {
    const transfers: Transfer[] = [];

    for (const rec of recipients) {
      const amount = rec.value.toString();
      if (amount !== '0') {
        transfers.push(
          this.buildTransfer({
            from: senders[0].address,
            to: rec.address,
            amount,
          }),
        );
      }
    }

    return transfers;
  }

  private generateManyToOneTransfers({
    senders,
    recipients,
    totalIn,
  }: {
    senders: AddressValuePair[];
    recipients: AddressValuePair[];
    totalIn: BigNumber;
  }): Transfer[] {
    const transfers: Transfer[] = [];
    const receiver = recipients[0].address;
    const totalReceived = recipients[0].value;

    for (const s of senders) {
      const ratio = s.value.div(totalIn);
      const amount = totalReceived.multipliedBy(ratio).toString();
      if (amount !== '0') {
        transfers.push(
          this.buildTransfer({
            from: s.address,
            to: receiver,
            amount,
          }),
        );
      }
    }

    return transfers;
  }

  private generateManyToManyTransfers({
    senders,
    recipients,
  }: {
    senders: AddressValuePair[];
    recipients: AddressValuePair[];
  }): Transfer[] {
    const transfers: Transfer[] = [];

    for (const sender of senders) {
      const amount = sender.value.toString();
      if (amount !== '0') {
        const recipientCount = `${recipients.length} address${
          recipients.length === 1 ? '' : 'es'
        }`;
        transfers.push(
          this.buildTransfer({
            from: sender.address,
            to: recipientCount,
            amount,
          }),
        );
      }
    }

    for (const recipient of recipients) {
      const amount = recipient.value.toString();
      if (amount !== '0') {
        const senderCount = `${senders.length} address${
          senders.length === 1 ? '' : 'es'
        }`;
        transfers.push(
          this.buildTransfer({
            from: senderCount,
            to: recipient.address,
            amount,
          }),
        );
      }
    }

    return transfers;
  }

  private groupByAddress(entries: AddressValuePair[]): Map<string, BigNumber> {
    const map = new Map<string, BigNumber>();
    for (const { address, value } of entries) {
      if (!map.has(address)) {
        map.set(address, BigNumber(0));
      }
      const currentValue = map.get(address) || BigNumber(0);
      map.set(address, currentValue.plus(value));
    }
    return map;
  }

  protected async buildOnChainActivity({
    transaction,
    transfers,
    senderData,
  }: {
    transaction: QuickNodeBitcoinWebhookDto;
    transfers: Transfer[];
    senderData: ProcessedSenders;
  }): Promise<ProcessorOnChainActivity> {
    const transferBalanceChanges = transfers.flatMap((t) =>
      this.getTransferBalanceChanges(t),
    );
    const feeBalanceChanges = this.getFeeBalanceChanges({
      senderData,
      feeAmount: transaction.fees,
    });

    return {
      identifier: buildTransactionIdentifier({
        network: NETWORK.BITCOIN,
        hash: transaction.txid,
      }),
      completedAtTimestamp: transaction.blockTime * 1000,
      metadata: {
        blockHeight: transaction.blockHeight,
        blockTime: transaction.blockTime,
      },
      status: 'success',
      transfers,
      tokenIdentifiers: [BTC_TOKEN_ID],
      fee: {
        amount: Number(transaction.fees),
        feePayer: senderData?.senderAmounts.map((s) =>
          buildWalletIdentifier({
            network: NETWORK.BITCOIN,
            address: s.address,
          }),
        ),
      },
      balanceChanges: [...transferBalanceChanges, ...feeBalanceChanges],
    };
  }

  private getTransferBalanceChanges(
    transfer: Transfer,
  ): WalletBalanceChanges[] {
    const wallets = new Map<WalletIdentifier, Map<string, BigNumber>>();
    const amount = new BigNumber(transfer.amount);

    wallets.set(
      buildWalletIdentifier({
        network: NETWORK.BITCOIN,
        address: transfer.from,
      }),
      new Map([[BTC_TOKEN_ID, amount.negated()]]),
    );

    wallets.set(
      buildWalletIdentifier({
        network: NETWORK.BITCOIN,
        address: transfer.to,
      }),
      new Map([[BTC_TOKEN_ID, amount]]),
    );

    return Array.from(wallets.entries()).map(([wallet, changes]) => ({
      wallet,
      changes: Array.from(changes.entries()).map(([token, changeAmount]) => ({
        token: token as TokenIdentifier<NETWORK.BITCOIN, string>,
        amount: changeAmount.toString(),
      })),
    }));
  }

  private getFeeBalanceChanges({
    senderData,
    feeAmount,
  }: {
    senderData: ProcessedSenders;
    feeAmount: string;
  }): WalletBalanceChanges[] {
    const numSenders = senderData?.sendersCount || 0;
    const totalFee = new BigNumber(feeAmount || '0');

    if (numSenders === 0 || totalFee.isZero()) {
      return [];
    }

    if (numSenders === 1) {
      const sender = senderData.senderAmounts[0];
      return [
        {
          wallet: buildWalletIdentifier({
            network: NETWORK.BITCOIN,
            address: sender.address,
          }),
          changes: [
            {
              token: BTC_TOKEN_ID,
              amount: totalFee.negated().toString(),
            },
          ],
        },
      ];
    }

    const share = totalFee.div(numSenders);

    return senderData.senderAmounts
      .map((s) => ({
        wallet: buildWalletIdentifier({
          network: NETWORK.BITCOIN,
          address: s.address,
        }),
        amount: share.negated(),
      }))
      .filter(({ amount }) => !amount.isZero())
      .map(({ wallet, amount }) => ({
        wallet,
        changes: [
          {
            token: BTC_TOKEN_ID,
            amount: amount.toString(),
          },
        ],
      }));
  }

  protected isValidActivity(activity: ProcessorOnChainActivity): boolean {
    return activity !== null;
  }
}
