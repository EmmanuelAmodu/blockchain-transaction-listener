import { ExecutionContext } from '@nestjs/common';

export const createExecutionContext = (args: any[]) => {
  return {
    getArgByIndex: (index) => {
      return args[index];
    },
  } as ExecutionContext;
};
