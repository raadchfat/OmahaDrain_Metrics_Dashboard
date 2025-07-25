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
          "Original Price": number | null
          "Adjusted Price": number | null
          "Primary Key": string
        }
        Insert: {
          [key: string]: any
        }
        Update: {
          [key: string]: any
        }
      }
      Opportunities: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          customer_name: string | null
          customer_email: string | null
          customer_phone: string | null
          opportunity_value: number | null
          opportunity_stage: string | null
          opportunity_source: string | null
          assigned_technician: string | null
          scheduled_date: string | null
          completion_date: string | null
          opportunity_type: string | null
          notes: string | null
          status: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          opportunity_value?: number | null
          opportunity_stage?: string | null
          opportunity_source?: string | null
          assigned_technician?: string | null
          scheduled_date?: string | null
          completion_date?: string | null
          opportunity_type?: string | null
          notes?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          customer_name?: string | null
          customer_email?: string | null
          customer_phone?: string | null
          opportunity_value?: number | null
          opportunity_stage?: string | null
          opportunity_source?: string | null
          assigned_technician?: string | null
          scheduled_date?: string | null
          completion_date?: string | null
          opportunity_type?: string | null
          notes?: string | null
          status?: string | null
        }
      }
    }
  }
}