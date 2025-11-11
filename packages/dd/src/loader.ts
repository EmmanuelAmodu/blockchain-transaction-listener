import { DynamicModule } from '@nestjs/common';
import { DatadogTraceModule } from 'nestjs-ddtrace';

export class DataDogModule {
  public static forRoot(): DynamicModule {
    return DatadogTraceModule.forRoot({
      controllers: true,
      providers: true,
    });
  }
}
