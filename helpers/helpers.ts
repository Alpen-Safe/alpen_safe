import * as bitcoinjs from 'bitcoinjs-lib';

export const getBitcoinLibNetwork = (network: string) => {
    if (['testnet', 'signet'].includes(network)) {
      return bitcoinjs.networks.testnet;
    }
    return bitcoinjs.networks.bitcoin;
  };

