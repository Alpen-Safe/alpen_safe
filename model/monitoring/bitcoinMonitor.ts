import Supabase from "../supabase";
import { Transaction, Block, networks } from 'bitcoinjs-lib';
import { address as bitcoinAddress } from 'bitcoinjs-lib';
import Esplora from "../../api/esplora";

class BitcoinMonitor {
  private supabase: Supabase;
  private network: networks.Network;
  private esplora: Esplora;
  /**
   * Memory map of all addresses in the database.
   */
  private addresses: Map<string, boolean>;
  constructor({ supabase, esplora, network = networks.bitcoin }: { supabase: Supabase, esplora: Esplora, network?: networks.Network }) {
    this.supabase = supabase;
    this.addresses = new Map();
    this.network = network;
    this.esplora = esplora;
  }

  addAddressToMonitor = (address: string) => {
    this.addresses.set(address, true);
  }

  /**
   * Load all addresses from the database into the memory.
   * This is used to quick check monitored addresses in mempool and as blocks arrive.
   */
  async loadAddresses() {
    const addresses = await this.supabase.getAllAddresses();
    for (const address of addresses) {
      this.addAddressToMonitor(address.address);
    }
  }

  checkBlock = async (rawBlock: Buffer) => {
    const block = Block.fromBuffer(rawBlock);
    const blockHash = block.getId();

    console.log(`procesing block ${blockHash}`);
    const txs = block.transactions;

    if (txs === undefined) {
        return;
    }

    for (const tx of txs) {
        this.checkTransaction(tx, true);
    }
  };

  checkMempoolTransaction = async (rawTx: Buffer) => {
    const tx = Transaction.fromBuffer(rawTx);
    await this.checkTransaction(tx, false);
  }

  /**
   * Try to decode an address from a buffer.
   * it will not parse taproot addresses.
   * @param buffer - The buffer to decode.
   * @returns The decoded address or null if it is not a valid address.
   */
  tryDecodeAddress = (buffer: Buffer) => {
    try {
      return bitcoinAddress.fromOutputScript(buffer, this.network);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return null;
    }
  }

  checkTransaction = async (tx: Transaction, confirmed: boolean) => {
    // TODO: handle reorgs
    // TODO: handle rbf

    // TODO: monitor utxos in db, check if they are spent outside of the wallet software

    const id = tx.getId();
    let i = 0;
    for (const output of tx.outs) {
      // this will not decode a taproot address.
      // however, we are not interested in taproot addresses at the moment
      // when we start working with ordinals, we will need to decode taproot addresses
      const address = this.tryDecodeAddress(output.script);

      if (address === null) {
        continue;
      }

      if (this.addresses.has(address)) {
        const utxoId = `${id}:${i}`;
        console.log(`received ${utxoId} in address ${address}`);

        // index the transaction in the database
        await this.supabase.receivedUtxoInMonitoredAddress(id, address, utxoId, output.value, false, confirmed);
      }
      i++;
    }
  }

  checkEntireWallet = async (walletId: string) => {
    console.time(`checkEntireWallet-${walletId}`);

    const addresses = await this.supabase.getWalletAddresses(walletId);

    console.log(`checking entire wallet ${walletId} with ${addresses.length} addresses`);

    /**
     * Check receive and change addresses separately.
     * @param addresses - The addresses to check.
     */
    const checkAddresses = async (addresses: string[], stopAfterEmptyAddresses: number = 10) => {
      let emptyAddresses = 0;

      // we need to start counting empty addresses after the first non-empty address
      let startCountingEmptyAddresses = false;
      for (const address of addresses) {
        const utxos = await this.esplora.getAddressUtxos(address);
  
        // count empty addresses
        if (utxos.length === 0 && startCountingEmptyAddresses) {
          emptyAddresses++;

          // stop checking if too many addresses had no utxos
          if (emptyAddresses >= stopAfterEmptyAddresses) {
            console.log(`${emptyAddresses} addresses had no utxos`);
            return;
          }

          continue;
        } else {
          emptyAddresses = 0;
          startCountingEmptyAddresses = true;
        }
  
        for (const utxo of utxos) {
          const { txid, vout, value, status } = utxo;
  
          const confirmed = status.confirmed;
  
          // TODO: remove all utxos that are not returned by esplora because they must have been spent
          await this.supabase.receivedUtxoInMonitoredAddress(txid, address, `${txid}:${vout}`, value, false, confirmed);
        }
      };
    }

    const receiveAddresses = addresses.filter((a) => a.change === false).map((a) => a.address);
    const changeAddresses = addresses.filter((a) => a.change === true).map((a) => a.address);

    await checkAddresses(receiveAddresses);
    await checkAddresses(changeAddresses);

    console.timeEnd(`checkEntireWallet-${walletId}`);
  };

}

export default BitcoinMonitor;
