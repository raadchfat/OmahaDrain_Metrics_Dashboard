import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please connect to Supabase first.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types - update these to match your actual table structure
export type Database = {
  public: {
    Tables: {
      // Replace 'your_table_name' with your actual table name
      your_table_name: {
        Row: {
          id: string
          created_at: string
          date: string
          // Add your actual column names here
          [key: string]: any
        }
        Insert: {
          // Not needed for read-only access
          [key: string]: any
        }
        Update: {
          // Not needed for read-only access
          [key: string]: any
        }
      }
    }
  }
}