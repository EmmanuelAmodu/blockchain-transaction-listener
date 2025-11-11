import { CommonErrorCode } from './onionfi-error-code.enum';
import { onionfiError } from './onionfi.error';
import { onionfiErrorOptions } from './types';

export class ForbiddenError extends onionfiError {
  constructor(message?: string, options?: onionfiErrorOptions) {
    super(message, options);
    this.statusCode = 403;
    this.onionfiErrorCode = CommonErrorCode.FORBIDDEN;
    this.name = 'ForbiddenError';
  }
}
