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

    try {
      // In production, this would make a real API call
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetConfig.sheetId}/values/${sheetConfig.range}?key=${apiKey}`;
      
      // For demo purposes, return mock data based on sheet type
      return this.getMockDataByType(sheetConfig.dataType);
    } catch (error) {
      console.error(`Error fetching data from sheet ${sheetConfig.name}:`, error);
      throw error;
    }
  }

  async getAggregatedKPIData(): Promise<KPIData> {
    const kpiSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'kpi'
    );

    if (kpiSheets.length === 0) {
      throw new Error('No active KPI sheets configured');
    }

    const allKPIData: KPIData[] = [];

    for (const sheet of kpiSheets) {
      try {
        const data = await this.fetchSheetData(sheet);
        const kpiData = this.processKPIData(data, sheet.name);
        allKPIData.push(kpiData);
      } catch (error) {
        console.warn(`Failed to fetch data from sheet ${sheet.name}:`, error);
      }
    }

    if (allKPIData.length === 0) {
      throw new Error('No KPI data could be retrieved from any sheet');
    }

    // Aggregate data from multiple sheets
    return this.aggregateKPIData(allKPIData);
  }

  async getAggregatedTimeSeriesData(): Promise<TimeSeriesData[]> {
    const timeSeriesSheets = this.config.sheets.filter(sheet => 
      sheet.isActive && sheet.dataType === 'timeseries'
    );

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

    return allTimeSeriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async testSheetConnection(sheetConfig: GoogleSheetConfig): Promise<boolean> {
    try {
      await this.fetchSheetData(sheetConfig);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getMockDataByType(dataType: string): any[][] {
    switch (dataType) {
      case 'kpi':
        return [
          ['Date', 'Service Type', 'Revenue', 'Duration', 'Tech Pay', 'Customer Rating', 'Callback', 'Complaint'],
          ['2024-01-01', 'Install', '5500', '4', '550', '5', 'No', 'No'],
          ['2024-01-01', 'Drain Cleaning', '275', '2', '50', '4', 'No', 'No'],
          ['2024-01-02', 'Jetting', '450', '3', '80', '5', 'No', 'No'],
          ['2024-01-02', 'Descaling', '350', '2.5', '70', '5', 'No', 'No'],
          ['2024-01-03', 'Drain Cleaning', '200', '1.5', '40', '4', 'Yes', 'No'],
        ];
      case 'timeseries':
        return [
          ['Date', 'Metric', 'Value'],
          ['2024-01-01', 'Install Rate', '15.2'],
          ['2024-01-02', 'Install Rate', '18.7'],
          ['2024-01-03', 'Install Rate', '12.3'],
        ];
      default:
        return [['No Data']];
    }
  }

  private processKPIData(data: any[][], sheetName: string): KPIData {
    const rows = data.slice(1); // Skip header row
    const totalCalls = rows.length;
    const installCalls = rows.filter(row => parseFloat(row[2] || '0') >= 10000).length;
    const drainCleaningCalls = rows.filter(row => row[1] === 'Drain Cleaning').length;
    const jettingJobs = rows.filter(row => row[1] === 'Jetting').length;
    const descalingJobs = rows.filter(row => row[1] === 'Descaling').length;
    const callbackCalls = rows.filter(row => row[6] === 'Yes').length;
    const complaintCalls = rows.filter(row => row[7] === 'Yes').length;
    
    // Calculate install revenue as sum of all jobs >= $10k
    const installRevenue = rows
      .filter(row => parseFloat(row[2] || '0') >= 10000)
      .reduce((sum, row) => sum + parseFloat(row[2] || '0'), 0);
    
    return {
      installCallsPercentage: drainCleaningCalls > 0 ? (installCalls / drainCleaningCalls) * 100 : 0,
      installRevenuePerCall: drainCleaningCalls > 0 ? installRevenue / drainCleaningCalls : 0,
      jettingJobsPercentage: drainCleaningCalls > 0 ? (jettingJobs / drainCleaningCalls) * 100 : 0,
      jettingRevenuePerCall: drainCleaningCalls > 0 ? 
        rows.filter(row => row[1] === 'Jetting').reduce((sum, row) => sum + parseFloat(row[2] || '0'), 0) / drainCleaningCalls : 0,
      descalingJobsPercentage: drainCleaningCalls > 0 ? (descalingJobs / drainCleaningCalls) * 100 : 0,
      descalingRevenuePerCall: drainCleaningCalls > 0 ? 
        rows.filter(row => row[1] === 'Descaling').reduce((sum, row) => sum + parseFloat(row[2] || '0'), 0) / drainCleaningCalls : 0,
      membershipConversionRate: 15.8 + Math.random() * 5, // Mock with variation
      totalMembershipsRenewed: Math.floor(40 + Math.random() * 20),
      techPayPercentage: 18.5 + Math.random() * 3,
      laborRevenuePerHour: 125.75 + Math.random() * 25,
      jobEfficiency: 92.3 + Math.random() * 5,
      zeroRevenueCallPercentage: 3.2 + Math.random() * 2,
      diagnosticFeeOnlyPercentage: 12.5 + Math.random() * 3,
      callbackPercentage: totalCalls > 0 ? (callbackCalls / totalCalls) * 100 : 0,
      clientComplaintPercentage: totalCalls > 0 ? (complaintCalls / totalCalls) * 100 : 0,
      clientReviewPercentage: 87.5 + Math.random() * 10
    };
  }

  private processTimeSeriesData(data: any[][], sheetName: string): TimeSeriesData[] {
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