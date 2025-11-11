import {
  NETWORK,
  QuickNodeEvmProcessor,
} from '@onionfi-internal/on-chain-activity-processors';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnChainActivityService } from '../on-chain-activity.service';
import { verifySignature } from '../utils/utils';
import { QuickNodeEvmController } from './quicknode-evm.controller';

// Mock verifySignature from utils
jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  verifySignature: jest.fn(),
}));

describe('QuickNodeEvmController', () => {
  const secret = 'test-secret';
  let controller: QuickNodeEvmController;
  let processor: jest.Mocked<QuickNodeEvmProcessor>;
  let config: jest.Mocked<ConfigService>;
  let onChainActivityService: jest.Mocked<OnChainActivityService>;

  beforeEach(() => {
    jest.resetAllMocks();
    processor = {
      process: jest.fn().mockResolvedValue(undefined),
    } as any;

    config = {
      getOrThrow: jest.fn().mockReturnValue(secret),
    } as any;

    onChainActivityService = {
      handleActivityBatch: jest.fn().mockResolvedValue(undefined),
    } as any;

    controller = new QuickNodeEvmController(
      onChainActivityService,
      processor,
      config,
    );
  });

  it('should throw BadRequest when required headers are missing', async () => {
    await expect(
      controller.processEth([], { headers: {} } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should throw Unauthorized when signature is invalid', async () => {
    (verifySignature as jest.Mock).mockReturnValue(false);
    const headers = {
      'x-qn-nonce': 'n',
      'x-qn-timestamp': 't',
      'x-qn-signature': 'sig',
    } as any;

    await expect(
      controller.processEth([], { headers } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should call processor and return success when signature is valid', async () => {
    (verifySignature as jest.Mock).mockReturnValue(true);
    const headers = {
      'x-qn-nonce': 'n',
      'x-qn-timestamp': 't',
      'x-qn-signature': 'sig',
    } as any;
    const body: any[] = [];

    const res = await controller.processEth(body as any, { headers } as any);

    expect(verifySignature).toHaveBeenCalled();
    expect(processor.process).toHaveBeenCalledWith({
      transactions: body,
      network: NETWORK.ETHEREUM,
    });
    expect(res).toBe('Webhook received and verified');
  });
});
