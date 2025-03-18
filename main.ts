import {
  BITCOIN_NETWORK,
  SERVER_SEED,
  SUPABASE_URL,
  SUPABSE_SERVICE_KEY,
} from "./conf.ts";
import { createClient } from "@supabase/supabase-js";
import Supabase from "./model/supabase.ts";
import BitcoinMultiSigWallet from "./model/wallet/bitcoinMultiSigWallet.ts";
import WalletManager from "./model/wallet/walletManager.ts";
import WalletController from "./controller/walletController.ts";
import express from "express";

const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });
const multiSigWallet = new BitcoinMultiSigWallet({
  network: BITCOIN_NETWORK,
  seed: SERVER_SEED,
});

const walletManager = new WalletManager({ multiSigWallet, supabase });

const walletController = new WalletController({ walletManager });

const app = express();

app.get(
  "/user/create-wallet",
  walletController.createWalletValidator,
  walletController.create2Of3Wallet,
);

app.listen(3000);
