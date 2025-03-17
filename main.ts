import {
  BITCOIN_NETWORK,
  SERVER_SEED,
  SUPABASE_URL,
  SUPABSE_SERVICE_KEY,
} from "./conf.ts";
import { createClient } from "@supabase/supabase-js";
import Supabase from "./model/supabase.ts";
import MultiSigWallet from "./model/multiSigWallet.ts";
import WalletController from "./controller/walletController.ts";
import express from "express";
import { Request, Response } from "express";

const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });
const multiSigWallet = new MultiSigWallet({
  supabase,
  network: BITCOIN_NETWORK,
  seed: SERVER_SEED,
});

const walletController = new WalletController({ multiSigWallet });

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!");
});

console.log("end");

app.listen(3000);
