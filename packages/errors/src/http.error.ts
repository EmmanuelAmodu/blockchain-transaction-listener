import { onionfiError } from './onionfi.error';
import { onionfiErrorOptions } from './types';

export class HttpError extends onionfiError {
  public readonly status?: number;

  constructor(message: string, status: number, options?: onionfiErrorOptions) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}
