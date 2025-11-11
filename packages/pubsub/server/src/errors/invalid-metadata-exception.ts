import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidMetadataException extends RuntimeException {
  public pattern: string;

  constructor(pattern: string) {
    super(`The supplied pattern metadata is invalid: ${pattern}`);
    this.pattern = pattern;
  }
}
