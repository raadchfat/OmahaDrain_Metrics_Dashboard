import { KPIMetric } from '../types';

export const KPI_METRICS: KPIMetric[] = [
  {
    id: 'installCallsPercentage',
    name: 'Install Calls Rate',
    unit: '%',
    description: '% of Install Calls ($10k+) / Drain Cleaning Calls',
    formula: 'Install Call Rate% = Count of Install Jobs (≥10k) / Number of Service Calls',
    defaultRanges: [
      { min: 0, max: 1, score: 1 },
      { min: 1, max: 2, score: 2 },
      { min: 2, max: 3, score: 3 },
      { min: 3, max: 4, score: 4 },
      { min: 4, max: 5, score: 5 },
      { min: 5, max: 6, score: 6 },
      { min: 6, max: 7, score: 7 },
      { min: 7, max: 8, score: 8 },
      { min: 8, max: 10, score: 9 },
      { min: 10, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'installRevenuePerCall',
    name: 'Install Revenue per Call',
    unit: '$',
    description: 'Total Install Revenue ($10k+ jobs from Column Y) / Total Number of Rows',
    formula: 'Install Call Revenue Rate% = Sum of Install Jobs (≥10k) / Number of Service Calls',
    defaultRanges: [
      { min: 0, max: 399, score: 1 },
      { min: 400, max: 499, score: 2 },
      { min: 500, max: 599, score: 3 },
      { min: 600, max: 699, score: 4 },
      { min: 700, max: 799, score: 5 },
      { min: 800, max: 899, score: 6 },
      { min: 900, max: 999, score: 7 },
      { min: 1000, max: 1099, score: 8 },
      { min: 1100, max: 1249, score: 9 },
      { min: 1250, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'jettingJobsPercentage',
    name: 'Jetting Jobs Rate',
    unit: '%',
    description: 'Percentage of unique jobs that included jetting services',
    formula: 'Jetting Jobs Performed ÷ Total Jobs Performed × 100',
    defaultRanges: [
      { min: 0, max: 5, score: 1 },
      { min: 5, max: 10, score: 2 },
      { min: 10, max: 15, score: 3 },
      { min: 15, max: 20, score: 4 },
      { min: 20, max: 25, score: 5 },
      { min: 25, max: 30, score: 6 },
      { min: 30, max: 35, score: 7 },
      { min: 35, max: 40, score: 8 },
      { min: 40, max: 50, score: 9 },
      { min: 50, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'jettingRevenuePerCall',
    name: 'Jetting Revenue per Call',
    unit: '$',
    description: 'Total jetting revenue from all jetting line items divided by total jobs performed',
    formula: 'Jetting Revenue per Service Call = Total Jetting Revenue ÷ Total Jobs Performed',
    defaultRanges: [
      { min: 0, max: 39, score: 1 },
      { min: 40, max: 59, score: 2 },
      { min: 60, max: 79, score: 3 },
      { min: 80, max: 99, score: 4 },
      { min: 100, max: 119, score: 5 },
      { min: 120, max: 139, score: 6 },
      { min: 140, max: 159, score: 7 },
      { min: 160, max: 179, score: 8 },
      { min: 180, max: 199, score: 9 },
      { min: 200, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'descalingJobsPercentage',
    name: 'Descaling Jobs Rate',
    unit: '%',
    description: 'Percentage of unique Drain Cleaning jobs that included descaling services',
    formula: 'Descaling Jobs Performed ÷ Drain Cleaning Service Calls Performed × 100',
    defaultRanges: [
      { min: 0, max: 5, score: 1 },
      { min: 5, max: 10, score: 2 },
      { min: 10, max: 15, score: 3 },
      { min: 15, max: 20, score: 4 },
      { min: 20, max: 25, score: 5 },
      { min: 25, max: 30, score: 6 },
      { min: 30, max: 35, score: 7 },
      { min: 35, max: 40, score: 8 },
      { min: 40, max: 50, score: 9 },
      { min: 50, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'descalingRevenuePerCall',
    name: 'Descaling Revenue per Call',
    unit: '$',
    description: 'Total descaling revenue from all descaling line items divided by total Drain Cleaning jobs performed',
    formula: 'Descaling Revenue per Service Call = Total Descaling Revenue ÷ Total Drain Cleaning Jobs Performed',
    defaultRanges: [
      { min: 0, max: 39, score: 1 },
      { min: 40, max: 59, score: 2 },
      { min: 60, max: 79, score: 3 },
      { min: 80, max: 99, score: 4 },
      { min: 100, max: 119, score: 5 },
      { min: 120, max: 139, score: 6 },
      { min: 140, max: 159, score: 7 },
      { min: 160, max: 179, score: 8 },
      { min: 180, max: 199, score: 9 },
      { min: 200, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'membershipConversionRate',
    name: 'Membership Conversion',
    unit: '%',
    description: 'Percentage of customers who sign up for memberships',
    formula: '(# of New Memberships) ÷ (# of Total Customers) × 100',
    defaultRanges: [
      { min: 0, max: 2, score: 1 },
      { min: 2, max: 4, score: 2 },
      { min: 4, max: 6, score: 3 },
      { min: 6, max: 8, score: 4 },
      { min: 8, max: 10, score: 5 },
      { min: 10, max: 12, score: 6 },
      { min: 12, max: 15, score: 7 },
      { min: 15, max: 18, score: 8 },
      { min: 18, max: 22, score: 9 },
      { min: 22, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'totalMembershipsRenewed',
    name: 'Memberships Renewed',
    unit: '',
    description: 'Total number of memberships renewed this period',
    formula: 'COUNT(Renewed Memberships)',
    defaultRanges: [
      { min: 0, max: 5, score: 1 },
      { min: 5, max: 10, score: 2 },
      { min: 10, max: 20, score: 3 },
      { min: 20, max: 35, score: 4 },
      { min: 35, max: 50, score: 5 },
      { min: 50, max: 75, score: 6 },
      { min: 75, max: 100, score: 7 },
      { min: 100, max: 150, score: 8 },
      { min: 150, max: 200, score: 9 },
      { min: 200, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'techPayPercentage',
    name: 'Tech Pay Percentage',
    unit: '%',
    description: 'Tech Pay / Total Tech Call Revenue',
    formula: '(Total Tech Pay) ÷ (Total Tech Call Revenue) × 100',
    defaultRanges: [
      { min: 50, max: Infinity, score: 1 },
      { min: 45, max: 50, score: 2 },
      { min: 40, max: 45, score: 3 },
      { min: 35, max: 40, score: 4 },
      { min: 30, max: 35, score: 5 },
      { min: 25, max: 30, score: 6 },
      { min: 20, max: 25, score: 7 },
      { min: 15, max: 20, score: 8 },
      { min: 10, max: 15, score: 9 },
      { min: 0, max: 10, score: 10 }
    ]
  },
  {
    id: 'laborRevenuePerHour',
    name: 'Labor Revenue per Hour',
    unit: '$',
    description: 'Labor Revenue / Worked Hours',
    formula: '(Total Labor Revenue) ÷ (Total Worked Hours)',
    defaultRanges: [
      { min: 0, max: 50, score: 1 },
      { min: 50, max: 75, score: 2 },
      { min: 75, max: 100, score: 3 },
      { min: 100, max: 125, score: 4 },
      { min: 125, max: 150, score: 5 },
      { min: 150, max: 175, score: 6 },
      { min: 175, max: 200, score: 7 },
      { min: 200, max: 250, score: 8 },
      { min: 250, max: 300, score: 9 },
      { min: 300, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'jobEfficiency',
    name: 'Job Efficiency',
    unit: '%',
    description: 'Allotted Hours for Repair / Actual Repair Time',
    formula: '(Allotted Hours for Repair) ÷ (Actual Repair Time) × 100',
    defaultRanges: [
      { min: 0, max: 60, score: 1 },
      { min: 60, max: 70, score: 2 },
      { min: 70, max: 75, score: 3 },
      { min: 75, max: 80, score: 4 },
      { min: 80, max: 85, score: 5 },
      { min: 85, max: 90, score: 6 },
      { min: 90, max: 95, score: 7 },
      { min: 95, max: 100, score: 8 },
      { min: 100, max: 110, score: 9 },
      { min: 110, max: Infinity, score: 10 }
    ]
  },
  {
    id: 'zeroRevenueCallPercentage',
    name: 'Zero Revenue Calls',
    unit: '%',
    description: 'Percentage of calls that generated no revenue',
    formula: '(# of $0 Revenue Calls) ÷ (Total # of Calls) × 100',
    defaultRanges: [
      { min: 20, max: Infinity, score: 1 },
      { min: 18, max: 20, score: 2 },
      { min: 15, max: 18, score: 3 },
      { min: 12, max: 15, score: 4 },
      { min: 10, max: 12, score: 5 },
      { min: 8, max: 10, score: 6 },
      { min: 6, max: 8, score: 7 },
      { min: 4, max: 6, score: 8 },
      { min: 2, max: 4, score: 9 },
      { min: 0, max: 2, score: 10 }
    ]
  },
  {
    id: 'diagnosticFeeOnlyPercentage',
    name: 'Diagnostic Fee Only',
    unit: '%',
    description: 'Percentage of calls that only charged diagnostic fee',
    formula: '(# of Diagnostic Fee Only Calls) ÷ (Total # of Calls) × 100',
    defaultRanges: [
      { min: 40, max: Infinity, score: 1 },
      { min: 35, max: 40, score: 2 },
      { min: 30, max: 35, score: 3 },
      { min: 25, max: 30, score: 4 },
      { min: 20, max: 25, score: 5 },
      { min: 15, max: 20, score: 6 },
      { min: 12, max: 15, score: 7 },
      { min: 8, max: 12, score: 8 },
      { min: 5, max: 8, score: 9 },
      { min: 0, max: 5, score: 10 }
    ]
  },
  {
    id: 'callbackPercentage',
    name: 'Callback Rate',
    unit: '%',
    description: 'Percentage of jobs that required a callback',
    formula: '(# of Callback Jobs) ÷ (Total # of Jobs) × 100',
    defaultRanges: [
      { min: 15, max: Infinity, score: 1 },
      { min: 12, max: 15, score: 2 },
      { min: 10, max: 12, score: 3 },
      { min: 8, max: 10, score: 4 },
      { min: 6, max: 8, score: 5 },
      { min: 5, max: 6, score: 6 },
      { min: 4, max: 5, score: 7 },
      { min: 3, max: 4, score: 8 },
      { min: 2, max: 3, score: 9 },
      { min: 0, max: 2, score: 10 }
    ]
  },
  {
    id: 'clientComplaintPercentage',
    name: 'Client Complaints',
    unit: '%',
    description: 'Percentage of jobs that resulted in complaints',
    formula: '(# of Jobs with Complaints) ÷ (Total # of Jobs) × 100',
    defaultRanges: [
      { min: 10, max: Infinity, score: 1 },
      { min: 8, max: 10, score: 2 },
      { min: 6, max: 8, score: 3 },
      { min: 5, max: 6, score: 4 },
      { min: 4, max: 5, score: 5 },
      { min: 3, max: 4, score: 6 },
      { min: 2, max: 3, score: 7 },
      { min: 1.5, max: 2, score: 8 },
      { min: 1, max: 1.5, score: 9 },
      { min: 0, max: 1, score: 10 }
    ]
  },
  {
    id: 'clientReviewPercentage',
    name: 'Client Reviews',
    unit: '%',
    description: 'Percentage of customers who left reviews',
    formula: '(# of Customer Reviews) ÷ (Total # of Customers) × 100',
    defaultRanges: [
      { min: 0, max: 10, score: 1 },
      { min: 10, max: 20, score: 2 },
      { min: 20, max: 30, score: 3 },
      { min: 30, max: 40, score: 4 },
      { min: 40, max: 50, score: 5 },
      { min: 50, max: 60, score: 6 },
      { min: 60, max: 70, score: 7 },
      { min: 70, max: 80, score: 8 },
      { min: 80, max: 90, score: 9 },
      { min: 90, max: Infinity, score: 10 }
    ]
  }
];

export const getKPIMetricById = (id: string): KPIMetric | undefined => {
  return KPI_METRICS.find(metric => metric.id === id);
};

export const getAllKPIMetrics = (): KPIMetric[] => {
  return KPI_METRICS;
};