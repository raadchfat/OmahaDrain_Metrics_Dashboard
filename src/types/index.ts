export interface KPIData {
  installCallsPercentage: number;
  installRevenuePerCall: number;
  jettingJobsPercentage: number;
  jettingRevenuePerCall: number;
  descalingJobsPercentage: number;
  descalingRevenuePerCall: number;
  membershipConversionRate: number;
  totalMembershipsRenewed: number;
  techPayPercentage: number;
  laborRevenuePerHour: number;
  jobEfficiency: number;
  zeroRevenueCallPercentage: number;
  diagnosticFeeOnlyPercentage: number;
  callbackPercentage: number;
  clientComplaintPercentage: number;
  clientReviewPercentage: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
  metric: string;
}

export interface GoogleSheetConfig {
  sheetId: string;
  apiKey: string;
  range: string;
  refreshInterval: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
}

export interface DateRange {
  start: Date;
  end: Date;
}

export type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'custom';