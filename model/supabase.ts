import { Database } from "../database.types.ts";
import { SupabaseClient } from "@supabase/supabase-js";

class Supabase {
    supabase: SupabaseClient<Database>;

    constructor({ supabase }: { supabase: SupabaseClient<Database> }) {
        this.supabase = supabase;
    }
}

export default Supabase;