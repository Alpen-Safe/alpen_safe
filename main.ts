import { SUPABASE_URL, SUPABSE_SERVICE_KEY } from "./conf.ts";
import { createClient } from "@supabase/supabase-js";
import Supabase from "./model/supabase.ts";
import MultiSigWallet from "./model/multiSigWallet.ts";

const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });
// const multiSigWallet = new MultiSigWallet({ supabase });

console.log("end");
