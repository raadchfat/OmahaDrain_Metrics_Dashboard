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
      console.log('Using Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Table name:', this.tableName);
      
      // Add timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      // First, test basic connection and check if table exists
      try {
        console.log('Testing basic Supabase connection...');
        const connectionTest = supabase
          .from(this.tableName)
          .select('"Primary Key"', { count: 'exact', head: true });

        const { count, error: countError } = await Promise.race([
          connectionTest,
          timeoutPromise
        ]) as any;

        if (countError) {
          console.error('❌ Table access error:', countError);
          if (countError.code === 'PGRST116') {
            throw new Error(`Table "${this.tableName}" does not exist. Please check your table name in Settings.`);
          }
          if (countError.code === '42501') {
            throw new Error(`Permission denied. Please check your Supabase RLS policies for table "${this.tableName}".`);
          }
          throw new Error(`Database error: ${countError.message}`);
        }

        console.log(`✅ Table "${this.tableName}" exists with ${count || 0} total rows`);
        
        if (count === 0) {
          console.warn(`⚠️ Table "${this.tableName}" is empty`);
          return this.getDefaultKPIData();
        }

        // Now try to fetch sample data
        const sampleDataPromise = supabase
          .from(this.tableName)
          .select('"Customer ID", "Invoice Date", "Department", "Price", "Line Item", "Job"')
          .order('Invoice Date', { ascending: false })
          .limit(10);

        const { data: allData, error: allError } = await Promise.race([
          sampleDataPromise,
          timeoutPromise
        ]) as any;

        if (allError) {
          console.error('❌ Error fetching sample data:', allError);
          throw new Error(`Failed to fetch data: ${allError.message}`);
        } else {
          console.log('Sample data from table (first 10 rows):');
          console.log('Total rows in sample:', allData?.length || 0);
          if (allData && allData.length > 0) {
            console.log('Sample row structure:', Object.keys(allData[0]));
            console.log('Sample Invoice Date values:', allData.slice(0, 5).map(row => ({
              'Invoice Date': row['Invoice Date'],
              'Invoice Date type': typeof row['Invoice Date']
            })));
            
            // Check if we have any recent data at all
            const hasRecentData = allData.some(row => {
              const invoiceDate = new Date(row['Invoice Date']);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              return invoiceDate >= thirtyDaysAgo;
            });
            console.log('Has data from last 30 days:', hasRecentData);
          } else {
            console.warn('⚠️ No sample data returned from table');
          }
        }
      } catch (sampleError) {
        console.error('❌ Could not fetch sample data:', sampleError);
        throw sampleError;
      }
      
      // Try multiple date filtering approaches
      let data = null;
      let error = null;
      
      // Approach 1: Standard date filtering
      try {
        console.log('Trying standard date filtering...');
        const standardPromise = supabase
          .from(this.tableName)
          .select('"Customer ID", "Invoice Date", "Department", "Price", "Line Item", "Job", "Customer"')
          .gte('Invoice Date', dateRange.start.toISOString().split('T')[0])
          .lte('Invoice Date', dateRange.end.toISOString().split('T')[0])
          .order('Invoice Date', { ascending: false });

        const result = await Promise.race([standardPromise, timeoutPromise]) as any;
        data = result.data;
        error = result.error;
        
        if (error) {
          console.error('❌ Standard date filtering error:', error);
        }
        
        if (data && data.length > 0) {
          console.log('Standard date filtering worked! Found', data.length, 'rows');
        } else {
          console.log('Standard date filtering returned no results');
        }
      } catch (standardError) {
        console.error('❌ Standard date filtering failed:', standardError);
      }
      
      // Approach 2: If no data found, try with different date formats
      if (!data || data.length === 0) {
        try {
          console.log('Trying alternative date filtering...');
          const altPromise = supabase
            .from(this.tableName)
            .select('"Customer ID", "Invoice Date", "Department", "Price", "Line Item", "Job", "Customer"')
            .gte('Invoice Date', dateRange.start.toISOString())
            .lte('Invoice Date', dateRange.end.toISOString())
            .order('Invoice Date', { ascending: false });

          const altResult = await Promise.race([altPromise, timeoutPromise]) as any;
          
          if (altResult.error) {
            console.error('❌ Alternative date filtering error:', altResult.error);
          }
          
          if (altResult.data && altResult.data.length > 0) {
            data = altResult.data;
            error = altResult.error;
            console.log('Alternative date filtering worked! Found', data.length, 'rows');
          }
        } catch (altError) {
          console.error('❌ Alternative date filtering failed:', altError);
        }
      }
      
      // Approach 3: If still no data, try broader date range
      if (!data || data.length === 0) {
        try {
          console.log('Trying broader date range (last 90 days)...');
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          
          const broadPromise = supabase
            .from(this.tableName)
            .select('"Customer ID", "Invoice Date", "Department", "Price", "Line Item", "Job", "Customer"')
            .gte('Invoice Date', ninetyDaysAgo.toISOString().split('T')[0])
            .order('Invoice Date', { ascending: false });

          const broadResult = await Promise.race([broadPromise, timeoutPromise]) as any;
          
          if (broadResult.error) {
            console.error('❌ Broader date filtering error:', broadResult.error);
          }
          
          if (broadResult.data && broadResult.data.length > 0) {
            data = broadResult.data;
            error = broadResult.error;
            console.log('Broader date range worked! Found', data.length, 'rows');
          }
        } catch (broadError) {
          console.error('❌ Broader date filtering failed:', broadError);
        }
      }
      if (error) {
        console.error('Error fetching KPI data:', error);
      }

      console.log('Filtered data result:', {
        rowsFound: data?.length || 0,
        requestedDateRange: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`
      });
      
      if (!data || data.length === 0) {
        console.warn('No data found with any date filtering approach, trying without date filter...')
        
        try {
          // Try without date filtering to see if we can get any data
          const fallbackPromise = supabase
            .from(this.tableName)
            .select('"Customer ID", "Invoice Date", "Department", "Price", "Line Item", "Job", "Customer"')
            .order('Invoice Date', { ascending: false })
            .limit(1000);

          const { data: fallbackData, error: fallbackError } = await Promise.race([
            fallbackPromise,
            timeoutPromise
          ]) as any;
          
          if (fallbackError) {
            console.error('❌ Error fetching fallback data:', fallbackError);
            throw new Error(`Failed to fetch any data from table "${this.tableName}": ${fallbackError.message}`);
          }
          
          if (fallbackData && fallbackData.length > 0) {
            console.log('✅ Found data without date filter! Using all available data for calculation');
            console.log('Total rows found:', fallbackData.length);
            console.log('Date range in data:', {
              earliest: fallbackData[fallbackData.length - 1]?.['Invoice Date'],
              latest: fallbackData[0]?.['Invoice Date']
            });
            return this.calculateKPIsFromSoldLineitems(fallbackData);
          } else {
            throw new Error(`Table "${this.tableName}" appears to be empty or inaccessible`);
          }
        } catch (fallbackError) {
          console.error('❌ Fallback query failed:', fallbackError);
          throw fallbackError;
        }
      }

      // Calculate KPIs from the SoldLineitems data
      console.log('✅ Using filtered data for KPI calculation');
      return this.calculateKPIsFromSoldLineitems(data);
    } catch (error) {
      console.error('Error in getKPIData:', error);
      throw error;
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
    
    // Get all unique jobs (service calls) - this is our denominator
    const allJobs = [...new Set(data.map(row => row.Job).filter(Boolean))];
    console.log('Total unique jobs found:', allJobs.length);
    
    // Find jobs with install calls (any line item ≥$10k in the job)
    const jobsWithInstalls = new Set();
    const installLineItems = data.filter(row => {
      const price = Number(row.Price) || 0;
      if (price >= 10000) {
        jobsWithInstalls.add(row.Job);
        return true;
      }
      return false;
    });
    
    console.log('Install line items (≥$10k) found:', installLineItems.length);
    console.log('Jobs with installs found:', jobsWithInstalls.size);
    
    // Debug: Show some examples of install jobs
    if (installLineItems.length > 0) {
      console.log('Sample install line items:');
      installLineItems.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. Job: ${item.Job}, Price: $${item.Price}, Department: ${item.Department}, Line Item: ${item['Line Item']}`);
      });
    }
    
    // Debug: Check for drain cleaning specifically
    const drainCleaningItems = data.filter(row => {
      const dept = row.Department;
      return dept && dept.toLowerCase().includes('drain');
    });
    console.log('Items with "drain" in department:', drainCleaningItems.length);
    
    // Show unique department values for debugging
    const uniqueDepartments = [...new Set(data.map(row => row.Department).filter(Boolean))];
    console.log('All unique departments in data:', uniqueDepartments);
    
    // Calculate install call rate: Jobs with installs / Total jobs
    const installCallsPercentage = allJobs.length > 0 ? (jobsWithInstalls.size / allJobs.length) * 100 : 0;
    
    // Calculate install revenue per call: Total install revenue / Total jobs
    const totalInstallRevenue = installLineItems.reduce((sum, row) => sum + (Number(row.Price) || 0), 0);
    const installRevenuePerCall = allJobs.length > 0 ? totalInstallRevenue / allJobs.length : 0;
    
    console.log('=== CALCULATION RESULTS ===');
    console.log('Total jobs:', allJobs.length);
    console.log('Jobs with installs:', jobsWithInstalls.size);
    console.log('Install call rate:', installCallsPercentage.toFixed(2) + '%');
    console.log('Total install revenue:', totalInstallRevenue);
    console.log('Install revenue per call:', installRevenuePerCall);
    console.log('=== END DEBUGGING ===');
    
    // For other calculations, we'll use the same total jobs count
    const totalJobs = allJobs.length;
    
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
      installRevenuePerCall: installRevenuePerCall,
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
      
      // Test if table exists and is accessible
      const testPromise = supabase
        .from(this.tableName)
        .select('count', { count: 'exact', head: true });

      const { count, error } = await Promise.race([testPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Connection test error:', error);
        if (error.code === 'PGRST116') {
          console.error(`Table "${this.tableName}" does not exist`);
        } else if (error.code === '42501') {
          console.error(`Permission denied for table "${this.tableName}"`);
        }
        return false;
      }
      
      console.log(`✅ Connection successful! Table "${this.tableName}" has ${count || 0} rows`);
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }
  }

  async testConnectionDetailed(): Promise<{ success: boolean; message: string; rowCount?: number }> {
    try {
      console.log('🔍 Testing Supabase connection...');
      console.log('Table name:', this.tableName);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 5000);
      });
      
      // Test with your exact table structure
      const dataTestPromise = supabase
        .from(this.tableName)
        .select('"Primary Key", "Customer ID", "Invoice Date", "Department", "Price"')
        .limit(5);

      const { data, error } = await Promise.race([dataTestPromise, timeoutPromise]) as any;

      console.log('Query result:', { data: data?.length, error });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: `Table "${this.tableName}" does not exist. Please check your table name in Settings.`
          };
        } else if (error.code === '42501') {
          return {
            success: false,
            message: `Permission denied for table "${this.tableName}". Please check your Supabase RLS policies.`
          };
        } else {
          return {
            success: false,
            message: `Database error: ${error.message}`
          };
        }
      }
      
      if (!data || data.length === 0) {
        // Try to get count as fallback
        try {
          const { count } = await supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true });
          
          if (count === 0) {
            return {
              success: true,
              message: `Connected successfully, but table "${this.tableName}" is empty. Please add data to your table.`,
              rowCount: 0
            };
          }
        } catch (countError) {
          console.warn('Count query failed:', countError);
          console.warn('Could not get exact count, but table appears to have data');
        }
        
        return {
          success: true,
          message: `Connected successfully to table "${this.tableName}"! Data found and ready for KPI calculations.`,
          rowCount: undefined
        };
      }
      
      console.log('✅ Sample data retrieved:', data.slice(0, 2));
      console.log('Data structure:', Object.keys(data[0]));
      
      // Try to get approximate count
      let approximateCount = 'unknown';
      try {
        const { count } = await supabase
          .from(this.tableName)
          .select('*', { count: 'exact', head: true });
        approximateCount = count ? count.toString() : 'many';
      } catch (countError) {
        approximateCount = 'many';
      }
      
      return {
        success: true,
        message: `Successfully connected to table "${this.tableName}" with ${approximateCount} rows!`,
        rowCount: typeof approximateCount === 'string' ? undefined : parseInt(approximateCount)
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Legacy method for backward compatibility
  async testConnectionLegacy(): Promise<boolean> {
    try {
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