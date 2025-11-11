import { onionfiError } from './onionfi.error';
import { onionfiErrorOptions } from './types';
import { CommonErrorCode } from './onionfi-error-code.enum';

export class NotFoundError extends onionfiError {
  constructor(message?: string, options?: onionfiErrorOptions) {
    super(message, options);
    this.onionfiErrorCode = CommonErrorCode.NOT_FOUND;
    this.name = 'NotFoundError';
  }
}
