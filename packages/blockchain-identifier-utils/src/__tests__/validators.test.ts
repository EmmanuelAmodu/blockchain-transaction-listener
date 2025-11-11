import {
  isContractIdentifier,
  isIdentifier,
  isTokenIdentifier,
  isTransactionIdentifier,
  isWalletIdentifier,
} from '../validators';

describe('validators', () => {
  describe('isIdentifier', () => {
    test.each([
      ['wallet:ethereum:0x1234567890abcdef', true],
      ['token:ethereum:0x1234567890abcdef', true],
      ['transaction:ethereum:0x1234567890abcdef', true],
      ['contract:ethereum:0x1234567890abcdef', true],
      ['invalid:ethereum:0x1234567890abcdef', false],
      ['wallet:ethereum', false],
      ['wallet::0x1234567890abcdef', false],
      ['wallet:ethereum:', false],
      ['walletethereumaddress', false],
      ['', false],
    ])('isIdentifier(%s) should return %s', (identifier, expected) => {
      expect(isIdentifier(identifier)).toBe(expected);
    });
  });

  describe('isWalletIdentifier', () => {
    test.each([
      ['wallet:ethereum:0x1234567890abcdef', true],
      ['wallet:bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', true],
      ['wallet:solana:9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', true],
      ['token:ethereum:0x1234567890abcdef', false],
      ['transaction:ethereum:0x1234567890abcdef', false],
      ['contract:ethereum:0x1234567890abcdef', false],
      ['wallet:ethereum', false],
      ['wallet::0x1234567890abcdef', false],
      ['wallet:ethereum:', false],
      ['walletethereumaddress', false],
      ['', false],
    ])('isWalletIdentifier(%s) should return %s', (identifier, expected) => {
      expect(isWalletIdentifier(identifier)).toBe(expected);
    });
  });

  describe('isTokenIdentifier', () => {
    test.each([
      ['token:ethereum:0x1234567890abcdef', true],
      ['token:polygon:0x1234567890abcdef', true],
      ['token:binance:0x1234567890abcdef', true],
      ['wallet:ethereum:0x1234567890abcdef', false],
      ['transaction:ethereum:0x1234567890abcdef', false],
      ['contract:ethereum:0x1234567890abcdef', false],
      ['token:ethereum', false],
      ['token::0x1234567890abcdef', false],
      ['token:ethereum:', false],
      ['tokenethereumaddress', false],
      ['', false],
    ])('isTokenIdentifier(%s) should return %s', (identifier, expected) => {
      expect(isTokenIdentifier(identifier)).toBe(expected);
    });
  });

  describe('isTransactionIdentifier', () => {
    test.each([
      ['transaction:ethereum:0x1234567890abcdef', true],
      ['transaction:bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', true],
      ['transaction:solana:9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', true],
      ['wallet:ethereum:0x1234567890abcdef', false],
      ['token:ethereum:0x1234567890abcdef', false],
      ['contract:ethereum:0x1234567890abcdef', false],
      ['transaction:ethereum', false],
      ['transaction::0x1234567890abcdef', false],
      ['transaction:ethereum:', false],
      ['transactionethereumaddress', false],
      ['', false],
    ])(
      'isTransactionIdentifier(%s) should return %s',
      (identifier, expected) => {
        expect(isTransactionIdentifier(identifier)).toBe(expected);
      },
    );
  });

  describe('isContractIdentifier', () => {
    test.each([
      ['contract:ethereum:0x1234567890abcdef', true],
      ['contract:polygon:0x1234567890abcdef', true],
      ['contract:binance:0x1234567890abcdef', true],
      ['wallet:ethereum:0x1234567890abcdef', false],
      ['token:ethereum:0x1234567890abcdef', false],
      ['transaction:ethereum:0x1234567890abcdef', false],
      ['contract:ethereum', false],
      ['contract::0x1234567890abcdef', false],
      ['contract:ethereum:', false],
      ['contractethereumaddress', false],
      ['', false],
    ])('isContractIdentifier(%s) should return %s', (identifier, expected) => {
      expect(isContractIdentifier(identifier)).toBe(expected);
    });
  });
});
