import { onionfiError } from './onionfi.error';
import { onionfiErrorOptions } from './types';

export class TimeoutError extends onionfiError {
  constructor(message?: string, options?: onionfiErrorOptions) {
    super(message, options);
    this.name = 'TimeoutError';
  }
}
