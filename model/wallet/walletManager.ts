import BitcoinMultiSigWallet from "./bitcoinMultiSigWallet.ts";
import Supabase from "../supabase.ts";
import { Chain, UserPublicKey } from "../types.ts";

// we fix 1 server signer for now
// should apply in all cases
const SERVER_SIGNERS = 1;

class WalletManager {
  supabase: Supabase;
  multiSigWallet: BitcoinMultiSigWallet;
  chain: Chain;

  constructor(
    { multiSigWallet, supabase }: {
      multiSigWallet: BitcoinMultiSigWallet;
      supabase: Supabase;
    },
  ) {
    this.multiSigWallet = multiSigWallet;
    this.supabase = supabase;
    this.chain = "bitcoin";
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

    const reservedServerSigner = await this.supabase.reserveServerSigner();
    const { account_id } = reservedServerSigner;

    const xpubs = userXPubs.map((xpub) => xpub.publicKey);
    const { walletDescriptor, serverDerivationPath } = this.multiSigWallet
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
