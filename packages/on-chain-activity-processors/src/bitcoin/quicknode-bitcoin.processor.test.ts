import { Test, TestingModule } from '@nestjs/testing';
import BigNumber from 'bignumber.js';
import { QuickNodeBitcoinWebhookDto } from './dtos';
import { QuickNodeBitcoinProcessor } from './quicknode-bitcoin.processor';

type AddressValue = { address: string; value: string };

const buildDto = ({
  senders,
  recipients,
  txid = 'a1b2c3d4e5f6789012345678901234567890abcdef',
  blockHeight = 700_000,
  blockTime = 1_633_072_800,
  confirmations = 10,
  blockHash = '0000000000000000000example',
  fees = '10000',
  value = '0',
  valueIn = '0',
}: {
  senders: AddressValue[];
  recipients: AddressValue[];
  txid?: string;
  blockHeight?: number;
  blockTime?: number;
  confirmations?: number;
  blockHash?: string;
  fees?: string;
  value?: string;
  valueIn?: string;
}): QuickNodeBitcoinWebhookDto => ({
  blockHash,
  blockHeight,
  blockTime,
  confirmations,
  fees,
  txid,
  value,
  valueIn,
  vin: senders.map((s, idx) => ({
    addresses: [s.address],
    value: s.value,
    isAddress: true,
    n: idx,
  })),
  vout: recipients.map((r, idx) => ({
    addresses: [r.address],
    value: r.value,
    isAddress: true,
    n: idx,
    spent: true,
  })),
});

describe('QuickNodeBitcoinProcessor (no handleActivity)', () => {
  let service: QuickNodeBitcoinProcessor;

  const sender = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
  const recipient = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

  const oneToOneWithChange: QuickNodeBitcoinWebhookDto = buildDto({
    senders: [{ address: sender, value: '1100000' }],
    recipients: [
      { address: recipient, value: '1000000' },
      { address: sender, value: '100000' },
    ],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QuickNodeBitcoinProcessor],
    }).compile();
    service = module.get(QuickNodeBitcoinProcessor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('processes a 1->1 tx with change', async () => {
      const acts = await service.process({
        transactions: [oneToOneWithChange],
      });
      expect(acts).toHaveLength(1);
      expect(acts[0]).toMatchObject({
        identifier:
          'transaction:bitcoin:a1b2c3d4e5f6789012345678901234567890abcdef',
        status: 'success',
      });
      expect(acts[0].transfers[0]).toMatchObject({
        amount: '1000000',
        token: 'token:bitcoin:native',
      });
    });

    it('processes multiple transactions', async () => {
      const tx2 = buildDto({
        txid: 'second-transaction-id',
        senders: [{ address: 'bc1qother-address-1', value: '2100000' }],
        recipients: [
          { address: 'bc1qother-address-2', value: '2000000' },
          { address: 'bc1qother-address-1', value: '100000' },
        ],
      });

      const acts = await service.process({
        transactions: [oneToOneWithChange, tx2],
      });
      expect(acts).toHaveLength(2);
      expect(acts[1]).toMatchObject({
        identifier: 'transaction:bitcoin:second-transaction-id',
      });
    });

    it('runs without throwing', async () => {
      await expect(
        service.process({ transactions: [oneToOneWithChange] }),
      ).resolves.not.toThrow();
    });

    it('transforms transaction metadata correctly', async () => {
      const tx = buildDto({
        senders: [{ address: sender, value: '1100000' }],
        recipients: [
          { address: recipient, value: '1000000' },
          { address: sender, value: '100000' },
        ],
        blockHeight: 750_000,
        blockTime: 1_650_000_000,
      });

      const acts = await service.process({ transactions: [tx] });
      expect(acts[0].metadata).toEqual({
        blockHeight: 750_000,
        blockTime: 1_650_000_000,
      });
    });

    it('produces a fully specified activity object (contract test)', async () => {
      const acts = await service.process({
        transactions: [oneToOneWithChange],
      });

      expect(acts).toHaveLength(1);

      const expected = {
        identifier:
          'transaction:bitcoin:a1b2c3d4e5f6789012345678901234567890abcdef',
        completedAtTimestamp: 1_633_072_800_000,
        metadata: {
          blockHeight: 700_000,
          blockTime: 1_633_072_800,
        },
        status: 'success',
        transfers: [
          {
            from: `wallet:bitcoin:${sender}`,
            to: `wallet:bitcoin:${recipient}`,
            amount: '1000000',
            token: 'token:bitcoin:native',
          },
        ],
        tokenIdentifiers: ['token:bitcoin:native'],
        fee: {
          amount: 10000,
          feePayer: [`wallet:bitcoin:${sender}`],
        },
        balanceChanges: [
          {
            wallet: `wallet:bitcoin:${sender}`,
            changes: [{ token: 'token:bitcoin:native', amount: '-1000000' }],
          },
          {
            wallet: `wallet:bitcoin:${recipient}`,
            changes: [{ token: 'token:bitcoin:native', amount: '1000000' }],
          },
          {
            wallet: `wallet:bitcoin:${sender}`,
            changes: [{ token: 'token:bitcoin:native', amount: '-10000' }],
          },
        ],
      };

      // Strict equality to catch added/removed fields or shape drift
      expect(acts[0]).toStrictEqual(expected);
    });

    it('always uses Bitcoin native token identifier', async () => {
      const acts = await service.process({
        transactions: [oneToOneWithChange],
      });
      expect(acts[0].tokenIdentifiers).toEqual(['token:bitcoin:native']);
      expect(acts[0].transfers[0].token).toBe('token:bitcoin:native');
    });

    it('sets fee payer as all input addresses and uses numeric fee', async () => {
      const tx = buildDto({
        fees: '0',
        senders: [
          { address: 'bc1qsender1', value: '600000' },
          { address: 'bc1qsender2', value: '400000' },
        ],
        recipients: [
          { address: 'bc1qreceiver', value: '900000' },
          // change back to a sender
          { address: 'bc1qsender1', value: '100000' },
        ],
      });

      const activity = (await service.process({ transactions: [tx] }))[0];
      expect(activity.fee).toEqual({
        amount: 0,
        feePayer: ['wallet:bitcoin:bc1qsender1', 'wallet:bitcoin:bc1qsender2'],
      });
      // Many->One proportional split
      expect(activity.transfers).toEqual([
        {
          from: 'wallet:bitcoin:bc1qsender1',
          to: 'wallet:bitcoin:bc1qreceiver',
          amount: '540000',
          token: 'token:bitcoin:native',
        },
        {
          from: 'wallet:bitcoin:bc1qsender2',
          to: 'wallet:bitcoin:bc1qreceiver',
          amount: '360000',
          token: 'token:bitcoin:native',
        },
      ]);
    });

    it('ignores entries where isAddress is false', async () => {
      const tx = buildDto({
        senders: [
          { address: 'bc1qsender1', value: '600000' },
          { address: 'bc1qsender2', value: '400000' },
        ],
        recipients: [
          { address: 'bc1qreceiver', value: '900000' },
          { address: 'bc1qsender1', value: '100000' },
        ],
      });

      // inject non-address entries
      (tx.vin as any).push({ isAddress: false, n: 99, value: '123' });
      (tx.vout as any).push({ isAddress: false, n: 98, value: '456' });

      const activity = (await service.process({ transactions: [tx] }))[0];
      expect(activity.transfers).toEqual([
        {
          from: 'wallet:bitcoin:bc1qsender1',
          to: 'wallet:bitcoin:bc1qreceiver',
          amount: '540000',
          token: 'token:bitcoin:native',
        },
        {
          from: 'wallet:bitcoin:bc1qsender2',
          to: 'wallet:bitcoin:bc1qreceiver',
          amount: '360000',
          token: 'token:bitcoin:native',
        },
      ]);
    });

    it('includes negative fee balance changes split equally among multiple senders', async () => {
      const tx = buildDto({
        senders: [
          { address: 'bc1qsender1', value: '600000' },
          { address: 'bc1qsender2', value: '400000' },
        ],
        recipients: [
          { address: 'bc1qreceiver', value: '900000' },
          { address: 'bc1qsender1', value: '100000' },
        ],
        // default fees = '10000'
      });

      const activity = (await service.process({ transactions: [tx] }))[0];

      expect(activity.fee.amount).toBe(10_000);
      expect(activity.fee.feePayer).toEqual([
        'wallet:bitcoin:bc1qsender1',
        'wallet:bitcoin:bc1qsender2',
      ]);

      expect(activity.balanceChanges).toEqual(
        expect.arrayContaining([
          {
            wallet: 'wallet:bitcoin:bc1qsender1',
            changes: [{ token: 'token:bitcoin:native', amount: '-5000' }],
          },
          {
            wallet: 'wallet:bitcoin:bc1qsender2',
            changes: [{ token: 'token:bitcoin:native', amount: '-5000' }],
          },
        ]),
      );
    });

    it('processes provided real BTC transaction correctly', async () => {
      const realTx: QuickNodeBitcoinWebhookDto = {
        blockHash:
          '0000000000000000000066ca37e6a630710a6b188b616cf10b8536d611c667ae',
        blockHeight: 909_696,
        blockTime: 1_755_006_030,
        confirmations: 18,
        fees: '2000',
        txid: '720ec430c80cdc2da6944d91259ded8edadd59b2441e7b7212dbf984a173a0cd',
        value: '8523438',
        valueIn: '8525438',
        vin: [
          {
            addresses: ['bc1qujepl0k5n0ga2e86yskvxa6auehpf6dlf84dx0'],
            isAddress: true,
            n: 0,
            value: '8525438',
          },
        ],
        vout: [
          {
            addresses: ['bc1qh585gtmfal6a2wnstextcd5qralhr6v78pv6zs'],
            isAddress: true,
            n: 0,
            spent: true,
            value: '19212',
          },
          {
            addresses: ['bc1qujepl0k5n0ga2e86yskvxa6auehpf6dlf84dx0'],
            isAddress: true,
            n: 1,
            value: '8504226',
          },
        ],
      };

      const acts = await service.process({ transactions: [realTx] });
      expect(acts[0]).toMatchObject({
        identifier:
          'transaction:bitcoin:720ec430c80cdc2da6944d91259ded8edadd59b2441e7b7212dbf984a173a0cd',
        status: 'success',
      });
    });
  });

  describe('getTransferBalanceChanges (private)', () => {
    it('should create balance changes for both sender and receiver wallets', () => {
      const transfer = {
        from: 'bc1qsenderWallet',
        to: 'bc1qreceiverWallet',
        amount: '1000000',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      expect(balanceChanges).toHaveLength(2);
      const wallets = balanceChanges.map((c: any) => c.wallet);
      expect(wallets).toContain('wallet:bitcoin:bc1qsenderWallet');
      expect(wallets).toContain('wallet:bitcoin:bc1qreceiverWallet');
    });
    it('should create balance changes for both sender and receiver', () => {
      const transfer = {
        from: 'bc1qsender123',
        to: 'bc1qrecipient456',
        amount: '5000000',
        token: 'token:bitcoin:native',
      } as any;

      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );

      expect(balanceChanges).toEqual([
        {
          wallet: 'wallet:bitcoin:bc1qsender123',
          changes: [{ token: 'token:bitcoin:native', amount: '-5000000' }],
        },
        {
          wallet: 'wallet:bitcoin:bc1qrecipient456',
          changes: [{ token: 'token:bitcoin:native', amount: '5000000' }],
        },
      ]);
    });

    it('should preserve precision for very small amounts', () => {
      const transfer = {
        from: 'bc1qsender123',
        to: 'bc1qrecipient456',
        amount: '1',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      expect(balanceChanges[0].changes[0].amount).toBe('-1');
      expect(balanceChanges[1].changes[0].amount).toBe('1');
    });

    it('should handle large amounts correctly for both wallets', () => {
      const transfer = {
        from: 'bc1qsender123',
        to: 'bc1qrecipient456',
        amount: '2100000000000000',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      const senderChange = balanceChanges.find(
        (bc) => bc.wallet === 'wallet:bitcoin:bc1qsender123',
      );
      const receiverChange = balanceChanges.find(
        (bc) => bc.wallet === 'wallet:bitcoin:bc1qrecipient456',
      );
      expect(senderChange.changes[0].amount).toBe('-2100000000000000');
      expect(receiverChange.changes[0].amount).toBe('2100000000000000');
    });

    it('should handle zero amounts for both wallets', () => {
      const transfer = {
        from: 'bc1qsender123',
        to: 'bc1qrecipient456',
        amount: '0',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      const senderChange = balanceChanges.find(
        (bc) => bc.wallet === 'wallet:bitcoin:bc1qsender123',
      );
      const receiverChange = balanceChanges.find(
        (bc) => bc.wallet === 'wallet:bitcoin:bc1qrecipient456',
      );
      expect(senderChange.changes[0].amount).toBe('0');
      expect(receiverChange.changes[0].amount).toBe('0');
    });

    it('should always use Bitcoin native token for both wallets', () => {
      const transfer = {
        from: 'bc1qsender123',
        to: 'bc1qrecipient456',
        amount: '1500000',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      balanceChanges.forEach((change) => {
        expect(change.changes[0].token).toBe('token:bitcoin:native');
      });
    });

    it('should handle self-transfer by collapsing to single positive entry', () => {
      const transfer = {
        from: 'bc1qsameaddress123',
        to: 'bc1qsameaddress123',
        amount: '5000000',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      expect(balanceChanges).toHaveLength(1);
      expect(balanceChanges[0]).toEqual({
        wallet: 'wallet:bitcoin:bc1qsameaddress123',
        changes: [{ token: 'token:bitcoin:native', amount: '5000000' }],
      });
    });

    it('should handle legacy and bech32 address formats', () => {
      const transfer = {
        from: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        to: 'bc1qrecipient456',
        amount: '10000000',
        token: 'token:bitcoin:native',
      } as any;
      const balanceChanges = (service as any).getTransferBalanceChanges(
        transfer,
      );
      expect(balanceChanges).toEqual([
        {
          wallet: 'wallet:bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          changes: [{ token: 'token:bitcoin:native', amount: '-10000000' }],
        },
        {
          wallet: 'wallet:bitcoin:bc1qrecipient456',
          changes: [{ token: 'token:bitcoin:native', amount: '10000000' }],
        },
      ]);
    });
  });

  describe('getFeeBalanceChanges (private)', () => {
    it('should apply full fee as negative change to the single sender', () => {
      const feeChanges = (service as any).getFeeBalanceChanges({
        senderData: {
          senderAmounts: [{ address: 'bc1qsender', value: new BigNumber(0) }],
          sendersCount: 1,
        },
        feeAmount: '10000',
      });

      expect(feeChanges).toEqual([
        {
          wallet: 'wallet:bitcoin:bc1qsender',
          changes: [{ token: 'token:bitcoin:native', amount: '-10000' }],
        },
      ]);
    });

    it('should split fee equally across multiple senders (even split)', () => {
      const feeChanges = (service as any).getFeeBalanceChanges({
        senderData: {
          senderAmounts: [
            { address: 'bc1qsender1', value: new BigNumber(0) },
            { address: 'bc1qsender2', value: new BigNumber(0) },
          ],
          sendersCount: 2,
        },
        feeAmount: '10000',
      });

      expect(feeChanges).toEqual(
        expect.arrayContaining([
          {
            wallet: 'wallet:bitcoin:bc1qsender1',
            changes: [{ token: 'token:bitcoin:native', amount: '-5000' }],
          },
          {
            wallet: 'wallet:bitcoin:bc1qsender2',
            changes: [{ token: 'token:bitcoin:native', amount: '-5000' }],
          },
        ]),
      );
      expect(feeChanges).toHaveLength(2);
    });

    it('should split fee using float division when not evenly divisible', () => {
      const feeChanges = (service as any).getFeeBalanceChanges({
        senderData: {
          senderAmounts: [
            { address: 's1', value: new BigNumber(0) },
            { address: 's2', value: new BigNumber(0) },
            { address: 's3', value: new BigNumber(0) },
          ],
          sendersCount: 3,
        },
        feeAmount: '10000',
      });

      const expectedShare = new BigNumber('10000').div(3).negated().toString();
      expect(feeChanges).toHaveLength(3);
      feeChanges.forEach((c: any) => {
        expect(c.changes[0].amount).toBe(expectedShare);
      });
    });
  });
});
