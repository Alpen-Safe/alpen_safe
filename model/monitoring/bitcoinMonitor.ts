import Supabase from "../supabase";
import { Transaction, Block, networks } from 'bitcoinjs-lib';
import { address as bitcoinAddress } from 'bitcoinjs-lib';


class BitcoinMonitor {
  private supabase: Supabase;
  private network: networks.Network;
  /**
   * Memory map of all addresses in the database.
   */
  private addresses: Map<string, boolean>;
  constructor({ supabase, network = networks.bitcoin }: { supabase: Supabase, network?: networks.Network }) {
    this.supabase = supabase;
    this.addresses = new Map();
    this.network = network;
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
        await this.supabase.receivedUtxoInMonitoredAddress(address, utxoId, output.value, false, confirmed);
      }
      i++;
    }
  }

}

export default BitcoinMonitor;
