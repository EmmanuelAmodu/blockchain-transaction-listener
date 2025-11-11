/* eslint-disable max-classes-per-file */
import { HttpError, onionfiError } from '@onionfi-internal/errors';
import { HttpException, HttpStatus } from '@nestjs/common';

export const HTTP_STATUS_RETRYABLE_ERRORS = [
  HttpStatus.BAD_GATEWAY,
  HttpStatus.SERVICE_UNAVAILABLE,
  HttpStatus.GATEWAY_TIMEOUT,
  HttpStatus.INTERNAL_SERVER_ERROR,
];

export class RetryableError extends Error {}

export const mapHttpError = (
  error: HttpError,
  publicDetails?: Record<string, unknown>,
): Error => {
  if (!error.status) {
    return new onionfiError(error.message, { cause: error });
  }

  if (HTTP_STATUS_RETRYABLE_ERRORS.includes(error.status)) {
    return new RetryableError(error.message, { cause: error });
  }

  return new HttpException(
    new onionfiError(error.message, { publicDetails }),
    error.status,
    { cause: error },
  );
};

export enum RetryStrategy {
  Constant = 'constant',
  Linear = 'linear',
  Exponential = 'exponential',
}

type RetryConfig = {
  attempt: number;
  limit: number;
  delayMs: number;
  baseDelay: number;
  strategy?: RetryStrategy;
};

type RetryConfigParams = Partial<RetryConfig>;

const defaultRetryConfig: RetryConfig = {
  attempt: 0,
  limit: 6,
  delayMs: 300,
  baseDelay: 300,
  strategy: RetryStrategy.Exponential,
};

/*
  Default config delays:
Initial call: 0 milliseconds
Attempt 1: 300 milliseconds (0.3 seconds)
Attempt 2: 600 milliseconds (0.6 seconds)
Attempt 3: 1200 milliseconds (1.2 seconds)
Attempt 4: 2400 milliseconds (2.4 seconds)
Attempt 5: 4800 milliseconds (4.8 seconds)
*/

export class RetryableErrorHandler {
  public static executeWithRetry<T>(
    handler: () => Promise<T>,
    retryConfig?: RetryConfigParams,
    errorRecursion?: Error,
  ): Promise<T> {
    const currentIteration: RetryConfig = {
      attempt: retryConfig?.attempt || defaultRetryConfig.attempt,
      limit: retryConfig?.limit || defaultRetryConfig.limit,
      baseDelay: retryConfig?.delayMs || defaultRetryConfig.delayMs,
      delayMs: retryConfig?.delayMs || defaultRetryConfig.delayMs,
      strategy: retryConfig?.strategy || defaultRetryConfig.strategy,
    };
    const nextIteration = {
      ...currentIteration,
      attempt: currentIteration.attempt + 1,
      baseDelay: currentIteration.baseDelay,
      delayMs: this.getNextDelayByStrategy(
        currentIteration.baseDelay,
        currentIteration.delayMs,
        currentIteration.strategy,
      ),
    };

    const { attempt, delayMs, limit } = currentIteration;

    if (attempt === limit) {
      throw new onionfiError(
        errorRecursion?.message || 'Retry limit exceeded',
        {
          cause: errorRecursion,
        },
      );
    }

    return handler().catch((error) => {
      if (error instanceof RetryableError) {
        return this.delay(delayMs).then(() =>
          this.executeWithRetry(handler, nextIteration, error),
        );
      }
      throw error;
    });
  }

  private static getNextDelayByStrategy(
    baseDelay: number,
    delayMs: number,
    strategy: RetryStrategy = RetryStrategy.Exponential,
  ): number {
    const randomnessFactor =
      Math.random() * (baseDelay * 0.3) + baseDelay * 0.7;

    switch (strategy) {
      case RetryStrategy.Constant:
        return baseDelay;
      case RetryStrategy.Linear:
        return delayMs + randomnessFactor;
      case RetryStrategy.Exponential:
        return delayMs + Math.random() * (delayMs * 0.3) + delayMs * 0.7;
      default:
        return delayMs + Math.random() * (delayMs * 0.3) + delayMs * 0.7;
    }
  }

  public static delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
