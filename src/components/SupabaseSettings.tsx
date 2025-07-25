import React, { useState, useEffect } from 'react';
import { Database, TestTube, CheckCircle, XCircle, AlertCircle, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
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
      isActive: false
    },
    {
      name: 'Jobs_revenue',
      displayName: 'Jobs Revenue',
      description: 'Completed job revenue and billing information',
      primaryDateColumn: 'Job',
      isActive: false
    },
    {
      name: 'Jobs_revenue',
      displayName: 'Jobs Revenue',
      description: 'Completed job revenue and billing information',
      primaryDateColumn: 'Job', // No date column, using Job as identifier
      isActive: false
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
    
    for (const table of tablesToTest) {
      setConnectionResults(prev => ({
        ...prev,
        [table]: { status: 'idle', message: 'Testing...' }
      }));
    }

    try {
      for (const table of tablesToTest) {
        try {
          const supabaseService = new SupabaseService(table);
          const result = await supabaseService.testConnectionDetailed();

          if (result.success) {
            setConnectionResults(prev => ({
              ...prev,
              [table]: { status: 'success', message: result.message }
            }));
            
            // Only fetch sample data for the active table
            if (table === activeTable && result.rowCount && result.rowCount > 0) {
              try {
                const sampleData = await supabaseService.getRawData(5);
                setRawData(sampleData);
                setShowRawData(true);
              } catch (error) {
                console.warn('Could not fetch sample data:', error);
              }
            }
          } else {
            setConnectionResults(prev => ({
              ...prev,
              [table]: { status: 'error', message: result.message }
            }));
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
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
            <li>Toggle tables on/off to control which data sources are active</li>
            <li>Select your primary table for KPI calculations</li>
            <li>Test connections to verify we can read your data</li>
            <li>The app will read data from your existing table structures</li>
          </ol>
        </div>

        {/* Table Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Tables</h3>
          
          {tableConfigs.map((config) => (
            <div key={config.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTableActive(config.name)}
                    className={`p-1 rounded ${config.isActive ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {config.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <div>
                    <h4 className="font-medium text-gray-900">{config.displayName}</h4>
                    <p className="text-sm text-gray-600">{config.description}</p>
                    <p className="text-xs text-gray-500 font-mono">Table: {config.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTableAndSave(config.name)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg ${
                      activeTable === config.name
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {activeTable === config.name ? 'Primary' : 'Set Primary'}
                  </button>
                  
                  <button
                    onClick={() => testSupabaseConnection(config.name)}
                    disabled={isTestingConnection}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    <TestTube className={`w-3 h-3 ${isTestingConnection ? 'animate-pulse' : ''}`} />
                    Test
                  </button>
                </div>
              </div>
              
              {connectionResults[config.name] && (
                <div className={`p-3 rounded-lg border flex items-start gap-3 text-sm ${
                  connectionResults[config.name].status === 'success' ? 'bg-green-50 border-green-200' : 
                  connectionResults[config.name].status === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  {connectionResults[config.name].status === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />}
                  {connectionResults[config.name].status === 'error' && <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />}
                  {connectionResults[config.name].status === 'idle' && <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />}
                  <div>
                    <h5 className={`font-medium ${
                      connectionResults[config.name].status === 'success' ? 'text-green-800' : 
                      connectionResults[config.name].status === 'error' ? 'text-red-800' :
                      'text-blue-800'
                    }`}>
                      {connectionResults[config.name].status === 'success' ? 'Connection Successful' : 
                       connectionResults[config.name].status === 'error' ? 'Connection Failed' :
                       'Testing Connection'}
                    </h5>
                    <p className={`mt-1 ${
                      connectionResults[config.name].status === 'success' ? 'text-green-700' : 
                      connectionResults[config.name].status === 'error' ? 'text-red-700' :
                      'text-blue-700'
                    }`}>
                      {connectionResults[config.name].message}
                    </p>
                  </div>
                </div>
              )}
            </div>
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