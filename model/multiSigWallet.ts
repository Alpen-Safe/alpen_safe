import BIP32Factory from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { Network, networks } from "bitcoinjs-lib";
import Supabase from "./supabase.ts";
import { Buffer } from "node:buffer";
import { BIP32Interface } from "bip32";
import { ECPairFactory, ECPairInterface } from "ecpair";

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const MAX_ACCOUNT_INDEX = 2147483647; // 2^31 - 1

interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
  derivationPath: string;
}

interface WalletInfo {
  address: string;
  witnessScript: Buffer;
  serverKeyDerivationPath: string;
  serverPublicKey: string;
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address: string;
  witnessScript: Buffer;
  derivationPath: string;
}

export interface TxOutput {
  address: string;
  value: number;
}

export interface UnsignedTx {
  psbtBase64: string;
  txid: string;
  fee: number;
}

interface SignedTx {
  psbtBase64: string;
  isComplete: boolean;
  signaturesAdded: number;
  totalSignaturesRequired: number;
}

interface BroadcastResult {
  txid: string;
  isSuccess: boolean;
  error?: string;
}

class MultiSigWallet {
  private supabase: Supabase;
  private masterNode: BIP32Interface;
  private network: Network;
  constructor(
    { supabase, seed, network }: {
      supabase: Supabase;
      seed: Buffer;
      network: Network;
    },
  ) {
    this.supabase = supabase;
    this.masterNode = bip32.fromSeed(seed, network);
    this.network = network;
  }

  private validateAccountIndex(index: number) {
    return Number.isInteger(index) && index >= 0 && index <= MAX_ACCOUNT_INDEX;
  }

  /**
   * Derive the hardened path for an account
   * This only derives the account-level path (m/84'/coinType'/accountId')
   */
  private deriveAccountNode(
    accountId: number,
  ) {
    if (!this.validateAccountIndex(accountId)) {
      throw new Error(
        `Account index must be between 0 and ${MAX_ACCOUNT_INDEX}`,
      );
    }

    // m / purpose' / coin_type' / account'
    // Using BIP84 path for native SegWit
    const coinType = this.network === networks.bitcoin ? 0 : 1;
    const hardenedPath = `m/84'/${coinType}'/${accountId}'`;

    const accountNode = this.masterNode.derivePath(hardenedPath);

    if (!accountNode.privateKey || !accountNode.publicKey) {
      throw new Error("Failed to derive account node");
    }

    return accountNode;
  }

  /**
   * Derive a key pair for a specific address using the account node
   */
  private getServerKeyPair(
    accountId: number,
    addressIndex: number,
    change = false,
  ): KeyPair {
    // First get the account-level node (hardened derivation)
    const accountNode = this.deriveAccountNode(accountId);

    if (!this.validateAccountIndex(addressIndex)) {
      throw new Error(
        `Address index must be between 0 and ${MAX_ACCOUNT_INDEX}`,
      );
    }

    // Derive the non-hardened path (change/addressIndex)
    const changeIndex = change ? 1 : 0;
    const childPath = `${changeIndex}/${addressIndex}`;

    // Derive from the account node
    const childNode = accountNode.derivePath(childPath);

    if (!childNode.privateKey || !childNode.publicKey) {
      throw new Error("Failed to derive key pair");
    }

    // Construct the full derivation path for reference
    const coinType = this.network === networks.bitcoin ? 0 : 1;
    const fullDerivationPath =
      `m/84'/${coinType}'/${accountId}'/${changeIndex}/${addressIndex}`;

    return {
      publicKey: Buffer.from(childNode.publicKey),
      privateKey: Buffer.from(childNode.privateKey),
      derivationPath: fullDerivationPath,
    };
  }

  /**
   * Get the xpub for a specific account
   * This is used for sharing with hardware wallet software
   */
  public getServerAccountXpub(accountId: number): string {
    const accountNode = this.deriveAccountNode(accountId);
    return accountNode.neutered().toBase58();
  }

  /**
   * Create a wallet descriptor for hardware wallet compatibility
   * This can be imported into wallet software like Sparrow, Electrum, etc.
   */
  public createWalletDescriptor(
    accountId: number,
    m: number,
    userXpubs: string[],
  ): string {
    const serverXpub = this.getServerAccountXpub(accountId);

    // Format: wsh(multi(2,xpub1/0/*,xpub2/0/*,...))
    const xpubPaths = [
      `${serverXpub}/0/*`, // Receive path
      ...userXpubs.map((xpub) => `${xpub}/0/*`),
    ].join(",");

    return `wsh(multi(${m},${xpubPaths}))`;
  }

  /**
   * Derive an address using xpubs (compatible with hardware wallets)
   * This method ensures hardware wallets will recognize the address
   */
  public deriveAddressFromXpubs(
    accountId: number,
    m: number,
    userXpubs: string[],
    addressIndex: number,
    change: boolean = false,
  ): WalletInfo {
    if (!this.validateAccountIndex(addressIndex)) {
      throw new Error(
        `Address index must be between 0 and ${MAX_ACCOUNT_INDEX}`,
      );
    }

    // 1. Get server key pair for this address
    const serverKeyPair = this.getServerKeyPair(
      accountId,
      addressIndex,
      change,
    );

    // 2. Derive corresponding keys from user xpubs
    const userKeys: Buffer[] = [];
    for (const userXpub of userXpubs) {
      try {
        // Import the xpub
        const userAccountNode = bip32.fromBase58(userXpub, this.network);

        // Derive the same path as server (change/index)
        const changeIndex = change ? 1 : 0;
        const userKey = userAccountNode
          .derive(changeIndex)
          .derive(addressIndex)
          .publicKey;

        userKeys.push(Buffer.from(userKey));
      } catch (error: any) {
        throw new Error(`Failed to derive key from xpub: ${error.message}`);
      }
    }

    // 3. Combine and sort all public keys (server + users)
    const pubKeys = [serverKeyPair.publicKey, ...userKeys].sort((a, b) =>
      Buffer.compare(a, b)
    );

    // 4. Create P2WSH multisig address
    const p2ms = bitcoin.payments.p2ms({
      m,
      pubkeys: pubKeys,
      network: this.network,
    });

    if (!p2ms.output) {
      throw new Error("Failed to create P2MS output");
    }

    const p2wsh = bitcoin.payments.p2wsh({
      redeem: p2ms,
      network: this.network,
    });

    if (!p2wsh.address) {
      throw new Error("Failed to create P2WSH address");
    }

    return {
      address: p2wsh.address,
      witnessScript: p2ms.output,
      serverKeyDerivationPath: serverKeyPair.derivationPath,
      serverPublicKey: serverKeyPair.publicKey.toString("hex"),
    };
  }

  /**
   * Generate multiple addresses for a wallet (receive or change)
   */
  public generateAddresses(
    accountId: number,
    m: number,
    userXpubs: string[],
    startIndex: number = 0,
    count: number = 10,
    change: boolean = false,
  ): WalletInfo[] {
    const addresses: WalletInfo[] = [];

    for (let i = 0; i < count; i++) {
      const addressIndex = startIndex + i;
      const address = this.deriveAddressFromXpubs(
        accountId,
        m,
        userXpubs,
        addressIndex,
        change,
      );
      addresses.push(address);
    }

    return addresses;
  }

  /**
   * Creates an unsigned PSBT for spending from multisig addresses
   * @param utxos UTXOs to spend from
   * @param outputs Transaction outputs
   * @param feeRate Fee rate in satoshis per byte
   * @returns The unsigned transaction as base64-encoded PSBT
   */
  public createUnsignedTransaction(
    utxos: UTXO[],
    outputs: TxOutput[],
    feeRate: number,
  ) {
    if (utxos.length === 0) {
      throw new Error("No UTXOs provided");
    }
    if (outputs.length === 0) {
      throw new Error("No outputs provided");
    }

    // Create new transaction builder
    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add all inputs
    for (const utxo of utxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(utxo.address, this.network),
          value: utxo.value,
        },
        witnessScript: utxo.witnessScript,
      });
    }

    // Calculate total input amount
    const totalInput = utxos.reduce((sum, utxo) => sum + utxo.value, 0);

    // Add outputs
    for (const output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: output.value,
      });
    }

    // Calculate total output amount
    const totalOutput = outputs.reduce((sum, output) => sum + output.value, 0);

    // Estimate transaction size
    const inputSize = 180; // Average size for P2WSH input with 2 signatures
    const outputSize = 43; // Average size for P2WSH output
    const txOverhead = 11; // Transaction overhead bytes
    const estimatedSize = txOverhead + (utxos.length * inputSize) +
      (outputs.length * outputSize);

    // Calculate fee
    const estimatedFee = Math.ceil(estimatedSize * feeRate);

    // Verify that inputs cover outputs + fee
    if (totalInput < totalOutput + estimatedFee) {
      throw new Error(
        `Insufficient funds. Have: ${totalInput}, Need: ${
          totalOutput + estimatedFee
        }`,
      );
    }

    return {
      psbtBase64: psbt.toBase64(),
      fee: estimatedFee,
    };
  }

  /**
   * Add a signature to a PSBT using the server's private key
   * @param psbtBase64 Base64-encoded PSBT
   * @param accountId Account ID for key derivation
   * @returns The PSBT with the server's signature added
   */
  public signTransactionWithServer(
    psbtBase64: string,
    accountId: number,
  ): SignedTx {
    // Parse the PSBT
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: this.network });

    // Get total inputs to determine required signatures
    const totalInputs = psbt.data.inputs.length;

    // Find required signatures from one of the inputs' witnessScript
    let totalSignaturesRequired = 2; // Default to 2 (most common)

    for (const input of psbt.data.inputs) {
      if (input.witnessScript) {
        // Parse the witness script to find the m value
        const chunks = bitcoin.script.decompile(input.witnessScript);
        if (chunks && chunks.length > 0 && typeof chunks[0] === "number") {
          totalSignaturesRequired = chunks[0] as number;
          break;
        }
      }
    }

    let signaturesAdded = 0;

    // Sign each input with the appropriate server key
    for (let i = 0; i < totalInputs; i++) {
      let inputSigned = false;

      // Try up to 20 address indices
      for (
        let addressIndex = 0;
        addressIndex < 20 && !inputSigned;
        addressIndex++
      ) {
        // First try receive path (change = false)
        const receiveKeyPair = this.getServerKeyPair(
          accountId,
          addressIndex,
          false,
        );
        const receiveSigner = ECPair.fromPrivateKey(receiveKeyPair.privateKey);

        if (this.trySignInput(psbt, i, receiveSigner)) {
          signaturesAdded++;
          inputSigned = true;
          continue;
        }

        // If receive path fails, try change path
        const changeKeyPair = this.getServerKeyPair(
          accountId,
          addressIndex,
          true,
        );
        const changeSigner = ECPair.fromPrivateKey(changeKeyPair.privateKey);

        if (this.trySignInput(psbt, i, changeSigner)) {
          signaturesAdded++;
          inputSigned = true;
        }
      }
    }

    // Check if the PSBT is complete
    const isComplete = this.isPsbtComplete(psbt);

    return {
      psbtBase64: psbt.toBase64(),
      isComplete,
      signaturesAdded,
      totalSignaturesRequired,
    };
  }

  /**
   * Helper method to attempt signing a specific input
   * @param psbt The PSBT to sign
   * @param inputIndex The input index to sign
   * @param signer The key to sign with
   * @returns True if signing succeeded, false otherwise
   */
  private trySignInput(
    psbt: bitcoin.Psbt,
    inputIndex: number,
    signer: ECPairInterface,
  ): boolean {
    try {
      // Create a wrapper that satisfies bitcoinjs-lib's Signer interface
      const signerAdapter = {
        publicKey: Buffer.from(signer.publicKey),
        sign(hash: Buffer): Buffer {
          return Buffer.from(signer.sign(hash));
        },
      };

      psbt.signInput(inputIndex, signerAdapter);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper method to check if a PSBT is complete
   * @param psbt The PSBT to check
   * @returns True if the PSBT is complete, false otherwise
   */
  private isPsbtComplete(psbt: bitcoin.Psbt): boolean {
    try {
      psbt.validateSignaturesOfAllInputs((pubkey, msghash, signature) => {
        return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
      });
      // Make a copy of the PSBT to finalize, so we don't modify the original
      const psbtCopy = bitcoin.Psbt.fromBase64(psbt.toBase64(), {
        network: this.network,
      });
      psbtCopy.finalizeAllInputs();
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default MultiSigWallet;
