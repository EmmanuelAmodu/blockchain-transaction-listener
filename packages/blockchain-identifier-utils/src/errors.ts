export class IdentifierFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentifierFormatError';
  }
}
