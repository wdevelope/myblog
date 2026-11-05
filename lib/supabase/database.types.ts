export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          slug: string
          sort_order: number
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          slug: string
          sort_order?: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          author_is_admin: boolean
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          author_is_admin?: boolean
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          author_is_admin?: boolean
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_profiles_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook_entries: {
        Row: {
          author_id: string
          author_is_admin: boolean
          content: string | null
          created_at: string
          id: string
          is_secret: boolean
          parent_id: string | null
        }
        Insert: {
          author_id: string
          author_is_admin?: boolean
          content?: string | null
          created_at?: string
          id?: string
          is_secret?: boolean
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          author_is_admin?: boolean
          content?: string | null
          created_at?: string
          id?: string
          is_secret?: boolean
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbook_entries_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "guestbook_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook_secret_contents: {
        Row: {
          content: string
          entry_id: string
        }
        Insert: {
          content: string
          entry_id: string
        }
        Update: {
          content?: string
          entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_secret_contents_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "guestbook_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          category_slug: string | null
          content: string
          created_at: string
          id: string
          image_keys: string[] | null
          slug: string
          thumbnail_image_key: string | null
          title: string
          type: string
          updated_at: string
          view_count: number
          visibility: string
        }
        Insert: {
          author_id?: string | null
          category_slug?: string | null
          content: string
          created_at?: string
          id?: string
          image_keys?: string[] | null
          slug: string
          thumbnail_image_key?: string | null
          title: string
          type: string
          updated_at?: string
          view_count?: number
          visibility: string
        }
        Update: {
          author_id?: string | null
          category_slug?: string | null
          content?: string
          created_at?: string
          id?: string
          image_keys?: string[] | null
          slug?: string
          thumbnail_image_key?: string | null
          title?: string
          type?: string
          updated_at?: string
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          id: string
          nickname: string | null
        }
        Insert: {
          avatar_path?: string | null
          id: string
          nickname?: string | null
        }
        Update: {
          avatar_path?: string | null
          id?: string
          nickname?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_nickname: { Args: { name: string }; Returns: string }
      create_guestbook_entry: {
        Args: { p_content: string; p_is_secret?: boolean; p_parent_id?: string }
        Returns: string
      }
      delete_category: {
        Args: { p_move_to?: string; p_slug: string }
        Returns: string
      }
      increment_post_view: { Args: { p_slug: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      move_category: {
        Args: { p_direction: string; p_slug: string }
        Returns: string
      }
      nickname_problem: { Args: { name: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
