import { onionfiError } from './onionfi.error';
import { onionfiErrorOptions } from './types';

export class ConfigurationError extends onionfiError {
  constructor(message?: string, options?: onionfiErrorOptions) {
    super(message, options);
    this.name = 'ConfigurationError';
  }
}
