import BitcoinWallet from "./bitcoinWallet";
import Supabase from "../supabase";
import { Chain, UserPublicKey } from "../types";
import BitcoinMonitor from "../monitoring/bitcoinMonitor";
import { objectToCamel } from "ts-case-convert";

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
}

export default WalletManager;
