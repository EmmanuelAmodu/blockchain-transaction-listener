import { onionfiError } from './onionfi.error';
import { onionfiErrorOptions } from './types';
import { onionfiErrorCode } from './onionfi-error-code.enum';

export class ValidationError extends onionfiError {
  public statusCode?: number;

  constructor(
    message: string,
    code: onionfiErrorCode,
    overrideStatusCode?: number,
    options?: onionfiErrorOptions,
  ) {
    super(message, options);
    this.name = 'ValidationError';
    this.onionfiErrorCode = code;
    this.statusCode = overrideStatusCode ?? 400;
  }
}
