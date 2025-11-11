import { NestFactory } from '@nestjs/core';
import { INestApplication, VersioningType } from '@nestjs/common';

export interface MoonPayNestAppOptions {
  bufferLogs?: boolean;
  versioning?: {
    defaultVersion: string;
    type: VersioningType;
  };
  microservices?: any[];
}

export async function createMoonPayNestApp(
  module: any,
  options: MoonPayNestAppOptions = {}
): Promise<INestApplication> {
  const app = await NestFactory.create(module, {
    bufferLogs: options.bufferLogs ?? false,
  });

  if (options.versioning) {
    app.enableVersioning(options.versioning);
  }

  // Register microservices if provided
  if (options.microservices) {
    for (const [strategy, config] of options.microservices) {
      app.connectMicroservice(strategy, config);
    }
  }

  return app;
}

// Re-export Module decorator
export { Module } from '@nestjs/common';

// Simple logger module
export class LoggerModule {
  static forRoot() {
    return {
      module: LoggerModule,
      global: true,
    };
  }
}

// Simple onionfi module
export class onionfiModule {}
