import Supabase from "../supabase.ts";

class BitcoinMonitor {
  private supabase: Supabase;
  constructor({ supabase }: { supabase: Supabase }) {
    this.supabase = supabase;
  }
}

export default BitcoinMonitor;
