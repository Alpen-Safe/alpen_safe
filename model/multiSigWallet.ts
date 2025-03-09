import BIP32Factory from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { Network, networks } from "bitcoinjs-lib";
import Supabase from "./supabase.ts";
import { Buffer } from "node:buffer";
import { BIP32Interface } from "bip32";

const bip32 = BIP32Factory(ecc);

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
}

export default MultiSigWallet;
