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
      .insert([{}])
      .select("*")
      .single();

    if (error) {
      console.error("error reserving server signer", error.message);
      throw new Error(error.message);
    }

    return data;
  };

  createWallet = async (params: CreateWalletParams) => {
    const {
      userId,
      walletName,
      m,
      n,
      chain,
      walletDescriptor,
      serverSigners,
      userPublicKeys,
      serverSignerId,
      serverSignerDerivationPath,
    } = params;

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
      console.error("error createWallet", error.message);
      throw new Error(error.message);
    }

    return data;
  };

  getWalletData = async (walletId: string) => {
    const { error, data } = await this.supabase.rpc("get_wallet_data", {
      _wallet_id: walletId,
    }).single();

    if (error) {
      console.error("error getWalletData", error.message);
      throw new Error(error.message);
    }

    return data;
  };

  getWalletOwner = async (walletId: string) => {
    const res = await this.supabase
      .from("multi_sig_wallets")
      .select("user_owner")
      .eq("id", walletId);

    return res;
  };
}

export default Supabase;
