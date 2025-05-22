import BitcoinWallet from "./bitcoin/bitcoinWalletModel";
import Supabase from "../supabase";
import { Chain, UserPublicKey, Receiver } from "../types";
import BitcoinMonitor from "../monitoring/bitcoinMonitor";
import { objectToCamel } from "ts-case-convert";
import { UTXO } from "./bitcoin/bitcoinWalletModel";
import { calculateTxFees } from "../../helpers/feeEstimator";
import { generateInternalTransactionId } from "../../helpers/helpers";
import { PartialSignature } from "../types";
import Esplora from "../../api/esplora";

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
  esplora: Esplora;

  constructor(
    { bitcoinWallet, supabase, bitcoinMonitor, esplora }: {
      bitcoinWallet: BitcoinWallet;
      supabase: Supabase;
      bitcoinMonitor: BitcoinMonitor;
      esplora: Esplora;
    },
  ) {
    this.bitcoinWallet = bitcoinWallet;
    this.supabase = supabase;
    this.bitcoinMonitor = bitcoinMonitor;
    this.chain = "bitcoin";
    this.esplora = esplora;
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

    const toSendValue = receivers.reduce((acc, receiver) => acc + receiver.value, 0);

    const utxosSum = utxos.reduce((acc, utxo) => acc + utxo.value, 0);

    if (utxosSum < toSendValue) {
      return {
        error: "Insufficient funds",
      };
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

      const rawTx = await this.esplora.getRawTransaction(txid);

      // Derive witness script using the bitcoinWallet's deriveWalletFromXpubs method
      const derivedAddressInfo = this.bitcoinWallet.deriveWalletFromXpubs(
        walletData.account_id,
        walletData.m,
        walletData.user_xpubs,
        utxo.address_index,
        utxo.change,
        walletData.user_master_fingerprints,
        walletData.user_derivation_paths
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
        bip32Derivations: derivedAddressInfo.bip32Derivations,
        nonWitnessUtxo: rawTx ? Buffer.from(rawTx, 'hex') : undefined,
      });

      inputValue += utxo.value;
      const outputsCount = receivers.length + 1;
      const inputsCount = inputs.length;

      // we update the estimated fee as we add more inputs
      // we assume that the outputs are P2SH
      estimatedFee = calculateTxFees(inputsCount, outputsCount, feePerByte, 'P2WSH', 'P2SH');
    }

    if (inputValue < toSendValue + estimatedFee) {
      return {
        error: "Insufficient funds",
      };
    }

    const outputs = receivers.map((receiver) => ({
      address: receiver.address,
      value: receiver.value,
    }));

    const changeValue = inputValue - toSendValue - estimatedFee;
    if (changeValue >= 546) {
      const [changeAddress] = await this.handoutAddresses(walletId, true, 1);
      outputs.push({
        address: changeAddress.address,
        value: changeValue,
      });
    }

    const psbt = this.bitcoinWallet.createUnsignedTransaction(inputs, outputs);
    const inputsUsed = inputs.map((input) => (`${input.txid}:${input.vout}`));

    const outputValue = outputs.reduce((acc, output) => acc + output.value, 0);
    const finalFee = inputValue - outputValue;
    const totalSpent = toSendValue + finalFee;

    // TODO: Randomize the input and output order if not ordinals transaction

    // Create and return the unsigned transaction
    return {
      psbtBase64: psbt.psbtBase64,
      inputs: inputsUsed,
      outputs,
      totalSpent,
      fee: finalFee,
    }
  }

  async initiateSpendTransaction(walletId: string, receivers: Receiver[], feePerByte: number, initiatedBy: string) {
    const res = await this.buildWalletSpendPsbt(walletId, receivers, feePerByte);

    const { psbtBase64, inputs, totalSpent, fee } = res;

    if ("error" in res) {
      return {
        error: res.error,
      };
    }

    if (!totalSpent) {
      throw new Error("Total spent is not set");
    }

    if (!inputs) {
      throw new Error("No UTXOs used");
    }

    if (!fee) {
      throw new Error("Fee is not set");
    }

    const unsignedTransactionId = generateInternalTransactionId();

    const outputs = receivers.map((receiver) => ({
      address: receiver.address,
      value: receiver.value,
      label: receiver.label,
      is_change: false,
    }));

    // I am passing the receivers without the change address for now
    // as this will be used mostly for UI purposes
    // consider passing the change address as well if we want to have better tracking in the db
    await this.supabase.initiateSpendTransaction(unsignedTransactionId, walletId, psbtBase64, inputs, outputs, feePerByte, initiatedBy, totalSpent, fee);

    return {
      internalTransactionId: unsignedTransactionId,
      psbtBase64: psbtBase64,
    };
  }

  async addLedgerPolicy(walletId: string, masterFingerprint: string, policyIdHex: string, policyHmacHex: string) {
    const existingPolicy = await this.supabase.getLedgerPolicy(walletId, masterFingerprint);

    if (existingPolicy && existingPolicy.length > 0) {
      return {
        error: "Policy already exists for this wallet and public key",
      };
    }

    await this.supabase.addLedgerPolicy(walletId, masterFingerprint, policyIdHex, policyHmacHex);

    return {
      success: true,
    };
  }

  async submitPartialSignatures(unsignedTransactionId: string, masterFingerprint: string, partialSignatures: PartialSignature[]) {
    const { signatures_count, is_complete } = await this.supabase.submitPartialSignatures(unsignedTransactionId, masterFingerprint, partialSignatures);

    return {
      signaturesCount: signatures_count,
      isComplete: is_complete,
    };
  }

  async finalizeTransaction(unsignedTransactionId: string) {
    const unsignedTxResult = await this.supabase.getUnsignedTx(unsignedTransactionId);

    if (!unsignedTxResult || unsignedTxResult.length === 0) {
      return {
        error: "Transaction not found",
        status: 404,
      };
    }

    const unsignedTx = unsignedTxResult[0];

    const { is_complete, partial_signatures, is_broadcasted, psbt_base64 } = unsignedTx;
    if (!is_complete) {
      return {
        error: "Transaction needs more signatures",
      };
    }

    if (is_broadcasted) {
      return {
        error: "Transaction already broadcasted",
      };
    }

    const sigs = partial_signatures.map((sig) => ({
      inputIndex: sig.input_index,
      signature: sig.signature,
      pubkey: sig.pubkey,
      tapleafHash: sig.tapleaf_hash,
    } as PartialSignature));

    const { psbt, isComplete } = this.bitcoinWallet.applyPartialSignatures(psbt_base64, sigs);
    if (!isComplete) {
      // this should never happen
      throw new Error("The combined partial signatures are not complete");
    }

    const hex = psbt.toHex();

    // Broadcast the transaction

    const txid = await this.esplora.postTransaction(hex);

    // Updates the transaction data in the database
    await this.supabase.broadcastTx(unsignedTransactionId, txid);

    return {
      isComplete: is_complete,
      txid,
    };
  }
}
export default WalletManager;
