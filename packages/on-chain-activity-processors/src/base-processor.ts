import { Logger } from '@nestjs/common';
import { NETWORK } from './networks';
import { ProcessorOnChainActivity } from './types';

export abstract class BaseOnChainActivityProcessor<T> {
  protected readonly logger: Logger;

  protected constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  public abstract process({
    transactions,
    network,
  }: {
    transactions: T[];
    network?: NETWORK;
  }): Promise<ProcessorOnChainActivity[]>;
}
