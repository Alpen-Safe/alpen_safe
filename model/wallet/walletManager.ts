import BitcoinWallet from "./bitcoin/bitcoinWalletModel";
import Supabase from "../supabase";
import { Chain, UserPublicKey, Receiver } from "../types";
import BitcoinMonitor from "../monitoring/bitcoinMonitor";
import { objectToCamel } from "ts-case-convert";
import { UTXO } from "./bitcoin/bitcoinWalletModel";
import { calculateTxFees } from "../../helpers/feeEstimator";

// we fix 1 server signer for now
// Should apply in all cases
const SERVER_SIGNERS = 1;

/**
 * A class to manage wallet and database operations.
 * Use this class to interact with the wallet to create new wallets, send funds, etc.
 */
class WalletManager {
  supabase: Supabase;
  bitcoinWallet: BitcoinWallet;
  chain: Chain;
  bitcoinMonitor: BitcoinMonitor;

  constructor(
    { bitcoinWallet, supabase, bitcoinMonitor }: {
      bitcoinWallet: BitcoinWallet;
      supabase: Supabase;
      bitcoinMonitor: BitcoinMonitor;
    },
  ) {
    this.bitcoinWallet = bitcoinWallet;
    this.supabase = supabase;
    this.bitcoinMonitor = bitcoinMonitor;
    this.chain = "bitcoin";
  }

  async signTransactionWithServer(
    walletId: string,
    psbtBase64: string,
  ) {
    const walletData = await this.supabase.getWalletData(walletId);

    const signedTx = this.bitcoinWallet.signTransactionWithServer(
      psbtBase64,
      walletData.account_id,
    );

    return signedTx;
  }

  async deriveAddresses(walletId: string, count: number, change: boolean) {
    const walletData = await this.supabase.getWalletData(walletId);
    const lastIndex = await this.supabase.getLastAddressIndex(walletId, change);
    const startIndex = lastIndex ? lastIndex + 1 : 0;

    console.log(`deriving ${count} ${change ? "change" : "receive"} addresses starting from index ${startIndex}...`);
    
    const derivedAddresses = this.bitcoinWallet.deriveAddresses(
      walletData.account_id,
      walletData.m,
      walletData.user_xpubs,
      startIndex,
      count,
      change,
    );

    const addresses = derivedAddresses.map(x => ({
      address: x.address,
      addressIndex: x.addressIndex,
      change,
    }));

    await this.supabase.saveAddresses(walletId, addresses);

    // Add addresses to monitor
    for (const address of addresses) {
      this.bitcoinMonitor.addAddressToMonitor(address.address);
    }

    return addresses;
  }

  async handoutAddresses(walletId: string, isChange: boolean, amount: number) {
    // we always derive addresses first, saving them in the database
    // we always keep more addresses than needed in the database
    await this.deriveAddresses(walletId, amount, isChange);

    // the handoud function ensures that the addresses are handed out in the correct order
    const addresses = await this.supabase.handoutAddresses(walletId, isChange, amount);

    const camelAddresses = addresses.map((x) => objectToCamel(x));

    return camelAddresses;
  }

  async createMOfNWallet(
    userId: string,
    walletName: string,
    m: number,
    n: number,
    userXPubs: UserPublicKey[],
  ) {
    if (userXPubs.length !== n - 1) {
      throw new Error(`expected ${n - 1} keys, got ${userXPubs.length}`);
    }

    console.log(`creating ${m} of ${n} wallet for user ${userId}...`);

    const reservedServerSigner = await this.supabase.reserveServerSigner();
    const { account_id } = reservedServerSigner;

    const xpubs = userXPubs.map((xpub) => xpub.xpub);
    const { walletDescriptor, serverDerivationPath, serverXpub } = this
      .bitcoinWallet
      .createWalletDescriptor(
        account_id,
        m,
        xpubs,
      );

    const walletId = await this.supabase.createWallet({
      userId,
      walletName,
      m,
      n,
      chain: this.chain,
      walletDescriptor,
      serverSigners: SERVER_SIGNERS,
      serverSignerId: account_id,
      serverSignerDerivationPath: serverDerivationPath,
      serverXpub,
      userPublicKeys: userXPubs,
    });

    console.log(
      `created ${m} of ${n} wallet with id ${walletId} for user ${userId}`,
    );

    await this.deriveAddresses(
      walletId,
      10,
      false,
    );

    // derive change addresses as well
    await this.deriveAddresses(
      walletId,
      10,
      true,
    );

    const firstAddressReceive = await this.supabase.handoutAddresses(walletId, false, 1);

    return {
      walletId,
      walletDescriptor,
      firstAddressReceive: firstAddressReceive[0].address,
    };
  }

  createTwoOfThreeWallet(
    userId: string,
    walletName: string,
    xpubs: UserPublicKey[],
  ) {
    return this.createMOfNWallet(userId, walletName, 2, 3, xpubs);
  }

  async buildWalletSpendPsbt(walletId: string, receivers: Receiver[], feePerByte: number) {
    const utxos = await this.supabase.getWalletUtxos(walletId);
    const walletData = await this.supabase.getWalletData(walletId);

    const toSendValue = receivers.reduce((acc, receiver) => acc + receiver.amount, 0);

    const utxosSum = utxos.reduce((acc, utxo) => acc + utxo.value, 0);

    if (utxosSum < toSendValue) {
      throw new Error("Insufficient funds");
    }

    const inputs = [] as UTXO[];
    let inputValue = 0;
    let estimatedFee = 0;
    for (const utxo of utxos) {
      if (inputValue >= toSendValue + estimatedFee) {
        break;
      }

      const txid = utxo.utxo.split(":")[0];
      const vout = Number(utxo.utxo.split(":")[1]);

      // Derive witness script using the bitcoinWallet's deriveWalletFromXpubs method
      const derivedAddressInfo = this.bitcoinWallet.deriveWalletFromXpubs(
        walletData.account_id,
        walletData.m,
        walletData.user_xpubs,
        utxo.address_index,
        utxo.change
      );
      
      // Verify the derived address matches the UTXO address
      if (derivedAddressInfo.address !== utxo.address) {
        throw new Error(`Derived address ${derivedAddressInfo.address} doesn't match UTXO address ${utxo.address}`);
      }

      inputs.push({
        txid,
        vout,
        value: utxo.value,
        address: utxo.address,
        witnessScript: derivedAddressInfo.witnessScript,
      });

      inputValue += utxo.value;
      const outputsCount = receivers.length + 1;
      const inputsCount = inputs.length;

      // we update the estimated fee as we add more inputs
      // we assume that the outputs are P2SH
      estimatedFee = calculateTxFees(inputsCount, outputsCount, feePerByte, 'P2WSH', 'P2SH');
    }

    const outputs = receivers.map((receiver) => ({
      address: receiver.address,
      value: receiver.amount,
    }));

    const changeValue = inputValue - toSendValue - estimatedFee;
    if (changeValue >= 546) {
      const [changeAddress] = await this.handoutAddresses(walletId, true, 1);
      outputs.push({
        address: changeAddress.address,
        value: changeValue,
      });
    }
    
    // Create and return the unsigned transaction
    return this.bitcoinWallet.createUnsignedTransaction(inputs, outputs);
  }
}

export default WalletManager;
