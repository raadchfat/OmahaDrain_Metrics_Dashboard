import { KPIData, TimeSeriesData, GoogleSheetConfig, MultiSheetConfig } from '../types';

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
          throw new Error(`Access denied. Please check your API key configuration in Google Cloud Console. ${errorMessage}`);
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

  async getAggregatedKPIData(): Promise<KPIData> {
    const kpiSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'kpi'
    );

    if (kpiSheets.length === 0) {
      // Fallback to demo data if no sheets configured
      return this.getDemoKPIData();
    }

    const allKPIData: KPIData[] = [];

    for (const sheet of kpiSheets) {
      try {
        const data = await this.fetchSheetData(sheet);
        const kpiData = this.processKPIData(data, sheet.name);
        allKPIData.push(kpiData);
      } catch (error) {
        console.warn(`Failed to fetch data from sheet ${sheet.name}:`, error);
        // Continue with other sheets even if one fails
      }
    }

    if (allKPIData.length === 0) {
      // Fallback to demo data if all sheets fail
      console.warn('No KPI data could be retrieved from any sheet, using demo data');
      return this.getDemoKPIData();
    }

    // Aggregate data from multiple sheets
    return this.aggregateKPIData(allKPIData);
  }

  async getAggregatedTimeSeriesData(): Promise<TimeSeriesData[]> {
    const timeSeriesSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'timeseries'
    );

    if (timeSeriesSheets.length === 0) {
      // Generate demo time series data
      return this.getDemoTimeSeriesData();
    }

    const allTimeSeriesData: TimeSeriesData[] = [];

    for (const sheet of timeSeriesSheets) {
      try {
        const data = await this.fetchSheetData(sheet);
        const timeSeriesData = this.processTimeSeriesData(data, sheet.name);
        allTimeSeriesData.push(...timeSeriesData);
      } catch (error) {
        console.warn(`Failed to fetch time series data from sheet ${sheet.name}:`, error);
      }
    }

    if (allTimeSeriesData.length === 0) {
      return this.getDemoTimeSeriesData();
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

  private processKPIData(data: any[][], sheetName: string): KPIData {
    if (!data || data.length < 2) {
      throw new Error('Insufficient data in sheet');
    }

    const rows = data.slice(1); // Skip header row
    const totalCalls = rows.length;
    
    if (totalCalls === 0) {
      throw new Error('No data rows found in sheet');
    }

    // Column Y is index 24 (Y = 25th column, 0-indexed = 24)
    const revenueColumnIndex = 24; // Column Y
    
    // Helper function to safely parse numbers
    const parseNumber = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove currency symbols, commas, and other formatting
        const cleaned = value.replace(/[$,\s]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Helper function to safely get string values
    const getString = (row: any[], index: number): string => {
      return (row[index] || '').toString().trim();
    };

    // Calculate metrics based on actual data
    const installCalls = rows.filter(row => {
      const revenue = parseNumber(row[revenueColumnIndex]);
      return revenue >= 10000;
    }).length;

    const drainCleaningCalls = rows.filter(row => 
      getString(row, 1).toLowerCase().includes('drain cleaning') ||
      getString(row, 1).toLowerCase().includes('drain') ||
      getString(row, 1).toLowerCase().includes('cleaning')
    ).length;

    const jettingJobs = rows.filter(row => 
      getString(row, 1).toLowerCase().includes('jetting') ||
      getString(row, 1).toLowerCase().includes('jet')
    ).length;

    const descalingJobs = rows.filter(row => 
      getString(row, 1).toLowerCase().includes('descaling') ||
      getString(row, 1).toLowerCase().includes('descale')
    ).length;

    // Look for callback indicators in multiple possible columns
    const callbackCalls = rows.filter(row => {
      for (let i = 6; i < Math.min(row.length, 15); i++) {
        const value = getString(row, i).toLowerCase();
        if (value.includes('yes') || value.includes('callback') || value.includes('return')) {
          return true;
        }
      }
      return false;
    }).length;

    // Look for complaint indicators
    const complaintCalls = rows.filter(row => {
      for (let i = 7; i < Math.min(row.length, 15); i++) {
        const value = getString(row, i).toLowerCase();
        if (value.includes('yes') || value.includes('complaint') || value.includes('issue')) {
          return true;
        }
      }
      return false;
    }).length;
    
    // Calculate install revenue as sum of all jobs >= $10k from column Y
    const installRevenue = rows
      .filter(row => parseNumber(row[revenueColumnIndex]) >= 10000)
      .reduce((sum, row) => sum + parseNumber(row[revenueColumnIndex]), 0);

    // Calculate jetting revenue
    const jettingRevenue = rows
      .filter(row => getString(row, 1).toLowerCase().includes('jetting') || getString(row, 1).toLowerCase().includes('jet'))
      .reduce((sum, row) => sum + parseNumber(row[revenueColumnIndex]), 0);

    // Calculate descaling revenue
    const descalingRevenue = rows
      .filter(row => getString(row, 1).toLowerCase().includes('descaling') || getString(row, 1).toLowerCase().includes('descale'))
      .reduce((sum, row) => sum + parseNumber(row[revenueColumnIndex]), 0);

    // Calculate total revenue and other metrics
    const totalRevenue = rows.reduce((sum, row) => sum + parseNumber(row[revenueColumnIndex]), 0);
    const totalHours = rows.reduce((sum, row) => sum + parseNumber(row[3] || row[4] || 0), 0); // Duration column
    const totalTechPay = rows.reduce((sum, row) => sum + parseNumber(row[4] || row[5] || 0), 0); // Tech pay column

    console.log(`Sheet ${sheetName} processed:`, {
      totalRows: totalCalls,
      installCalls,
      drainCleaningCalls,
      installRevenue,
      totalRevenue
    });
    
    return {
      installCallsPercentage: drainCleaningCalls > 0 ? (installCalls / drainCleaningCalls) * 100 : 0,
      installRevenuePerCall: totalCalls > 0 ? installRevenue / totalCalls : 0,
      jettingJobsPercentage: drainCleaningCalls > 0 ? (jettingJobs / drainCleaningCalls) * 100 : 0,
      jettingRevenuePerCall: drainCleaningCalls > 0 ? jettingRevenue / drainCleaningCalls : 0,
      descalingJobsPercentage: drainCleaningCalls > 0 ? (descalingJobs / drainCleaningCalls) * 100 : 0,
      descalingRevenuePerCall: drainCleaningCalls > 0 ? descalingRevenue / drainCleaningCalls : 0,
      membershipConversionRate: this.calculateMembershipConversion(rows),
      totalMembershipsRenewed: this.calculateMembershipsRenewed(rows),
      techPayPercentage: totalRevenue > 0 ? (totalTechPay / totalRevenue) * 100 : 0,
      laborRevenuePerHour: totalHours > 0 ? totalRevenue / totalHours : 0,
      jobEfficiency: this.calculateJobEfficiency(rows),
      zeroRevenueCallPercentage: totalCalls > 0 ? (rows.filter(row => parseNumber(row[revenueColumnIndex]) === 0).length / totalCalls) * 100 : 0,
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

  private processTimeSeriesData(data: any[][], sheetName: string): TimeSeriesData[] {
    if (!data || data.length < 2) {
      return [];
    }

    const rows = data.slice(1); // Skip header row
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

  private getDemoKPIData(): KPIData {
    return {
      installCallsPercentage: 16.5,
      installRevenuePerCall: 2850,
      jettingJobsPercentage: 22.3,
      jettingRevenuePerCall: 425,
      descalingJobsPercentage: 18.7,
      descalingRevenuePerCall: 350,
      membershipConversionRate: 15.8,
      totalMembershipsRenewed: 42,
      techPayPercentage: 18.5,
      laborRevenuePerHour: 125.75,
      jobEfficiency: 92.3,
      zeroRevenueCallPercentage: 3.2,
      diagnosticFeeOnlyPercentage: 12.5,
      callbackPercentage: 4.1,
      clientComplaintPercentage: 2.3,
      clientReviewPercentage: 87.5
    };
  }

  private getDemoTimeSeriesData(): TimeSeriesData[] {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: 15 + Math.random() * 10,
        metric: 'installCallsPercentage'
      });
    }
    
    return data;
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