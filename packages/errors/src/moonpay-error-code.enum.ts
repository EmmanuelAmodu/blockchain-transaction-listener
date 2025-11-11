export enum CommonErrorCode {
  // General non service or team specific errors - namespace 1XXXX
  UNKNOWN_ERROR = '1_SYS_UNKNOWN',
  INIT_LOAD_CONFIG_NOT_FOUND = '1_SYS_INIT_CONF',

  // Generic validation and bad request errors - namespace 4XXXX
  BAD_REQUEST = '4_SYS_BAD_REQUEST',
  UNPROCESSABLE_ENTITY = '4_SYS_UNPROCESSABLE_ENTITY',
  NOT_FOUND = '4_SYS_NOT_FOUND',
  FORBIDDEN = '4_SYS_FORBIDDEN',
}

export enum CodeSpace {
  BL_API = 'BL',
  WALLETS_API = 'WL',
  TOKENS_API = 'TOKENS',
  SWAP_API = 'SW',
}
export type ServiceErrorCode<T extends CodeSpace> = `5_${T}_${string}`;

export type onionfiErrorCode = ServiceErrorCode<CodeSpace> | CommonErrorCode;
