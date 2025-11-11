/* eslint-disable max-classes-per-file */
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  Source,
  TokenStandard,
  TransactionContext,
  TransactionType,
} from 'helius-sdk';

export class RawTokenAmount {
  @IsString()
  @IsNotEmpty()
  public tokenAmount!: string;

  @IsNumber()
  public decimals!: number;
}

export class TokenBalanceChange {
  @IsString()
  @IsNotEmpty()
  public userAccount!: string;

  @IsString()
  @IsNotEmpty()
  public tokenAccount!: string;

  @ValidateNested()
  @Type(() => RawTokenAmount)
  public rawTokenAmount!: RawTokenAmount;

  @IsString()
  @IsNotEmpty()
  public mint!: string;
}

export class AccountData {
  @IsString()
  @IsNotEmpty()
  public account!: string;

  @IsNumber()
  public nativeBalanceChange!: number;

  @ValidateIf((o) => o.tokenBalanceChanges !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceChange)
  public tokenBalanceChanges!: TokenBalanceChange[] | null;
}

export class TokenTransfer {
  @ValidateIf((o) => o.fromUserAccount !== null)
  @IsString()
  public fromUserAccount!: string | null;

  @ValidateIf((o) => o.toUserAccount !== null)
  @IsString()
  public toUserAccount!: string | null;

  @ValidateIf((o) => o.fromTokenAccount !== null)
  @IsString()
  public fromTokenAccount!: string | null;

  @ValidateIf((o) => o.toTokenAccount !== null)
  @IsString()
  public toTokenAccount!: string | null;

  @IsNumber()
  public tokenAmount!: number;

  @IsEnum(TokenStandard)
  public tokenStandard!: TokenStandard;

  @IsString()
  @IsNotEmpty()
  public mint!: string;
}

export class NativeTransfer {
  @ValidateIf((o) => o.fromUserAccount !== null)
  @IsString()
  public fromUserAccount!: string | null;

  @ValidateIf((o) => o.toUserAccount !== null)
  @IsString()
  public toUserAccount!: string | null;

  @IsNumber()
  public amount!: number;
}

export class InnerInstruction {
  @IsArray()
  @IsString({ each: true })
  public accounts!: string[];

  @IsString()
  public data!: string;

  @IsString()
  @IsNotEmpty()
  public programId!: string;
}

export class Instruction {
  @IsArray()
  @IsString({ each: true })
  public accounts!: string[];

  @IsString()
  public data!: string;

  @IsString()
  @IsNotEmpty()
  public programId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InnerInstruction)
  public innerInstructions!: InnerInstruction[];
}

export class ProgramInfo {
  @IsString()
  public source!: Source;

  @IsString()
  @IsNotEmpty()
  public account!: string;

  @IsString()
  public programName!: string;

  @IsString()
  public instructionName!: string;
}

export class NativeBalanceChange {
  @IsString()
  @IsNotEmpty()
  public account!: string;

  @IsString()
  public amount!: string;
}

export class TokenSwap {
  @ValidateIf((o) => o.nativeInput !== null)
  @ValidateNested()
  @Type(() => NativeTransfer)
  public nativeInput!: NativeTransfer | null;

  @ValidateIf((o) => o.nativeOutput !== null)
  @ValidateNested()
  @Type(() => NativeTransfer)
  public nativeOutput!: NativeTransfer | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenTransfer)
  public tokenInputs!: TokenTransfer[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenTransfer)
  public tokenOutputs!: TokenTransfer[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenTransfer)
  public tokenFees!: TokenTransfer[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NativeTransfer)
  public nativeFees!: NativeTransfer[];

  @ValidateNested()
  @Type(() => ProgramInfo)
  public programInfo!: ProgramInfo;
}

export class SwapEvent {
  @ValidateIf((o) => o.nativeInput !== null)
  @ValidateNested()
  @Type(() => NativeBalanceChange)
  public nativeInput!: NativeBalanceChange | null;

  @ValidateIf((o) => o.nativeOutput !== null)
  @ValidateNested()
  @Type(() => NativeBalanceChange)
  public nativeOutput!: NativeBalanceChange | null;

  @ValidateIf((o) => o.tokenInputs !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceChange)
  public tokenInputs!: TokenBalanceChange[] | null;

  @ValidateIf((o) => o.tokenOutputs !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceChange)
  public tokenOutputs!: TokenBalanceChange[] | null;

  @ValidateIf((o) => o.tokenFees !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenBalanceChange)
  public tokenFees!: TokenBalanceChange[] | null;

  @ValidateIf((o) => o.nativeFees !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NativeBalanceChange)
  public nativeFees!: NativeBalanceChange[] | null;

  @ValidateIf((o) => o.innerSwaps !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenSwap)
  public innerSwaps!: TokenSwap[] | null;
}

export class CompressedNftCreator {
  @IsString()
  @IsNotEmpty()
  public address!: string;

  @IsNumber()
  public share!: number;

  @IsBoolean()
  public verified!: boolean;
}

export class CompressedNftCollection {
  @IsString()
  @IsNotEmpty()
  public key!: string;

  @IsBoolean()
  public verified!: boolean;
}

export class CompressedNftMetadata {
  @IsObject()
  @ValidateNested()
  @Type(() => CompressedNftCollection)
  public collection!: CompressedNftCollection;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompressedNftCreator)
  public creators!: CompressedNftCreator[];

  @IsBoolean()
  public isMutable!: boolean;

  @IsString()
  @IsNotEmpty()
  public name!: string;

  @IsBoolean()
  public primarySaleHappened!: boolean;

  @IsNumber()
  public sellerFeeBasisPoints!: number;

  @IsString()
  public symbol!: string;

  @IsString()
  public tokenProgramVersion!: string;

  @IsEnum(TokenStandard)
  public tokenStandard!: TokenStandard;

  @IsString()
  @IsNotEmpty()
  public uri!: string;
}

export class CompressedNftEvent {
  @IsEnum(TransactionType)
  public type!: TransactionType;

  @IsString()
  @IsNotEmpty()
  public treeId!: string;

  @ValidateIf((o) => o.leafIndex !== null)
  @IsNumber()
  public leafIndex!: number | null;

  @ValidateIf((o) => o.seq !== null)
  @IsNumber()
  public seq!: number | null;

  @ValidateIf((o) => o.assetId !== null)
  @IsString()
  public assetId!: string | null;

  @ValidateIf((o) => o.instructionIndex !== null)
  @IsNumber()
  public instructionIndex!: number | null;

  @ValidateIf((o) => o.innerInstructionIndex !== null)
  @IsNumber()
  public innerInstructionIndex!: number | null;

  @ValidateIf((o) => o.newLeafOwner !== null)
  @IsString()
  public newLeafOwner!: string | null;

  @ValidateIf((o) => o.oldLeafOwner !== null)
  @IsString()
  public oldLeafOwner!: string | null;

  @ValidateIf((o) => o.newLeafDelegate !== null)
  @IsString()
  public newLeafDelegate!: string | null;

  @ValidateIf((o) => o.oldLeafDelegate !== null)
  @IsString()
  public oldLeafDelegate!: string | null;

  @ValidateIf((o) => o.treeDelegate !== null)
  @IsString()
  public treeDelegate!: string | null;

  @ValidateIf((o) => o.metadata !== null)
  @ValidateNested()
  @Type(() => CompressedNftMetadata)
  public metadata!: CompressedNftMetadata | null;
}

export class Token {
  @IsString()
  @IsNotEmpty()
  public mint!: string;

  @IsEnum(TokenStandard)
  public tokenStandard!: TokenStandard;
}

export class NFTEvent {
  @IsString()
  @IsNotEmpty()
  public seller!: string;

  @IsString()
  @IsNotEmpty()
  public buyer!: string;

  @IsNumber()
  public timestamp!: number;

  @IsNumber()
  public amount!: number;

  @IsNumber()
  public fee!: number;

  @IsString()
  @IsNotEmpty()
  public signature!: string;

  @IsEnum(Source)
  public source!: Source;

  @IsEnum(TransactionType)
  public type!: TransactionType;

  @IsOptional()
  @IsEnum(TransactionContext)
  public saleType?: TransactionContext;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Token)
  public nfts!: Token[];
}

export class TransactionEvent {
  @IsOptional()
  @ValidateIf((o) => o.nft !== null)
  @ValidateNested()
  @Type(() => NFTEvent)
  public nft?: NFTEvent | null;

  @IsOptional()
  @ValidateIf((o) => o.swap !== null)
  @ValidateNested()
  @Type(() => SwapEvent)
  public swap?: SwapEvent | null;

  @IsOptional()
  @ValidateIf((o) => o.compressed !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompressedNftEvent)
  public compressed?: CompressedNftEvent[] | null;
}

export class EnrichedTransactionDto {
  @IsString()
  public description!: string;

  @IsEnum(TransactionType)
  public type!: TransactionType;

  @IsString()
  public source!: Source;

  @IsNumber()
  public fee!: number;

  @IsString()
  @IsNotEmpty()
  public feePayer!: string;

  @IsString()
  @IsNotEmpty()
  public signature!: string;

  @IsNumber()
  public slot!: number;

  @IsNumber()
  public timestamp!: number;

  @ValidateIf((o) => o.nativeTransfers !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NativeTransfer)
  public nativeTransfers!: NativeTransfer[] | null;

  @ValidateIf((o) => o.tokenTransfers !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenTransfer)
  public tokenTransfers!: TokenTransfer[] | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountData)
  public accountData!: AccountData[];

  @ValidateIf((o) => o.transactionError !== null)
  @IsObject()
  public transactionError!: object | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Instruction)
  public instructions!: Instruction[];

  @ValidateNested()
  @Type(() => TransactionEvent)
  public events!: TransactionEvent;
}
