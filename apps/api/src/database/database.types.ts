export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          document_id: string;
          embedding: string;
          embedding_model: string;
          heading_path: string[];
          id: number;
          user_id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          document_id: string;
          embedding: string;
          embedding_model: string;
          heading_path?: string[];
          id?: never;
          user_id?: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          document_id?: string;
          embedding?: string;
          embedding_model?: string;
          heading_path?: string[];
          id?: never;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_chunks_document_id_user_id_fkey';
            columns: ['document_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      documents: {
        Row: {
          content: string;
          content_hash: string;
          created_at: string;
          embedding_error: string | null;
          embedding_model: string | null;
          embedding_status: Database['public']['Enums']['embedding_status'];
          id: string;
          tags: string[];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content: string;
          content_hash?: string;
          created_at?: string;
          embedding_error?: string | null;
          embedding_model?: string | null;
          embedding_status?: Database['public']['Enums']['embedding_status'];
          id?: string;
          tags?: string[];
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          content?: string;
          content_hash?: string;
          created_at?: string;
          embedding_error?: string | null;
          embedding_model?: string | null;
          embedding_status?: Database['public']['Enums']['embedding_status'];
          id?: string;
          tags?: string[];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          citations: Json;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          model: string | null;
          role: Database['public']['Enums']['message_role'];
          user_id: string;
        };
        Insert: {
          citations?: Json;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          model?: string | null;
          role: Database['public']['Enums']['message_role'];
          user_id?: string;
        };
        Update: {
          citations?: Json;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          model?: string | null;
          role?: Database['public']['Enums']['message_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_user_id_fkey';
            columns: ['conversation_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      usage_events: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          id: number;
          kind: Database['public']['Enums']['usage_kind'];
          model: string;
          prompt_tokens: number | null;
          provider: string;
          user_id: string;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          id?: never;
          kind: Database['public']['Enums']['usage_kind'];
          model: string;
          prompt_tokens?: number | null;
          provider: string;
          user_id?: string;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          id?: never;
          kind?: Database['public']['Enums']['usage_kind'];
          model?: string;
          prompt_tokens?: number | null;
          provider?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      embedding_dimensions: { Args: never; Returns: number };
      list_document_summaries: {
        Args: { with_tag?: string };
        Returns: {
          created_at: string;
          embedding_error: string;
          embedding_model: string;
          embedding_status: Database['public']['Enums']['embedding_status'];
          excerpt: string;
          id: string;
          tags: string[];
          title: string;
          updated_at: string;
        }[];
      };
      list_document_tags: {
        Args: never;
        Returns: {
          documents: number;
          tag: string;
        }[];
      };
      match_document_chunks: {
        Args: {
          match_count?: number;
          min_similarity?: number;
          model: string;
          query_embedding: string;
        };
        Returns: {
          chunk_index: number;
          content: string;
          document_id: string;
          document_title: string;
          heading_path: string[];
          id: number;
          similarity: number;
        }[];
      };
      replace_document_chunks: {
        Args: {
          chunks: Json;
          expected_content_hash: string;
          model: string;
          target_document_id: string;
        };
        Returns: boolean;
      };
      usage_by_day: {
        Args: { since: string };
        Returns: {
          calls: number;
          completion_tokens: number;
          day: string;
          kind: Database['public']['Enums']['usage_kind'];
          model: string;
          prompt_tokens: number;
          provider: string;
          unreported_calls: number;
        }[];
      };
    };
    Enums: {
      embedding_status: 'pending' | 'ready' | 'failed';
      message_role: 'user' | 'assistant';
      usage_kind: 'chat' | 'condense' | 'embedding';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      embedding_status: ['pending', 'ready', 'failed'],
      message_role: ['user', 'assistant'],
      usage_kind: ['chat', 'condense', 'embedding'],
    },
  },
} as const;
