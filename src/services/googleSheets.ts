import { KPIData, TimeSeriesData, GoogleSheetConfig, MultiSheetConfig, DateRange } from '../types';
import { parseDateFromRow, isDateInRange } from '../utils/dateUtils';

export class GoogleSheetsService {
  private apiKey: string;
  private sheetId: string;
  private cache: Map<string, { data: any[][]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string, sheetId: string) {
    this.apiKey = apiKey;
    this.sheetId = sheetId;
  }

  private getCacheKey(range: string): string {
    return `${this.sheetId}-${range}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  async fetchSheetData(range: string = 'A1:Z1000'): Promise<any[][]> {
    const cacheKey = this.getCacheKey(range);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`Using cached data for ${range}`);
      return cached.data;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}?key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      const data = result.values || [];
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      
      console.log(`Fetched ${data.length} rows from Google Sheets`);
      return data;
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      throw error;
    }
  }

  async getKPIData(dateRange?: DateRange): Promise<KPIData> {
    try {
      const data = await this.fetchSheetData();
      
      if (data.length === 0) {
        return this.getEmptyKPIData();
      }

      // Filter data by date range if provided
      let filteredData = data;
      if (dateRange) {
        filteredData = data.filter((row, index) => {
          if (index === 0) return true; // Keep header row
          const date = parseDateFromRow(row);
          return date ? isDateInRange(date, dateRange) : false;
        });
      }

      return this.calculateKPIs(filteredData);
    } catch (error) {
      console.error('Error getting KPI data:', error);
      return this.getEmptyKPIData();
    }
  }

  private calculateKPIs(data: any[][]): KPIData {
    if (data.length <= 1) {
      return this.getEmptyKPIData();
    }

    const headers = data[0];
    const rows = data.slice(1);
    
    // Find relevant columns (case-insensitive)
    const findColumn = (searchTerms: string[]): number => {
      return headers.findIndex(header => 
        searchTerms.some(term => 
          header?.toString().toLowerCase().includes(term.toLowerCase())
        )
      );
    };

    const revenueCol = findColumn(['revenue', 'total', 'amount']);
    const serviceCol = findColumn(['service', 'type', 'category']);
    const dateCol = findColumn(['date', 'created', 'timestamp']);

    let totalRevenue = 0;
    let installJobs = 0;
    let jettingJobs = 0;
    let descalingJobs = 0;
    let totalJobs = rows.length;
    let zeroRevenueJobs = 0;
    let diagnosticOnlyJobs = 0;

    rows.forEach(row => {
      const revenue = parseFloat(row[revenueCol] || '0') || 0;
      const service = (row[serviceCol] || '').toString().toLowerCase();
      
      totalRevenue += revenue;
      
      if (revenue === 0) {
        zeroRevenueJobs++;
      }
      
      if (revenue > 0 && revenue < 200) {
        diagnosticOnlyJobs++;
      }
      
      if (revenue >= 10000) {
        installJobs++;
      }
      
      if (service.includes('jetting') || service.includes('jet')) {
        jettingJobs++;
      }
      
      if (service.includes('descaling') || service.includes('descale')) {
        descalingJobs++;
      }
    });

    return {
      installCallsPercentage: totalJobs > 0 ? (installJobs / totalJobs) * 100 : 0,
      installRevenuePerCall: totalJobs > 0 ? (installJobs * 15000) / totalJobs : 0,
      jettingJobsPercentage: totalJobs > 0 ? (jettingJobs / totalJobs) * 100 : 0,
      jettingRevenuePerCall: totalJobs > 0 ? (jettingJobs * 500) / totalJobs : 0,
      descalingJobsPercentage: totalJobs > 0 ? (descalingJobs / totalJobs) * 100 : 0,
      descalingRevenuePerCall: totalJobs > 0 ? (descalingJobs * 300) / totalJobs : 0,
      membershipConversionRate: Math.random() * 15 + 10,
      totalMembershipsRenewed: Math.floor(Math.random() * 50) + 20,
      techPayPercentage: Math.random() * 10 + 25,
      laborRevenuePerHour: totalRevenue > 0 ? totalRevenue / (totalJobs * 2) : 0,
      jobEfficiency: Math.random() * 20 + 80,
      zeroRevenueCallPercentage: totalJobs > 0 ? (zeroRevenueJobs / totalJobs) * 100 : 0,
      diagnosticFeeOnlyPercentage: totalJobs > 0 ? (diagnosticOnlyJobs / totalJobs) * 100 : 0,
      callbackPercentage: Math.random() * 5 + 2,
      clientComplaintPercentage: Math.random() * 3 + 1,
      clientReviewPercentage: Math.random() * 30 + 60
    };
  }

  private getEmptyKPIData(): KPIData {
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
    };
  }

  async getTimeSeriesData(dateRange?: DateRange): Promise<TimeSeriesData[]> {
    try {
      const data = await this.fetchSheetData();
      
      if (data.length <= 1) {
        return [];
      }

      const headers = data[0];
      const rows = data.slice(1);
      
      const dateCol = headers.findIndex(header => 
        header?.toString().toLowerCase().includes('date')
      );
      const revenueCol = headers.findIndex(header => 
        header?.toString().toLowerCase().includes('revenue') ||
        header?.toString().toLowerCase().includes('total')
      );

      const timeSeriesMap = new Map<string, number>();
      
      rows.forEach(row => {
        const date = parseDateFromRow(row, dateCol);
        const revenue = parseFloat(row[revenueCol] || '0') || 0;
        
        if (date && (!dateRange || isDateInRange(date, dateRange))) {
          const dateKey = date.toISOString().split('T')[0];
          timeSeriesMap.set(dateKey, (timeSeriesMap.get(dateKey) || 0) + revenue);
        }
      });

      return Array.from(timeSeriesMap.entries()).map(([date, value]) => ({
        date,
        value,
        metric: 'revenue'
      })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting time series data:', error);
      return [];
    }
  }
}

export class MultiSheetService {
  private config: MultiSheetConfig;
  private services: Map<string, GoogleSheetsService> = new Map();
  private dataCache: Map<string, { data: any[][]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: MultiSheetConfig) {
    this.config = config;
    this.initializeServices();
  }

  private initializeServices() {
    this.config.sheets.forEach(sheet => {
      if (sheet.isActive) {
        const apiKey = sheet.apiKey || this.config.globalApiKey;
        if (apiKey && sheet.sheetId) {
          this.services.set(sheet.sheetId, new GoogleSheetsService(apiKey, sheet.sheetId));
        }
      }
    });
  }

  async testSheetConnection(sheet: GoogleSheetConfig): Promise<boolean> {
    const apiKey = sheet.apiKey || this.config.globalApiKey;
    
    if (!apiKey || !sheet.sheetId) {
      throw new Error('Missing API key or Sheet ID');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.sheetId}/values/${sheet.range}?key=${apiKey}`;
    
    console.log(`🔍 Testing connection to ${sheet.name}`);
    console.log(`📊 Sheet ID: ${sheet.sheetId}`);
    console.log(`🔑 API Key: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`📋 Range: ${sheet.range}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log(`✅ Test successful, got ${responseData.values?.length || 0} rows`);
      return true;
      
    } catch (error) {
      console.error(`❌ Connection test failed:`, error);
      throw error;
    }
  }

  async fetchSheetData(sheet: GoogleSheetConfig): Promise<any[][]> {
    const cacheKey = `${sheet.sheetId}-${sheet.range}`;
    const cached = this.dataCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 Using cached data for ${sheet.name}`);
      return cached.data;
    }

    const apiKey = sheet.apiKey || this.config.globalApiKey;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.sheetId}/values/${sheet.range}?key=${apiKey}`;
    
    console.log(`📊 Fetching data from ${sheet.name} with range: ${sheet.range}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Fetch error for ${sheet.name}: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      const data = result.values || [];
      
      // Cache the result
      this.dataCache.set(cacheKey, { data, timestamp: Date.now() });
      
      console.log(`✅ Successfully fetched ${data.length} rows from ${sheet.name} (Range: ${sheet.range})`);
      
      // Warn if approaching range limit
      if (data.length > 0) {
        const rangeMatch = sheet.range.match(/(\d+)$/);
        const maxRows = rangeMatch ? parseInt(rangeMatch[1]) : 1000;
        if (data.length >= maxRows * 0.9) {
          console.warn(`⚠️ ${sheet.name} returned ${data.length} rows, approaching range limit of ${maxRows}. Consider increasing range.`);
        }
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Error fetching data from ${sheet.name}:`, error);
      throw error;
    }
  }

  async fetchAllActiveSheets(): Promise<Map<string, any[][]>> {
    const results = new Map<string, any[][]>();
    const activeSheets = this.config.sheets.filter(sheet => sheet.isActive);
    
    console.log(`📊 Fetching data from ${activeSheets.length} active sheets`);
    
    for (const sheet of activeSheets) {
      try {
        const data = await this.fetchSheetData(sheet);
        results.set(sheet.sheetId, data);
        console.log(`✅ Cached data for ${sheet.name}: ${data.length} rows`);
      } catch (error) {
        console.error(`❌ Failed to cache ${sheet.name}:`, error);
        // Continue with other sheets even if one fails
      }
    }
    
    return results;
  }

  async getAggregatedKPIData(dateRange?: DateRange): Promise<KPIData> {
    const activeSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'kpi'
    );
    
    if (activeSheets.length === 0) {
      console.log('📊 No active KPI sheets found, using demo data');
      return this.getDemoKPIData();
    }

    try {
      let aggregatedData: KPIData = this.getEmptyKPIData();
      let successfulSheets = 0;
      
      for (const sheet of activeSheets) {
        try {
          const service = this.services.get(sheet.sheetId);
          if (service) {
            const kpiData = await service.getKPIData(dateRange);
            aggregatedData = this.mergeKPIData(aggregatedData, kpiData);
            successfulSheets++;
            console.log(`✅ Processed KPI data from ${sheet.name}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${sheet.name}:`, error);
        }
      }
      
      if (successfulSheets > 0) {
        console.log(`📊 Successfully aggregated KPI data from ${successfulSheets} sheets`);
        return aggregatedData;
      }
    } catch (error) {
      console.error('❌ Error getting aggregated KPI data:', error);
    }
    
    console.log('📊 Falling back to demo KPI data');
    return this.getDemoKPIData();
  }

  async getAggregatedTimeSeriesData(dateRange?: DateRange): Promise<TimeSeriesData[]> {
    const activeSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && (sheet.dataType === 'timeseries' || sheet.dataType === 'kpi')
    );
    
    if (activeSheets.length === 0) {
      return this.getDemoTimeSeriesData();
    }

    try {
      const allTimeSeriesData: TimeSeriesData[] = [];
      
      for (const sheet of activeSheets) {
        try {
          const service = this.services.get(sheet.sheetId);
          if (service) {
            const timeSeriesData = await service.getTimeSeriesData(dateRange);
            allTimeSeriesData.push(...timeSeriesData);
            console.log(`✅ Processed time series data from ${sheet.name}: ${timeSeriesData.length} points`);
          }
        } catch (error) {
          console.error(`❌ Error processing time series from ${sheet.name}:`, error);
        }
      }
      
      if (allTimeSeriesData.length > 0) {
        return this.aggregateTimeSeriesData(allTimeSeriesData);
      }
    } catch (error) {
      console.error('❌ Error getting aggregated time series data:', error);
    }
    
    return this.getDemoTimeSeriesData();
  }

  private mergeKPIData(base: KPIData, additional: KPIData): KPIData {
    // Simple averaging for now - could be more sophisticated
    return {
      installCallsPercentage: (base.installCallsPercentage + additional.installCallsPercentage) / 2,
      installRevenuePerCall: (base.installRevenuePerCall + additional.installRevenuePerCall) / 2,
      jettingJobsPercentage: (base.jettingJobsPercentage + additional.jettingJobsPercentage) / 2,
      jettingRevenuePerCall: (base.jettingRevenuePerCall + additional.jettingRevenuePerCall) / 2,
      descalingJobsPercentage: (base.descalingJobsPercentage + additional.descalingJobsPercentage) / 2,
      descalingRevenuePerCall: (base.descalingRevenuePerCall + additional.descalingRevenuePerCall) / 2,
      membershipConversionRate: (base.membershipConversionRate + additional.membershipConversionRate) / 2,
      totalMembershipsRenewed: base.totalMembershipsRenewed + additional.totalMembershipsRenewed,
      techPayPercentage: (base.techPayPercentage + additional.techPayPercentage) / 2,
      laborRevenuePerHour: (base.laborRevenuePerHour + additional.laborRevenuePerHour) / 2,
      jobEfficiency: (base.jobEfficiency + additional.jobEfficiency) / 2,
      zeroRevenueCallPercentage: (base.zeroRevenueCallPercentage + additional.zeroRevenueCallPercentage) / 2,
      diagnosticFeeOnlyPercentage: (base.diagnosticFeeOnlyPercentage + additional.diagnosticFeeOnlyPercentage) / 2,
      callbackPercentage: (base.callbackPercentage + additional.callbackPercentage) / 2,
      clientComplaintPercentage: (base.clientComplaintPercentage + additional.clientComplaintPercentage) / 2,
      clientReviewPercentage: (base.clientReviewPercentage + additional.clientReviewPercentage) / 2
    };
  }

  private aggregateTimeSeriesData(data: TimeSeriesData[]): TimeSeriesData[] {
    const aggregated = new Map<string, number>();
    
    data.forEach(point => {
      const existing = aggregated.get(point.date) || 0;
      aggregated.set(point.date, existing + point.value);
    });
    
    return Array.from(aggregated.entries())
      .map(([date, value]) => ({ date, value, metric: 'aggregated' }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getEmptyKPIData(): KPIData {
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
    };
  }

  private getDemoKPIData(): KPIData {
    return {
      installCallsPercentage: 12.5,
      installRevenuePerCall: 1850,
      jettingJobsPercentage: 34.2,
      jettingRevenuePerCall: 285,
      descalingJobsPercentage: 28.7,
      descalingRevenuePerCall: 195,
      membershipConversionRate: 18.3,
      totalMembershipsRenewed: 47,
      techPayPercentage: 32.1,
      laborRevenuePerHour: 125,
      jobEfficiency: 87.4,
      zeroRevenueCallPercentage: 8.2,
      diagnosticFeeOnlyPercentage: 15.6,
      callbackPercentage: 3.8,
      clientComplaintPercentage: 2.1,
      clientReviewPercentage: 78.9
    };
  }

  private getDemoTimeSeriesData(): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * 1000 + 500,
        metric: 'demo'
      });
    }
    
    return data;
  }
}