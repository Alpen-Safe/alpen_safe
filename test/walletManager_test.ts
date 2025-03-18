import { SupabaseClient } from "@supabase/supabase-js";
import Supabase from "../model/supabase.ts";
import BitcoinWallet from "../model/wallet/bitcoinWallet.ts";
import { Buffer } from "node:buffer";
import { networks } from "bitcoinjs-lib";
import WalletManager from "../model/wallet/walletManager.ts";

// Setup function to create a new wallet instance
function setupWalletManager() {
  // Use a predictable seed
  const seed = Buffer.from(
    "5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4",
    "hex",
  );
  const network = networks.testnet;
  const supabase = new Supabase({ supabase: {} as SupabaseClient });
  const bitcoinWallet = new BitcoinWallet({ seed, network });
  const walletManager = new WalletManager({
    bitcoinWallet,
    supabase,
  });

  return walletManager;
}
