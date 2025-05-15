import BIP32Factory from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { Network, networks } from "bitcoinjs-lib";
import { Buffer } from "node:buffer";
import { BIP32Interface } from "bip32";
import { ECPairFactory, ECPairInterface } from "ecpair";

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const MAX_ACCOUNT_INDEX = 2147483647; // 2^31 - 1

// Define our own Bip32Derivation interface instead of importing from bip174
interface Bip32Derivation {
  masterFingerprint: Buffer;
  pubkey: Buffer;
  path: string;
}

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
  addressIndex: number;
  change: boolean;
  bip32Derivations: Bip32Derivation[];
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  address: string;
  witnessScript: Buffer;
  bip32Derivations: Bip32Derivation[];
  nonWitnessUtxo?: Buffer;
}

export interface TxOutput {
  address: string;
  value: number;
}

export interface UnsignedTx {
  psbtBase64: string;
}

interface SignedTx {
  psbtBase64: string;
  isComplete: boolean;
  signaturesAdded: number;
}

/**
 * Stateless class that implements a bitcoin multi sig wallet.
 * This class only work with bitcoin protocol primitives to
 * build and sign transactions.
 *
 * This class is network and database agnostic.
 */
class BitcoinWallet {
  private masterNode: BIP32Interface;
  private network: Network;
  constructor(
    { seed, network }: {
      seed: Buffer;
      network: Network;
    },
  ) {
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

    // Using BIP48 for multi-sig wallets derivation scheme
    // m / purpose' / coin_type' / account' / script_type' / change / address_index
    const purpose = 48; // BIP48 (multi-sig)
    const coinType = this.network === networks.bitcoin ? 0 : 1;
    const scriptType = 2; // P2WSH (native segwit)
    const hardenedPath =
      `m/${purpose}'/${coinType}'/${accountId}'/${scriptType}'`;

    const accountNode = this.masterNode.derivePath(hardenedPath);

    if (!accountNode.privateKey || !accountNode.publicKey) {
      throw new Error("Failed to derive account node");
    }

    return {
      accountNode,
      path: hardenedPath,
    };
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
    const { accountNode, path } = this.deriveAccountNode(accountId);

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
    const fullDerivationPath = `${path}/${changeIndex}/${addressIndex}`;

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
  public getServerAccountXpub(accountId: number) {
    const { accountNode, path } = this.deriveAccountNode(accountId);
    const xpub = accountNode.neutered().toBase58();
    return {
      xpub,
      path,
    };
  }

  /**
   * Create a wallet descriptor for hardware wallet compatibility
   * This can be imported into wallet software like Sparrow, Electrum, etc.
   */
  public createWalletDescriptor(
    accountId: number,
    m: number,
    userXpubs: string[],
  ) {
    const { xpub, path } = this.getServerAccountXpub(accountId);

    // https://blog.casa.io/introducing-wallet-descriptors/
    // Format: wsh(multi(2,xpub1/<0;1>/*,xpub2/<0;1>/*,...))
    // TODO: Add the []
    const xpubPaths = [
      `${xpub}/<0;1>/*`, // Receive path
      ...userXpubs.map((xpub) => `${xpub}/<0;1>/*`),
    ].join(",");

    const walletDescriptor = `wsh(sortedmulti(${m},${xpubPaths}))`;

    return {
      walletDescriptor,
      serverDerivationPath: path,
      serverXpub: xpub,
    };
  }

  /**
   * Derive an address using xpubs (compatible with hardware wallets)
   * This method ensures hardware wallets will recognize the address
   */
  public deriveWalletFromXpubs(
    accountId: number,
    m: number,
    userXpubs: string[],
    addressIndex: number,
    change: boolean = false,
    userMasterFingerprints: string[] = [],
    userAccountNodeDerivationPaths: string[] = [],
  ): WalletInfo {
    if (!this.validateAccountIndex(addressIndex)) {
      throw new Error(
        `Address index must be between 0 and ${MAX_ACCOUNT_INDEX}`,
      );
    }

    // Create server fingerprint with zeros
    const serverMasterFingerprint = Buffer.from('00000000', 'hex');

    // Convert user fingerprints from hex strings to Buffers
    // If no fingerprints provided or array is empty, use zero fingerprints for all users
    let userFingerprints: Buffer[];
    if (userMasterFingerprints.length === 0) {
      // Create an array of zero fingerprints matching the number of xpubs
      userFingerprints = Array(userXpubs.length).fill(Buffer.from('00000000', 'hex'));
    } else {
      // Validate that we have the right number of fingerprints
      if (userMasterFingerprints.length !== userXpubs.length) {
        throw new Error("Number of user fingerprints must match number of xpubs");
      }
      
      // Convert provided fingerprints from hex strings to Buffers
      userFingerprints = userMasterFingerprints.map(fingerprint => 
        Buffer.from(fingerprint === null ? '00000000' : fingerprint, 'hex')
      );
    }

    // 1. Get server key pair for this address
    const serverKeyPair = this.getServerKeyPair(
      accountId,
      addressIndex,
      change,
    );


    // do not give out the full server derivation path
    // we do not want to give out the account number and other
    // sensitive information
    const changeIndex = change ? 1 : 0;
    const serverDerivationPath = `m/${changeIndex}/${addressIndex}`;

    // 2. Derive corresponding keys from user xpubs
    const userKeys: Buffer[] = [];
    const userDerivationPaths: string[] = [];
    
    for (let index = 0; index < userXpubs.length; index++) {
      try {
        // Import the xpub
        const userAccountNode = bip32.fromBase58(userXpubs[index], this.network);

        // Derive the same path as server (change/index)
        const userKey = userAccountNode
          .derive(changeIndex)
          .derive(addressIndex)
          .publicKey;

        userKeys.push(Buffer.from(userKey));
        

        if (userAccountNodeDerivationPaths[index]) {
          // Store the full derivation path
          userDerivationPaths.push(`${userAccountNodeDerivationPaths[index]}/${changeIndex}/${addressIndex}`);
        } else {
          // Store the derivation path (this is the path AFTER the xpub level)
          userDerivationPaths.push(`${changeIndex}/${addressIndex}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to derive key from xpub: ${error.message}`);
      }
    }

    // 3. Combine all public keys (server + users) and remember original order
    const allPubKeys = [serverKeyPair.publicKey, ...userKeys];
    const allFingerprints = [serverMasterFingerprint, ...userFingerprints];
    const allPaths = [serverDerivationPath, ...userDerivationPaths];
    
    // Get sorted pubkeys for the actual multisig script
    const pubKeyIndices = allPubKeys.map((_, index) => index);
    const sortedPubKeyIndices = [...pubKeyIndices].sort((a, b) => 
      Buffer.compare(allPubKeys[a], allPubKeys[b])
    );
    const sortedPubKeys = sortedPubKeyIndices.map(idx => allPubKeys[idx]);

    // 4. Create P2WSH multisig address
    const p2ms = bitcoin.payments.p2ms({
      m,
      pubkeys: sortedPubKeys,
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

    // 5. Create BIP32 derivation array needed for PSBT
    const bip32Derivations: Bip32Derivation[] = allPubKeys.map((pubkey, index) => ({
      pubkey: pubkey,
      masterFingerprint: allFingerprints[index],
      path: allPaths[index],
    }));

    return {
      address: p2wsh.address,
      witnessScript: p2ms.output,
      serverKeyDerivationPath: serverKeyPair.derivationPath,
      serverPublicKey: serverKeyPair.publicKey.toString("hex"),
      addressIndex: addressIndex,
      change: change,
      bip32Derivations: bip32Derivations,
    };
  }

  /**
   * Generate multiple addresses for a wallet (receive or change)
   */
  public deriveAddresses(
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
      const address = this.deriveWalletFromXpubs(
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
   * @returns The unsigned transaction as base64-encoded PSBT
   */
  public createUnsignedTransaction(
    inputs: UTXO[],
    outputs: TxOutput[],
  ): UnsignedTx {
    if (inputs.length === 0) {
      throw new Error("No inputs provided");
    }
    if (outputs.length === 0) {
      throw new Error("No outputs provided");
    }

    // Create new transaction builder
    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add all inputs
    for (const input of inputs) {

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        witnessUtxo: {
          script: bitcoin.address.toOutputScript(input.address, this.network),
          value: input.value,
        },
        ...(input.nonWitnessUtxo ? { nonWitnessUtxo: input.nonWitnessUtxo } : {}),
        witnessScript: input.witnessScript,
        bip32Derivation: input.bip32Derivations,
      });
    }

    // Add outputs
    for (const output of outputs) {
      psbt.addOutput({
        address: output.address,
        value: output.value,
      });
    }

    const psbtBase64 = psbt.toBase64();
    
    return {
      psbtBase64,
    };
  }

  /**
   * Add a signature to a PSBT using the server's private key
   * @param psbtBase64 Base64-encoded PSBT
   * @param accountId Account ID for key derivation
   * @param m Number of signatures required
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

export default BitcoinWallet;
