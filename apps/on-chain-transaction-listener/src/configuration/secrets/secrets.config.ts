import { Secrets } from './secrets.interface';

export default async (): Promise<Secrets> => {
  // Load secrets from environment variables instead of GCP Secret Manager
  const secrets = new Secrets();
  
  secrets.helius = {
    apiKey: process.env.HELIUS_API_KEY || '',
    webhookSecret: process.env.HELIUS_WEBHOOK_SECRET || '',
  };

  secrets.quickNode = {
    btcWebhookSecret: process.env.QUICKNODE_BTC_WEBHOOK_SECRET || '',
    ethWebhookSecret: process.env.QUICKNODE_ETH_WEBHOOK_SECRET || '',
    polygonWebhookSecret: process.env.QUICKNODE_POLYGON_WEBHOOK_SECRET || '',
    arbitrumWebhookSecret: process.env.QUICKNODE_ARBITRUM_WEBHOOK_SECRET || '',
    optimismWebhookSecret: process.env.QUICKNODE_OPTIMISM_WEBHOOK_SECRET || '',
    baseWebhookSecret: process.env.QUICKNODE_BASE_WEBHOOK_SECRET || '',
    bscWebhookSecret: process.env.QUICKNODE_BSC_WEBHOOK_SECRET || '',
    xrplWebhookSecret: process.env.QUICKNODE_XRPL_WEBHOOK_SECRET || '',
    tronWebhookSecret: process.env.QUICKNODE_TRON_WEBHOOK_SECRET || '',
  };

  return secrets;
};
