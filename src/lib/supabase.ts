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
          "Date": string | null
          "Job": number
          "Tags": string | null
          "Customer": string | null
          "Email": string | null
          "Phone": string | null
          "Location Name": string | null
          "Street": string | null
          "Apt/Suite": string | null
          "City": string | null
          "State": string | null
          "Zip Code": number | null
          "Department": string | null
          "Status": string | null
          "Opportunity Owner": string | null
          "Lead Type": string | null
          "Lead Source": string | null
          "Call Assigned To": string | null
          "Booking Call Source": string | null
          "Membership Opportunity": string | null
          "Membership Sold": string | null
          "Revenue": number | null
        }
        Insert: {
          "Date"?: string | null
          "Job": number
          "Tags"?: string | null
          "Customer"?: string | null
          "Email"?: string | null
          "Phone"?: string | null
          "Location Name"?: string | null
          "Street"?: string | null
          "Apt/Suite"?: string | null
          "City"?: string | null
          "State"?: string | null
          "Zip Code"?: number | null
          "Department"?: string | null
          "Status"?: string | null
          "Opportunity Owner"?: string | null
          "Lead Type"?: string | null
          "Lead Source"?: string | null
          "Call Assigned To"?: string | null
          "Booking Call Source"?: string | null
          "Membership Opportunity"?: string | null
          "Membership Sold"?: string | null
          "Revenue"?: number | null
        }
        Update: {
          "Date"?: string | null
          "Job"?: number
          "Tags"?: string | null
          "Customer"?: string | null
          "Email"?: string | null
          "Phone"?: string | null
          "Location Name"?: string | null
          "Street"?: string | null
          "Apt/Suite"?: string | null
          "City"?: string | null
          "State"?: string | null
          "Zip Code"?: number | null
          "Department"?: string | null
          "Status"?: string | null
          "Opportunity Owner"?: string | null
          "Lead Type"?: string | null
          "Lead Source"?: string | null
          "Call Assigned To"?: string | null
          "Booking Call Source"?: string | null
          "Membership Opportunity"?: string | null
          "Membership Sold"?: string | null
          "Revenue"?: number | null
        }
      }
    }
    Jobs_revenue: {
      Row: {
        "Completed": string | null
        "Invoice": string | null
        "Customer": string | null
        "Email": string | null
        "Phone": string | null
        "Billing Street": string | null
        "Apt": string | null
        "Billing City": string | null
        "Billing State": string | null
        "Billing Zip Code": string | null
        "Job": string
        "Tags": string | null
        "Location Name": string | null
        "Service Street": string | null
        "Department": string | null
        "Owner": string | null
        "Revenue": number | null
        "Balance": number | null
        "Primary Key": string
      }
      Insert: {
        "Completed"?: string | null
        "Invoice"?: string | null
        "Customer"?: string | null
        "Email"?: string | null
        "Phone"?: string | null
        "Billing Street"?: string | null
        "Apt"?: string | null
        "Billing City"?: string | null
        "Billing State"?: string | null
        "Billing Zip Code"?: string | null
        "Job": string
        "Tags"?: string | null
        "Location Name"?: string | null
        "Service Street"?: string | null
        "Department"?: string | null
        "Owner"?: string | null
        "Revenue"?: number | null
        "Balance"?: number | null
        "Primary Key": string
      }
      Update: {
        "Completed"?: string | null
        "Invoice"?: string | null
        "Customer"?: string | null
        "Email"?: string | null
        "Phone"?: string | null
        "Billing Street"?: string | null
        "Apt"?: string | null
        "Billing City"?: string | null
        "Billing State"?: string | null
        "Billing Zip Code"?: string | null
        "Job"?: string
        "Tags"?: string | null
        "Location Name"?: string | null
        "Service Street"?: string | null
        "Department"?: string | null
        "Owner"?: string | null
        "Revenue"?: number | null
        "Balance"?: number | null
        "Primary Key"?: string
      }
    }
  }
}