import {
  BITCOIN_NETWORK,
  PORT,
  SERVER_SEED,
  SUPABASE_URL,
  SUPABSE_SERVICE_KEY,
} from "./conf.ts";
import { createClient } from "@supabase/supabase-js";
import Supabase from "./model/supabase.ts";
import BitcoinWallet from "./model/wallet/bitcoinWallet.ts";
import WalletManager from "./model/wallet/walletManager.ts";
import WalletController from "./controller/walletController.ts";
import UserController from "./controller/userController.ts";
import express from "express";

const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });
const bitcoinWallet = new BitcoinWallet({
  network: BITCOIN_NETWORK,
  seed: SERVER_SEED,
});

const walletManager = new WalletManager({
  bitcoinWallet,
  supabase,
});

const userController = new UserController();
const walletController = new WalletController({ walletManager });

const app = express();
app.use(express.json());

const userRouter = express.Router();

userRouter.use(userController.getUser);

userRouter.post(
  "/wallet/create",
  walletController.createWalletValidator,
  walletController.create2Of3Wallet,
);

userRouter.post(
  "/wallet/addresses",
  walletController.deriveWalletAddressesValidator,
  walletController.deriveWalletAddresses,
);

app.use("/user", userRouter);

app.listen(PORT);

console.log(`Server running on port ${PORT}`);
