import {
  BITCOIN_NETWORK,
  PORT,
  SERVER_SEED,
  SUPABASE_URL,
  SUPABSE_SERVICE_KEY,
  ZMQ_URL,
} from "./conf";
import { createClient } from "@supabase/supabase-js";
import Supabase from "./model/supabase";
import BitcoinWallet from "./model/wallet/bitcoinWallet";
import WalletManager from "./model/wallet/walletManager";
import WalletController from "./controller/walletController";
import AuthController from "./controller/authController";
import AdminController from "./controller/adminController";
import express from "express";
import cors from "cors";
import { Request, Response } from "express";
import TransactionListenerController from "./controller/transactionLitenerController";
import BitcoinMonitor from "./model/monitoring/bitcoinMonitor";
const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });
const bitcoinWallet = new BitcoinWallet({
  network: BITCOIN_NETWORK,
  seed: SERVER_SEED,
});

const bitcoinMonitor = new BitcoinMonitor({ supabase, network: BITCOIN_NETWORK });

const walletManager = new WalletManager({
  bitcoinWallet,
  supabase,
  bitcoinMonitor,
});
const authController = new AuthController({ supabase });
const walletController = new WalletController({ walletManager });
const adminController = new AdminController({ walletManager });

const transactionListenerController = new TransactionListenerController({
  zmqUrl: ZMQ_URL,
  bitcoinMonitor,
});

transactionListenerController.startBitcoinTxListener();

const app = express();
app.use(express.json());
app.use(cors());

const userRouter = express.Router();
const adminRouter = express.Router();
const userWalletRouter = express.Router({ mergeParams: true });

userRouter.use(authController.getUser);
userWalletRouter.use(authController.getUserWallet);

app.get("/", (_: Request, res: Response) => {
  res.send("Hello World");
});

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
