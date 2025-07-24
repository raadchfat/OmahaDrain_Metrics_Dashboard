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
      SoldLineitems: {
        Row: {
          "Customer ID": number
          "Invoice Date": string
          "Customer": string | null
          "Email": string | null
          "Phone": string | null
          "Location Name": string | null
          "Street": string | null
          "Apt/Suite": string | null
          "City": string | null
          "State": string | null
          "Zip Code": number | null
          "Member Status": string | null
          "Invoice": number | null
          "Job": string | null
          "Opp. Owner": string | null
          "Department": string | null
          "Category": string | null
          "Line Item": string | null
          "Quantity": number | null
          "Price": number | null
          "Price Adjustment": string | null
          "Price Adjusted At": string | null
          "Price Adjusted By": string | null
          "Original Price": string | null
          "Adjusted Price": string | null
          "Primary Key": string
        }
        Insert: {
          [key: string]: any
        }
        Update: {
          [key: string]: any
        }
      }
    }
  }
}