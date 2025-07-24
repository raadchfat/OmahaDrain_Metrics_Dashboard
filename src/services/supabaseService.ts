import { supabase } from '../lib/supabase'
import { KPIData, TimeSeriesData, DateRange } from '../types'
import { isDateInRange } from '../utils/dateUtils'

export class SupabaseService {
  private tableName: string;
  
  constructor(tableName: string = 'your_table_name') {
    this.tableName = tableName;
  }
  
  // Method to set the table name dynamically
  setTableName(tableName: string) {
    this.tableName = tableName;
  }

  async getKPIData(dateRange: DateRange): Promise<KPIData> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching KPI data:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No data found in date range, returning default values')
        return this.getDefaultKPIData()
      }

      const latestData = data[0]
      
      // Map your actual column names to the KPI data structure
      return this.mapRowToKPIData(latestData)
    } catch (error) {
      console.error('Error in getKPIData:', error)
      return this.getDefaultKPIData()
    }
  }

  // Helper method to map your table columns to KPI data
  private mapRowToKPIData(row: any): KPIData {
    // TODO: Update this mapping to match your actual column names
    return {
      installCallsPercentage: row.install_calls_percentage || 0,
      installRevenuePerCall: row.install_revenue_per_call || 0,
      jettingJobsPercentage: row.jetting_jobs_percentage || 0,
      jettingRevenuePerCall: row.jetting_revenue_per_call || 0,
      descalingJobsPercentage: row.descaling_jobs_percentage || 0,
      descalingRevenuePerCall: row.descaling_revenue_per_call || 0,
      membershipConversionRate: row.membership_conversion_rate || 0,
      totalMembershipsRenewed: row.total_memberships_renewed || 0,
      techPayPercentage: row.tech_pay_percentage || 0,
      laborRevenuePerHour: row.labor_revenue_per_hour || 0,
      jobEfficiency: row.job_efficiency || 0,
      zeroRevenueCallPercentage: row.zero_revenue_call_percentage || 0,
      diagnosticFeeOnlyPercentage: row.diagnostic_fee_only_percentage || 0,
      callbackPercentage: row.callback_percentage || 0,
      clientComplaintPercentage: row.client_complaint_percentage || 0,
      clientReviewPercentage: row.client_review_percentage || 0
    }
  }
  async getTimeSeriesData(dateRange: DateRange): Promise<TimeSeriesData[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching time series data:', error)
        throw error
      }

      // Convert your data to time series format
      return this.mapRowsToTimeSeriesData(data || [])
    } catch (error) {
      console.error('Error in getTimeSeriesData:', error)
      return []
    }
  }

  // Helper method to convert your data to time series format
  private mapRowsToTimeSeriesData(rows: any[]): TimeSeriesData[] {
    // TODO: Update this to match how you want to create time series from your data
    return rows.map(row => ({
      date: row.date || row.created_at,
      value: row.install_calls_percentage || 0, // Use whatever metric you want to trend
      metric: 'install_calls'
    }))
  }

  // Method to get raw data from your table for inspection
  async getRawData(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching raw data:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getRawData:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('count')
        .limit(1)

      return !error
    } catch (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
  }

  private getDefaultKPIData(): KPIData {
    return {
      installCallsPercentage: 0,
      installRevenuePerCall: 0,
      jettingJobsPercentage: 0,
      jettingRevenuePerCall: 0,
      descalingJobsPercentage: 0,
      descalingRevenuePerCall: 0,
      membershipConversionRate: 0,
      totalMembershipsRenewed: 0,
      techPayPercentage: 0,
      laborRevenuePerHour: 0,
      jobEfficiency: 0,
      zeroRevenueCallPercentage: 0,
      diagnosticFeeOnlyPercentage: 0,
      callbackPercentage: 0,
      clientComplaintPercentage: 0,
      clientReviewPercentage: 0
    }
  }
}