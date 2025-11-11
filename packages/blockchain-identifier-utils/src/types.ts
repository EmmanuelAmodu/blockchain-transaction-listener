/**
 * The type of the identifier string
 */
export type IdentifierType = 'wallet' | 'token' | 'transaction' | 'contract';

export type Identifier<
  T extends IdentifierType = IdentifierType,
  N extends string = string,
  A extends string = string,
> = `${T}:${N}:${A}`;

export type WalletIdentifier<
  N extends string = string,
  A extends string = string,
> = Identifier<'wallet', N, A>;
export type TokenIdentifier<
  N extends string = string,
  A extends string = string,
> = Identifier<'token', N, A>;
export type TransactionIdentifier<
  N extends string = string,
  H extends string = string,
> = Identifier<'transaction', N, H>;
export type ContractIdentifier<
  N extends string = string,
  A extends string = string,
> = Identifier<'contract', N, A>;
