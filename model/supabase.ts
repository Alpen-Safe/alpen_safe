import { Database } from "../database.types.ts";
import { SupabaseClient } from "@supabase/supabase-js";
import { UserPublicKey } from "./types.ts";
import { objectToSnake } from "npm:ts-case-convert";

export interface CreateWalletParams {
  userId: string;
  walletName: string;
  m: number;
  n: number;
  chain: "bitcoin" | "ethereum";
  walletDescriptor: string;
  serverSigners: number;
  serverSignerId: number;
  serverSignerDerivationPath: string;
  userPublicKeys: UserPublicKey[];
}

class Supabase {
  supabase: SupabaseClient<Database>;

  constructor({ supabase }: { supabase: SupabaseClient<Database> }) {
    this.supabase = supabase;
  }

  reserveServerSigner = async () => {
    const { error, data } = await this.supabase.from("server_signers")
      .insert([])
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  createWallet = async (params: CreateWalletParams) => {
    const { userId, walletName, m, n, chain, walletDescriptor, serverSigners, userPublicKeys, serverSignerId, serverSignerDerivationPath } = params;
  
    const convertedKeys = objectToSnake(userPublicKeys);
    const { error, data } = await this.supabase.rpc("create_wallet", {
      _user_id: userId,
      _wallet_name: walletName,
      _m: m,
      _n: n,
      _chain: chain,
      _wallet_descriptor: walletDescriptor,
      _server_signers: serverSigners,
      _server_signer_id: serverSignerId,
      _server_signer_derivation_path: serverSignerDerivationPath,
      _user_public_keys: convertedKeys,
    });
  
    if (error) {
      throw new Error(error.message);
    }
  
    return data;
  }
}

export default Supabase;
