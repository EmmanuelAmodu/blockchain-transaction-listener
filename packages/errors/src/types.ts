export type onionfiErrorOptions = ErrorOptions & {
  /** Logged but also passed as response in http requests, etc. Should only contain public information. */
  publicDetails?: Record<string, unknown>;
};
