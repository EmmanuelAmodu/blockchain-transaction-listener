import {
  buildTokenIdentifier,
  buildTransactionIdentifier,
  buildWalletIdentifier,
  type TokenIdentifier,
  type WalletIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';
import { Injectable } from '@nestjs/common';
import { BaseOnChainActivityProcessor } from '../base-processor';
import {
  ERC1155_TRANSFER_BATCH_TOPIC,
  ERC1155_TRANSFER_SINGLE_TOPIC,
  ERC20_ERC721_TRANSFER_TOPIC,
} from '../constants';
import { NETWORK } from '../networks';
import {
  ProcessorOnChainActivity,
  Transfer,
  WalletBalanceChanges,
} from '../types';
import { EvmLogDTO, EvmTraceDTO, TxWithLogsAndTracesDTO } from './dtos';

@Injectable()
export class QuickNodeEvmProcessor extends BaseOnChainActivityProcessor<TxWithLogsAndTracesDTO> {
  constructor() {
    super(QuickNodeEvmProcessor.name);
  }

  public async process({
    transactions,
    network,
  }: {
    transactions: TxWithLogsAndTracesDTO[];
    network: NETWORK;
  }): Promise<ProcessorOnChainActivity[]> {
    this.logger.log(`Processing ${transactions.length} transactions`);

    const settled = await Promise.allSettled(
      transactions.map(async (transaction) => {
        const onChainActivity = await this.transformToOnChainActivity({
          tx: transaction,
          network,
        });

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
        network,
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
      network,
    });
    return fulfilled;
  }

  protected async transformToOnChainActivity({
    tx,
    network,
  }: {
    tx: TxWithLogsAndTracesDTO;
    network: NETWORK;
  }): Promise<ProcessorOnChainActivity> {
    const nativeToken = buildTokenIdentifier({
      network,
      address: 'native',
    });

    const transfers: Transfer[] = [];

    if (tx.to && tx.value) {
      const amount = this.hexToDecimalString(tx.value);
      if (amount !== '0') {
        transfers.push(
          this.buildTransfer({
            from: tx.from || '0x0',
            to: tx.to,
            amount,
            token: nativeToken,
            network,
          }),
        );
      }
    }

    for (const it of this.extractInternalTransfersFromTraces(tx.traces)) {
      const amount = this.hexToDecimalString(it.value);
      if (amount !== '0' && it.from && it.to) {
        transfers.push(
          this.buildTransfer({
            from: it.from,
            to: it.to,
            amount,
            token: nativeToken,
            network,
          }),
        );
      }
    }

    const parsedLogs = this.parseLogsForTransfersAndStandards(
      tx.logs as EvmLogDTO[],
      network,
    );
    const tokenTransfers = parsedLogs.transfers;
    transfers.push(...tokenTransfers);

    const tokenIds = new Set<string>(transfers.map((t) => t.token));
    const tokenIdentifiers = Array.from(tokenIds) as TokenIdentifier[];

    const feeWei = this.computeFeeWei(
      tx.gasUsed || tx.gas,
      tx.effectiveGasPrice || tx.gasPrice,
    );

    return {
      identifier: buildTransactionIdentifier({
        network,
        hash: tx.hash,
      }),
      completedAtTimestamp:
        this.hexSecondsToMs(tx.blockTimestamp) ?? Date.now(),
      metadata: {
        nonce: this.safeParseHexToNumber(tx.nonce),
      },
      status: 'success',
      transfers,
      tokenIdentifiers,
      tokenTypes: Object.fromEntries(parsedLogs.standards.entries()),
      fee: {
        amount: Number(feeWei),
        feePayer: [
          buildWalletIdentifier({
            network,
            address: tx.from || '0x0',
          }),
        ],
      },
      balanceChanges: this.getAggregatedBalanceChanges({
        transfers,
        from: tx.from,
        feeWei,
        network,
      }),
    };
  }

  private extractInternalTransfersFromTraces(traces: EvmTraceDTO[]): Array<{
    from: string;
    to: string;
    value: string;
  }> {
    const results: Array<{ from: string; to: string; value: string }> = [];
    const parseValue = (v: unknown): bigint => {
      try {
        const s = typeof v === 'string' ? v : String(v ?? '0');
        return BigInt(s.startsWith('0x') ? s : `0x${s}`);
      } catch {
        return 0n;
      }
    };
    const isReverted = (node: any): boolean => {
      return (
        !!node?.error ||
        node?.reverted === true ||
        !!node?.result?.error ||
        node?.status === 0 ||
        node?.result?.status === 0
      );
    };
    const visit = (node: any) => {
      if (!node || typeof node !== 'object') {
        return;
      }

      if (isReverted(node)) {
        return;
      }
      const from = node?.from ?? node?.action?.from;
      const to = node?.to ?? node?.action?.to;
      const value = parseValue(node?.value ?? node?.action?.value ?? '0');
      if (value > 0n && from && to) {
        results.push({ from, to, value: `0x${value.toString(16)}` });
      }
      const children = node.calls || node.subtraces || node.call_traces || [];
      if (Array.isArray(children)) {
        children.forEach(visit);
      }
    };
    for (const t of traces) {
      visit(t);
    }
    return results;
  }

  private parseTokenTransferLog(
    log: EvmLogDTO,
  ): { token: string; from: string; to: string; value: string } | null {
    try {
      const topics = Array.isArray(log?.topics) ? log.topics : [];
      const topic0 = (topics[0] || '').toLowerCase();
      const token = (log.address || '').toLowerCase();
      if (!token) {
        return null;
      }
      if (topic0 === ERC20_ERC721_TRANSFER_TOPIC && topics.length >= 3) {
        const from = this.topicToAddress(topics[1]);
        const to = this.topicToAddress(topics[2]);
        if (from && to) {
          if (topics.length >= 4) {
            // Likely ERC-721
            return { token, from, to, value: '0x1' };
          }
          const value = typeof log.data === 'string' ? log.data : '0x0';
          return { token, from, to, value };
        }
      }
      if (topic0 === ERC1155_TRANSFER_SINGLE_TOPIC && topics.length >= 4) {
        const from = this.topicToAddress(topics[2]);
        const to = this.topicToAddress(topics[3]);
        const data = (log.data || '0x').slice(2);
        const value = data.length >= 128 ? `0x${data.slice(64, 128)}` : '0x0';
        if (from && to) {
          return { token, from, to, value };
        }
      }
      if (topic0 === ERC1155_TRANSFER_BATCH_TOPIC && topics.length >= 4) {
        const from = this.topicToAddress(topics[2]);
        const to = this.topicToAddress(topics[3]);
        if (from && to) {
          const total = this.sumErc1155BatchValues(log.data);
          return { token, from, to, value: `0x${total.toString(16)}` };
        }
        return null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  private parseLogsForTransfersAndStandards(
    logs: EvmLogDTO[],
    network: NETWORK,
  ): {
    transfers: Transfer[];
    standards: Map<string, 'erc20' | 'erc721' | 'erc1155'>;
  } {
    const transfers: Transfer[] = [];
    const standards = new Map<string, 'erc20' | 'erc721' | 'erc1155'>();
    for (const log of logs || []) {
      const parsed = this.parseTokenTransferLog(log);
      if (!parsed) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const { token, from, to, value } = parsed;
      const amount = this.hexToDecimalString(value);
      if (!from || !to) {
        // eslint-disable-next-line no-continue
        continue;
      }
      const standard = this.identifyStandardFromLog(log);
      standards.set(token, standard);
      transfers.push(
        this.buildTransfer({
          from,
          to,
          amount,
          token: buildTokenIdentifier({
            network,
            address: token,
          }),
          network,
        }),
      );
    }
    return { transfers, standards };
  }

  private identifyStandardFromLog(
    log: EvmLogDTO,
  ): 'erc20' | 'erc721' | 'erc1155' {
    const topics = Array.isArray(log?.topics) ? log.topics : [];
    const topic0 = (topics[0] || '').toLowerCase();
    if (
      topic0 === ERC1155_TRANSFER_SINGLE_TOPIC ||
      topic0 === ERC1155_TRANSFER_BATCH_TOPIC
    ) {
      return 'erc1155';
    }
    if (topic0 === ERC20_ERC721_TRANSFER_TOPIC) {
      // If 4th topic is present, it is likely ERC-721
      return topics.length >= 4 ? 'erc721' : 'erc20';
    }
    return 'erc20';
  }

  private sumErc1155BatchValues(data?: string): bigint {
    try {
      if (!data) {
        return 0n;
      }
      const hex = data.startsWith('0x') ? data.slice(2) : data;

      const readWord = (i: number): bigint => {
        const start = i * 64;
        const slice = hex.slice(start, start + 64) || '0'.repeat(64);
        return BigInt(`0x${slice}`);
      };
      const offsetVals = Number(readWord(1));
      if (!Number.isFinite(offsetVals)) {
        return 0n;
      }

      const wordIndexFromByteOffset = (off: number) => Math.floor(off / 32);
      const valsStart = wordIndexFromByteOffset(offsetVals);

      const valuesLen = Number(readWord(valsStart));
      if (!Number.isFinite(valuesLen) || valuesLen <= 0) {
        return 0n;
      }
      let total = 0n;
      for (let i = 0; i < valuesLen; i += 1) {
        total += readWord(valsStart + 1 + i);
      }
      return total;
    } catch {
      return 0n;
    }
  }

  private topicToAddress(topic?: string): string | undefined {
    if (!topic || typeof topic !== 'string') {
      return undefined;
    }
    const hex = topic.toLowerCase();
    if (!hex.startsWith('0x')) {
      return undefined;
    }
    return `0x${hex.slice(-40)}`;
  }

  private buildTransfer({
    from,
    to,
    amount,
    token,
    network,
  }: {
    from: string;
    to: string;
    amount: string;
    token: ReturnType<typeof buildTokenIdentifier>;
    network: NETWORK;
  }): Transfer {
    return {
      from: buildWalletIdentifier({
        network,
        address: from,
      }),
      to: buildWalletIdentifier({
        network,
        address: to,
      }),
      amount,
      token,
    };
  }

  private hexToDecimalString(hex?: string): string {
    if (!hex) {
      return '0';
    }
    try {
      const s = hex.toLowerCase();
      const bi = BigInt(s.startsWith('0x') ? s : `0x${s}`);
      return bi.toString(10);
    } catch {
      return '0';
    }
  }

  private safeParseHexToNumber(hex?: string): number {
    if (!hex) {
      return 0;
    }
    try {
      const s = hex.toLowerCase();
      const bi = BigInt(s.startsWith('0x') ? s : `0x${s}`);
      const n = Number(bi);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  private computeFeeWei(gasUsed?: string, effectiveGasPrice?: string): bigint {
    try {
      if (!gasUsed || !effectiveGasPrice) {
        return 0n;
      }
      const gu = BigInt(gasUsed);
      const egp = BigInt(effectiveGasPrice);
      return gu * egp;
    } catch {
      return 0n;
    }
  }

  private hexSecondsToMs(hex?: string): number | null {
    try {
      if (!hex || typeof hex !== 'string') {
        return null;
      }
      const s = hex.toLowerCase();
      const bi = BigInt(s.startsWith('0x') ? s : `0x${s}`);
      const ms = bi * 1000n;
      const n = Number(ms);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private getAggregatedBalanceChanges({
    transfers,
    from,
    feeWei,
    network,
  }: {
    transfers: Transfer[];
    from?: string;
    feeWei?: bigint;
    network: NETWORK;
  }): WalletBalanceChanges[] {
    type WalletAgg = {
      wallet: WalletIdentifier;
      tokenMap: Map<string, bigint>;
    };
    const changes = new Map<WalletIdentifier, WalletAgg>();

    const add = (wallet: WalletIdentifier, token: string, delta: bigint) => {
      let agg = changes.get(wallet);
      if (!agg) {
        agg = { wallet, tokenMap: new Map<string, bigint>() };
        changes.set(wallet, agg);
      }
      const prev = agg.tokenMap.get(token) || 0n;
      agg.tokenMap.set(token, prev + delta);
    };

    for (const t of transfers) {
      const amount = BigInt(t.amount || '0');
      add(t.from, t.token, -amount);
      add(t.to, t.token, amount);
    }

    if (from && feeWei && feeWei > 0n) {
      add(
        buildWalletIdentifier({ network, address: from }),
        buildTokenIdentifier({
          network,
          address: 'native',
        }),
        -feeWei,
      );
    }

    const aggregated = Array.from(changes.values()).map(
      ({ wallet, tokenMap }) => ({
        wallet,
        changes: Array.from(tokenMap.entries()).map(([token, amt]) => ({
          token: token as TokenIdentifier<NETWORK.ETHEREUM, string>,
          amount: amt.toString(),
        })),
      }),
    );
    return aggregated;
  }

  protected isValidActivity(activity: ProcessorOnChainActivity): boolean {
    return activity !== null;
  }

  protected getTransactionIdentifier(
    transaction: TxWithLogsAndTracesDTO,
  ): string {
    if (
      transaction &&
      typeof transaction === 'object' &&
      'hash' in transaction
    ) {
      return String((transaction as any).hash);
    }
    if (
      transaction &&
      typeof transaction === 'object' &&
      'txid' in transaction
    ) {
      return String((transaction as any).txid);
    }
    if (
      transaction &&
      typeof transaction === 'object' &&
      'signature' in transaction
    ) {
      return String((transaction as any).signature);
    }
    return 'unknown';
  }
}
