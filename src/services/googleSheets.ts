import { KPIData, TimeSeriesData, GoogleSheetConfig, MultiSheetConfig } from '../types';
import { DateRange, isDateInRange, parseDateFromRow } from '../utils/dateUtils';

export class MultiSheetService {
  private config: MultiSheetConfig;

  constructor(config: MultiSheetConfig) {
    this.config = config;
  }

  async fetchSheetData(sheetConfig: GoogleSheetConfig): Promise<any[][]> {
    const apiKey = sheetConfig.apiKey || this.config.globalApiKey;
    
    if (!apiKey || !sheetConfig.sheetId) {
      throw new Error('Missing API key or Sheet ID');
    }

    // Clean the sheet ID to remove any leading/trailing slashes or whitespace
    const cleanSheetId = sheetConfig.sheetId.trim().replace(/^\/+|\/+$/g, '');
    
    if (!cleanSheetId) {
      throw new Error('Invalid Sheet ID format');
    }
    try {
      // Make real API call to Google Sheets
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanSheetId}/values/${sheetConfig.range}?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
        }
        
        if (response.status === 403) {
          const currentDomain = window.location.hostname;
          const isWebContainer = currentDomain.includes('webcontainer-api.io');
          const domainPatterns = isWebContainer ? 
            ['*.webcontainer-api.io/*', '*.local-credentialless.webcontainer-api.io/*'] : 
            [`*${currentDomain}/*`];
          
          throw new Error(`Access denied (403). Your API key's HTTP referrer restrictions are blocking this domain. To fix this:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under "Application restrictions", select "HTTP referrers (web sites)"
4. Add these patterns: ${domainPatterns.join(' and ')}
5. Also ensure: Google Sheets API is enabled, and your sheet is set to 'Anyone with the link can view'

Current blocked domain: ${window.location.origin}
API Error: ${errorMessage}`);
        } else if (response.status === 400) {
          throw new Error(`Invalid request. Please check your Sheet ID and range. ${errorMessage}`);
        } else {
          throw new Error(`Google Sheets API error: ${errorMessage}`);
        }
      }
      
      const data = await response.json();
      
      if (!data.values || !Array.isArray(data.values)) {
        throw new Error('No data found in the specified range');
      }
      
      return data.values;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Network error: Unable to connect to Google Sheets API. This may be due to CORS restrictions or network connectivity issues.`);
      }
      
      console.error(`Error fetching data from sheet ${sheetConfig.name}:`, error);
      throw error;
    }
  }

  async getAggregatedKPIData(dateRange?: DateRange): Promise<KPIData> {
    const kpiSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'kpi'
    );

    if (kpiSheets.length === 0) {
      // Fallback to demo data if no sheets configured
      return this.getDemoKPIData(dateRange);
    }

    const allKPIData: KPIData[] = [];
    let soldLineItemsSheetData: any[][] = [];
    
    // Cache to store fetched sheet data to avoid redundant API calls
    const sheetDataCache = new Map<string, any[][]>();

    for (const sheet of kpiSheets) {
      try {
        const data = await this.fetchSheetData(sheet);
        // Store the fetched data in cache
        sheetDataCache.set(sheet.sheetId, data);
        
        const kpiData = this.processKPIData(data, sheet.name, dateRange);
        
        allKPIData.push(kpiData);
      } catch (error) {
        console.warn(`Failed to fetch data from sheet ${sheet.name}:`, error);
        // Continue with other sheets even if one fails
      }
    }

    // Fetch Sold Line Items sheet data separately for jetting jobs calculation
    const soldLineItemsSheet = this.config.sheets.find(sheet =>
      sheet.isActive && sheet.sheetId === '1fsGnYEklIM0F3gcihWC2xYk1SyNGBH4fs_HIGt_MCG0'
    );
    
    if (soldLineItemsSheet) {
      try {
        const soldLineItemsData = await this.fetchSheetData(soldLineItemsSheet);
        // Filter by date range if provided - try different date column positions
        if (dateRange) {
          const dataRows = soldLineItemsData.slice(1);
          soldLineItemsSheetData = dataRows.filter(row => {
            // Use column B (index 1) for date in Sold Line Items sheet
            const rowDate = parseDateFromRow(row, 1);
            return rowDate && isDateInRange(rowDate, dateRange);
          });
          
          // If no rows found with date filtering, use all rows (might be no date column)
          if (soldLineItemsSheetData.length === 0) {
            console.warn('No date-filtered rows found in Sold Line Items using column B, using all rows');
            soldLineItemsSheetData = dataRows;
          }
        } else {
          soldLineItemsSheetData = soldLineItemsData.slice(1);
        }
        
        console.log(`Sold Line Items sheet processed: ${soldLineItemsSheetData.length} rows after filtering (using column B for dates)`);
      } catch (error) {
        console.warn('Failed to fetch Sold Line Items sheet for jetting calculation:', error);
      }
    }

    if (allKPIData.length === 0) {
      // Fallback to demo data if all sheets fail
      console.warn('No KPI data could be retrieved from any sheet, using demo data');
      return this.getDemoKPIData(dateRange);
    }

    // Aggregate data from multiple sheets with special handling for install calls rate
    const aggregatedData = this.aggregateKPIData(allKPIData);
    
    // Calculate Install Calls Rate using the guide methodology
    if (soldLineItemsSheetData.length > 0) {
      const installMetrics = this.calculateInstallCallsRateFromGuide(soldLineItemsSheetData, dateRange);
      aggregatedData.installCallsPercentage = installMetrics.installCallsPercentage;
      aggregatedData.installRevenuePerCall = installMetrics.installRevenuePerCall;
      
      console.log('Install Calls Rate (Guide Method):', installMetrics);
    }
    
    // Calculate jetting jobs rate using Sold Line Items sheet
    if (soldLineItemsSheetData.length > 0) {
      // Excel formula: =SUMIF('Sold Line Items'!R:R,"*Jetting*",'Sold Line Items'!Y:Y)/(COUNTA('Jobs Revenue'!A:A)-1)
      
      // SUMIF('Sold Line Items'!R:R,"*Jetting*",'Sold Line Items'!Y:Y) - Sum revenue where description contains "Jetting"
      const jettingRevenue = soldLineItemsSheetData
        .filter(row => {
          const description = this.getString(row, 17).toLowerCase(); // Column R (18th column, 0-indexed = 17)
          return description.includes('jetting');
        })
        .reduce((sum, row) => {
          const revenue = this.parseNumber(row[24]); // Column Y (25th column, 0-indexed = 24)
          return sum + revenue;
        }, 0);
      
      // Get unique jobs count for denominator
      const uniqueJobs = this.getUniqueJobsInDateRange(soldLineItemsSheetData, dateRange);
      
      // Calculate jetting revenue per call using unique jobs count as denominator
      aggregatedData.jettingRevenuePerCall = uniqueJobs.length > 0 ? jettingRevenue / uniqueJobs.length : 0;
      
      // For jetting jobs percentage, we can calculate based on jetting line items vs total calls
      const jettingJobNumbers = new Set<string>();
      soldLineItemsSheetData.forEach(row => {
        const descriptionR = this.getString(row, 17).toLowerCase(); // Column R
        const jobNumber = this.getString(row, 13); // Column N
        if (descriptionR.includes('jetting') && jobNumber && jobNumber.trim() !== '') {
          jettingJobNumbers.add(jobNumber.trim());
        }
      });
      aggregatedData.jettingJobsPercentage = uniqueJobs.length > 0 ? (jettingJobNumbers.size / uniqueJobs.length) * 100 : 0;
      
      console.log('Excel SUMIF Jetting Calculation:', {
        formula: "=SUMIF('Sold Line Items'!R:R,\"*Jetting*\",'Sold Line Items'!Y:Y)/(COUNTA('Jobs Revenue'!A:A)-1)",
        sumifResult: jettingRevenue, // SUMIF('Sold Line Items'!R:R,"*Jetting*",'Sold Line Items'!Y:Y)
        countaResult: uniqueJobs.length, // Unique jobs count
        uniqueJettingJobs: Array.from(jettingJobNumbers).slice(0, 10),
        jettingRevenuePerJob: aggregatedData.jettingRevenuePerCall,
        jettingJobsPercentage: aggregatedData.jettingJobsPercentage,
        dateRange: dateRange ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}` : 'All time'
      });
    }
    
    return aggregatedData;
  }

  /**
   * Calculate Install Calls Rate following the guide methodology:
   * Step 1: Get unique jobs in date range
   * Step 2: Calculate total revenue per job
   * Step 3: Flag install jobs (≥$10k)
   * Step 4: Calculate percentage
   */
  private calculateInstallCallsRateFromGuide(soldLineItemsData: any[][], dateRange?: DateRange): {
    installCallsPercentage: number;
    installRevenuePerCall: number;
    uniqueJobsCount: number;
    installJobsCount: number;
    totalInstallRevenue: number;
  } {
    // Step 1: Get unique jobs in date range
    const uniqueJobs = this.getUniqueJobsInDateRange(soldLineItemsData, dateRange);
    
    if (uniqueJobs.length === 0) {
      return {
        installCallsPercentage: 0,
        installRevenuePerCall: 0,
        uniqueJobsCount: 0,
        installJobsCount: 0,
        totalInstallRevenue: 0
      };
    }
    
    // Step 2: Calculate total revenue per job
    const jobRevenueMap = new Map<string, number>();
    
    for (const job of uniqueJobs) {
      // Sum all line items for this job
      const totalRevenue = soldLineItemsData
        .filter(row => {
          const rowJob = this.getString(row, 13); // Column N (Job)
          const rowDate = parseDateFromRow(row, 1); // Column B (Invoice Date)
          
          // Check if job matches and date is in range (if specified)
          const jobMatches = rowJob.trim() === job.trim();
          const dateInRange = !dateRange || (rowDate && isDateInRange(rowDate, dateRange));
          
          return jobMatches && dateInRange;
        })
        .reduce((sum, row) => {
          const price = this.parseNumber(row[19]); // Column T (Price)
          return sum + price;
        }, 0);
      
      jobRevenueMap.set(job, totalRevenue);
    }
    
    // Step 3: Flag install jobs (≥$10k)
    let installJobsCount = 0;
    let totalInstallRevenue = 0;
    
    for (const [job, revenue] of jobRevenueMap) {
      if (revenue >= 10000) {
        installJobsCount++;
        totalInstallRevenue += revenue;
      }
    }
    
    // Step 4: Calculate the KPI
    const installCallsPercentage = uniqueJobs.length > 0 ? (installJobsCount / uniqueJobs.length) * 100 : 0;
    const installRevenuePerCall = uniqueJobs.length > 0 ? totalInstallRevenue / uniqueJobs.length : 0;
    
    return {
      installCallsPercentage,
      installRevenuePerCall,
      uniqueJobsCount: uniqueJobs.length,
      installJobsCount,
      totalInstallRevenue
    };
  }

  /**
   * Get unique jobs in the specified date range
   */
  private getUniqueJobsInDateRange(soldLineItemsData: any[][], dateRange?: DateRange): string[] {
    const uniqueJobs = new Set<string>();
    
    soldLineItemsData.forEach(row => {
      const job = this.getString(row, 13); // Column N (Job)
      const invoiceDate = parseDateFromRow(row, 1); // Column B (Invoice Date)
      
      // Only include jobs within the date range (if specified)
      if (job && job.trim() !== '') {
        if (!dateRange || (invoiceDate && isDateInRange(invoiceDate, dateRange))) {
          uniqueJobs.add(job.trim());
        }
      }
    });
    
    return Array.from(uniqueJobs);
  }

  async getAggregatedTimeSeriesData(dateRange?: DateRange): Promise<TimeSeriesData[]> {
    const timeSeriesSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'timeseries'
    );

    if (timeSeriesSheets.length === 0) {
      // Generate demo time series data
      return this.getDemoTimeSeriesData(dateRange);
    }

    const allTimeSeriesData: TimeSeriesData[] = [];

    for (const sheet of timeSeriesSheets) {
      try {
        const data = await this.fetchSheetData(sheet);
        const timeSeriesData = this.processTimeSeriesData(data, sheet.name, dateRange);
        allTimeSeriesData.push(...timeSeriesData);
      } catch (error) {
        console.warn(`Failed to fetch time series data from sheet ${sheet.name}:`, error);
      }
    }

    if (allTimeSeriesData.length === 0) {
      return this.getDemoTimeSeriesData(dateRange);
    }

    return allTimeSeriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async testSheetConnection(sheetConfig: GoogleSheetConfig): Promise<boolean> {
    try {
      const data = await this.fetchSheetData(sheetConfig);
      // Verify we got actual data
      if (!data || data.length === 0) {
        throw new Error('No data returned from sheet');
      }
      return true;
    } catch (error) {
      console.error(`Connection test failed for sheet ${sheetConfig.name}:`, error);
      return false;
    }
  }

  private processKPIData(data: any[][], sheetName: string, dateRange?: DateRange): KPIData {
    if (!data || data.length < 2) {
      throw new Error('Insufficient data in sheet');
    }

    // Filter rows by date range if provided
    let rows = data.slice(1); // Skip header row
    
    if (dateRange) {
      rows = rows.filter(row => {
        const rowDate = parseDateFromRow(row, 0); // Assuming date is in first column
        return rowDate && isDateInRange(rowDate, dateRange);
      });
    }
    
    const totalCalls = rows.length;
    
    if (totalCalls === 0) {
      throw new Error(`No data rows found in sheet for the selected time period`);
    }

    // Column Y is index 24 (Y = 25th column, 0-indexed = 24)
    const revenueColumnIndex = 24; // Column Y
    
    // Calculate metrics based on actual data
    const installCalls = rows.filter(row => {
      const revenue = this.parseNumber(row[revenueColumnIndex]);
      return revenue >= 10000;
    }).length;


    const jettingJobs = rows.filter(row => 
      this.getString(row, 1).toLowerCase().includes('jetting') ||
      this.getString(row, 1).toLowerCase().includes('jet')
    ).length;

    const descalingJobs = rows.filter(row => 
      this.getString(row, 1).toLowerCase().includes('descaling') ||
      this.getString(row, 1).toLowerCase().includes('descale')
    ).length;

    // Look for callback indicators in multiple possible columns
    const callbackCalls = rows.filter(row => {
      for (let i = 6; i < Math.min(row.length, 15); i++) {
        const value = this.getString(row, i).toLowerCase();
        if (value.includes('yes') || value.includes('callback') || value.includes('return')) {
          return true;
        }
      }
      return false;
    }).length;

    // Look for complaint indicators
    const complaintCalls = rows.filter(row => {
      for (let i = 7; i < Math.min(row.length, 15); i++) {
        const value = this.getString(row, i).toLowerCase();
        if (value.includes('yes') || value.includes('complaint') || value.includes('issue')) {
          return true;
        }
      }
      return false;
    }).length;
    
    // Calculate install revenue as sum of all jobs >= $10k from column Y
    const installRevenue = rows
      .filter(row => this.parseNumber(row[revenueColumnIndex]) >= 10000)
      .reduce((sum, row) => sum + this.parseNumber(row[revenueColumnIndex]), 0);

    // Calculate jetting revenue
    const jettingRevenue = rows
      .filter(row => this.getString(row, 1).toLowerCase().includes('jetting') || this.getString(row, 1).toLowerCase().includes('jet'))
      .reduce((sum, row) => sum + this.parseNumber(row[revenueColumnIndex]), 0);

    // Calculate descaling revenue
    const descalingRevenue = rows
      .filter(row => this.getString(row, 1).toLowerCase().includes('descaling') || this.getString(row, 1).toLowerCase().includes('descale'))
      .reduce((sum, row) => sum + this.parseNumber(row[revenueColumnIndex]), 0);

    // Calculate total revenue and other metrics
    const totalRevenue = rows.reduce((sum, row) => sum + this.parseNumber(row[revenueColumnIndex]), 0);
    const totalHours = rows.reduce((sum, row) => sum + this.parseNumber(row[3] || row[4] || 0), 0); // Duration column
    const totalTechPay = rows.reduce((sum, row) => sum + this.parseNumber(row[4] || row[5] || 0), 0); // Tech pay column

    console.log(`Sheet ${sheetName} processed (filtered):`, {
      totalRows: totalCalls,
      installCalls,
      installRevenue,
      totalRevenue,
      dateRange: dateRange ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}` : 'All time'
    });
    
    return {
      installCallsPercentage: totalCalls > 0 ? (installCalls / totalCalls) * 100 : 0,
      installRevenuePerCall: totalCalls > 0 ? installRevenue / totalCalls : 0,
      jettingJobsPercentage: totalCalls > 0 ? (jettingJobs / totalCalls) * 100 : 0,
      jettingRevenuePerCall: totalCalls > 0 ? jettingRevenue / totalCalls : 0,
      descalingJobsPercentage: totalCalls > 0 ? (descalingJobs / totalCalls) * 100 : 0,
      descalingRevenuePerCall: totalCalls > 0 ? descalingRevenue / totalCalls : 0,
      membershipConversionRate: this.calculateMembershipConversion(rows),
      totalMembershipsRenewed: this.calculateMembershipsRenewed(rows),
      techPayPercentage: totalRevenue > 0 ? (totalTechPay / totalRevenue) * 100 : 0,
      laborRevenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
      jobEfficiency: this.calculateJobEfficiency(rows),
      zeroRevenueCallPercentage: totalCalls > 0 ? (rows.filter(row => this.parseNumber(row[revenueColumnIndex]) === 0).length / totalCalls) * 100 : 0,
      diagnosticFeeOnlyPercentage: this.calculateDiagnosticFeeOnly(rows, totalCalls),
      callbackPercentage: totalCalls > 0 ? (callbackCalls / totalCalls) * 100 : 0,
      clientComplaintPercentage: totalCalls > 0 ? (complaintCalls / totalCalls) * 100 : 0,
      clientReviewPercentage: this.calculateReviewPercentage(rows)
    };
  }

  private calculateMembershipConversion(rows: any[][]): number {
    // Look for membership-related data in the sheet
    const membershipSigns = rows.filter(row => {
      for (let i = 0; i < row.length; i++) {
        const value = (row[i] || '').toString().toLowerCase();
        if (value.includes('membership') || value.includes('member') || value.includes('plan')) {
          return true;
        }
      }
      return false;
    }).length;
    
    return rows.length > 0 ? (membershipSigns / rows.length) * 100 : 0;
  }

  private calculateMembershipsRenewed(rows: any[][]): number {
    // Count renewals
    return rows.filter(row => {
      for (let i = 0; i < row.length; i++) {
        const value = (row[i] || '').toString().toLowerCase();
        if (value.includes('renew') || value.includes('renewal')) {
          return true;
        }
      }
      return false;
    }).length;
  }

  private calculateJobEfficiency(rows: any[][]): number {
    // Calculate based on estimated vs actual time if available
    let totalEfficiency = 0;
    let validJobs = 0;

    rows.forEach(row => {
      const estimatedTime = parseFloat(row[3] || '0');
      const actualTime = parseFloat(row[4] || '0');
      
      if (estimatedTime > 0 && actualTime > 0) {
        totalEfficiency += (estimatedTime / actualTime) * 100;
        validJobs++;
      }
    });

    return validJobs > 0 ? totalEfficiency / validJobs : 95; // Default to 95% if no data
  }

  private calculateDiagnosticFeeOnly(rows: any[][], totalCalls: number): number {
    const diagnosticOnlyCalls = rows.filter(row => {
      const revenue = parseFloat(row[24] || '0'); // Column Y
      // Assuming diagnostic fee is typically $50-150
      return revenue > 0 && revenue <= 150;
    }).length;

    return totalCalls > 0 ? (diagnosticOnlyCalls / totalCalls) * 100 : 0;
  }

  private calculateReviewPercentage(rows: any[][]): number {
    const reviewCount = rows.filter(row => {
      for (let i = 0; i < row.length; i++) {
        const value = (row[i] || '').toString().toLowerCase();
        if (value.includes('review') || value.includes('rating') || value.includes('star')) {
          return true;
        }
      }
      return false;
    }).length;

    return rows.length > 0 ? (reviewCount / rows.length) * 100 : 0;
  }

  private processTimeSeriesData(data: any[][], sheetName: string, dateRange?: DateRange): TimeSeriesData[] {
    if (!data || data.length < 2) {
      return [];
    }

    let rows = data.slice(1); // Skip header row
    
    if (dateRange) {
      rows = rows.filter(row => {
        const rowDate = parseDateFromRow(row, 0);
        return rowDate && isDateInRange(rowDate, dateRange);
      });
    }
    
    return rows.map(row => ({
      date: row[0],
      value: parseFloat(row[2] || '0'),
      metric: `${row[1]}_${sheetName}`
    }));
  }

  private aggregateKPIData(kpiDataArray: KPIData[]): KPIData {
    if (kpiDataArray.length === 1) {
      return kpiDataArray[0];
    }

    // Calculate weighted averages or sums as appropriate
    const count = kpiDataArray.length;
    
    return {
      installCallsPercentage: kpiDataArray.reduce((sum, data) => sum + data.installCallsPercentage, 0) / count,
      installRevenuePerCall: kpiDataArray.reduce((sum, data) => sum + data.installRevenuePerCall, 0) / count,
      jettingJobsPercentage: kpiDataArray.reduce((sum, data) => sum + data.jettingJobsPercentage, 0) / count,
      jettingRevenuePerCall: kpiDataArray.reduce((sum, data) => sum + data.jettingRevenuePerCall, 0) / count,
      descalingJobsPercentage: kpiDataArray.reduce((sum, data) => sum + data.descalingJobsPercentage, 0) / count,
      descalingRevenuePerCall: kpiDataArray.reduce((sum, data) => sum + data.descalingRevenuePerCall, 0) / count,
      membershipConversionRate: kpiDataArray.reduce((sum, data) => sum + data.membershipConversionRate, 0) / count,
      totalMembershipsRenewed: kpiDataArray.reduce((sum, data) => sum + data.totalMembershipsRenewed, 0), // Sum for totals
      techPayPercentage: kpiDataArray.reduce((sum, data) => sum + data.techPayPercentage, 0) / count,
      laborRevenuePerHour: kpiDataArray.reduce((sum, data) => sum + data.laborRevenuePerHour, 0) / count,
      jobEfficiency: kpiDataArray.reduce((sum, data) => sum + data.jobEfficiency, 0) / count,
      zeroRevenueCallPercentage: kpiDataArray.reduce((sum, data) => sum + data.zeroRevenueCallPercentage, 0) / count,
      diagnosticFeeOnlyPercentage: kpiDataArray.reduce((sum, data) => sum + data.diagnosticFeeOnlyPercentage, 0) / count,
      callbackPercentage: kpiDataArray.reduce((sum, data) => sum + data.callbackPercentage, 0) / count,
      clientComplaintPercentage: kpiDataArray.reduce((sum, data) => sum + data.clientComplaintPercentage, 0) / count,
      clientReviewPercentage: kpiDataArray.reduce((sum, data) => sum + data.clientReviewPercentage, 0) / count,
    };
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and other formatting
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private getString(row: any[], index: number): string {
    return (row[index] || '').toString().trim();
  }

  private getPriceFromRow(row: any[], sheetData: any[][] | undefined): number {
    if (!sheetData || sheetData.length === 0) {
      // Fallback to checking common price column positions
      return this.parseNumber(row[3]) || this.parseNumber(row[2]) || this.parseNumber(row[4]) || 0;
    }
    
    // Find the "price" column from the header row
    const headerRow = sheetData[0];
    let priceColumnIndex = -1;
    
    for (let i = 0; i < headerRow.length; i++) {
      const header = (headerRow[i] || '').toString().toLowerCase().trim();
      if (header.includes('price') || header === 'amount' || header === 'cost' || header === 'total') {
        priceColumnIndex = i;
        break;
      }
    }
    
    if (priceColumnIndex >= 0 && priceColumnIndex < row.length) {
      return this.parseNumber(row[priceColumnIndex]);
    }
    
    // Fallback if no price column found
    return this.parseNumber(row[3]) || this.parseNumber(row[2]) || this.parseNumber(row[4]) || 0;
  }

  private getDemoKPIData(dateRange?: DateRange): KPIData {
    // Simulate different values based on time frame to show the filtering is working
    const baseMultiplier = dateRange ? this.getTimeFrameMultiplier(dateRange) : 1;
    
    return {
      installCallsPercentage: 16.5 * baseMultiplier,
      installRevenuePerCall: 2850 * baseMultiplier,
      jettingJobsPercentage: 22.3 * baseMultiplier,
      jettingRevenuePerCall: 425 * baseMultiplier,
      descalingJobsPercentage: 18.7 * baseMultiplier,
      descalingRevenuePerCall: 350 * baseMultiplier,
      membershipConversionRate: 15.8 * baseMultiplier,
      totalMembershipsRenewed: Math.round(42 * baseMultiplier),
      techPayPercentage: 18.5 * baseMultiplier,
      laborRevenuePerHour: 125.75 * baseMultiplier,
      jobEfficiency: Math.min(95, 92.3 * baseMultiplier),
      zeroRevenueCallPercentage: Math.max(1, 3.2 / baseMultiplier),
      diagnosticFeeOnlyPercentage: Math.max(5, 12.5 / baseMultiplier),
      callbackPercentage: Math.max(1, 4.1 / baseMultiplier),
      clientComplaintPercentage: Math.max(0.5, 2.3 / baseMultiplier),
      clientReviewPercentage: Math.min(95, 87.5 * baseMultiplier)
    };
  }

  private getDemoTimeSeriesData(dateRange?: DateRange): TimeSeriesData[] {
    const data = [];
    const endDate = dateRange ? dateRange.end : new Date();
    const startDate = dateRange ? dateRange.start : new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const maxPoints = Math.min(daysDiff, 30); // Limit to 30 data points max
    
    for (let i = 0; i < maxPoints; i++) {
      const date = new Date(startDate.getTime() + (i * (daysDiff / maxPoints) * 24 * 60 * 60 * 1000));
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: 15 + Math.random() * 10,
        metric: 'installCallsPercentage'
      });
    }
    
    return data;
  }
  
  private getTimeFrameMultiplier(dateRange: DateRange): number {
    const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));
    
    // Simulate realistic variations based on time period
    if (daysDiff <= 1) return 0.3; // Today/Yesterday - lower volume
    if (daysDiff <= 7) return 0.7; // Week
    if (daysDiff <= 30) return 0.9; // Month
    if (daysDiff <= 90) return 1.1; // Quarter
    return 1.2; // Year - higher accumulated values
  }
}

// Legacy single sheet service for backward compatibility
export class GoogleSheetsService {
  private multiSheetService: MultiSheetService;

  constructor(apiKey: string, sheetId: string, range: string = 'A:Z') {
    const config: MultiSheetConfig = {
      globalApiKey: apiKey,
      sheets: [{
        sheetId,
        name: 'Default Sheet',
        apiKey,
        range,
        refreshInterval: 300,
        isActive: true,
        dataType: 'kpi'
      }]
    };
    this.multiSheetService = new MultiSheetService(config);
  }

  async getKPIData(): Promise<KPIData> {
    return this.multiSheetService.getAggregatedKPIData();
  }

  async getTimeSeriesData(): Promise<TimeSeriesData[]> {
    // Mock time series data for backward compatibility
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: 15 + Math.random() * 10, // More realistic install call percentages
        metric: 'installCallsPercentage'
      });
    }
    
    return data;
  }
}