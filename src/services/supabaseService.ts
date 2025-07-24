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
      console.log('=== SUPABASE DATE FILTERING DEBUG ===');
      console.log('Requested date range:', {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        startDate: dateRange.start.toISOString().split('T')[0],
        endDate: dateRange.end.toISOString().split('T')[0]
      });
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      // First, let's see what data exists without date filtering
      try {
        const sampleDataPromise = supabase
          .from(this.tableName)
          .select('*')
          .order('Invoice Date', { ascending: false })
          .limit(10);

        const { data: allData, error: allError } = await Promise.race([
          sampleDataPromise,
          timeoutPromise
        ]) as any;

        if (allError) {
          console.error('Error fetching sample data:', allError);
        } else {
          console.log('Sample data from table (first 10 rows):');
          console.log('Total rows in sample:', allData?.length || 0);
          if (allData && allData.length > 0) {
            console.log('Sample row structure:', Object.keys(allData[0]));
            console.log('Sample Invoice Date values:', allData.slice(0, 5).map(row => ({
              'Invoice Date': row['Invoice Date'],
              'Invoice Date type': typeof row['Invoice Date']
            })));
          }
        }
      } catch (sampleError) {
        console.warn('Could not fetch sample data:', sampleError);
      }
      
      // Main data query with timeout
      const mainDataPromise = supabase
        .from(this.tableName)
        .select('*')
        .gte('Invoice Date', dateRange.start.toISOString().split('T')[0])
        .lte('Invoice Date', dateRange.end.toISOString().split('T')[0])
        .order('Invoice Date', { ascending: false });

      const { data, error } = await Promise.race([
        mainDataPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Error fetching KPI data:', error);
        // Don't throw immediately, try fallback
      }

      console.log('Filtered data result:', {
        rowsFound: data?.length || 0,
        dateFilter: {
          gte: dateRange.start.toISOString().split('T')[0],
          lte: dateRange.end.toISOString().split('T')[0]
        }
      });
      
      if (!data || data.length === 0) {
        console.warn('No data found in date range, trying without date filter...')
        
        try {
          // Try without date filtering to see if we can get any data
          const fallbackPromise = supabase
            .from(this.tableName)
            .select('*')
            .order('Invoice Date', { ascending: false })
            .limit(1000);

          const { data: fallbackData, error: fallbackError } = await Promise.race([
            fallbackPromise,
            timeoutPromise
          ]) as any;
          
          if (fallbackError) {
            console.error('Error fetching fallback data:', fallbackError);
            return this.getDefaultKPIData();
          }
          
          if (fallbackData && fallbackData.length > 0) {
            console.log('Found data without date filter, using all available data for calculation');
            console.log('Total rows found:', fallbackData.length);
            return this.calculateKPIsFromSoldLineitems(fallbackData);
          }
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
        }
        
        return this.getDefaultKPIData();
      }

      // Calculate KPIs from the SoldLineitems data
      return this.calculateKPIsFromSoldLineitems(data);
    } catch (error) {
      console.error('Error in getKPIData:', error);
      return this.getDefaultKPIData();
    }
  }

  // Calculate KPIs from SoldLineitems data
  private calculateKPIsFromSoldLineitems(data: any[]): KPIData {
    console.log('=== DEBUGGING INSTALL CALL RATE ===');
    console.log('Total rows received:', data.length);
    
    // Debug: Check sample data structure
    if (data.length > 0) {
      console.log('Sample row structure:', Object.keys(data[0]));
      console.log('Sample row data:', data[0]);
    }
    
    const totalRevenue = data.reduce((sum, row) => sum + (Number(row.Price) || 0), 0);
    
    // Debug: Check Department column values
    const departmentValues = data.map(row => row.Department).filter(Boolean);
    console.log('Sample Department values:', [...new Set(departmentValues)].slice(0, 10));
    
    // Debug: Check Price column values
    const priceValues = data.map(row => row.Price).filter(val => val !== null && val !== undefined);
    console.log('Sample Price values:', priceValues.slice(0, 10));
    console.log('Max price found:', Math.max(...priceValues.map(p => Number(p) || 0)));
    
    // Install calls: count of prices ≥$10k / count of all "Drain Cleaning" calls (exact match)
    const drainCleaningCalls = data.filter(row => {
      const dept = row.Department;
      return dept === 'Drain Cleaning';
    });
    console.log('Drain cleaning calls found:', drainCleaningCalls.length);
    
    const installCalls = data.filter(row => {
      const price = Number(row.Price) || 0;
      return price >= 10000;
    });
    console.log('Install calls (≥$10k) found:', installCalls.length);
    
    // Debug: Show some examples
    if (installCalls.length > 0) {
      console.log('Sample install call:', {
        price: installCalls[0].Price,
        department: installCalls[0].Department,
        lineItem: installCalls[0]['Line Item']
      });
    }
    
    const totalDrainCleaningCalls = drainCleaningCalls.length;
    const totalInstallCalls = installCalls.length;
    const installRevenue = installCalls.reduce((sum, row) => sum + (Number(row.Price) || 0), 0);
    
    const installCallsPercentage = totalDrainCleaningCalls > 0 ? (totalInstallCalls / totalDrainCleaningCalls) * 100 : 0;
    console.log('Install calls percentage calculated:', installCallsPercentage);
    console.log('=== END DEBUGGING ===');
    
    // For other calculations, we'll use total jobs
    const totalJobs = new Set(data.map(row => row.Job)).size;
    
    // Jetting jobs (line items containing "jetting" or similar)
    const jettingItems = data.filter(row => 
      (row['Line Item'] || '').toLowerCase().includes('jetting') ||
      (row['Line Item'] || '').toLowerCase().includes('jet')
    );
    const uniqueJettingJobs = new Set(jettingItems.map(row => row.Job)).size;
    const jettingRevenue = jettingItems.reduce((sum, row) => sum + (Number(row.Price) || 0), 0);
    
    // Descaling jobs
    const descalingItems = data.filter(row => 
      (row['Line Item'] || '').toLowerCase().includes('descaling') ||
      (row['Line Item'] || '').toLowerCase().includes('descale')
    );
    const uniqueDescalingJobs = new Set(descalingItems.map(row => row.Job)).size;
    const descalingRevenue = descalingItems.reduce((sum, row) => sum + (Number(row.Price) || 0), 0);
    
    // Membership data
    const membershipItems = data.filter(row => 
      (row['Line Item'] || '').toLowerCase().includes('membership') ||
      (row['Member Status'] || '').toLowerCase().includes('member')
    );
    const totalCustomers = new Set(data.map(row => row['Customer ID'])).size;
    
    // Zero revenue calls
    const zeroRevenueJobs = data.filter(row => (Number(row.Price) || 0) === 0);
    const uniqueZeroRevenueJobs = new Set(zeroRevenueJobs.map(row => row.Job)).size;
    
    // Diagnostic fee only (assuming diagnostic fees are typically $100-300)
    const diagnosticOnlyJobs = data.filter(row => {
      const price = Number(row.Price) || 0;
      return price > 0 && price <= 300 && 
        ((row['Line Item'] || '').toLowerCase().includes('diagnostic') ||
         (row['Line Item'] || '').toLowerCase().includes('service call'));
    });
    const uniqueDiagnosticOnlyJobs = new Set(diagnosticOnlyJobs.map(row => row.Job)).size;
    
    return {
      installCallsPercentage: installCallsPercentage,
      installRevenuePerCall: totalDrainCleaningCalls > 0 ? installRevenue / totalDrainCleaningCalls : 0,
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
      const installJobs = dayData.filter(row => (Number(row.Price) || 0) >= 10000);
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
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 5000);
      });
      
      const testPromise = supabase
        .from(this.tableName)
        .select('"Primary Key"')
        .limit(1);

      const { data, error } = await Promise.race([testPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Connection test error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  async getTotalCount(): Promise<{ count: number }> {
    try {
      const { count, error } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })

      if (error) {
        console.error('Error getting total count:', error)
        throw error
      }

      return { count: count || 0 }
    } catch (error) {
      console.error('Error in getTotalCount:', error)
      throw error
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