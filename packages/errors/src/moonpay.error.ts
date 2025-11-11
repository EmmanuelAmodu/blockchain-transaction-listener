import { onionfiErrorOptions } from './types';
import { onionfiErrorCode } from './onionfi-error-code.enum';

export class onionfiError extends Error {
  public readonly publicDetails?: Record<string, unknown>;

  public onionfiErrorCode?: onionfiErrorCode;

  public statusCode?: number;

  constructor(message?: string, options?: onionfiErrorOptions) {
    const { publicDetails, ...standardOptions } = options || {};
    super(message, standardOptions);
    this.publicDetails = publicDetails;
    this.name = 'onionfiError';
  }
}
