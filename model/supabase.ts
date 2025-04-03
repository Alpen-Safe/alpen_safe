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
  serverXpub: string;
  userPublicKeys: UserPublicKey[];
}

export interface Address {
  address: string;
  addressIndex: number;
  change: boolean;
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
      serverXpub,
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
      _server_xpub: serverXpub,
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

  getWalletOwners = async (walletId: string) => {
    const res = await this.supabase
      .from("wallet_owners")
      .select("user_id, role")
      .eq("wallet_id", walletId);

    return res;
  };

  saveAddresses = async (walletId: string, addresses: Address[]) => {
    const { error, data } = await this.supabase.rpc("create_addresses", {
      _wallet_id: walletId,
      _addresses: objectToSnake(addresses),
    });

    if (error) {
      console.error("error saveAddresses", error.message);
      throw new Error(error.message);
    }

    return data;
  };
}

export default Supabase;
