import '@onionfi-internal/dd/init';

import {
  createonionfiNestApp,
  onionfiNestAppOptions,
} from '@onionfi-internal/nestjs';
import { PubSubStrategy } from '@onionfi-internal/pubsub-server';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// part of nestjs
// eslint-disable-next-line import/no-extraneous-dependencies
import { json } from 'body-parser';
import { AppModule } from './app.module';
import { ConfigUtil } from './common/config/config.util';

async function bootstrap(): Promise<void> {
  const appOptions: onionfiNestAppOptions = {
    bufferLogs: true,
    versioning: {
      defaultVersion: '1',
      type: VersioningType.URI,
    },
  };

  const httpApp = await createonionfiNestApp(AppModule, {
    ...appOptions,
    microservices: [
      [
        {
          strategy: new PubSubStrategy({
            subscriptionOptionsOverrides: {
              flowControl: {
                maxMessages: Number(process.env.PUBSUB_FLOW_MAX_MESSAGES || 50),
              },
            },
          }),
        },
        { inheritAppConfig: true },
      ],
    ],
  });

  const configService = httpApp.get(ConfigService);
  ConfigUtil.setConfigService(configService);

  const config = new DocumentBuilder()
    .setTitle('onionfi Wallets API')
    .setDescription('onionfi Wallets API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(httpApp, config);

  // Only enable Swagger UI if ENABLE_SWAGGER_UI is set to true
  if (configService.get('ENABLE_SWAGGER_UI') === 'true') {
    SwaggerModule.setup('openapi', httpApp, document);
  }

  await httpApp.startAllMicroservices();
  // https://github.com/nestjs/nest/issues/529#issuecomment-376576929
  httpApp.use(json({ limit: '30mb' }));

  await httpApp.listen(process.env.PORT ?? 3000);
}

bootstrap();
