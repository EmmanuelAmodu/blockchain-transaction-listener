import { HttpError, onionfiError } from '@onionfi-internal/errors';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  HTTP_STATUS_RETRYABLE_ERRORS,
  RetryableError,
  RetryableErrorHandler,
  mapHttpError,
} from './retryableErrorHandler';

describe('RetryableErrorHandler', () => {
  beforeAll(() => {
    jest.spyOn(RetryableErrorHandler, 'delay').mockResolvedValue();
  });

  const successfulOperationResult = 'Success';

  const retryableErrorResult = new RetryableError('Retryable error');

  const nonRetryableErrorResult = new Error('Fatal error');

  describe('#mapHttpError', () => {
    it('Should return onionfiError when there is no status', () => {
      // Arrange
      const error = new Error('Without status');

      // Act
      const mappedError = mapHttpError(error);

      // Assert
      expect(mappedError).toBeInstanceOf(onionfiError);
      expect(mappedError.message).toBe('Without status');
      expect(mappedError.cause).toBe(error);
    });

    it.each(HTTP_STATUS_RETRYABLE_ERRORS)(
      'Should return RetryableError when status is %s',
      (status) => {
        // Arrange
        const error = new HttpError('With status', status);

        // Act
        const mappedError = mapHttpError(error);

        // Assert
        expect(mappedError).toBeInstanceOf(RetryableError);
        expect(mappedError.message).toBe('With status');
        expect(mappedError.cause).toBe(error);
      },
    );

    it.each([undefined, { a: 'b' }])(
      'Should return HttpException when status is not re-triable and public details %s',
      (publicDetails) => {
        // Arrange
        const error = new HttpError('Message', HttpStatus.BAD_REQUEST);

        // Act
        const mappedError = mapHttpError(error, publicDetails);

        // Assert
        expect(mappedError).toBeInstanceOf(HttpException);
        expect(mappedError.message).toBe('Message');
        expect(mappedError.cause).toBe(error);
        expect((mappedError as HttpException).getStatus()).toBe(
          HttpStatus.BAD_REQUEST,
        );
        expect((mappedError as HttpException).getResponse()).toBeInstanceOf(
          onionfiError,
        );
        expect(
          ((mappedError as HttpException).getResponse() as onionfiError)
            .publicDetails,
        ).toBe(publicDetails);
      },
    );
  });

  describe('RetryableErrorHandler', () => {
    describe('#executeWithRetry', () => {
      it('should handle successful operation without retry', async () => {
        // Arrange
        const successfulOperation = jest
          .fn()
          .mockResolvedValue(successfulOperationResult);

        // Act
        const result = await RetryableErrorHandler.executeWithRetry(
          successfulOperation,
        );

        // Assert
        expect(result).toBe('Success');
        expect(successfulOperation).toHaveBeenCalledTimes(1);
      });

      it('should reach retry limit and fail', async () => {
        // Arrange
        const failingOperation = jest
          .fn()
          .mockRejectedValue(retryableErrorResult);

        // Act
        try {
          await RetryableErrorHandler.executeWithRetry(failingOperation, {
            attempt: 0,
            limit: 3,
            delayMs: 100,
          });
        } catch (error) {
          // Assert
          expect(error).toBeInstanceOf(onionfiError);
          expect((error as Error).message).toBe('Retryable error');
        }

        expect(failingOperation).toHaveBeenCalledTimes(3);
      });

      it('should retry on RetryableError and eventually succeed', async () => {
        // Arrange
        const operationMock = jest
          .fn()
          .mockRejectedValueOnce(retryableErrorResult)
          .mockResolvedValueOnce(successfulOperationResult);

        // Act
        const result = await RetryableErrorHandler.executeWithRetry(
          operationMock,
          {
            attempt: 0,
            limit: 2,
            delayMs: 100,
          },
        );

        // Assert
        expect(result).toBe('Success');
        expect(operationMock).toHaveBeenCalledTimes(2);
      });

      it('should not retry on non-retryable errors', async () => {
        // Arrange
        const failingOperation = jest
          .fn()
          .mockRejectedValue(nonRetryableErrorResult);

        // Act
        try {
          await RetryableErrorHandler.executeWithRetry(failingOperation);
        } catch (error) {
          // Assert
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Fatal error');
        }
        expect(failingOperation).toHaveBeenCalledTimes(1);
      });
    });
  });
});
