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
  name: string;
  apiKey: string;
  range: string;
  refreshInterval: number;
  isActive: boolean;
  dataType: 'kpi' | 'timeseries' | 'raw';
  lastSync?: Date;
}

export interface MultiSheetConfig {
  sheets: GoogleSheetConfig[];
  globalApiKey: string;
  scoringRanges?: Record<string, ScoreRange[]>;
}

export interface ScoreRange {
  min: number;
  max: number;
  score: number;
}

export interface KPIMetric {
  id: string;
  name: string;
  unit: string;
  description: string;
  formula: string;
  defaultRanges: ScoreRange[];
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

export type TimeFrame = 'today' | 'yesterday' | 'week' | 'lastweek' | 'month' | 'quarter' | 'year' | 'custom';