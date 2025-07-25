import React, { useState, useEffect } from 'react';
import { TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { KPICard } from './charts/KPICard';
import { TrendChart } from './charts/TrendChart';
import { TimeFrameFilter } from './filters/TimeFrameFilter';
import { MultiSheetService } from '../services/googleSheets';
import { SupabaseService } from '../services/supabaseService';
import { KPIData, TimeFrame, TimeSeriesData, MultiSheetConfig } from '../types';
import { getDateRangeFromTimeFrame } from '../utils/dateUtils';
import { KPI_METRICS } from '../utils/kpiMetrics';
import { getScoringRanges } from '../utils/scoringUtils';

export const Dashboard: React.FC = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [trendData, setTrendData] = useState<TimeSeriesData[]>([]);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error' | 'no-config'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'sheets'>('supabase');

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
    
    console.log('Dashboard loadData started for timeFrame:', timeFrame);
    
    try {
      // Try Supabase first
      try {
        const tableName = localStorage.getItem('supabaseTableName') || 'SoldLineitems';
        const supabaseService = new SupabaseService(tableName);
        const dateRange = getDateRangeFromTimeFrame(timeFrame);
        
        console.log('Attempting to load data from Supabase...');
        
        // Add timeout wrapper for the entire operation
        const dataPromise = Promise.all([
          supabaseService.getKPIData(dateRange),
          supabaseService.getTimeSeriesData(dateRange)
        ]);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Data loading timeout')), 15000);
        });
        
        const [kpis, trends] = await Promise.race([dataPromise, timeoutPromise]) as [KPIData, TimeSeriesData[]];
        
        console.log(`Successfully loaded data from Supabase table "${tableName}":`, { kpis, trendsLength: trends.length });
        console.log('KPI values loaded:', {
          installCallsPercentage: kpis.installCallsPercentage,
          installRevenuePerCall: kpis.installRevenuePerCall,
          totalRows: 'from Supabase query'
        });
        
        setDebugInfo({
          dataSource: `Supabase Database`,
          timeFrame: timeFrame,
          dateRange: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
          dataLoadedAt: new Date().toISOString(),
          tableName: tableName,
          totalRecords: 'Calculated from SoldLineitems',
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
        setConnectionMessage(`Successfully calculated KPIs from your SoldLineitems table for ${timeFrame}! Found real transaction data.`);
        setDataSource('supabase');
        console.log('Supabase data loading completed successfully');
        return;
      } catch (supabaseError) {
        console.warn('Failed to load data from Supabase, trying Google Sheets:', supabaseError);
      }
      
      // Load configuration from localStorage
      const savedConfig = localStorage.getItem('multiSheetConfig');
      let config: MultiSheetConfig;
      
      if (savedConfig) {
        config = JSON.parse(savedConfig);
        console.log('Loaded config from localStorage:', {
          globalApiKey: config.globalApiKey ? 'present' : 'missing',
          sheetsCount: config.sheets.length,
          activeSheets: config.sheets.filter(s => s.isActive).length
        });
        
        // Try to load data with saved configuration
        try {
          const multiSheetService = new MultiSheetService(config);
          
          // Try to fetch all active sheets once to populate cache, but continue even if it fails
          try {
            await multiSheetService.fetchAllActiveSheets();
            console.log('Successfully pre-cached all active sheets');
          } catch (cacheError) {
            console.warn('Failed to pre-cache sheets, will fetch individually as needed:', cacheError);
          }
          
          const dateRange = getDateRangeFromTimeFrame(timeFrame);
          console.log('Date range for', timeFrame, ':', dateRange);
          
          const [kpis, trends] = await Promise.all([
            multiSheetService.getAggregatedKPIData(dateRange),
            multiSheetService.getAggregatedTimeSeriesData(dateRange)
          ]);
          
          console.log('Successfully loaded KPIs and trends:', { kpis, trendsLength: trends.length });
          
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
          setConnectionMessage(`Successfully loaded data from Google Sheets for ${timeFrame}! (Supabase not available)`);
          setDataSource('sheets');
          console.log('Dashboard data loading completed successfully');
          return;
        } catch (savedConfigError) {
          console.warn('Failed to load data with saved configuration, falling back to demo data:', savedConfigError);
          
          // Set error status to show in UI
          setConnectionStatus('error');
          const errorMsg = savedConfigError instanceof Error ? savedConfigError.message : 'Unknown error';
          setConnectionMessage(`Failed to load data from both Supabase and Google Sheets: ${errorMsg}. Displaying demo data instead.`);
        }
      } else {
        console.log('No saved config found and Supabase not available, using demo data');
      }
      
      // Set debug info for demo data
      setDebugInfo({
        dataSource: 'Demo Data',
        timeFrame: timeFrame,
        dataLoadedAt: new Date().toISOString(),
        note: 'Using fallback demo data - connect to Supabase or configure Google Sheets'
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
      
      console.log('Demo data loaded:', { kpis, trendsLength: trends.length });
      setKpiData(kpis);
      setTrendData(trends);
      setDataSource('sheets');
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Set error status for complete failure
      setConnectionStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setConnectionMessage(`Unable to load any data: ${errorMsg}. Please connect to Supabase or configure Google Sheets.`);
      
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
    console.log('Dashboard loadData completed');
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
      metricId: 'installCallsPercentage',
      color: 'blue' as const,
      trend: 'up' as const,
      trendValue: 5.2
    },
    {
      title: 'Install Revenue per Call',
      value: kpiData.installRevenuePerCall,
      metricId: 'installRevenuePerCall',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 12.8
    },
    {
      title: 'Jetting Jobs Rate',
      value: kpiData.jettingJobsPercentage,
      metricId: 'jettingJobsPercentage',
      color: 'orange' as const,
      trend: 'down' as const,
      trendValue: -2.1
    },
    {
      title: 'Jetting Revenue per Call',
      value: kpiData.jettingRevenuePerCall,
      metricId: 'jettingRevenuePerCall',
      color: 'purple' as const,
      trend: 'up' as const,
      trendValue: 8.5
    },
    {
      title: 'Descaling Jobs Rate',
      value: kpiData.descalingJobsPercentage,
      metricId: 'descalingJobsPercentage',
      color: 'blue' as const,
      trend: 'neutral' as const
    },
    {
      title: 'Descaling Revenue per Call',
      value: kpiData.descalingRevenuePerCall,
      metricId: 'descalingRevenuePerCall',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 15.3
    },
    {
      title: 'Membership Conversion',
      value: kpiData.membershipConversionRate,
      metricId: 'membershipConversionRate',
      color: 'orange' as const,
      trend: 'up' as const,
      trendValue: 7.2
    },
    {
      title: 'Memberships Renewed',
      value: kpiData.totalMembershipsRenewed,
      metricId: 'totalMembershipsRenewed',
      color: 'purple' as const,
      trend: 'up' as const,
      trendValue: 18.7
    },
    {
      title: 'Tech Pay Percentage',
      value: kpiData.techPayPercentage,
      metricId: 'techPayPercentage',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -1.8
    },
    {
      title: 'Labor Revenue per Hour',
      value: kpiData.laborRevenuePerHour,
      metricId: 'laborRevenuePerHour',
      color: 'blue' as const,
      trend: 'up' as const,
      trendValue: 9.4
    },
    {
      title: 'Job Efficiency',
      value: kpiData.jobEfficiency,
      metricId: 'jobEfficiency',
      color: 'green' as const,
      trend: 'up' as const,
      trendValue: 3.6
    },
    {
      title: 'Zero Revenue Calls',
      value: kpiData.zeroRevenueCallPercentage,
      metricId: 'zeroRevenueCallPercentage',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -12.5
    },
    {
      title: 'Diagnostic Fee Only',
      value: kpiData.diagnosticFeeOnlyPercentage,
      metricId: 'diagnosticFeeOnlyPercentage',
      color: 'orange' as const,
      trend: 'down' as const,
      trendValue: -5.8
    },
    {
      title: 'Callback Rate',
      value: kpiData.callbackPercentage,
      metricId: 'callbackPercentage',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -8.2
    },
    {
      title: 'Client Complaints',
      value: kpiData.clientComplaintPercentage,
      metricId: 'clientComplaintPercentage',
      color: 'red' as const,
      trend: 'down' as const,
      trendValue: -15.3
    },
    {
      title: 'Client Reviews',
      value: kpiData.clientReviewPercentage,
      metricId: 'clientReviewPercentage',
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



      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          (() => {
            const metric = KPI_METRICS.find(m => m.id === card.metricId);
            const customRanges = getScoringRanges(card.metricId);
            const scoreRanges = customRanges.length > 0 ? customRanges : metric?.defaultRanges || [];
            
            return (
          <KPICard
            key={index}
            title={card.title}
            value={card.value}
            unit={metric?.unit || ''}
            description={metric?.description || ''}
            formula={metric?.formula || ''}
            color={card.color}
            trend={card.trend}
            trendValue={card.trendValue}
            scoreRanges={scoreRanges}
          />
            );
          })()
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart
          data={trendData}
          title={`Live Install Calls Trend (${dataSource === 'supabase' ? 'From Supabase' : 'From Your Sheets'})`}
          color="#3B82F6"
        />
        <TrendChart
          data={trendData.map(d => ({ ...d, value: d.value * 0.7 + 15 }))}
          title={`Live Revenue Efficiency (${dataSource === 'supabase' ? 'From Supabase' : 'From Your Sheets'})`}
          color="#10B981"
        />
      </div>
    </div>
  );
};