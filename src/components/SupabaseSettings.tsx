import React, { useState, useEffect } from 'react';
import { Database, TestTube, CheckCircle, XCircle, AlertCircle, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { SettingsTable } from './SettingsTable';
import { TableConfig, TableName } from '../types';

export const SupabaseSettings: React.FC = () => {
  const [tableConfigs, setTableConfigs] = useState<TableConfig[]>([
    {
      name: 'SoldLineitems',
      displayName: 'Sold Line Items',
      description: 'Transaction data with pricing, departments, and job details',
      primaryDateColumn: 'Invoice Date',
      isActive: true
    },
    {
      name: 'Opportunities',
      displayName: 'Opportunities',
      description: 'Sales opportunities and pipeline data',
      primaryDateColumn: 'Date',
      isActive: true
    },
    {
      name: 'Jobs_revenue',
      displayName: 'Jobs Revenue',
      description: 'Completed job revenue and billing information (Historical Data)',
      primaryDateColumn: 'Completed',
      isActive: true
    }
  ]);
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResults, setConnectionResults] = useState<Record<string, { status: 'idle' | 'success' | 'error', message: string }>>({});
  const [rawData, setRawData] = useState<any[]>([]);
  const [showRawData, setShowRawData] = useState(false);
  const [activeTable, setActiveTable] = useState<TableName>('SoldLineitems');

  useEffect(() => {
    // Load saved table configurations
    const savedConfigs = localStorage.getItem('supabaseTableConfigs');
    if (savedConfigs) {
      setTableConfigs(JSON.parse(savedConfigs));
    }
    
    const savedActiveTable = localStorage.getItem('supabaseActiveTable') as TableName;
    if (savedActiveTable) {
      setActiveTable(savedActiveTable);
    }
  }, []);

  const toggleTableActive = (tableName: TableName) => {
    const newConfigs = tableConfigs.map(config => 
      config.name === tableName 
        ? { ...config, isActive: !config.isActive }
        : config
    );
    setTableConfigs(newConfigs);
    localStorage.setItem('supabaseTableConfigs', JSON.stringify(newConfigs));
  };

  const setActiveTableAndSave = (tableName: TableName) => {
    setActiveTable(tableName);
    localStorage.setItem('supabaseActiveTable', tableName);
    // Also save for backward compatibility
    localStorage.setItem('supabaseTableName', tableName);
  };

  const testSupabaseConnection = async (tableName?: TableName) => {
    setIsTestingConnection(true);
    
    const tablesToTest = tableName ? [tableName] : tableConfigs.filter(config => config.isActive).map(config => config.name);
    
    console.log('🧪 Testing connections for tables:', tablesToTest);
    
    for (const table of tablesToTest) {
      setConnectionResults(prev => ({
        ...prev,
        [table]: { status: 'idle', message: 'Testing...' }
      }));
      
      console.log(`🔍 Testing table: "${table}" (case-sensitive)`);
    }

    try {
      for (const table of tablesToTest) {
        try {
          console.log(`📊 Creating SupabaseService for table: "${table}"`);
          const supabaseService = new SupabaseService(table);
          const result = await supabaseService.testConnectionDetailed();
          
          console.log(`📋 Test result for "${table}":`, result);

          if (result.success) {
            setConnectionResults(prev => ({
              ...prev,
              [table]: { status: 'success', message: result.message }
            }));
            
            // Only fetch sample data for the active table
            if (table === activeTable && result.rowCount && result.rowCount > 0) {
              try {
                console.log(`📄 Fetching sample data for active table: "${table}"`);
                const sampleData = await supabaseService.getRawData(5);
                setRawData(sampleData);
                setShowRawData(true);
                console.log(`✅ Sample data fetched for "${table}":`, sampleData.length, 'rows');
              } catch (error) {
                console.warn('Could not fetch sample data:', error);
              }
            }
          } else {
            console.error(`❌ Connection failed for "${table}":`, result.message);
            setConnectionResults(prev => ({
              ...prev,
              [table]: { status: 'error', message: result.message }
            }));
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`💥 Exception testing "${table}":`, errorMsg);
          setConnectionResults(prev => ({
            ...prev,
            [table]: { status: 'error', message: `Connection failed: ${errorMsg}` }
          }));
        }
      }
    } catch (error) {
      console.error('Error testing connections:', error);
    }

    setIsTestingConnection(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-600" />
        Supabase Database Tables (Read-Only)
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Multi-Table Setup Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Click the "Connect to Supabase" button in the top right corner</li>
            <li><strong>All three tables (SoldLineitems, Opportunities, Jobs_revenue) are now active by default</strong></li>
            <li>Toggle tables on/off to control which data sources are active</li>
            <li>Select your primary table for KPI calculations</li>
            <li>Test connections to verify we can read your data</li>
            <li>The app will read data from your existing table structures</li>
          </ol>
        </div>

        {/* Connection Status Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Connection Status Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tableConfigs.map((config) => {
              const result = connectionResults[config.name];
              return (
                <div key={config.name} className={`p-3 rounded-lg border-2 ${
                  result?.status === 'success' ? 'bg-green-50 border-green-200' :
                  result?.status === 'error' ? 'bg-red-50 border-red-200' :
                  config.isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {result?.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {result?.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                    {!result && config.isActive && <AlertCircle className="w-4 h-4 text-blue-600" />}
                    {!result && !config.isActive && <div className="w-4 h-4 rounded-full bg-gray-400" />}
                    <span className="font-medium text-sm">{config.displayName}</span>
                  </div>
                  <div className="text-xs">
                    {result?.status === 'success' && <span className="text-green-700">✓ Connected</span>}
                    {result?.status === 'error' && <span className="text-red-700">✗ Failed</span>}
                    {!result && config.isActive && <span className="text-blue-700">? Not tested</span>}
                    {!result && !config.isActive && <span className="text-gray-600">○ Inactive</span>}
                  </div>
                  {config.name === activeTable && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Primary Table
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Table Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Tables</h3>
          
          {/* Debug: Show table count */}
          <div className="text-xs text-gray-500 mb-2">
            Found {tableConfigs.length} tables configured. Active: {tableConfigs.filter(t => t.isActive).length}
          </div>
          
          {tableConfigs.map(table => (
            <SettingsTable
              key={table.name}
              table={table.name}
              displayName={table.displayName}
              description={table.description}
              isActive={table.isActive}
              isPrimary={activeTable === table.name}
              onToggleActive={toggleTableActive}
              onSetPrimary={setActiveTableAndSave}
              connectionResult={connectionResults[table.name]}
              onTest={testSupabaseConnection}
              isTestingConnection={isTestingConnection}
            />
          ))}
          
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => testSupabaseConnection()}
            disabled={isTestingConnection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className={`w-4 h-4 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            {isTestingConnection ? 'Testing Connections...' : 'Test All Active Tables'}
          </button>
        </div>

        {showRawData && rawData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Sample Data from {activeTable}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    {Object.keys(rawData[0]).map((key) => (
                      <th key={key} className="text-left py-2 px-2 font-medium text-gray-700">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 3).map((row, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      {Object.values(row).map((value, cellIndex) => (
                        <td key={cellIndex} className="py-2 px-2 text-gray-600">
                          {String(value).substring(0, 50)}
                          {String(value).length > 50 ? '...' : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing first 3 rows. Total columns: {Object.keys(rawData[0]).length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};