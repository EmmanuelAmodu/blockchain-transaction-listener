import {
  buildTokenIdentifier,
  buildTransactionIdentifier,
  buildWalletIdentifier,
} from '../builders';

describe('Identifier Utilities - builders', () => {
  test('buildWalletIdentifier should create the correct wallet identifier string', () => {
    const network = 'ethereum';
    const address = '0x1234567890abcdef';
    const expectedIdentifier = `wallet:${network}:${address}`;
    expect(buildWalletIdentifier({ network, address })).toBe(
      expectedIdentifier,
    );
  });

  test('buildTokenIdentifier should create the correct token identifier string', () => {
    const network = 'polygon';
    const address = '0xabcdef1234567890';
    const expectedIdentifier = `token:${network}:${address}`;
    expect(buildTokenIdentifier({ network, address })).toBe(expectedIdentifier);
  });

  test('buildTransactionIdentifier should create the correct transaction identifier string', () => {
    const network = 'bsc';
    const txHash = '0x9876543210fedcba';
    const expectedIdentifier = `transaction:${network}:${txHash}`;
    expect(buildTransactionIdentifier({ network, hash: txHash })).toBe(
      expectedIdentifier,
    );
  });

  test('buildIdentifier should lowercase the network', () => {
    const network = 'BSC';
    const address = '0x9876543210fedcba';
    const expectedIdentifier = `wallet:${network.toLowerCase()}:${address}`;
    expect(buildWalletIdentifier({ network, address })).toBe(
      expectedIdentifier,
    );
  });

  test('buildIdentifier should lowercase base16 addresses', () => {
    const network = 'bsc';
    const address = '0x9876543210feAaDa';
    const expectedIdentifier = `wallet:bsc:${address.toLowerCase()}`;
    expect(buildWalletIdentifier({ network, address })).toBe(
      expectedIdentifier,
    );
  });

  test('buildIdentifier should not lowercase other addresses', () => {
    const network = 'bsc';
    // Because it contains the letter H, it is not a base16 address
    const address = '0x9876543210fHeAaDa';
    const expectedIdentifier = `wallet:bsc:${address}`;
    expect(buildWalletIdentifier({ network, address })).toBe(
      expectedIdentifier,
    );
  });
});
