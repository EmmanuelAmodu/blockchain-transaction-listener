import { Message } from '@google-cloud/pubsub';
import {
  ArgumentsHost,
  Catch,
  Logger,
  RpcExceptionFilter,
} from '@nestjs/common';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';

/**
 * Logs the pubsub message and the payload in case there is an unhandled exception
 * during the processing. The original exception is rethrown so that the message
 * can be automatically nacked and retried.
 */
@Catch()
export class PubSubExceptionFilter implements RpcExceptionFilter<Error> {
  private readonly logger = new Logger(PubSubExceptionFilter.name);

  public catch(exception: Error, host: ArgumentsHost): any {
    let errorDetails = {};
    try {
      if (host) {
        const rpcHost: RpcArgumentsHost = host.switchToRpc();
        if (rpcHost) {
          const pubsubMessage: Message = rpcHost.getContext();

          if (pubsubMessage) {
            const { deliveryAttempt, ackId } = pubsubMessage;
            errorDetails = { ...errorDetails, deliveryAttempt, ackId };
          }

          const data = rpcHost.getData();
          if (data) {
            errorDetails = { ...errorDetails, data };
          }
        }
      }
    } catch (herr) {
      const message =
        herr instanceof Error ? herr.message : JSON.stringify(herr);
      this.logger.error(`Error in PubsSubExceptionFilter: ${message}`);
    }

    this.logger.error(
      `Unable to handle pubsub message: ${exception.message}`,
      errorDetails,
    );
    throw exception;
  }
}
