export type Chain = "bitcoin" | "ethereum";

export type UserPublicKey = {
  xpub: string;
  path: string;
  device: string;
};
