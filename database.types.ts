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
          id: number
          is_used: boolean
          wallet_id: string
        }
        Insert: {
          address: string
          address_index: number
          change: boolean
          created_at?: string
          id?: number
          is_used?: boolean
          wallet_id: string
        }
        Update: {
          address?: string
          address_index?: number
          change?: boolean
          created_at?: string
          id?: number
          is_used?: boolean
          wallet_id?: string
        }
        Relationships: [
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
          value: number
        }
        Insert: {
          chain?: Database["public"]["Enums"]["supported_chains"]
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: number
          transaction_id: string
          value: number
        }
        Update: {
          chain?: Database["public"]["Enums"]["supported_chains"]
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: number
          transaction_id?: string
          value?: number
        }
        Relationships: []
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
            referencedRelation: "multi_sig_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
      get_wallet_data: {
        Args: { _wallet_id: string }
        Returns: {
          account_id: number
          m: number
          user_xpubs: string[]
        }[]
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

