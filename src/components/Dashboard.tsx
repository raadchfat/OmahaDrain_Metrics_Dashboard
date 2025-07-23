import React, { useState, useEffect } from 'react';
import { KPICard } from './charts/KPICard';
import { TrendChart } from './charts/TrendChart';
import { TimeFrameFilter } from './filters/TimeFrameFilter';
import { MultiSheetService } from '../services/googleSheets';
import { KPIData, TimeFrame, TimeSeriesData, MultiSheetConfig } from '../types';

export const Dashboard: React.FC = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [trendData, setTrendData] = useState<TimeSeriesData[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('today');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [timeFrame]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load configuration from localStorage
      const savedConfig = localStorage.getItem('multiSheetConfig');
      let config: MultiSheetConfig;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
        
        // Try to load data with saved configuration
        try {
          const multiSheetService = new MultiSheetService(config);
          const [kpis, trends] = await Promise.all([
            multiSheetService.getAggregatedKPIData(),
            multiSheetService.getAggregatedTimeSeriesData()
          ]);
          
          setKpiData(kpis);
          setTrendData(trends);
          setIsLoading(false);
          return;
        } catch (savedConfigError) {
          console.warn('Failed to load data with saved configuration, falling back to demo data:', savedConfigError);
        }
      }
      
      // Fallback to demo configuration
      config = {
        globalApiKey: 'demo-key',
        sheets: [{
          sheetId: 'demo-sheet-id',
          name: 'Demo Sheet',
          apiKey: '',
          range: 'A1:Z1000',
          refreshInterval: 300,
          isActive: true,
          dataType: 'kpi'
        }]
      };
      
      const multiSheetService = new MultiSheetService(config);
      
      const [kpis, trends] = await Promise.all([
        multiSheetService.getAggregatedKPIData(),
        multiSheetService.getAggregatedTimeSeriesData()
      ]);
      
      setKpiData(kpis);
      setTrendData(trends);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set fallback data to prevent complete failure
      setKpiData({
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
      });
      setTrendData([]);
    }
    setIsLoading(false);
  };

  if (isLoading || !kpiData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Install Calls Rate',
      value: kpiData.installCallsPercentage,
      unit: '%',
      description: '% of Install Calls ($10k+) / Drain Cleaning Calls',
      formula: '(# of Install Calls ≥ $10k) ÷ (# of Drain Cleaning Calls) × 100',
      color: 'blue' as const,
      trend: 'up' as const,
      trendValue: 5.2
    },
    {
      title: 'Install Revenue per Call',
      value: kpiData.installRevenuePerCall,
      unit: '$',
      description: 'Install Revenue ($10k+ jobs) / # of Drain Cleaning Calls',
      formula: '(Sum of all jobs ≥ $10k) ÷ (# of Drain Cleaning Calls)',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 12.8
    },
    {
      title: 'Jetting Jobs Rate',
      value: kpiData.jettingJobsPercentage,
      unit: '%',
      description: '% of Jetting Jobs / # of Drain Cleaning Calls',
      formula: '(# of Jetting Jobs) ÷ (# of Drain Cleaning Calls) × 100',
      color: 'orange' as const,
      trend: 'down' as const,
      trendValue: -2.1
    },
    {
      title: 'Jetting Revenue per Call',
      value: kpiData.jettingRevenuePerCall,
      unit: '$',
      description: 'Jetting Revenue / # of Drain Cleaning Calls',
      formula: '(Total Jetting Revenue) ÷ (# of Drain Cleaning Calls)',
      color: 'purple' as const,
      trend: 'up' as const,
      trendValue: 8.5
    },
    {
      title: 'Descaling Jobs Rate',
      value: kpiData.descalingJobsPercentage,
      unit: '%',
      description: '% of Descaling Jobs / # of Drain Cleaning Calls',
      formula: '(# of Descaling Jobs) ÷ (# of Drain Cleaning Calls) × 100',
      color: 'blue' as const,
      trend: 'neutral' as const
    },
    {
      title: 'Descaling Revenue per Call',
      value: kpiData.descalingRevenuePerCall,
      unit: '$',
      description: 'Descaling Revenue / # of Drain Cleaning Calls',
      formula: '(Total Descaling Revenue) ÷ (# of Drain Cleaning Calls)',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 15.3
    },
    {
      title: 'Membership Conversion',
      value: kpiData.membershipConversionRate,
      unit: '%',
      description: 'Percentage of customers who sign up for memberships',
      formula: '(# of New Memberships) ÷ (# of Total Customers) × 100',
      color: 'orange' as const,
      trend: 'up' as const,
      trendValue: 7.2
    },
    {
      title: 'Memberships Renewed',
      value: kpiData.totalMembershipsRenewed,
      unit: '',
      description: 'Total number of memberships renewed this period',
      formula: 'COUNT(Renewed Memberships)',
      color: 'purple' as const,
      trend: 'up' as const,
      trendValue: 18.7
    },
    {
      title: 'Tech Pay Percentage',
      value: kpiData.techPayPercentage,
      unit: '%',
      description: 'Tech Pay / Total Tech Call Revenue',
      formula: '(Total Tech Pay) ÷ (Total Tech Call Revenue) × 100',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -1.8
    },
    {
      title: 'Labor Revenue per Hour',
      value: kpiData.laborRevenuePerHour,
      unit: '$',
      description: 'Labor Revenue / Worked Hours',
      formula: '(Total Labor Revenue) ÷ (Total Worked Hours)',
      color: 'blue' as const,
      trend: 'up' as const,
      trendValue: 9.4
    },
    {
      title: 'Job Efficiency',
      value: kpiData.jobEfficiency,
      unit: '%',
      description: 'Allotted Hours for Repair / Actual Repair Time',
      formula: '(Allotted Hours for Repair) ÷ (Actual Repair Time) × 100',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 3.6
    },
    {
      title: 'Zero Revenue Calls',
      value: kpiData.zeroRevenueCallPercentage,
      unit: '%',
      description: 'Percentage of calls that generated no revenue',
      formula: '(# of $0 Revenue Calls) ÷ (Total # of Calls) × 100',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -12.5
    },
    {
      title: 'Diagnostic Fee Only',
      value: kpiData.diagnosticFeeOnlyPercentage,
      unit: '%',
      description: 'Percentage of calls that only charged diagnostic fee',
      formula: '(# of Diagnostic Fee Only Calls) ÷ (Total # of Calls) × 100',
      color: 'orange' as const,
      trend: 'down' as const,
      trendValue: -5.8
    },
    {
      title: 'Callback Rate',
      value: kpiData.callbackPercentage,
      unit: '%',
      description: 'Percentage of jobs that required a callback',
      formula: '(# of Callback Jobs) ÷ (Total # of Jobs) × 100',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -8.2
    },
    {
      title: 'Client Complaints',
      value: kpiData.clientComplaintPercentage,
      unit: '%',
      description: 'Percentage of jobs that resulted in complaints',
      formula: '(# of Jobs with Complaints) ÷ (Total # of Jobs) × 100',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -15.3
    },
    {
      title: 'Client Reviews',
      value: kpiData.clientReviewPercentage,
      unit: '%',
      description: 'Percentage of customers who left reviews',
      formula: '(# of Customer Reviews) ÷ (Total # of Customers) × 100',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 22.1
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Dashboard</h1>
          <p className="text-gray-600">Monitor your business performance metrics</p>
        </div>
        <TimeFrameFilter selected={timeFrame} onSelect={setTimeFrame} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          <KPICard
            key={index}
            title={card.title}
            value={card.value}
            unit={card.unit}
            description={card.description}
            formula={card.formula}
            color={card.color}
            trend={card.trend}
            trendValue={card.trendValue}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          data={trendData}
          title="Multi-Source Install Calls Trend"
          color="#3B82F6"
        />
        <TrendChart
          data={trendData.map(d => ({ ...d, value: d.value * 0.7 + 15 }))}
          title="Aggregated Revenue Efficiency"
          color="#10B981"
        />
      </div>
    </div>
  );
};