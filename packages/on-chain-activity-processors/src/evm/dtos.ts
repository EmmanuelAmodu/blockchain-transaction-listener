/* eslint-disable max-classes-per-file */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const HEX_RE = /^0x[0-9a-fA-F]*$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export class HexString {
  @IsString()
  @Matches(HEX_RE)
  public value!: string;
}

export class AddressHex {
  @IsString()
  @Matches(ADDRESS_RE)
  public value!: string;
}

export class AccessListEntryDTO {
  @IsString()
  @Matches(ADDRESS_RE)
  public address!: string;

  @IsArray()
  @IsString({ each: true })
  @Matches(HEX_RE, { each: true })
  public storageKeys!: string[];
}

export class EvmLogDTO {
  @IsString()
  @Matches(ADDRESS_RE)
  public address!: string;

  @IsString()
  @Matches(HEX_RE)
  public blockHash!: string;

  @IsString()
  @Matches(HEX_RE)
  public blockNumber!: string;

  @IsString()
  @Matches(HEX_RE)
  public data!: string;

  @IsString()
  @Matches(HEX_RE)
  public logIndex!: string;

  @IsBoolean()
  public removed!: boolean;

  @IsArray()
  @IsString({ each: true })
  @Matches(HEX_RE, { each: true })
  public topics!: string[];

  @IsString()
  @Matches(HEX_RE)
  public transactionHash!: string;

  @IsString()
  @Matches(HEX_RE)
  public transactionIndex!: string;
}

export class TraceActionDTO {
  @IsOptional()
  @IsString()
  public callType?:
    | 'call'
    | 'delegatecall'
    | 'staticcall'
    | 'create'
    | 'suicide';

  @IsOptional()
  @IsString()
  @Matches(ADDRESS_RE)
  public from?: string;

  @IsOptional()
  @IsString()
  @Matches(ADDRESS_RE)
  public to?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public gas?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public input?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public value?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public init?: string;
}

export class TraceResultDTO {
  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public gasUsed?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public output?: string;

  @IsOptional()
  @IsString()
  @Matches(ADDRESS_RE)
  public address?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public code?: string;
}

export class EvmTraceDTO {
  @IsOptional()
  @ValidateNested()
  @Type(() => TraceActionDTO)
  public action?: TraceActionDTO;

  @IsString()
  @Matches(HEX_RE)
  public blockHash!: string;

  @IsInt()
  public blockNumber!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TraceResultDTO)
  public result?: TraceResultDTO;

  @IsInt()
  public subtraces!: number;

  @IsArray()
  @IsInt({ each: true })
  public traceAddress!: number[];

  @IsString()
  @Matches(HEX_RE)
  public transactionHash!: string;

  @IsInt()
  public transactionPosition!: number;

  @IsString()
  public type!: 'call' | 'create' | 'suicide' | 'reward' | 'precompile';

  @IsOptional()
  @IsString()
  @Matches(ADDRESS_RE)
  public from!: string;

  @IsOptional()
  @IsString()
  @Matches(ADDRESS_RE)
  public to!: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public value!: string;

  @IsOptional()
  @IsString()
  public error?: string;
}

export class TxWithLogsAndTracesDTO {
  @IsString()
  @Matches(HEX_RE)
  public hash!: string;

  @IsString()
  @Matches(ADDRESS_RE)
  public from!: string;

  @IsOptional()
  @ValidateIf(
    (o: TxWithLogsAndTracesDTO) => o.to !== null && o.to !== undefined,
  )
  @IsString()
  @Matches(ADDRESS_RE)
  public to!: string;

  @IsString()
  @Matches(HEX_RE)
  public blockHash!: string;

  @IsString()
  @Matches(HEX_RE)
  public blockNumber!: string;

  @IsString()
  @Matches(HEX_RE)
  public transactionIndex!: string;

  @IsString()
  @Matches(HEX_RE)
  public nonce!: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public blockTimestamp?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public gasUsed?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public effectiveGasPrice?: string;

  @IsString()
  @Matches(HEX_RE)
  public gas!: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public gasPrice?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public maxFeePerGas?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public maxPriorityFeePerGas?: string;

  @IsString()
  @Matches(HEX_RE)
  public value!: string;

  @IsString()
  @Matches(HEX_RE)
  public input!: string;

  @IsString()
  @Matches(HEX_RE)
  public type!: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public chainId?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public v?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public r?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public s?: string;

  @IsOptional()
  @IsString()
  @Matches(HEX_RE)
  public yParity?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccessListEntryDTO)
  public accessList?: AccessListEntryDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvmLogDTO)
  public logs!: EvmLogDTO[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvmTraceDTO)
  public traces!: EvmTraceDTO[];
}
