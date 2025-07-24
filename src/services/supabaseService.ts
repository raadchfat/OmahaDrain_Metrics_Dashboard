import { supabase } from '../lib/supabase'
import { KPIData, TimeSeriesData, DateRange } from '../types'
import { isDateInRange } from '../utils/dateUtils'

export class SupabaseService {
  private tableName: string;
  
  constructor(tableName: string = 'SoldLineitems') {
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
        .gte('Invoice Date', dateRange.start.toISOString().split('T')[0])
        .lte('Invoice Date', dateRange.end.toISOString().split('T')[0])
        .order('Invoice Date', { ascending: false })

      if (error) {
        console.error('Error fetching KPI data:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.warn('No data found in date range, returning default values')
        return this.getDefaultKPIData()
      }

      // Calculate KPIs from the SoldLineitems data
      return this.calculateKPIsFromSoldLineitems(data)
    } catch (error) {
      console.error('Error in getKPIData:', error)
      return this.getDefaultKPIData()
    }
  }

  // Calculate KPIs from SoldLineitems data
  private calculateKPIsFromSoldLineitems(data: any[]): KPIData {
    const totalJobs = new Set(data.map(row => row.Job)).size;
    const totalRevenue = data.reduce((sum, row) => sum + (row.Price || 0), 0);
    
    // Install calls (jobs with revenue >= $10,000)
    const installJobs = data.filter(row => (row.Price || 0) >= 10000);
    const uniqueInstallJobs = new Set(installJobs.map(row => row.Job)).size;
    const installRevenue = installJobs.reduce((sum, row) => sum + (row.Price || 0), 0);
    
    // Jetting jobs (line items containing "jetting" or similar)
    const jettingItems = data.filter(row => 
      (row['Line Item'] || '').toLowerCase().includes('jetting') ||
      (row['Line Item'] || '').toLowerCase().includes('jet')
    );
    const uniqueJettingJobs = new Set(jettingItems.map(row => row.Job)).size;
    const jettingRevenue = jettingItems.reduce((sum, row) => sum + (row.Price || 0), 0);
    
    // Descaling jobs
    const descalingItems = data.filter(row => 
      (row['Line Item'] || '').toLowerCase().includes('descaling') ||
      (row['Line Item'] || '').toLowerCase().includes('descale')
    );
    const uniqueDescalingJobs = new Set(descalingItems.map(row => row.Job)).size;
    const descalingRevenue = descalingItems.reduce((sum, row) => sum + (row.Price || 0), 0);
    
    // Membership data
    const membershipItems = data.filter(row => 
      (row['Line Item'] || '').toLowerCase().includes('membership') ||
      (row['Member Status'] || '').toLowerCase().includes('member')
    );
    const totalCustomers = new Set(data.map(row => row['Customer ID'])).size;
    
    // Zero revenue calls
    const zeroRevenueJobs = data.filter(row => (row.Price || 0) === 0);
    const uniqueZeroRevenueJobs = new Set(zeroRevenueJobs.map(row => row.Job)).size;
    
    // Diagnostic fee only (assuming diagnostic fees are typically $100-300)
    const diagnosticOnlyJobs = data.filter(row => {
      const price = row.Price || 0;
      return price > 0 && price <= 300 && 
        ((row['Line Item'] || '').toLowerCase().includes('diagnostic') ||
         (row['Line Item'] || '').toLowerCase().includes('service call'));
    });
    const uniqueDiagnosticOnlyJobs = new Set(diagnosticOnlyJobs.map(row => row.Job)).size;
    
    return {
      installCallsPercentage: totalJobs > 0 ? (uniqueInstallJobs / totalJobs) * 100 : 0,
      installRevenuePerCall: totalJobs > 0 ? installRevenue / totalJobs : 0,
      jettingJobsPercentage: totalJobs > 0 ? (uniqueJettingJobs / totalJobs) * 100 : 0,
      jettingRevenuePerCall: totalJobs > 0 ? jettingRevenue / totalJobs : 0,
      descalingJobsPercentage: totalJobs > 0 ? (uniqueDescalingJobs / totalJobs) * 100 : 0,
      descalingRevenuePerCall: totalJobs > 0 ? descalingRevenue / totalJobs : 0,
      membershipConversionRate: totalCustomers > 0 ? (membershipItems.length / totalCustomers) * 100 : 0,
      totalMembershipsRenewed: membershipItems.length,
      techPayPercentage: 0, // Would need additional data to calculate
      laborRevenuePerHour: 0, // Would need time tracking data
      jobEfficiency: 0, // Would need time allocation data
      zeroRevenueCallPercentage: totalJobs > 0 ? (uniqueZeroRevenueJobs / totalJobs) * 100 : 0,
      diagnosticFeeOnlyPercentage: totalJobs > 0 ? (uniqueDiagnosticOnlyJobs / totalJobs) * 100 : 0,
      callbackPercentage: 0, // Would need callback tracking data
      clientComplaintPercentage: 0, // Would need complaint tracking data
      clientReviewPercentage: 0 // Would need review tracking data
    }
  }
  
  async getTimeSeriesData(dateRange: DateRange): Promise<TimeSeriesData[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .gte('Invoice Date', dateRange.start.toISOString().split('T')[0])
        .lte('Invoice Date', dateRange.end.toISOString().split('T')[0])
        .order('Invoice Date', { ascending: true })

      if (error) {
        console.error('Error fetching time series data:', error)
        throw error
      }

      return this.calculateTimeSeriesFromSoldLineitems(data || [])
    } catch (error) {
      console.error('Error in getTimeSeriesData:', error)
      return []
    }
  }

  // Calculate time series data from SoldLineitems
  private calculateTimeSeriesFromSoldLineitems(rows: any[]): TimeSeriesData[] {
    // Group data by date and calculate daily metrics
    const dailyData = new Map<string, any[]>();
    
    rows.forEach(row => {
      const date = row['Invoice Date'];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(row);
    });
    
    // Calculate daily install call percentages
    return Array.from(dailyData.entries()).map(([date, dayData]) => {
      const totalJobs = new Set(dayData.map(row => row.Job)).size;
      const installJobs = dayData.filter(row => (row.Price || 0) >= 10000);
      const uniqueInstallJobs = new Set(installJobs.map(row => row.Job)).size;
      
      return {
        date,
        value: totalJobs > 0 ? (uniqueInstallJobs / totalJobs) * 100 : 0,
        metric: 'install_calls_percentage'
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Method to get raw data from your table for inspection
  async getRawData(limit: number = 100): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('Invoice Date', { ascending: false })
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
        .select('"Primary Key"')
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