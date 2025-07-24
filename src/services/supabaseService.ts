import { supabase } from '../lib/supabase'
import { KPIData, TimeSeriesData, DateRange } from '../types'
import { isDateInRange } from '../utils/dateUtils'

export class SupabaseService {
  async getKPIData(dateRange: DateRange): Promise<KPIData> {
    try {
      const { data, error } = await supabase
        .from('kpi_data')
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
        // Return default values if no data found
        return this.getDefaultKPIData()
      }

      const latestData = data[0]
      return {
        installCallsPercentage: latestData.install_calls_percentage,
        installRevenuePerCall: latestData.install_revenue_per_call,
        jettingJobsPercentage: latestData.jetting_jobs_percentage,
        jettingRevenuePerCall: latestData.jetting_revenue_per_call,
        descalingJobsPercentage: latestData.descaling_jobs_percentage,
        descalingRevenuePerCall: latestData.descaling_revenue_per_call,
        membershipConversionRate: latestData.membership_conversion_rate,
        totalMembershipsRenewed: latestData.total_memberships_renewed,
        techPayPercentage: latestData.tech_pay_percentage,
        laborRevenuePerHour: latestData.labor_revenue_per_hour,
        jobEfficiency: latestData.job_efficiency,
        zeroRevenueCallPercentage: latestData.zero_revenue_call_percentage,
        diagnosticFeeOnlyPercentage: latestData.diagnostic_fee_only_percentage,
        callbackPercentage: latestData.callback_percentage,
        clientComplaintPercentage: latestData.client_complaint_percentage,
        clientReviewPercentage: latestData.client_review_percentage
      }
    } catch (error) {
      console.error('Error in getKPIData:', error)
      return this.getDefaultKPIData()
    }
  }

  async getTimeSeriesData(dateRange: DateRange): Promise<TimeSeriesData[]> {
    try {
      const { data, error } = await supabase
        .from('time_series_data')
        .select('*')
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (error) {
        console.error('Error fetching time series data:', error)
        throw error
      }

      return data?.map(row => ({
        date: row.date,
        value: row.value,
        metric: row.metric
      })) || []
    } catch (error) {
      console.error('Error in getTimeSeriesData:', error)
      return []
    }
  }

  async insertKPIData(date: string, kpiData: KPIData): Promise<void> {
    try {
      const { error } = await supabase
        .from('kpi_data')
        .insert({
          date,
          install_calls_percentage: kpiData.installCallsPercentage,
          install_revenue_per_call: kpiData.installRevenuePerCall,
          jetting_jobs_percentage: kpiData.jettingJobsPercentage,
          jetting_revenue_per_call: kpiData.jettingRevenuePerCall,
          descaling_jobs_percentage: kpiData.descalingJobsPercentage,
          descaling_revenue_per_call: kpiData.descalingRevenuePerCall,
          membership_conversion_rate: kpiData.membershipConversionRate,
          total_memberships_renewed: kpiData.totalMembershipsRenewed,
          tech_pay_percentage: kpiData.techPayPercentage,
          labor_revenue_per_hour: kpiData.laborRevenuePerHour,
          job_efficiency: kpiData.jobEfficiency,
          zero_revenue_call_percentage: kpiData.zeroRevenueCallPercentage,
          diagnostic_fee_only_percentage: kpiData.diagnosticFeeOnlyPercentage,
          callback_percentage: kpiData.callbackPercentage,
          client_complaint_percentage: kpiData.clientComplaintPercentage,
          client_review_percentage: kpiData.clientReviewPercentage
        })

      if (error) {
        console.error('Error inserting KPI data:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in insertKPIData:', error)
      throw error
    }
  }

  async insertTimeSeriesData(timeSeriesData: TimeSeriesData[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('time_series_data')
        .insert(
          timeSeriesData.map(data => ({
            date: data.date,
            metric: data.metric,
            value: data.value
          }))
        )

      if (error) {
        console.error('Error inserting time series data:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in insertTimeSeriesData:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('kpi_data')
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