/* eslint-disable max-classes-per-file */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class BitcoinTransactionInputDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public addresses?: string[];

  @IsOptional()
  @IsString()
  public value?: string;

  @IsBoolean()
  public isAddress?: boolean;

  @IsNumber()
  public n?: number;
}

export class BitcoinTransactionOutputDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  public addresses?: string[];

  @IsOptional()
  @IsString()
  public value?: string;

  @IsBoolean()
  public isAddress?: boolean;

  @IsNumber()
  public n?: number;

  @IsOptional()
  @IsBoolean()
  public spent?: boolean;
}

export class QuickNodeBitcoinWebhookDto {
  @IsString()
  public blockHash!: string;

  @IsNumber()
  public blockHeight!: number;

  @IsNumber()
  public blockTime!: number;

  @IsNumber()
  public confirmations!: number;

  @IsString()
  public fees!: string;

  @IsString()
  public txid!: string;

  @IsString()
  public value!: string;

  @IsString()
  public valueIn!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BitcoinTransactionInputDto)
  public vin?: BitcoinTransactionInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BitcoinTransactionOutputDto)
  public vout?: BitcoinTransactionOutputDto[];
}
