import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please connect to Supabase first.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types will be generated automatically
export type Database = {
  public: {
    Tables: {
      kpi_data: {
        Row: {
          id: string
          created_at: string
          date: string
          install_calls_percentage: number
          install_revenue_per_call: number
          jetting_jobs_percentage: number
          jetting_revenue_per_call: number
          descaling_jobs_percentage: number
          descaling_revenue_per_call: number
          membership_conversion_rate: number
          total_memberships_renewed: number
          tech_pay_percentage: number
          labor_revenue_per_hour: number
          job_efficiency: number
          zero_revenue_call_percentage: number
          diagnostic_fee_only_percentage: number
          callback_percentage: number
          client_complaint_percentage: number
          client_review_percentage: number
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          install_calls_percentage: number
          install_revenue_per_call: number
          jetting_jobs_percentage: number
          jetting_revenue_per_call: number
          descaling_jobs_percentage: number
          descaling_revenue_per_call: number
          membership_conversion_rate: number
          total_memberships_renewed: number
          tech_pay_percentage: number
          labor_revenue_per_hour: number
          job_efficiency: number
          zero_revenue_call_percentage: number
          diagnostic_fee_only_percentage: number
          callback_percentage: number
          client_complaint_percentage: number
          client_review_percentage: number
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          install_calls_percentage?: number
          install_revenue_per_call?: number
          jetting_jobs_percentage?: number
          jetting_revenue_per_call?: number
          descaling_jobs_percentage?: number
          descaling_revenue_per_call?: number
          membership_conversion_rate?: number
          total_memberships_renewed?: number
          tech_pay_percentage?: number
          labor_revenue_per_hour?: number
          job_efficiency?: number
          zero_revenue_call_percentage?: number
          diagnostic_fee_only_percentage?: number
          callback_percentage?: number
          client_complaint_percentage?: number
          client_review_percentage?: number
        }
      }
      time_series_data: {
        Row: {
          id: string
          created_at: string
          date: string
          metric: string
          value: number
        }
        Insert: {
          id?: string
          created_at?: string
          date: string
          metric: string
          value: number
        }
        Update: {
          id?: string
          created_at?: string
          date?: string
          metric?: string
          value?: number
        }
      }
    }
  }
}