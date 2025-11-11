import { ConfigService } from '@nestjs/config';

export class ConfigUtil {
  private static configService: ConfigService;

  public static setConfigService(configService: ConfigService) {
    this.configService = configService;
  }

  public static getConfigService(): ConfigService {
    if (!this.configService) {
      throw new Error('ConfigService is not initialized!');
    }
    return this.configService;
  }
}
