import { SUPABASE_URL, SUPABSE_SERVICE_KEY } from "./conf.ts";
import { createClient } from "@supabase/supabase-js";
import Supabase from "./model/supabase.ts";
import MultiSigWallet from "./model/multiSigWallet.ts";
import express from "express";
import { Request, Response } from "express";

const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });
// const multiSigWallet = new MultiSigWallet({ supabase });

const app = express();

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!");
});

console.log("end");

app.listen(3000);
