export type Chain = "bitcoin" | "ethereum";

export type UserPublicKey = {
  xpub: string;
  path: string;
  device: string;
  masterFingerprint?: string;
  label?: string;
};


export type Receiver = {
  address: string;
  value: number;
  label?: string;
};

export interface PartialSignature {
  inputIndex: number;
  pubkey: string;
  signature: string;
  tapleafHash?: string;
}