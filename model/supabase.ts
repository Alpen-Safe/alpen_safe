import { Database, Json } from "../database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { UserPublicKey } from "./types";
import { objectToSnake } from "ts-case-convert";
import { PartialSignature } from "./types";

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

  /**
   * Paginate a function that returns a list of items.
   * @param func - function to paginate
   * @param limit - limit of items to return
   * @returns list of items
   */
  paginateFunction = async <T>(func: (from: number, to: number) => Promise<T[]>, limit: number = 1000) => {
      let from = 0;
      let to = limit - 1;
      const res = await func(from, to);
      console.log(`fetched ${res.length} items from ${from} to ${to}`);

      let nextPage = res.length >= limit;
      while (nextPage) {
          from += limit;
          to += limit;
          const moreTxs = await func(from, to);
          console.log(`fetched ${moreTxs.length} items from ${from} to ${to}`);
          res.push(...moreTxs);
          nextPage = moreTxs.length >= limit;
      }

      return res;
  }


  getAddresses = async (from: number, to: number) => {
    const { data, error } = await this
      .supabase
      .from('addresses')
      .select('address')
      .range(from, to);

    if (error) {
      console.error("error getAddresses", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  getAllAddresses = () => this.paginateFunction(this.getAddresses);

  receivedUtxoInMonitoredAddress = async (txid: string, address: string, utxo: string, value: number, isSpent: boolean, confirmed: boolean) => {
    const { error } = await this.supabase.rpc("received_utxo_in_monitored_address", {
      _txid: txid,
      _address: address,
      _utxo: utxo,
      _value: value,
      _is_spent: isSpent,
      _confirmed: confirmed,
    });

    if (error) {
      console.error("error receivedUtxoInMonitoredAddress", error.message);
      console.error("error receivedUtxoInMonitoredAddress with args", txid, address, utxo, value, isSpent, confirmed);
      console.error(error);
    }
  }

  getWalletAddresses = async (walletId: string) => {
    // no pagination here because I don't expect more than 1000 addresses
    const { data, error } = await this.supabase
      .from("addresses")
      .select("address, address_index, change")
      .eq("wallet_id", walletId)
      .order("address_index", { ascending: true })
      .order("change", { ascending: false });

    if (error) {
      console.error("error getWalletAddresses", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  getLastAddressIndex = async (walletId: string, isChange: boolean) => {
    const { data, error } = await this.supabase
      .from("addresses")
      .select("address_index")
      .eq("wallet_id", walletId)
      .eq("change", isChange)
      .order("address_index", { ascending: false })
      .limit(1);

    if (error) {
      console.error("error getLastAddressIndex", error.message);
      throw new Error(error.message);
    }

    if (data.length === 0) {
      return null;
    }

    return data[0].address_index;
  }

  handoutAddresses = async (walletId: string, isChange: boolean, amount: number) => {
    const { data, error } = await this.supabase.rpc("handout_addresses", {
      _wallet_id: walletId,
      _is_change: isChange,
      _amount: amount,
    });

    if (error) {
      console.error("error handoutAddresses", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  getWalletUtxos = async (walletId: string) => {
    const { data, error } = await this.supabase.rpc("get_wallet_utxos", {
      _wallet_id: walletId,
    });

    if (error) {
      console.error("error getWalletUtxos", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  initiateSpendTransaction = async (unsignedTransactionId: string, walletId: string, psbtBase64: string, inputs: string[], outputs: Json[], feePerByte: number, initiatedBy: string, totalSpent: number, feeBaseCurrencyAmount: number) => {
    const { error } = await this.supabase.rpc("initiate_spend_transaction", {
      _unsigned_transaction_id: unsignedTransactionId,
      _wallet_id: walletId,
      _psbt_base64: psbtBase64,
      _inputs: inputs,
      _outputs: outputs,
      _fee_per_byte: feePerByte,
      _initiated_by: initiatedBy,
      _total_spent: totalSpent,
      _fee_base_currency_amount: feeBaseCurrencyAmount,
    });

    if (error) {
      console.error("error initiateSpendTransaction", error.message);
      throw new Error(error.message);
    }
  }

  addLedgerPolicy = async (walletId: string, masterFingerprint: string, policyIdHex: string, policyHmacHex: string) => {
    const { error, data } = await this.supabase.rpc("create_ledger_policy", {
      _wallet_id: walletId,
      _master_fingerprint: masterFingerprint,
      _policy_id_hex: policyIdHex,
      _policy_hmac_hex: policyHmacHex,
    });

    if (error) {
      console.error("error addLedgerPolicy", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  getLedgerPolicy = async (walletId: string, masterFingerprint: string) => {
    const { data, error } = await this.supabase
      .from("ledger_policies")
      .select("wallet_id, master_fingerprint")
      .eq("wallet_id", walletId)
      .eq("master_fingerprint", masterFingerprint);

    if (error) {
      console.error("error getLedgerPolicies", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  submitPartialSignatures = async (unsignedTransactionId: string, masterFingerprint: string, partialSignatures: PartialSignature[]) => {
    const convertedPartialSignatures = objectToSnake(partialSignatures);

    const { error, data } = await this.supabase.rpc("submit_partial_signatures", {
      _unsigned_tx_id: unsignedTransactionId,
      _master_fingerprint: masterFingerprint,
      _partial_signatures: convertedPartialSignatures,
    }).single();

    if (error) {
      console.error("error submitPartialSignatures", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  getUnsignedTx = async (unsignedTransactionId: string) => {
    const { data, error } = await this.supabase
      .from("unsigned_transactions")
      .select("*, partial_signatures(*)")
      .eq("id", unsignedTransactionId);

    if (error) {
      console.error("error unsignedTx", error.message);
      throw new Error(error.message);
    }

    return data;
  }

  broadcastTx = async (unsignedTransactionId: string, blockchainTxId: string) => {
    const { error } = await this.supabase.rpc("broadcast_tx", {
      _unsigned_tx_id: unsignedTransactionId,
      _blockchain_txid: blockchainTxId,
    });

    if (error) {
      console.error("error broadcastTx", error.message);
      throw new Error(error.message);
    }
  }
}
export default Supabase;
