import { supabase } from '../lib/supabase'
import { KPIData, TimeSeriesData, DateRange } from '../types'
import { isDateInRange } from '../utils/dateUtils'

export class SupabaseService {
  private tableName: string;
  
  constructor(tableName: string = 'SoldLineitems') {
    this.tableName = tableName;
  }
  
  // Helper method to get the correct database table name
  private getDbTableName(logicalName: string): string {
    switch (logicalName) {
      case 'SoldLineitems':
        return 'SoldLineitems'; // keep original casing
      case 'Opportunities':
        return 'Opportunities'; // keep original casing
      case 'Jobs_revenue':
        return 'Jobs_revenue'; // keep original casing for this table
      default:
        return logicalName; // keep original casing
    }
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

      // Get base KPI data from the primary table
      let baseKPIs: KPIData;
      if (this.tableName === 'Opportunities') {
        baseKPIs = await this.getOpportunitiesKPIData(dateRange, timeoutPromise);
      } else if (this.tableName === 'Jobs_revenue') {
        baseKPIs = await this.getJobsRevenueKPIData(dateRange, timeoutPromise);
      } else {
        baseKPIs = await this.getSoldLineitemsKPIData(dateRange, timeoutPromise);
      }
      
      // Always calculate client reviews from Reviews and Opportunities tables
      const clientReviewPercentage = await this.calculateClientReviewsKPI(dateRange, timeoutPromise);
      
      return {
        ...baseKPIs,
        clientReviewPercentage
      };
    } catch (error) {
      console.error('Error in getKPIData:', error);
      throw error;
    }
  }

  private async getSoldLineitemsKPIData(dateRange: DateRange, timeoutPromise: Promise<never>): Promise<KPIData> {
      // Step 1: Fetch ALL data first to understand the date range
      console.log('🔍 Step 1: Fetching sample data to understand date format...');
      const samplePromise = supabase
        .from(this.getDbTableName(this.tableName))
        .select('"Invoice Date", "Department", "Price", "Job"')
        .order('Invoice Date', { ascending: false })
        .limit(50);

      const { data: sampleData, error: sampleError } = await Promise.race([
        samplePromise,
        timeoutPromise
      ]) as any;

      if (sampleError) {
        console.error('❌ Error fetching sample data:', sampleError);
        throw new Error(`Failed to fetch data: ${sampleError.message}`);
      }

      if (!sampleData || sampleData.length === 0) {
        console.warn('⚠️ No data found in table');
        return this.getDefaultKPIData();
      }

      console.log('✅ Sample data retrieved:', {
        totalRows: sampleData.length,
        dateRange: {
          latest: sampleData[0]?.['Invoice Date'],
          earliest: sampleData[sampleData.length - 1]?.['Invoice Date']
        },
        sampleDates: sampleData.slice(0, 5).map(row => row['Invoice Date'])
      });

      // Step 2: Now fetch data with proper date filtering
      console.log('🔍 Step 2: Applying date filter...');
      console.log('Requested range:', {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0]
      });

      const filteredPromise = supabase
        .from(this.getDbTableName(this.tableName))
        .select('"Customer ID", "Invoice Date", "Department", "Price", "Line Item", "Job", "Customer"')
        .gte('Invoice Date', dateRange.start.toISOString().split('T')[0])
        .lte('Invoice Date', dateRange.end.toISOString().split('T')[0])
        .order('Invoice Date', { ascending: false });

      const { data: filteredData, error: filteredError } = await Promise.race([
        filteredPromise,
        timeoutPromise
      ]) as any;

      if (filteredError) {
        console.error('❌ Date filtering error:', filteredError);
        throw new Error(`Date filtering failed: ${filteredError.message}`);
      }

      console.log('✅ Date filtering result:', {
        rowsFound: filteredData?.length || 0,
        requestedRange: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`
      });

      // Step 3: If no data in range, show what dates we actually have
      if (!filteredData || filteredData.length === 0) {
        console.warn('⚠️ No data found in requested date range!');
        console.log('Available dates in your table:', {
          latest: sampleData[0]?.['Invoice Date'],
          earliest: sampleData[sampleData.length - 1]?.['Invoice Date'],
          sampleDates: sampleData.slice(0, 10).map(row => row['Invoice Date'])
        });
        
        // Return empty KPIs but don't throw error
        return this.getDefaultKPIData();
      }

      // Step 4: Calculate KPIs from filtered data
      console.log('✅ Calculating KPIs from filtered data...');
      return this.calculateKPIsFromSoldLineitems(filteredData);
  }

  // Separate method to calculate client reviews KPI that works with any primary table
  private async calculateClientReviewsKPI(dateRange: DateRange, timeoutPromise: Promise<never>): Promise<number> {
    try {
      console.log('🔍 Calculating Client Reviews KPI...');
      console.log('Date range for reviews calculation:', {
        start: dateRange.start.toISOString().split('T')[0],
        end: dateRange.end.toISOString().split('T')[0],
        primaryTable: this.tableName
      });
      
      // Get won opportunities in the date range
      console.log('🔍 Fetching won opportunities from Opportunities table...');
      const opportunitiesPromise = supabase
        .from('Opportunities')
        .select('"Job", "Status", "Date", "Primary Key"')
        .gte('"Date"', dateRange.start.toISOString().split('T')[0])
        .lte('"Date"', dateRange.end.toISOString().split('T')[0])
        .or('"Status".ilike.%won%,"Status".ilike.%closed won%,"Status".ilike.%completed%,"Status".ilike.%sold%');

      const { data: wonOpportunities, error: oppError } = await Promise.race([
        opportunitiesPromise,
        timeoutPromise
      ]) as any;

      if (oppError) {
        console.warn('Could not fetch opportunities for reviews calculation:', oppError);
        console.error('Opportunities query error details:', oppError);
        return 0; // Return 0 if can't fetch opportunities
      }

      console.log('✅ Won opportunities query result:', {
        totalFound: wonOpportunities?.length || 0,
        sampleData: wonOpportunities?.slice(0, 3),
        dateFilter: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`
      });

      // Get reviews in the date range
      console.log('🔍 Fetching reviews from Reviews table...');
      const reviewsPromise = supabase
        .from('Reviews')
        .select('"ID", "Rating", "Review Date", "Customer Name", "Source", "Status"')
        .gte('"Review Date"', dateRange.start.toISOString().split('T')[0])
        .lte('"Review Date"', dateRange.end.toISOString().split('T')[0]);

      const { data: reviews, error: reviewsError } = await Promise.race([
        reviewsPromise,
        timeoutPromise
      ]) as any;

      if (reviewsError) {
        console.warn('Could not fetch reviews for reviews calculation:', reviewsError);
        console.error('Reviews query error details:', reviewsError);
        return 0; // Return 0 if can't fetch reviews
      }

      console.log('✅ Reviews query result:', {
        totalFound: reviews?.length || 0,
        sampleData: reviews?.slice(0, 3),
        dateFilter: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`
      });

      const wonOpportunitiesCount = wonOpportunities?.length || 0;
      const reviewsCount = reviews?.length || 0;
      
      const clientReviewPercentage = wonOpportunitiesCount > 0 
        ? (reviewsCount / wonOpportunitiesCount) * 100 
        : 0;

      console.log('✅ Client Reviews calculation:', {
        wonOpportunities: wonOpportunitiesCount,
        reviews: reviewsCount,
        percentage: clientReviewPercentage.toFixed(2) + '%',
        dateRange: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`
      });

      // Additional debugging: Let's also check what statuses we're finding
      if (wonOpportunities && wonOpportunities.length > 0) {
        const statusCounts = wonOpportunities.reduce((acc: any, opp: any) => {
          const status = opp.Status || 'null';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Won opportunities by status:', statusCounts);
      }

      // Check review dates format
      if (reviews && reviews.length > 0) {
        console.log('📅 Sample review dates:', reviews.slice(0, 5).map((r: any) => ({
          id: r.ID,
          reviewDate: r['Review Date'],
          customer: r['Customer Name']
        })));
      }
      
      return clientReviewPercentage;

    } catch (error) {
      console.warn('Error calculating client reviews, using base KPIs:', error);
      console.error('Full error details:', error);
      return 0;
    }
  }

  private async getOpportunitiesKPIData(dateRange: DateRange, timeoutPromise: Promise<never>): Promise<KPIData> {
    console.log('🔍 Fetching Opportunities data with actual schema...');
    
    // Step 1: Fetch sample data to understand structure
    const samplePromise = supabase
      .from(this.getDbTableName(this.tableName))
      .select('"Date", "Job", "Customer", "Revenue", "Status", "Department", "Lead Type"')
      .order('"Date"', { ascending: false })
      .limit(50);

    const { data: sampleData, error: sampleError } = await Promise.race([
      samplePromise,
      timeoutPromise
    ]) as any;

    if (sampleError) {
      console.error('❌ Error fetching Opportunities sample data:', sampleError);
      throw new Error(`Failed to fetch Opportunities data: ${sampleError.message}`);
    }

    if (!sampleData || sampleData.length === 0) {
      console.warn('⚠️ No Opportunities data found');
      return this.getDefaultKPIData();
    }

    console.log('✅ Opportunities sample data retrieved:', {
      totalRows: sampleData.length,
      sampleData: sampleData.slice(0, 3)
    });

    // Step 2: Fetch filtered data
    const filteredPromise = supabase
      .from(this.getDbTableName(this.tableName))
      .select('*')
      .gte('"Date"', dateRange.start.toISOString().split('T')[0])
      .lte('"Date"', dateRange.end.toISOString().split('T')[0])
      .order('"Date"', { ascending: false });

    const { data: filteredData, error: filteredError } = await Promise.race([
      filteredPromise,
      timeoutPromise
    ]) as any;

    if (filteredError) {
      console.error('❌ Opportunities date filtering error:', filteredError);
      throw new Error(`Opportunities date filtering failed: ${filteredError.message}`);
    }

    console.log('✅ Opportunities date filtering result:', {
      rowsFound: filteredData?.length || 0
    });

    if (!filteredData || filteredData.length === 0) {
      return this.getDefaultKPIData();
    }

    return this.calculateKPIsFromOpportunities(filteredData);
  }

  private async getJobsRevenueKPIData(dateRange: DateRange, timeoutPromise: Promise<never>): Promise<KPIData> {
    console.log('🔍 Fetching Jobs_revenue data...');
    console.log('⚠️ Note: Jobs_revenue table does not have a date column, so date filtering is not applied');
    console.log('📋 Using exact table name: "Jobs_revenue" (case-sensitive)');
    
    // Step 1: Fetch sample data to understand structure
    const samplePromise = supabase
      .from(this.getDbTableName(this.tableName))
      .select('"Completed", "Job", "Customer", "Revenue", "Department", "Owner"')
      .order('"Job"', { ascending: false })
      .limit(50);

    const { data: sampleData, error: sampleError } = await Promise.race([
      samplePromise,
      timeoutPromise
    ]) as any;

    if (sampleError) {
      console.error('❌ Error fetching Jobs_revenue sample data:', sampleError);
      throw new Error(`Failed to fetch Jobs_revenue data: ${sampleError.message}`);
    }

    if (!sampleData || sampleData.length === 0) {
      console.warn('⚠️ No Jobs_revenue data found');
      return this.getDefaultKPIData();
    }

    console.log('✅ Jobs_revenue sample data retrieved:', {
      totalRows: sampleData.length,
      note: 'This table shows all jobs regardless of date range',
      sampleData: sampleData.slice(0, 3)
    });

    // Step 2: For Jobs_revenue, we don't have date filtering since there's no date column
    // We'll use all available data
    const allDataPromise = supabase
      .from(this.getDbTableName(this.tableName))
      .select('*')
      .order('"Job"', { ascending: false });

    const { data: allData, error: allDataError } = await Promise.race([
      allDataPromise,
      timeoutPromise
    ]) as any;

    if (allDataError) {
      console.error('❌ Jobs_revenue data fetch error:', allDataError);
      throw new Error(`Jobs_revenue data fetch failed: ${allDataError.message}`);
    }

    console.log('✅ Jobs_revenue data fetch result:', {
      rowsFound: allData?.length || 0,
      note: 'All jobs included (no date filtering available for this table)'
    });

    if (!allData || allData.length === 0) {
      return this.getDefaultKPIData();
    }

    return this.calculateKPIsFromJobsRevenue(allData);
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
      clientReviewPercentage: 0, // Calculated separately in calculateClientReviewsKPI
      debugData: {
        dataSource: `Supabase Database (${this.tableName})`,
        tableName: this.tableName,
        totalJobs: totalJobs,
        installJobs: jobsWithInstalls.size,
        totalInstallRevenue: totalInstallRevenue,
        calculatedAt: new Date().toISOString()
      }
    }
  }

  // Calculate KPIs from Opportunities data
  private calculateKPIsFromOpportunities(data: any[]): KPIData {
    console.log('=== CALCULATING OPPORTUNITIES KPIs ===');
    console.log('Total opportunities received:', data.length);
    
    if (data.length > 0) {
      console.log('Sample opportunity structure:', Object.keys(data[0]));
      console.log('Sample opportunity data:', data[0]);
    }
    
    const totalOpportunities = data.length;
    
    // Status analysis
    const statusGroups = data.reduce((acc, opp) => {
      const status = opp.Status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Opportunity statuses:', statusGroups);
    
    // Calculate conversion rates based on status
    const closedWon = data.filter(opp => 
      (opp.Status || '').toLowerCase().includes('won') ||
      (opp.Status || '').toLowerCase().includes('closed won') ||
      (opp.Status || '').toLowerCase().includes('completed')
      (opp.Status || '').toLowerCase().includes('sold')
    ).length;
    
    const closedLost = data.filter(opp => 
      (opp.Status || '').toLowerCase().includes('lost') ||
      (opp.Status || '').toLowerCase().includes('cancelled')
    ).length;
    
    // High-value opportunities (≥$10k)
    const highValueOpps = data.filter(opp => (Number(opp.Revenue) || 0) >= 10000);
    const installCallsPercentage = totalOpportunities > 0 ? (highValueOpps.length / totalOpportunities) * 100 : 0;
    
    // Average opportunity value
    const totalValue = data.reduce((sum, opp) => sum + (Number(opp.Revenue) || 0), 0);
    const avgOpportunityValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
    
    // Opportunities by lead type
    const typeGroups = data.reduce((acc, opp) => {
      const type = opp['Lead Type'] || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Lead types:', typeGroups);
    
    // Calculate specific service percentages
    const jettingOpps = data.filter(opp => 
      (opp.Department || '').toLowerCase().includes('jetting') ||
      (opp.Tags || '').toLowerCase().includes('jetting')
    ).length;
    
    const descalingOpps = data.filter(opp => 
      (opp.Department || '').toLowerCase().includes('descaling') ||
      (opp.Tags || '').toLowerCase().includes('descaling')
    ).length;
    
    const membershipOpps = data.filter(opp => 
      (opp['Membership Opportunity'] || '').toLowerCase().includes('yes') ||
      (opp['Membership Sold'] || '').toLowerCase().includes('yes')
    ).length;
    
    console.log('=== OPPORTUNITIES CALCULATION RESULTS ===');
    console.log('Total opportunities:', totalOpportunities);
    console.log('Closed won:', closedWon);
    console.log('High-value opportunities (≥$10k):', highValueOpps.length);
    console.log('Average opportunity value:', avgOpportunityValue);
    console.log('=== END OPPORTUNITIES DEBUGGING ===');
    
    return {
      installCallsPercentage: installCallsPercentage,
      installRevenuePerCall: avgOpportunityValue,
      jettingJobsPercentage: totalOpportunities > 0 ? (jettingOpps / totalOpportunities) * 100 : 0,
      jettingRevenuePerCall: 0, // Would need revenue data per opportunity type
      descalingJobsPercentage: totalOpportunities > 0 ? (descalingOpps / totalOpportunities) * 100 : 0,
      descalingRevenuePerCall: 0, // Would need revenue data per opportunity type
      membershipConversionRate: totalOpportunities > 0 ? (membershipOpps / totalOpportunities) * 100 : 0,
      totalMembershipsRenewed: membershipOpps,
      techPayPercentage: 0, // Not applicable for opportunities
      laborRevenuePerHour: 0, // Not applicable for opportunities
      jobEfficiency: totalOpportunities > 0 ? (closedWon / totalOpportunities) * 100 : 0, // Win rate as efficiency
      zeroRevenueCallPercentage: totalOpportunities > 0 ? (closedLost / totalOpportunities) * 100 : 0, // Loss rate
      diagnosticFeeOnlyPercentage: 0, // Not applicable for opportunities
      callbackPercentage: 0, // Would need follow-up data
      clientComplaintPercentage: 0, // Would need complaint tracking
      clientReviewPercentage: 0 // Calculated separately in calculateClientReviewsKPI
    };
  }
  
  // Calculate KPIs from Jobs_revenue data
  private calculateKPIsFromJobsRevenue(data: any[]): KPIData {
    console.log('=== CALCULATING JOBS_REVENUE KPIs ===');
    console.log('Total jobs received:', data.length);
    
    if (data.length > 0) {
      console.log('Sample job structure:', Object.keys(data[0]));
      console.log('Sample job data:', data[0]);
    }
    
    const totalJobs = data.length;
    
    // Revenue analysis
    const revenues = data.map(job => Number(job.Revenue) || 0);
    const totalRevenue = revenues.reduce((sum, rev) => sum + rev, 0);
    const avgRevenuePerJob = totalJobs > 0 ? totalRevenue / totalJobs : 0;
    
    // High-value jobs (≥$10k)
    const highValueJobs = data.filter(job => (Number(job.Revenue) || 0) >= 10000);
    const installCallsPercentage = totalJobs > 0 ? (highValueJobs.length / totalJobs) * 100 : 0;
    
    // Department analysis
    const departmentGroups = data.reduce((acc, job) => {
      const dept = job.Department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Department distribution:', departmentGroups);
    
    // Completion status analysis
    const completedJobs = data.filter(job => 
      (job.Completed || '').toLowerCase().includes('yes') ||
      (job.Completed || '').toLowerCase().includes('complete')
    ).length;
    
    // Service type analysis
    const jettingJobs = data.filter(job => 
      (job.Department || '').toLowerCase().includes('jetting') ||
      (job.Department || '').toLowerCase().includes('jet')
    ).length;
    
    const descalingJobs = data.filter(job => 
      (job.Department || '').toLowerCase().includes('descaling') ||
      (job.Department || '').toLowerCase().includes('descale')
    ).length;
    
    // Zero revenue jobs
    const zeroRevenueJobs = data.filter(job => (Number(job.Revenue) || 0) === 0).length;
    
    // Outstanding balance analysis
    const jobsWithBalance = data.filter(job => {
      const balance = Number(job.Balance) || 0;
      return balance > 0;
    }).length;
    
    console.log('=== JOBS_REVENUE CALCULATION RESULTS ===');
    console.log('Total jobs:', totalJobs);
    console.log('Completed jobs:', completedJobs);
    console.log('High-value jobs (≥$10k):', highValueJobs.length);
    console.log('Average revenue per job:', avgRevenuePerJob);
    console.log('Jobs with outstanding balance:', jobsWithBalance);
    console.log('=== END JOBS_REVENUE DEBUGGING ===');
    
    return {
      installCallsPercentage: installCallsPercentage,
      installRevenuePerCall: avgRevenuePerJob,
      jettingJobsPercentage: totalJobs > 0 ? (jettingJobs / totalJobs) * 100 : 0,
      jettingRevenuePerCall: 0, // Would need line item detail
      descalingJobsPercentage: totalJobs > 0 ? (descalingJobs / totalJobs) * 100 : 0,
      descalingRevenuePerCall: 0, // Would need line item detail
      membershipConversionRate: 0, // Not applicable for job revenue data
      totalMembershipsRenewed: 0, // Not applicable for job revenue data
      techPayPercentage: 0, // Would need cost data
      laborRevenuePerHour: 0, // Would need time tracking data
      jobEfficiency: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0, // Completion rate as efficiency
      zeroRevenueCallPercentage: totalJobs > 0 ? (zeroRevenueJobs / totalJobs) * 100 : 0,
      diagnosticFeeOnlyPercentage: 0, // Would need line item detail
      callbackPercentage: 0, // Not available in this data
      clientComplaintPercentage: 0, // Not available in this data
      clientReviewPercentage: 0 // Calculated separately in calculateClientReviewsKPI
    };
  }

  async getTimeSeriesData(dateRange: DateRange): Promise<TimeSeriesData[]> {
    try {
      const dateColumn = this.tableName === 'Opportunities' ? '"Date"' : 'Invoice Date';
      const selectColumns = this.tableName === 'Opportunities' 
        ? '"Date", "Revenue", "Status", "Department"'
        : '*';
      
      const { data, error } = await supabase
        .from(this.getDbTableName(this.tableName))
        .select(selectColumns)
        .gte(dateColumn, dateRange.start.toISOString().split('T')[0])
        .lte(dateColumn, dateRange.end.toISOString().split('T')[0])
        .order(dateColumn, { ascending: true })

      if (error) {
        console.error('Error fetching time series data:', error)
        throw error
      }

      if (this.tableName === 'Opportunities') {
        return this.calculateTimeSeriesFromOpportunities(data || [])
      } else if (this.tableName === 'Jobs_revenue') {
        return this.calculateTimeSeriesFromJobsRevenue(data || [])
      } else {
        return this.calculateTimeSeriesFromSoldLineitems(data || [])
      }
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

  // Calculate time series data from Opportunities
  private calculateTimeSeriesFromOpportunities(rows: any[]): TimeSeriesData[] {
    // Group data by date and calculate daily metrics
    const dailyData = new Map<string, any[]>();
    
    rows.forEach(row => {
      const date = row.Date; // Date is already in YYYY-MM-DD format
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(row);
    });
    
    // Calculate daily high-value opportunity percentages
    return Array.from(dailyData.entries()).map(([date, dayData]) => {
      const totalOpps = dayData.length;
      const highValueOpps = dayData.filter(row => (Number(row.Revenue) || 0) >= 10000).length;
      
      return {
        date,
        value: totalOpps > 0 ? (highValueOpps / totalOpps) * 100 : 0,
        metric: 'high_value_opportunities_percentage'
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Calculate time series data from Jobs_revenue
  private calculateTimeSeriesFromJobsRevenue(rows: any[]): TimeSeriesData[] {
    // Since Jobs_revenue doesn't have a date column, we'll create a simple trend
    // based on job numbers (assuming higher job numbers are more recent)
    const sortedJobs = rows.sort((a, b) => (parseInt(a.Job) || 0) - (parseInt(b.Job) || 0));
    
    // Group jobs into batches to create time series points
    const batchSize = Math.max(1, Math.floor(sortedJobs.length / 10)); // 10 data points
    const timeSeriesData: TimeSeriesData[] = [];
    
    for (let i = 0; i < sortedJobs.length; i += batchSize) {
      const batch = sortedJobs.slice(i, i + batchSize);
      const highValueJobs = batch.filter(job => (Number(job.Revenue) || 0) >= 10000).length;
      const batchTotal = batch.length;
      
      // Use the middle job number as a pseudo-date
      const middleJob = batch[Math.floor(batch.length / 2)];
      const pseudoDate = `Job-${middleJob?.Job || i}`;
      
      timeSeriesData.push({
        date: pseudoDate,
        value: batchTotal > 0 ? (highValueJobs / batchTotal) * 100 : 0,
        metric: 'high_value_jobs_percentage'
      });
    }
    
    return timeSeriesData;
  }

  // Method to get raw data from your table for inspection
  async getRawData(limit: number = 100): Promise<any[]> {
    try {
      let orderColumn: string;
      if (this.tableName === 'Opportunities') {
        orderColumn = '"Date"';
      } else if (this.tableName === 'Jobs_revenue') {
        orderColumn = '"Job"';
      } else if (this.tableName === 'Reviews') {
        orderColumn = '"Review Date"';
      } else if (this.tableName === 'memberships') {
        orderColumn = 'sold_on_clean';
      } else {
        orderColumn = '"Invoice Date"';
      }
      
      const { data, error } = await supabase
        .from(this.getDbTableName(this.tableName))
        .select('*')
        .order(orderColumn, { ascending: false })
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
        .from(this.getDbTableName(this.tableName))
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
      console.log('🔍 Testing Supabase connection for table:', this.tableName);
      console.log('Table name (exact):', `"${this.tableName}"`);
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection test timeout')), 5000);
      });
      
      // Test with table-specific columns
      let selectColumns: string;
      if (this.tableName === 'Opportunities') {
        selectColumns = '"Date", "Job", "Customer", "Revenue", "Status"';
      } else if (this.tableName === 'Jobs_revenue') {
        selectColumns = '"Job", "Customer", "Revenue", "Department", "Completed", "Primary Key"';
      } else if (this.tableName === 'Reviews') {
        selectColumns = '"ID", "Review Date", "Rating", "Customer Name", "Source", "Status"';
      } else if (this.tableName === 'memberships') {
        selectColumns = '"Primary Key", "Sold_On", "Job", "Customer", "Program", "Department", sold_on_clean';
      } else {
        selectColumns = '"Primary Key", "Customer ID", "Invoice Date", "Department", "Price"';
      }
      
      const dbTableName = this.getDbTableName(this.tableName);
      console.log('Testing with columns:', selectColumns);
      console.log('Using table name:', dbTableName);
      
      const dataTestPromise = supabase
        .from(dbTableName)
        .select(selectColumns)
        .limit(5);

      const { data, error } = await Promise.race([dataTestPromise, timeoutPromise]) as any;

      console.log('Query result for', this.tableName, ':', { 
        dataRows: data?.length, 
        error: error?.message || 'none',
        errorCode: error?.code || 'none'
      });
      
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
            .from(this.getDbTableName(this.tableName))
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
          .from(this.getDbTableName(this.tableName))
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
      
      let primaryKeyColumn: string;
      if (this.tableName === 'Opportunities' || this.tableName === 'Jobs_revenue') {
        primaryKeyColumn = '"Job"';
      } else if (this.tableName === 'Reviews') {
        primaryKeyColumn = '"ID"';
      } else if (this.tableName === 'memberships') {
        primaryKeyColumn = '"Primary Key"';
      } else {
        primaryKeyColumn = '"Primary Key"';
      }
      
      const selectColumn = primaryKeyColumn;
      
      const testPromise = supabase
        .from(this.getDbTableName(this.tableName))
        .select(selectColumn)
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
        .from(this.getDbTableName(this.tableName))
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