import * as bitcoinjs from 'bitcoinjs-lib';
import { randomBytes } from 'crypto';

export const getBitcoinLibNetwork = (network: string) => {
    if (['testnet', 'signet'].includes(network)) {
      return bitcoinjs.networks.testnet;
    }
    return bitcoinjs.networks.bitcoin;
  };

/**
 * Generates a transaction ID in the format `tx-{short-id}`
 * @param length The length of the short ID (default: 8)
 * @returns A string in the format `tx-{short-id}`
 */
export const generateInternalTransactionId = (length: number = 8): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  const randomValues = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % characters.length;
    result += characters.charAt(randomIndex);
  }
  
  return `tx-${result}`;
};

