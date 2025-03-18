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
          user_owner: string
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
          user_owner: string
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
          user_owner?: string
          wallet_descriptor?: string
        }
        Relationships: []
      }
      public_keys: {
        Row: {
          account_node_derivation_path: string | null
          id: number
          user_id: string
          xpub: string
        }
        Insert: {
          account_node_derivation_path?: string | null
          id?: number
          user_id: string
          xpub: string
        }
        Update: {
          account_node_derivation_path?: string | null
          id?: number
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
        }
        Insert: {
          account_id?: number
          account_node_derivation_path?: string | null
          created_at?: string
          wallet_id?: string | null
        }
        Update: {
          account_id?: number
          account_node_derivation_path?: string | null
          created_at?: string
          wallet_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_wallet: {
        Args: {
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
        Args: {
          _user_id: string
          _xpub: string
          _account_node_derivation_path: string
        }
        Returns: number
      }
    }
    Enums: {
      supported_chains: "bitcoin" | "ethereum"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

