import { HeliusSolanaProcessor } from '@onionfi-internal/on-chain-activity-processors';
import { PubSubClient } from '@onionfi-internal/pubsub-client';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { onChainActivityTopicName } from '../constants';
import { OnChainActivityService } from '../on-chain-activity.service';
import { HeliusSolanaController } from './helius-solana.controller';
import { IN_APP_SWAP, SOL_TRANSFER, USDC_TRANSFER } from './test-data';

describe('HeliusSolanaController', () => {
  let app;
  let pubSubClient: jest.Mocked<PubSubClient>;

  const mockWebhookSecret = 'test-webhook-secret';
  beforeEach(async () => {
    pubSubClient = {
      publishToTopic: jest.fn(),
    } as unknown as jest.Mocked<PubSubClient>;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HeliusSolanaController],
      providers: [
        HeliusSolanaProcessor,
        OnChainActivityService,
        {
          provide: PubSubClient,
          useValue: pubSubClient,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockWebhookSecret),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /webhooks/helius/enhanced-transaction', () => {
    test('In app swap', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .set('authorization', mockWebhookSecret)
        .send(IN_APP_SWAP)
        .expect(201);

      expect(pubSubClient.publishToTopic).toHaveBeenCalledWith(
        onChainActivityTopicName,
        {
          identifier:
            'transaction:solana:sSUeC7k55MMteV7PqAe3ETwhfYGsjjNXMofRg7n99RC3uCa7K7pXiiohRwzahLFwPpoJMkZeQryvTNS6beBVPSi',
          metadata: {
            slot: 335370224,
          },
          completedAtTimestamp: 1745411367000,
          status: 'success',
          description: '',
          fee: {
            amount: 110000,
            feePayer: [
              'wallet:solana:DyWNrf44xjeaDjvzuo4qUb7yhwgcMfmymEHbG8kts66z',
            ],
          },
          tokenIdentifiers: [
            'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            'token:solana:HrAgkjmK9PHUyQ4ijU6j6NVvAZQ4HQ1jPCsm626cZxSQ',
            'token:solana:So11111111111111111111111111111111111111112',
            'token:solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            'token:solana:native',
          ],
          transfers: [
            {
              from: 'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              to: 'wallet:solana:7kvVQgoVn5UPq7ZfcnsZwchfYhbbgjEeJRowPB1SzWh1',
              amount: '0.270922',
              token:
                'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
            {
              from: 'wallet:solana:BYRYB1oDnzkEdKWhT8PHF9K9MNQ4HXxeVunA3MogkmoY',
              to: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              amount: '2409.905543',
              token:
                'token:solana:HrAgkjmK9PHUyQ4ijU6j6NVvAZQ4HQ1jPCsm626cZxSQ',
            },
            {
              from: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              to: 'wallet:solana:BYRYB1oDnzkEdKWhT8PHF9K9MNQ4HXxeVunA3MogkmoY',
              amount: '0.004370792',
              token: 'token:solana:So11111111111111111111111111111111111111112',
            },
            {
              from: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              to: 'wallet:solana:G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP',
              amount: '0.000002182',
              token: 'token:solana:So11111111111111111111111111111111111111112',
            },
            {
              from: 'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              to: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              amount: '0.665516',
              token:
                'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
            {
              from: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              to: 'wallet:solana:8cjeuVV3KQ9k8RqW1JUyCfey2TDAhuo7f4hPDMeGfxv',
              amount: '0.665516',
              token:
                'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
            {
              from: 'wallet:solana:9MkixYmjT2UbMgnNnPBTYkRjzdmi4zP1jkMdCkR89L67',
              to: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              amount: '42083.08145',
              token:
                'token:solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            },
            {
              from: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              to: 'wallet:solana:BjZKz1z4UMjJPvPfKwTwjPErVBWnewnJFvcZB6minymy',
              amount: '42083.08145',
              token:
                'token:solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            },
            {
              from: 'wallet:solana:BjZKz1z4UMjJPvPfKwTwjPErVBWnewnJFvcZB6minymy',
              to: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              amount: '0.004372999',
              token: 'token:solana:So11111111111111111111111111111111111111112',
            },
            {
              from: 'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              to: 'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              amount: '2409.905543',
              token:
                'token:solana:HrAgkjmK9PHUyQ4ijU6j6NVvAZQ4HQ1jPCsm626cZxSQ',
            },
            {
              from: 'wallet:solana:DyWNrf44xjeaDjvzuo4qUb7yhwgcMfmymEHbG8kts66z',
              to: 'wallet:solana:J9dDjGVxVbaguQcx31tAeYLmtpB5GNQbetjodQfwg8UC',
              amount: '2039280',
              token: 'token:solana:native',
            },
          ],
          balanceChanges: [
            {
              wallet:
                'wallet:solana:DyWNrf44xjeaDjvzuo4qUb7yhwgcMfmymEHbG8kts66z',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '-2149280',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              changes: [
                {
                  token:
                    'token:solana:HrAgkjmK9PHUyQ4ijU6j6NVvAZQ4HQ1jPCsm626cZxSQ',
                  amount: '2409905543',
                },
                {
                  token:
                    'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  amount: '-936438',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:J9dDjGVxVbaguQcx31tAeYLmtpB5GNQbetjodQfwg8UC',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '2039280',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:GGztQqQ6pCPaJQnNpXBgELr5cs3WwDakRbh1iEMzjgSJ',
              changes: [
                {
                  token:
                    'token:solana:So11111111111111111111111111111111111111112',
                  amount: '25',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:g7dD1FHSemkUQrX1Eak37wzvDjscgBW2pFCENwjLdMX',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '25',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:7kvVQgoVn5UPq7ZfcnsZwchfYhbbgjEeJRowPB1SzWh1',
              changes: [
                {
                  token:
                    'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  amount: '270922',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:8cjeuVV3KQ9k8RqW1JUyCfey2TDAhuo7f4hPDMeGfxv',
              changes: [
                {
                  token:
                    'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  amount: '665516',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:9MkixYmjT2UbMgnNnPBTYkRjzdmi4zP1jkMdCkR89L67',
              changes: [
                {
                  token:
                    'token:solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                  amount: '-4208308145',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:BjZKz1z4UMjJPvPfKwTwjPErVBWnewnJFvcZB6minymy',
              changes: [
                {
                  token:
                    'token:solana:DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                  amount: '4208308145',
                },
                {
                  token:
                    'token:solana:So11111111111111111111111111111111111111112',
                  amount: '-4372999',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:Q7UFU9VeeTCuMVGJdp6bukcySc2LVrafhcnAM6SPG9W',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '-4372999',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:BYRYB1oDnzkEdKWhT8PHF9K9MNQ4HXxeVunA3MogkmoY',
              changes: [
                {
                  token:
                    'token:solana:HrAgkjmK9PHUyQ4ijU6j6NVvAZQ4HQ1jPCsm626cZxSQ',
                  amount: '-2409905543',
                },
                {
                  token:
                    'token:solana:So11111111111111111111111111111111111111112',
                  amount: '4370792',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:43RLPpujaandTzpJqQJqqqNuqarpE3mVCi1idwqa8reJ',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '4370792',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:G5UZAVbAf46s7cKWoyKu8kYTip9DGTpbLZ2qa9Aq69dP',
              changes: [
                {
                  token:
                    'token:solana:So11111111111111111111111111111111111111112',
                  amount: '2182',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:BWXT6RUhit9FfJQM3pBmqeFLPYmuxgmyhMGC5sGr8RbA',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '2182',
                },
              ],
            },
          ],
        },
      );
    });
    test('Solana transfer', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .set('authorization', mockWebhookSecret)
        .send(SOL_TRANSFER)
        .expect(201);

      expect(pubSubClient.publishToTopic).toHaveBeenCalledWith(
        onChainActivityTopicName,
        {
          identifier:
            'transaction:solana:34EMFRM3DezqxBvtcQeAB9ftqSfJATgP3oHqW5ZauiudnweYpFAdXsanQ363w6NC1tJhk8naF66RTFr8G7VPpad5',
          metadata: {
            slot: 335367432,
          },
          completedAtTimestamp: 1745410252000,
          status: 'success',
          description:
            '8YSVTY3avQPwZaoB3GdPfShTUYcE9hEppsMuGJPmoqbC transferred a total 0.00095 SOL to multiple accounts.',
          fee: {
            amount: 5000,
            feePayer: [
              'wallet:solana:8YSVTY3avQPwZaoB3GdPfShTUYcE9hEppsMuGJPmoqbC',
            ],
          },
          tokenIdentifiers: ['token:solana:native'],
          transfers: [
            {
              from: 'wallet:solana:8YSVTY3avQPwZaoB3GdPfShTUYcE9hEppsMuGJPmoqbC',
              to: 'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              amount: '10000',
              token: 'token:solana:native',
            },
            {
              from: 'wallet:solana:8YSVTY3avQPwZaoB3GdPfShTUYcE9hEppsMuGJPmoqbC',
              to: 'wallet:solana:CCPWz1WreB5xRsAH7YQgzZPwWTEYuSqKRNBzoZMALWKL',
              amount: '935000',
              token: 'token:solana:native',
            },
          ],
          balanceChanges: [
            {
              wallet:
                'wallet:solana:8YSVTY3avQPwZaoB3GdPfShTUYcE9hEppsMuGJPmoqbC',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '-950000',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '10000',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:CCPWz1WreB5xRsAH7YQgzZPwWTEYuSqKRNBzoZMALWKL',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '935000',
                },
              ],
            },
          ],
        },
      );
    });
    test('USDC transfer', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/helius/enhanced-transaction')
        .set('authorization', mockWebhookSecret)
        .send(USDC_TRANSFER)
        .expect(201);

      expect(pubSubClient.publishToTopic).toHaveBeenCalledWith(
        onChainActivityTopicName,
        {
          identifier:
            'transaction:solana:5QRpQdwtrYgAAYzF7kaqFAj1EPG4M6QZXnuaJFHRUcsvZ44i1d9keAuyWhcYMrLGVcPrP83YwESBJw9gW6ttHBB6',
          metadata: {
            slot: 335367143,
          },
          completedAtTimestamp: 1745410136000,
          status: 'success',
          description:
            '8YSVuWDeLLqdHsCupfJkWY3oAQkumcTUUKzCQHkptQvC transferred 0.03 USDC to mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh.',
          fee: {
            amount: 79994,
            feePayer: [
              'wallet:solana:8YSVuWDeLLqdHsCupfJkWY3oAQkumcTUUKzCQHkptQvC',
            ],
          },
          tokenIdentifiers: [
            'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            'token:solana:native',
          ],
          transfers: [
            {
              from: 'wallet:solana:8YSVuWDeLLqdHsCupfJkWY3oAQkumcTUUKzCQHkptQvC',
              to: 'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              amount: '0.03',
              token:
                'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
          ],
          balanceChanges: [
            {
              wallet:
                'wallet:solana:8YSVuWDeLLqdHsCupfJkWY3oAQkumcTUUKzCQHkptQvC',
              changes: [
                {
                  token: 'token:solana:native',
                  amount: '-79994',
                },
                {
                  token:
                    'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  amount: '-30000',
                },
              ],
            },
            {
              wallet:
                'wallet:solana:mJd1Z1CDa2vGMWmRyK8cRGHbCzPsgDF2pUmtMBkAkMh',
              changes: [
                {
                  token:
                    'token:solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  amount: '30000',
                },
              ],
            },
          ],
        },
      );
    });
  });
});
