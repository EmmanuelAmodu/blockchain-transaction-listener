import { Message } from '@google-cloud/pubsub';
import { ArgumentsHost } from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { PubSubExceptionFilter } from './pubsub-exception-filter';

describe('PubSubExceptionFilter', () => {
  let mockError: Error;
  let mockData: any;
  let mockPubSubMessage: Message;
  let mockHost: ArgumentsHost;
  let filter: PubSubExceptionFilter;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockError = new Error('test error');
    mockData = { test: 'data' };
    mockPubSubMessage = {
      deliveryAttempt: 1,
      ackId: 'test-ack-id',
    } as unknown as Message;
    mockHost = {
      switchToRpc: jest.fn().mockReturnValue({
        getContext: jest.fn().mockReturnValue(mockPubSubMessage),
        getData: jest.fn().mockReturnValue(mockData),
      }),
    } as unknown as ArgumentsHost;

    filter = new PubSubExceptionFilter();

    loggerSpy = jest.spyOn((filter as any).logger, 'error');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should throw and log the original error and message details', () => {
    // Act & Assert
    expect(() =>
      filter.catch(mockError, mockHost),
    ).toThrowErrorMatchingInlineSnapshot(`"${mockError.message}"`);
    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      `Unable to handle pubsub message: ${mockError.message}`,
      {
        deliveryAttempt: mockPubSubMessage.deliveryAttempt,
        ackId: mockPubSubMessage.ackId,
        data: mockData,
      },
    );
  });

  test('should throw and log the original error when there is no message', () => {
    // Arrange
    jest
      .spyOn(mockHost, 'switchToRpc')
      .mockReturnValueOnce(undefined as unknown as RpcArgumentsHost);

    // Act & Assert
    expect(() =>
      filter.catch(mockError, mockHost),
    ).toThrowErrorMatchingInlineSnapshot(`"${mockError.message}"`);
    expect(loggerSpy).toHaveBeenCalledTimes(1);
    expect(loggerSpy).toHaveBeenCalledWith(
      `Unable to handle pubsub message: ${mockError.message}`,
      {},
    );
  });

  test('should throw the original error if something fails', () => {
    // Arrange
    const anotherError = new Error('oops');
    jest.spyOn(mockHost, 'switchToRpc').mockImplementationOnce(() => {
      throw anotherError;
    });

    // Act & Assert
    expect(() =>
      filter.catch(mockError, mockHost),
    ).toThrowErrorMatchingInlineSnapshot(`"${mockError.message}"`);
    expect(loggerSpy).toHaveBeenCalledTimes(2);
    expect(loggerSpy).toHaveBeenNthCalledWith(
      1,
      `Error in PubsSubExceptionFilter: ${anotherError.message}`,
    );
    expect(loggerSpy).toHaveBeenNthCalledWith(
      2,
      `Unable to handle pubsub message: ${mockError.message}`,
      {},
    );
  });
});
