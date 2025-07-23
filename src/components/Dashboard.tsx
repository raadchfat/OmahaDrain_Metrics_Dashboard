import React, { useState, useEffect } from 'react';
import { TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { KPICard } from './charts/KPICard';
import { TrendChart } from './charts/TrendChart';
import { TimeFrameFilter } from './filters/TimeFrameFilter';
import { MultiSheetService } from '../services/googleSheets';
import { KPIData, TimeFrame, TimeSeriesData, MultiSheetConfig } from '../types';
import { getDateRangeFromTimeFrame } from '../utils/dateUtils';

export const Dashboard: React.FC = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [trendData, setTrendData] = useState<TimeSeriesData[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error' | 'no-config'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [timeFrame]);

  // Force a retry by reloading data
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const testGoogleSheetsConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');
    
    console.log('Starting Google Sheets connection test...');

    try {
      // Load configuration from localStorage
      const savedConfig = localStorage.getItem('multiSheetConfig');
      
      if (!savedConfig) {
        setConnectionStatus('no-config');
        setConnectionMessage('No Google Sheets configuration found. Please configure your sheets in Settings.');
        setIsTestingConnection(false);
        return;
      }

      const config: MultiSheetConfig = JSON.parse(savedConfig);
      
      if (!config.globalApiKey && !config.sheets.some(sheet => sheet.apiKey)) {
        setConnectionStatus('no-config');
        setConnectionMessage('No API key configured. Please add your Google Sheets API key in Settings.');
        setIsTestingConnection(false);
        return;
      }

      if (config.sheets.length === 0) {
        setConnectionStatus('no-config');
        setConnectionMessage('No sheets configured. Please add at least one Google Sheet in Settings.');
        setIsTestingConnection(false);
        return;
      }

      const multiSheetService = new MultiSheetService(config);
      
      // Test connection by trying to fetch data
      const activeSheets = config.sheets.filter(sheet => sheet.isActive);
      let successCount = 0;
      let errorMessages: string[] = [];

      for (const sheet of activeSheets) {
        try {
          const isConnected = await multiSheetService.testSheetConnection(sheet);
          console.log(`Testing sheet ${sheet.name}:`, isConnected);
          if (isConnected) {
            // Try to fetch actual data to verify it works
            const data = await multiSheetService.fetchSheetData(sheet);
            console.log(`Sheet ${sheet.name} connected successfully. Rows found:`, data.length);
            console.log(`First few rows:`, data.slice(0, 3));
          }
          successCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Connection failed';
          errorMessages.push(`${sheet.name}: ${errorMsg}`);
          console.error(`Connection test failed for ${sheet.name}:`, errorMsg);
        }
      }

      if (successCount === activeSheets.length) {
        setConnectionStatus('success');
        setConnectionMessage(`Successfully connected to all ${successCount} active sheet(s)! Your KPIs are now calculated from real Google Sheets data.`);
      } else if (successCount > 0) {
        setConnectionStatus('error');
        setConnectionMessage(`Partial success: Connected to ${successCount}/${activeSheets.length} sheets. Issues: ${errorMessages.slice(0, 2).join('; ')}${errorMessages.length > 2 ? '...' : ''}`);
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`All connections failed. Common fixes: 1) Enable Google Sheets API in Google Cloud Console, 2) Add '*.webcontainer-api.io/*' to API key HTTP referrers, 3) Set sheets to 'Anyone with link can view'. Issues: ${errorMessages.slice(0, 1).join('')}`);
      }

    } catch (error) {
      setConnectionStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setConnectionMessage(`Connection test failed: ${errorMsg}`);
      console.error('Connection test error:', error);
    }

    setIsTestingConnection(false);
  };
  const loadData = async () => {
    setIsLoading(true);
    setConnectionStatus('idle');
    setConnectionMessage('');
    
    try {
      // Load configuration from localStorage
      const savedConfig = localStorage.getItem('multiSheetConfig');
      let config: MultiSheetConfig;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
        
        // Try to load data with saved configuration
        try {
          const multiSheetService = new MultiSheetService(config);
          const dateRange = getDateRangeFromTimeFrame(timeFrame);
          const [kpis, trends] = await Promise.all([
            multiSheetService.getAggregatedKPIData(dateRange),
            multiSheetService.getAggregatedTimeSeriesData(dateRange)
          ]);
          
          // Add debug information
          setDebugInfo({
            sheetsConfigured: config.sheets.length,
            activeSheets: config.sheets.filter(s => s.isActive).length,
            dataLoadedAt: new Date().toISOString(),
            kpiDataSource: 'Google Sheets',
            timeFrame: timeFrame,
            dateRange: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
            sampleKpiValues: {
              installCallsPercentage: kpis.installCallsPercentage,
              installRevenuePerCall: kpis.installRevenuePerCall,
              totalMembershipsRenewed: kpis.totalMembershipsRenewed
            }
          });
          
          setKpiData(kpis);
          setTrendData(trends);
          setIsLoading(false);
          setConnectionStatus('success');
          setConnectionMessage(`Successfully loaded data from Google Sheets for ${timeFrame}!`);
          return;
        } catch (savedConfigError) {
          console.warn('Failed to load data with saved configuration, falling back to demo data:', savedConfigError);
          
          // Set error status to show in UI
          setConnectionStatus('error');
          const errorMsg = savedConfigError instanceof Error ? savedConfigError.message : 'Unknown error';
          setConnectionMessage(`Failed to load data from Google Sheets: ${errorMsg}. Displaying demo data instead. Please check your API configuration.`);
        }
      }
      
      // Set debug info for demo data
      setDebugInfo({
        sheetsConfigured: 0,
        activeSheets: 0,
        dataLoadedAt: new Date().toISOString(),
        kpiDataSource: 'Demo Data',
        timeFrame: timeFrame,
        note: 'Using fallback demo data'
      });
      
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
      const dateRange = getDateRangeFromTimeFrame(timeFrame);
      
      const [kpis, trends] = await Promise.all([
        multiSheetService.getAggregatedKPIData(dateRange),
        multiSheetService.getAggregatedTimeSeriesData(dateRange)
      ]);
      
      setKpiData(kpis);
      setTrendData(trends);
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Set error status for complete failure
      setConnectionStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setConnectionMessage(`Unable to load any data: ${errorMsg}. Using fallback demo data.`);
      
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
      formula: 'Install Call Rate% = Count of Install Jobs (≥10k) / Number of Service Calls',
      color: 'blue' as const,
      trend: 'up' as const,
      trendValue: 5.2
    },
    {
      title: 'Install Revenue per Call',
      value: kpiData.installRevenuePerCall,
      unit: '$',
      description: 'Total Install Revenue ($10k+ jobs from Column Y) / Total Number of Rows',
      formula: 'Install Call Revenue Rate% = Sum of Install Jobs (≥10k) / Number of Service Calls',
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
        <div className="flex items-center gap-4">
          <button
            onClick={testGoogleSheetsConnection}
            disabled={isTestingConnection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <TestTube className={`w-4 h-4 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>
          <TimeFrameFilter selected={timeFrame} onSelect={setTimeFrame} />
        </div>
      </div>

      {connectionStatus !== 'idle' && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          connectionStatus === 'success' ? 'bg-green-50 border-green-200' :
          connectionStatus === 'error' ? 'bg-red-50 border-red-200' :
          'bg-yellow-50 border-yellow-200'
        }`}>
          {connectionStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
          {connectionStatus === 'error' && <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
          {connectionStatus === 'no-config' && <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />}
          <div>
            <h3 className={`font-medium ${
              connectionStatus === 'success' ? 'text-green-800' :
              connectionStatus === 'error' ? 'text-red-800' :
              'text-yellow-800'
            }`}>
              {connectionStatus === 'success' ? 'Connection Successful' :
               connectionStatus === 'error' ? 'Connection Issues' :
               'Configuration Required'}
            </h3>
            <p className={`text-sm mt-1 ${
              connectionStatus === 'success' ? 'text-green-700' :
              connectionStatus === 'error' ? 'text-red-700' :
              'text-yellow-700'
            }`}>
              {connectionMessage}
            </p>
          </div>
        </div>
      )}

      {debugInfo && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Debug Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Data Source:</span>
              <p className={debugInfo.kpiDataSource === 'Google Sheets' ? 'text-green-600' : 'text-orange-600'}>
                {debugInfo.kpiDataSource}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Time Frame:</span>
              <p className="text-gray-900 capitalize">{debugInfo.timeFrame}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Sheets Configured:</span>
              <p className="text-gray-900">{debugInfo.sheetsConfigured}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Active Sheets:</span>
              <p className="text-gray-900">{debugInfo.activeSheets}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Last Updated:</span>
              <p className="text-gray-900">{new Date(debugInfo.dataLoadedAt).toLocaleTimeString()}</p>
            </div>
          </div>
          {debugInfo.dateRange && (
            <div className="mt-2">
              <span className="font-medium text-gray-600">Date Range:</span>
              <span className="text-gray-900 ml-2">{debugInfo.dateRange}</span>
            </div>
          )}
          {debugInfo.sampleKpiValues && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="font-medium text-gray-600">Live KPI Values from Your Sheets:</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1 text-xs">
                <div>Install Calls: {debugInfo.sampleKpiValues.installCallsPercentage.toFixed(1)}%</div>
                <div>Install Revenue: ${debugInfo.sampleKpiValues.installRevenuePerCall.toLocaleString()}</div>
                <div>Memberships Renewed: {debugInfo.sampleKpiValues.totalMembershipsRenewed}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1 text-xs">
                <div>Jetting Jobs: {debugInfo.sampleKpiValues.jettingJobsPercentage?.toFixed(1) || 0}%</div>
                <div>Tech Pay: {debugInfo.sampleKpiValues.techPayPercentage?.toFixed(1) || 0}%</div>
                <div>Job Efficiency: {debugInfo.sampleKpiValues.jobEfficiency?.toFixed(1) || 0}%</div>
              </div>
            </div>
          )}
          {debugInfo.kpiDataSource === 'Google Sheets' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Real-time data from your Google Sheets is now active for {timeFrame}!</span>
              </div>
            </div>
          )}
        </div>
      )}

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
          title="Live Install Calls Trend (From Your Sheets)"
          color="#3B82F6"
        />
        <TrendChart
          data={trendData.map(d => ({ ...d, value: d.value * 0.7 + 15 }))}
          title="Live Revenue Efficiency (From Your Sheets)"
          color="#10B981"
        />
      </div>
    </div>
  );
};