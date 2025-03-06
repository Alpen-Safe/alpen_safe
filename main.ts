import { SUPABASE_URL, SUPABSE_SERVICE_KEY } from "./conf.ts";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);

console.log("end");
