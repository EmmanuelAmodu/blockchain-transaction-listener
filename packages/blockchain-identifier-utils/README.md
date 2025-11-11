# @onionfi-internal/blockchain-identifier-utils

A TypeScript utility package for building, validating, and manipulating blockchain identifiers. This package provides a standardized way to work with different types of blockchain identifiers including wallets, tokens, transactions, and contracts.

## Identifier Format

All identifiers follow the format: `type:network:address`

Where:

- `type`: The type of identifier (wallet, token, transaction, or contract)
- `network`: The blockchain network (e.g., ethereum, polygon, bitcoin)
- `address`: The actual address or hash

### Examples

```typescript
// Wallet identifier
wallet:ethereum:0x742d35Cc6634C0532925a3b844Bc454e4438f44e

// Token identifier
token:polygon:0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174

// Transaction identifier
transaction:bitcoin:2b25558946c78f6b244aa37375330cd848b1686b6a671c06d0a2fe4b9df5e475

// Contract identifier
contract:ethereum:0x6b175474e89094c44da98b954eedeac495271d0f
```

## Installation

```bash
npm install @onionfi-internal/blockchain-identifier-utils
```

## Features

- Build standardized identifiers for wallets, tokens, and transactions
- Validate identifier formats
- Extract components from identifiers
- Type-safe identifier handling with TypeScript
- Compare addresses across different identifier formats

## Usage

### Building Identifiers

```typescript
import {
  buildWalletIdentifier,
  buildTokenIdentifier,
  buildTransactionIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';

// Create a wallet identifier
const walletId = buildWalletIdentifier({
  network: 'ethereum',
  address: '0x123...abc',
});
// Result: 'wallet:ethereum:0x123...abc'

// Create a token identifier
const tokenId = buildTokenIdentifier({
  network: 'polygon',
  address: '0xdef...789',
});
// Result: 'token:polygon:0xdef...789'

// Create a transaction identifier
const txId = buildTransactionIdentifier({
  network: 'bitcoin',
  hash: 'abcd...1234',
});
// Result: 'transaction:bitcoin:abcd...1234'
```

### Validating Identifiers

```typescript
import {
  isIdentifier,
  isWalletIdentifier,
  isTokenIdentifier,
  isTransactionIdentifier,
  isContractIdentifier,
} from '@onionfi-internal/blockchain-identifier-utils';

// Check if string is a valid identifier
isIdentifier('wallet:ethereum:0x123'); // true
isWalletIdentifier('wallet:ethereum:0x123'); // true
isTokenIdentifier('token:polygon:0x456'); // true
isTransactionIdentifier('transaction:bitcoin:abcd1234'); // true
isContractIdentifier('contract:ethereum:0x789'); // true
```

### Extracting Information

```typescript
import {
  getIdentifierParts,
  extractAddress,
  extractNetwork,
  extractType,
} from '@onionfi-internal/blockchain-identifier-utils';

const identifier = 'wallet:ethereum:0x123...abc';

// Get all parts
const parts = getIdentifierParts(identifier);
// Result: { type: 'wallet', network: 'ethereum', address: '0x123...abc' }

// Get individual components
const address = extractAddress(identifier); // '0x123...abc'
const network = extractNetwork(identifier); // 'ethereum'
const type = extractType(identifier); // 'wallet'
```

### Comparing Addresses

```typescript
import { compareAddresses } from '@onionfi-internal/blockchain-identifier-utils';

// Compare addresses across different identifier formats
compareAddresses('wallet:ethereum:0x123', '0x123'); // true

compareAddresses('wallet:ethereum:0x123', 'token:ethereum:0x123'); // true
```

## Types

The package includes TypeScript types for all identifiers with improved type safety:

- `Identifier<P, N, T>` - Generic base identifier type with prefix, network, and target parameters
- `WalletIdentifier<N, W>` - For wallet addresses with network and address type parameters
- `TokenIdentifier<N, T>` - For token contracts with network and token address parameters
- `TransactionIdentifier<N, T>` - For blockchain transactions with network and hash parameters
- `ContractIdentifier<N, C>` - For smart contracts with network and contract address parameters

All builder functions are fully typed and provide excellent TypeScript IntelliSense support.

## Error Handling

The package includes the `IdentifierFormatError` for handling invalid identifier formats:

```typescript
try {
  const parts = getIdentifierParts('invalid:format');
} catch (error) {
  if (error instanceof IdentifierFormatError) {
    // Handle invalid format
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build

# Type checking
npm run typecheck

# Lint code
npm run lint
```

## License

ISC
