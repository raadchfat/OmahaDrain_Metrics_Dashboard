import { KPIData, TimeSeriesData } from '../types';

// Mock Google Sheets API service
export class GoogleSheetsService {
  private apiKey: string;
  private sheetId: string;
  private range: string;

  constructor(apiKey: string, sheetId: string, range: string = 'A:Z') {
    this.apiKey = apiKey;
    this.sheetId = sheetId;
    this.range = range;
  }

  async fetchData(): Promise<any[][]> {
    // In production, this would make a real API call to Google Sheets
    // For demo purposes, we'll return mock data
    return this.getMockData();
  }

  async getKPIData(): Promise<KPIData> {
    const data = await this.fetchData();
    return this.processKPIData(data);
  }

  async getTimeSeriesData(): Promise<TimeSeriesData[]> {
    // Mock time series data for the last 30 days
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() * 100,
        metric: 'installCallsPercentage'
      });
    }
    
    return data;
  }

  private getMockData(): any[][] {
    // Mock data representing typical Google Sheets structure
    return [
      ['Date', 'Service Type', 'Revenue', 'Duration', 'Tech Pay', 'Customer Rating', 'Callback', 'Complaint'],
      ['2024-01-01', 'Install', '5500', '4', '550', '5', 'No', 'No'],
      ['2024-01-01', 'Drain Cleaning', '275', '2', '50', '4', 'No', 'No'],
      ['2024-01-02', 'Jetting', '450', '3', '80', '5', 'No', 'No'],
      ['2024-01-02', 'Descaling', '350', '2.5', '70', '5', 'No', 'No'],
      ['2024-01-03', 'Drain Cleaning', '200', '1.5', '40', '4', 'Yes', 'No'],
      // Add more mock data rows...
    ];
  }

  private processKPIData(data: any[][]): KPIData {
    // Process the raw sheet data to calculate KPIs
    // This is a simplified example - in production, you'd have more complex logic
    
    const rows = data.slice(1); // Skip header row
    const totalCalls = rows.length;
    const installCalls = rows.filter(row => row[1] === 'Install' && parseFloat(row[2]) >= 5000).length;
    const drainCleaningCalls = rows.filter(row => row[1] === 'Drain Cleaning').length;
    const jettingJobs = rows.filter(row => row[1] === 'Jetting').length;
    const descalingJobs = rows.filter(row => row[1] === 'Descaling').length;
    const callbackCalls = rows.filter(row => row[6] === 'Yes').length;
    const complaintCalls = rows.filter(row => row[7] === 'Yes').length;
    
    return {
      installCallsPercentage: drainCleaningCalls > 0 ? (installCalls / drainCleaningCalls) * 100 : 0,
      installRevenuePerCall: drainCleaningCalls > 0 ? 
        rows.filter(row => row[1] === 'Install').reduce((sum, row) => sum + parseFloat(row[2] || '0'), 0) / drainCleaningCalls : 0,
      jettingJobsPercentage: drainCleaningCalls > 0 ? (jettingJobs / drainCleaningCalls) * 100 : 0,
      jettingRevenuePerCall: drainCleaningCalls > 0 ? 
        rows.filter(row => row[1] === 'Jetting').reduce((sum, row) => sum + parseFloat(row[2] || '0'), 0) / drainCleaningCalls : 0,
      descalingJobsPercentage: drainCleaningCalls > 0 ? (descalingJobs / drainCleaningCalls) * 100 : 0,
      descalingRevenuePerCall: drainCleaningCalls > 0 ? 
        rows.filter(row => row[1] === 'Descaling').reduce((sum, row) => sum + parseFloat(row[2] || '0'), 0) / drainCleaningCalls : 0,
      membershipConversionRate: 15.8, // Mock value
      totalMembershipsRenewed: 42, // Mock value
      techPayPercentage: 18.5, // Mock value
      laborRevenuePerHour: 125.75, // Mock value
      jobEfficiency: 92.3, // Mock value
      zeroRevenueCallPercentage: 3.2, // Mock value
      diagnosticFeeOnlyPercentage: 12.5, // Mock value
      callbackPercentage: totalCalls > 0 ? (callbackCalls / totalCalls) * 100 : 0,
      clientComplaintPercentage: totalCalls > 0 ? (complaintCalls / totalCalls) * 100 : 0,
      clientReviewPercentage: 87.5 // Mock value
    };
  }
}