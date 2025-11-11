import { IdentifierFormatError } from '../errors';
import {
  compareAddresses,
  extractAddress,
  getIdentifierParts,
} from '../getters';

describe('getters', () => {
  test('extractAddress should return the correct address from an identifier string', () => {
    const identifier = 'wallet:ethereum:0x1234567890abcdef';
    const expectedAddress = '0x1234567890abcdef';
    expect(extractAddress(identifier)).toBe(expectedAddress);
  });

  test('extractAddress should return the original identifier if it is not a valid identifier', () => {
    const identifier = 'invalid-identifier';
    expect(extractAddress(identifier)).toBe(identifier);
  });

  test('getIdentifierParts should return the correct parts from an identifier string', () => {
    const identifier = 'wallet:ethereum:0x1234567890abcdef';
    const expectedParts = {
      type: 'wallet',
      network: 'ethereum',
      address: '0x1234567890abcdef',
    };
    expect(getIdentifierParts(identifier)).toEqual(expectedParts);
  });

  test('getIdentifierParts should throw an error if the identifier is not a valid identifier', () => {
    const identifier = 'invalid-identifier';
    expect(() => getIdentifierParts(identifier)).toThrow(
      new IdentifierFormatError(`Invalid identifier: ${identifier}`),
    );
  });

  test.each([
    [
      'wallet:ethereum:0x1234567890abcdef',
      'wallet:ethereum:0x1234567890abcdef',
      true,
    ],
    [
      'wallet:ethereum:0x1234567890abcdef',
      'wallet:ethereum:0x1234567890abbbcdef',
      false,
    ],
    ['wallet:ethereum:0x1234567890abcdef', '0x1234567890abcdef', true],
    ['0x1234567890abcdef', '0x1234567890abcdef', true],
    ['0x1234567890abasdfasdfcdef', '0x1234567890abcdef', false],
  ])(
    'compareAddresses for %s and %s should return %s',
    (id1, id2, expected) => {
      expect(compareAddresses(id1, id2)).toBe(expected);
    },
  );
});
