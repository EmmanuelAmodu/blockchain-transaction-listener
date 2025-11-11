import type {
  ContractIdentifier,
  Identifier,
  TokenIdentifier,
  TransactionIdentifier,
  WalletIdentifier,
} from './types';

export function isIdentifier(identifier: string): identifier is Identifier {
  return /^(wallet|token|transaction|contract):[^:]+:[^:]+$/.test(identifier);
}

export function isWalletIdentifier(
  identifier: string,
): identifier is WalletIdentifier {
  return /^(wallet):[^:]+:[^:]+$/.test(identifier);
}

export function isTokenIdentifier(
  identifier: string,
): identifier is TokenIdentifier {
  return /^(token):[^:]+:[^:]+$/.test(identifier);
}

export function isTransactionIdentifier(
  identifier: string,
): identifier is TransactionIdentifier {
  return /^(transaction):[^:]+:[^:]+$/.test(identifier);
}

export function isContractIdentifier(
  identifier: string,
): identifier is ContractIdentifier {
  return /^(contract):[^:]+:[^:]+$/.test(identifier);
}
