import type {
  Identifier,
  TokenIdentifier,
  TransactionIdentifier,
  WalletIdentifier,
} from './types';

function normalizeIdentifier<T extends string>(identifier: T): T {
  // Detect if base16, the probability of a base56 token to match is near zero
  if (identifier.match(/^0x[a-fA-F0-9]+$/)) {
    return identifier.toLowerCase() as T;
  }
  return identifier;
}

function buildIdentifier<
  N extends string,
  T extends string,
  P extends 'wallet' | 'token' | 'transaction',
>({
  prefix,
  network,
  identifier,
}: {
  prefix: P;
  network: N;
  identifier: T;
}): Identifier<P, N, T> {
  const identifierPrefix =
    `${prefix}:${network.toLowerCase()}:` as `${P}:${N}:`;
  if (identifier.startsWith(identifierPrefix)) {
    return identifier as Identifier<P, N, T>;
  }

  return `${identifierPrefix}${normalizeIdentifier(identifier)}` as Identifier<
    P,
    N,
    T
  >;
}

export function buildWalletIdentifier<N extends string, W extends string>({
  network,
  address,
}: {
  network: N;
  address: W;
}): WalletIdentifier<N, W> {
  return buildIdentifier({ prefix: 'wallet', network, identifier: address });
}

export function buildTokenIdentifier<N extends string, T extends string>({
  network,
  address,
}: {
  network: N;
  address: T;
}): TokenIdentifier<N, T> {
  return buildIdentifier({ prefix: 'token', network, identifier: address });
}

export function buildTransactionIdentifier<N extends string, T extends string>({
  network,
  hash,
}: {
  network: N;
  hash: T;
}): TransactionIdentifier<N, T> {
  return buildIdentifier({
    prefix: 'transaction',
    network,
    identifier: hash,
  });
}
