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
        "Completed": text | null
        "Invoice": bigint | null
        "Customer": text | null
        "Email": text | null
        "Phone": text | null
        "Billing Street": text | null
        "Billing Apt/Suite": text | null
        "Billing City": text | null
        "Billing State": text | null
        "Billing Zip Code": bigint | null
        "Job": bigint
        "Location Name": text | null
        "Service Street": text | null
        "Service Zip Code": bigint | null
        "Department": text | null
        "Owner": text | null
        "Revenue": number | null
        "Balance": text | null
      }
      Insert: {
        "Completed"?: text | null
        "Invoice"?: bigint | null
        "Customer"?: text | null
        "Email"?: text | null
        "Phone"?: text | null
        "Billing Street"?: text | null
        "Billing Apt/Suite"?: text | null
        "Billing City"?: text | null
        "Billing State"?: text | null
        "Billing Zip Code"?: bigint | null
        "Job": bigint
        "Location Name"?: text | null
        "Service Street"?: text | null
        "Service Zip Code"?: bigint | null
        "Department"?: text | null
        "Owner"?: text | null
        "Revenue"?: number | null
        "Balance"?: text | null
      }
      Update: {
        "Completed"?: text | null
        "Invoice"?: bigint | null
        "Customer"?: text | null
        "Email"?: text | null
        "Phone"?: text | null
        "Billing Street"?: text | null
        "Billing Apt/Suite"?: text | null
        "Billing City"?: text | null
        "Billing State"?: text | null
        "Billing Zip Code"?: bigint | null
        "Job"?: bigint
        "Location Name"?: text | null
        "Service Street"?: text | null
        "Service Zip Code"?: bigint | null
        "Department"?: text | null
        "Owner"?: text | null
        "Revenue"?: number | null
        "Balance"?: text | null
      }
    }
  }
}