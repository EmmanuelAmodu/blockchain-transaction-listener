/* eslint-disable max-classes-per-file */

export interface Helius {
  apiKey: string;
  webhookSecret: string;
}

export interface QuickNode {
  btcWebhookSecret: string;
  ethWebhookSecret: string;
  polygonWebhookSecret: string;
  arbitrumWebhookSecret: string;
  optimismWebhookSecret: string;
  baseWebhookSecret: string;
  bscWebhookSecret: string;
  xrplWebhookSecret: string;
  tronWebhookSecret: string;
}

export class Secrets {
  public helius!: Helius;
  public quickNode!: QuickNode;
}
