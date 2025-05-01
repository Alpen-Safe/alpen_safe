export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address: string
          address_index: number
          change: boolean
          created_at: string
          handed_out: boolean | null
          id: number
          is_used: boolean
          wallet_id: string
        }
        Insert: {
          address: string
          address_index: number
          change: boolean
          created_at?: string
          handed_out?: boolean | null
          id?: number
          is_used?: boolean
          wallet_id: string
        }
        Update: {
          address?: string
          address_index?: number
          change?: boolean
          created_at?: string
          handed_out?: boolean | null
          id?: number
          is_used?: boolean
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "btc_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "addresses_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_sig_wallets: {
        Row: {
          chain: Database["public"]["Enums"]["supported_chains"]
          created_at: string
          id: string
          m: number
          n: number
          name: string
          server_signers: number
          updated_at: string
          wallet_descriptor: string
        }
        Insert: {
          chain?: Database["public"]["Enums"]["supported_chains"]
          created_at?: string
          id?: string
          m: number
          n: number
          name: string
          server_signers: number
          updated_at?: string
          wallet_descriptor: string
        }
        Update: {
          chain?: Database["public"]["Enums"]["supported_chains"]
          created_at?: string
          id?: string
          m?: number
          n?: number
          name?: string
          server_signers?: number
          updated_at?: string
          wallet_descriptor?: string
        }
        Relationships: []
      }
      psbts: {
        Row: {
          created_at: string | null
          id: number
          psbt_base64: string
          public_key_id: number | null
          unsigned_transaction_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          psbt_base64: string
          public_key_id?: number | null
          unsigned_transaction_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          psbt_base64?: string
          public_key_id?: number | null
          unsigned_transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "psbts_public_key_id_fkey"
            columns: ["public_key_id"]
            isOneToOne: false
            referencedRelation: "public_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "psbts_unsigned_transaction_id_fkey"
            columns: ["unsigned_transaction_id"]
            isOneToOne: false
            referencedRelation: "unsigned_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      public_keys: {
        Row: {
          account_node_derivation_path: string
          created_at: string
          device: string
          id: number
          label: string | null
          user_id: string
          xpub: string
        }
        Insert: {
          account_node_derivation_path: string
          created_at?: string
          device: string
          id?: number
          label?: string | null
          user_id: string
          xpub: string
        }
        Update: {
          account_node_derivation_path?: string
          created_at?: string
          device?: string
          id?: number
          label?: string | null
          user_id?: string
          xpub?: string
        }
        Relationships: []
      }
      server_signers: {
        Row: {
          account_id: number
          account_node_derivation_path: string | null
          created_at: string
          wallet_id: string | null
          xpub: string | null
        }
        Insert: {
          account_id?: number
          account_node_derivation_path?: string | null
          created_at?: string
          wallet_id?: string | null
          xpub?: string | null
        }
        Update: {
          account_id?: number
          account_node_derivation_path?: string | null
          created_at?: string
          wallet_id?: string | null
          xpub?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_signers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "btc_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "server_signers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_inputs: {
        Row: {
          transaction_id: number
          utxo_id: number
        }
        Insert: {
          transaction_id: number
          utxo_id: number
        }
        Update: {
          transaction_id?: number
          utxo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_inputs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_inputs_utxo_id_fkey"
            columns: ["utxo_id"]
            isOneToOne: false
            referencedRelation: "utxos"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_outputs: {
        Row: {
          transaction_id: number
          utxo_id: number
        }
        Insert: {
          transaction_id: number
          utxo_id: number
        }
        Update: {
          transaction_id?: number
          utxo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_outputs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_outputs_utxo_id_fkey"
            columns: ["utxo_id"]
            isOneToOne: false
            referencedRelation: "utxos"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          chain: Database["public"]["Enums"]["supported_chains"]
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          id: number
          transaction_id: string
        }
        Insert: {
          chain?: Database["public"]["Enums"]["supported_chains"]
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: number
          transaction_id: string
        }
        Update: {
          chain?: Database["public"]["Enums"]["supported_chains"]
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: number
          transaction_id?: string
        }
        Relationships: []
      }
      unsigned_transaction_inputs: {
        Row: {
          unsigned_transaction_id: string
          utxo_id: number
        }
        Insert: {
          unsigned_transaction_id: string
          utxo_id: number
        }
        Update: {
          unsigned_transaction_id?: string
          utxo_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "unsigned_transaction_inputs_unsigned_transaction_id_fkey"
            columns: ["unsigned_transaction_id"]
            isOneToOne: false
            referencedRelation: "unsigned_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unsigned_transaction_inputs_utxo_id_fkey"
            columns: ["utxo_id"]
            isOneToOne: false
            referencedRelation: "utxos"
            referencedColumns: ["id"]
          },
        ]
      }
      unsigned_transactions: {
        Row: {
          created_at: string | null
          id: string
          initiated_by: string
          is_broadcasted: boolean
          is_cancelled: boolean
          is_complete: boolean
          is_signing: boolean
          signatures_count: number
          wallet_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          initiated_by: string
          is_broadcasted?: boolean
          is_cancelled?: boolean
          is_complete?: boolean
          is_signing?: boolean
          signatures_count?: number
          wallet_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          initiated_by?: string
          is_broadcasted?: boolean
          is_cancelled?: boolean
          is_complete?: boolean
          is_signing?: boolean
          signatures_count?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unsigned_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "btc_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "unsigned_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signers: {
        Row: {
          public_key_id: number
          wallet_id: string
        }
        Insert: {
          public_key_id: number
          wallet_id: string
        }
        Update: {
          public_key_id?: number
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signers_public_key_id_fkey"
            columns: ["public_key_id"]
            isOneToOne: false
            referencedRelation: "public_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_signers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "btc_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "user_signers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      utxos: {
        Row: {
          address_id: number | null
          confirmed: boolean
          created_at: string
          id: number
          is_spent: boolean
          reserved: boolean | null
          updated_at: string
          utxo: string
          value: number
        }
        Insert: {
          address_id?: number | null
          confirmed?: boolean
          created_at?: string
          id?: number
          is_spent?: boolean
          reserved?: boolean | null
          updated_at?: string
          utxo: string
          value: number
        }
        Update: {
          address_id?: number | null
          confirmed?: boolean
          created_at?: string
          id?: number
          is_spent?: boolean
          reserved?: boolean | null
          updated_at?: string
          utxo?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "utxos_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_owners: {
        Row: {
          role: Database["public"]["Enums"]["wallet_owner_role"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          role: Database["public"]["Enums"]["wallet_owner_role"]
          user_id: string
          wallet_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["wallet_owner_role"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_owners_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "btc_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "wallet_owners_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      btc_wallet_balance: {
        Row: {
          balance: number | null
          wallet_id: string | null
        }
        Relationships: []
      }
      server_signers_limited: {
        Row: {
          wallet_id: string | null
          xpub: string | null
        }
        Insert: {
          wallet_id?: string | null
          xpub?: string | null
        }
        Update: {
          wallet_id?: string | null
          xpub?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_signers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "btc_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "server_signers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_addresses: {
        Args: { _wallet_id: string; _addresses: Json }
        Returns: undefined
      }
      create_wallet: {
        Args:
          | {
              _user_id: string
              _wallet_name: string
              _m: number
              _n: number
              _chain: Database["public"]["Enums"]["supported_chains"]
              _wallet_descriptor: string
              _server_signers: number
              _server_signer_id: number
              _server_signer_derivation_path: string
              _server_xpub: string
              _user_public_keys: Json[]
            }
          | {
              _user_id: string
              _wallet_name: string
              _m: number
              _n: number
              _chain: Database["public"]["Enums"]["supported_chains"]
              _wallet_descriptor: string
              _server_signers: number
              _server_signer_id: number
              _server_signer_derivation_path: string
              _user_public_keys: Json[]
            }
        Returns: string
      }
      get_or_create_public_key: {
        Args:
          | {
              _user_id: string
              _xpub: string
              _account_node_derivation_path: string
            }
          | {
              _user_id: string
              _xpub: string
              _account_node_derivation_path: string
              _device: string
              _label?: string
            }
        Returns: number
      }
      get_tx_history: {
        Args: { _wallet_id: string }
        Returns: {
          transaction_id: string
          created_at: string
          confirmed_at: string
          chain: Database["public"]["Enums"]["supported_chains"]
          confirmed: boolean
          input_value: number
          output_value: number
        }[]
      }
      get_wallet_data: {
        Args: { _wallet_id: string }
        Returns: {
          account_id: number
          m: number
          user_xpubs: string[]
        }[]
      }
      get_wallet_utxos: {
        Args: { _wallet_id: string }
        Returns: {
          utxo: string
          value: number
          is_spent: boolean
          confirmed: boolean
          address: string
          address_index: number
          change: boolean
        }[]
      }
      handout_addresses: {
        Args: { _wallet_id: string; _is_change?: boolean; _amount?: number }
        Returns: {
          address: string
          address_index: number
          change: boolean
        }[]
      }
      initiate_spend_transaction: {
        Args: {
          _unsigned_transaction_id: string
          _wallet_id: string
          _psbt_base64: string
          _inputs: string[]
          _outputs: Json
          _fee_per_byte: number
          _initiated_by: string
        }
        Returns: undefined
      }
      received_utxo_in_monitored_address: {
        Args: {
          _txid: string
          _address: string
          _utxo: string
          _value: number
          _is_spent: boolean
          _confirmed: boolean
        }
        Returns: undefined
      }
      submit_signed_psbt: {
        Args: {
          _unsigned_transaction_id: string
          _psbt_base64: string
          _public_key: string
        }
        Returns: {
          is_complete: boolean
          signatures_count: number
        }[]
      }
      user_owns_wallet: {
        Args: { wallet_id: string }
        Returns: boolean
      }
    }
    Enums: {
      supported_chains: "bitcoin" | "ethereum"
      wallet_owner_role: "admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      supported_chains: ["bitcoin", "ethereum"],
      wallet_owner_role: ["admin", "viewer"],
    },
  },
} as const

