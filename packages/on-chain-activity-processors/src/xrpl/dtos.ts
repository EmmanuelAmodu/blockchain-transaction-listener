// eslint-disable-next-line max-classes-per-file
import { IsOptional, IsString } from 'class-validator';

export class QuickNodeXrplTransactionDto {
  @IsString()
  public timestamp!: string;

  @IsString()
  public Account!: string;

  @IsString()
  public Destination!: string;

  @IsString()
  public Fee!: string;

  @IsString()
  public hash!: string;

  @IsString()
  public TransactionType!: 'Payment' | 'TrustSet' | 'AccountSet';

  @IsOptional()
  public Amount!:
    | string
    | {
        currency: string;
        issuer: string;
        value: string;
      };

  @IsOptional()
  public DeliverMax!:
    | string
    | {
        currency: string;
        issuer: string;
        value: string;
      };
}
