export type Chain = "bitcoin" | "ethereum";

export type UserPublicKey = {
  xpub: string;
  path: string;
  device: string;
};


export type Receiver = {
  address: string;
  value: number;
  label?: string;
};