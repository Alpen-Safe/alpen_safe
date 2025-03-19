import BitcoinWallet from "./bitcoinWallet.ts";
import Supabase from "../supabase.ts";
import { Chain, UserPublicKey } from "../types.ts";

// we fix 1 server signer for now
// should apply in all cases
const SERVER_SIGNERS = 1;

/**
 * A class to manage wallet and database operations.
 * Use this class to interact with the wallet to create new wallets, send funds, etc.
 */
class WalletManager {
  supabase: Supabase;
  bitcoinWallet: BitcoinWallet;
  chain: Chain;

  constructor(
    { bitcoinWallet, supabase }: {
      bitcoinWallet: BitcoinWallet;
      supabase: Supabase;
    },
  ) {
    this.bitcoinWallet = bitcoinWallet;
    this.supabase = supabase;
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

  async deriveAddresses(walletId: string, count: number) {
    const walletData = await this.supabase.getWalletData(walletId);

    // TODO: keep track of the last index
    const startIndex = 0;

    const getAddresses = (change: boolean) => {
      const addresses = this.bitcoinWallet.deriveAddresses(
        walletData.account_id,
        walletData.m,
        walletData.user_xpubs,
        startIndex,
        count,
        change,
      );

      return addresses.map((x) => {
        return {
          address: x.address,
          index: x.addressIndex,
          change,
        };
      });
    };

    const addressesReceive = getAddresses(false);
    const addressesChange = getAddresses(true);

    return {
      addressesReceive,
      addressesChange,
    };
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
    const { walletDescriptor, serverDerivationPath } = this.bitcoinWallet
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
      userPublicKeys: userXPubs,
    });

    console.log(
      `created ${m} of ${n} wallet with id ${walletId} for user ${userId}`,
    );

    return {
      walletId,
      walletDescriptor,
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
