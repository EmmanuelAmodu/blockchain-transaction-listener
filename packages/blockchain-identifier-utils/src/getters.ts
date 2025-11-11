import { IdentifierFormatError } from './errors';
import { isIdentifier } from './validators';

/**
 * Extracts the parts from an identifier string, throws an error if the identifier is not a valid identifier
 * @returns The parts from the identifier string
 */
export function getIdentifierParts(identifier: string): {
  type: string;
  network: string;
  address: string;
} {
  if (!isIdentifier(identifier)) {
    throw new IdentifierFormatError(`Invalid identifier: ${identifier}`);
  }
  const [type, network, address] = identifier.split(':');
  if (!type || !network || !address) {
    throw new IdentifierFormatError(`Invalid identifier: ${identifier}`);
  }
  return { type, network, address };
}

/**
 * Extracts the address from an identifier string, or returns the original identifier if it is not a valid identifier assuming it is an address
 * @returns The address from the identifier string
 */
export function extractAddress(identifier: string): string {
  try {
    return getIdentifierParts(identifier).address;
  } catch (error) {
    if (error instanceof IdentifierFormatError) {
      return identifier;
    }
    throw error;
  }
}

/**
 * Extracts the network from an identifier string, throws an error if the identifier is not a valid identifier
 * @returns The network from the identifier string
 */
export function extractNetwork(identifier: string): string {
  return getIdentifierParts(identifier).network;
}

/**
 * Extracts the type from an identifier string, throws an error if the identifier is not a valid identifier
 * @returns The type from the identifier string
 */
export function extractType(identifier: string): string {
  return getIdentifierParts(identifier).type;
}

/**
 * Compares two identifiers or addresses by their address
 * @returns true if the addresses are the same, false otherwise
 */
export function compareAddresses(
  identifier1: string,
  identifier2: string,
): boolean {
  return extractAddress(identifier1) === extractAddress(identifier2);
}
