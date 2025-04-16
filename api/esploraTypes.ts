export interface PrevOut {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number; // Value in satoshis
  }
  
export interface Vin {
    txid: string;
    vout: number;
    prevout: PrevOut;
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
    inner_redeemscript_asm?: string;
  }
  
export interface Vout {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number; // Value in satoshis
  }
  
export interface TransactionStatus {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  }
  
export interface Transaction {
    txid: string;
    version: number;
    locktime: number;
    vin: Vin[];
    vout: Vout[];
    size: number;    // Transaction size in bytes
    weight: number;
    fee: number;     // Fee in satoshis
    status: TransactionStatus;
  }

export interface FeeEstimation {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
    minimumFee: number;
  }


export interface TransactionStatusResponse {
  confirmed: boolean;
  block_height: number;
  block_hash: string;
  block_time: number;
}

export interface TxOutspend {
  spent: boolean;
  txid?: string;
  vin?: number;
  status?: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

export interface AddressUtxo {
    txid: string;
    vout: number;
    value: number;
    status: TxStatus;
};

export interface TxStatus {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
};