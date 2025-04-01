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
import AuthController from "./controller/authController.ts";
import AdminController from "./controller/adminController.ts";
import express from "express";
import cors from "cors";

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

const authController = new AuthController({ supabase });
const walletController = new WalletController({ walletManager });
const adminController = new AdminController({ walletManager });

const app = express();
app.use(express.json());
app.use(cors());

const userRouter = express.Router();
const adminRouter = express.Router();
const userWalletRouter = express.Router({ mergeParams: true });

userRouter.use(authController.getUser);
userWalletRouter.use(authController.getUserWallet);

userRouter.post(
  "/wallet/create/2-of-3",
  walletController.createWalletValidator,
  walletController.create2Of3Wallet,
);

userWalletRouter.post(
  "/addresses",
  walletController.deriveWalletAddressesValidator,
  walletController.deriveWalletAddresses,
);

adminRouter.post(
  "/wallet/sign",
  adminController.signTransactionWithServerValidator,
  adminController.signTransactionWithServer,
);

app.use("/user", userRouter);
app.use("/admin", adminRouter);
app.use("/user/wallet/:walletId", userWalletRouter);
app.listen(PORT);

console.log(`Server running on port ${PORT}`);
