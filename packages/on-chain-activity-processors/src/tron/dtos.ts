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

export class TronDecodedLog {
  @IsString()
  public address!: string;

  @IsString()
  public blockHash!: string;

  @IsString()
  public blockNumber!: string;

  @IsString()
  public from!: string;

  @IsString()
  public logIndex!: string;

  @IsString()
  public name!: string;

  @IsString()
  public to!: string;

  @IsString()
  public transactionHash!: string;

  @IsString()
  public value!: string;
}

export class TronLog {
  @IsString()
  public address!: string;

  @IsString()
  public blockHash!: string;

  @IsString()
  public blockNumber!: string;

  @IsString()
  public data!: string;

  @IsString()
  public logIndex!: string;

  @IsBoolean()
  public removed!: boolean;

  @IsArray()
  @IsString({ each: true })
  public topics!: string[];

  @IsString()
  public transactionHash!: string;

  @IsString()
  public transactionIndex!: string;
}

export class QuickNodeTronDto {
  @IsString()
  public blockHash!: string;

  @IsString()
  public blockNumber!: string;

  @IsOptional()
  @IsString()
  public contractAddress?: string | null;

  @IsString()
  public cumulativeGasUsed!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TronDecodedLog)
  public decodedLogs?: TronDecodedLog[];

  @IsString()
  public effectiveGasPrice!: string;

  @IsString()
  public from!: string;

  @IsString()
  public gasUsed!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TronLog)
  public logs?: TronLog[];

  @IsString()
  public logsBloom!: string;

  @IsString()
  public nonce!: string;

  @IsString()
  public status!: string;

  @IsString()
  public to!: string;

  @IsString()
  public transactionHash!: string;

  @IsString()
  public transactionIndex!: string;

  @IsString()
  public type!: string;

  @IsNumber()
  public timestamp!: number;

  @IsString()
  public value!: string;
}
