import type {
  TokenIdentifier,
  TransactionIdentifier,
  WalletIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';

interface SolanaMetadata {
  mintId?: string;
  slot: number;
}

interface EvmMetadata {
  nonce: number;
}

interface BTCMetadata {
  blockHeight: number;
  blockTime: number;
}

interface XRPLMetadata {
  ledgerIndex: number;
  transactionType: string;
  date: number;
}

export type Metadata =
  | SolanaMetadata
  | EvmMetadata
  | BTCMetadata
  | XRPLMetadata;

export interface Transfer {
  from: WalletIdentifier;
  to: WalletIdentifier;
  amount: string;
  token: TokenIdentifier;
}

export interface BalanceChange {
  amount: string;
  token: TokenIdentifier;
}

export interface WalletBalanceChanges {
  wallet: WalletIdentifier;
  changes: BalanceChange[];
}

export type ProcessorOnChainActivity = {
  identifier: TransactionIdentifier;
  completedAtTimestamp: number;
  metadata: Metadata;
  status: 'success' | 'failed';
  statusReason?: string;
  description?: string;
  transfers: Transfer[];
  tokenIdentifiers: TokenIdentifier[];
  tokenTypes?: Record<string, 'erc20' | 'erc721' | 'erc1155'>;
  fee: {
    amount: number;
    feePayer: WalletIdentifier[];
  };
  balanceChanges: WalletBalanceChanges[];
};
