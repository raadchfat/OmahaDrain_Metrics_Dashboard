import React, { useState, useEffect } from 'react';
import { Database, TestTube, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';

export const SupabaseSettings: React.FC = () => {
  const [tableName, setTableName] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [rawData, setRawData] = useState<any[]>([]);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    // Load saved table name
    const savedTableName = localStorage.getItem('supabaseTableName');
    if (savedTableName) {
      setTableName(savedTableName);
    } else {
      // Set default to SoldLineitems
      setTableName('SoldLineitems');
    }
  }, []);

  const testSupabaseConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const currentTableName = tableName || 'SoldLineitems';
      const supabaseService = new SupabaseService(currentTableName);
      const isConnected = await supabaseService.testConnection();

      if (isConnected) {
        setConnectionStatus('success');
        setConnectionMessage(`Successfully connected to Supabase table "${currentTableName}"! Found your sold line items data and ready to calculate KPIs.`);
        
        // Fetch some sample data
        try {
          const sampleData = await supabaseService.getRawData(5);
          setRawData(sampleData);
          setShowRawData(true);
        } catch (error) {
          console.warn('Could not fetch sample data:', error);
        }
      } else {
        setConnectionStatus('error');
        setConnectionMessage(`Failed to connect to table "${currentTableName}". Please check your table name and configuration.`);
      }
    } catch (error) {
      setConnectionStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setConnectionMessage(`Connection failed: ${errorMsg}`);
    }

    setIsTestingConnection(false);
  };

  const handleTableNameSave = () => {
    localStorage.setItem('supabaseTableName', tableName);
    // Show success feedback
    const button = document.querySelector('[data-table-save]') as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Saved!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    }
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-600" />
        Supabase Database Connection (Read-Only)
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Read-Only Setup Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Click the "Connect to Supabase" button in the top right corner</li>
            <li>Enter your existing table name below</li>
            <li>Test the connection to verify we can read your data</li>
            <li>The app will read data from your existing table structure</li>
          </ol>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="tableName" className="block text-sm font-medium text-gray-700 mb-2">
              Your Supabase Table Name
            </label>
            <div className="flex gap-2">
              <input
                id="tableName"
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SoldLineitems"
              />
              <button
                onClick={handleTableNameSave}
                data-table-save
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Your table name is "SoldLineitems" - this will calculate KPIs from your sold line items data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={testSupabaseConnection}
            disabled={isTestingConnection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className={`w-4 h-4 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            {isTestingConnection ? 'Testing Connection...' : 'Test Connection & Read Data'}
          </button>
        </div>

        {connectionStatus !== 'idle' && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            connectionStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            {connectionStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />}
            {connectionStatus === 'error' && <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
            <div>
              <h3 className={`font-medium ${
                connectionStatus === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {connectionStatus === 'success' ? 'Connection Successful' : 'Connection Failed'}
              </h3>
              <p className={`text-sm mt-1 ${
                connectionStatus === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {connectionMessage}
              </p>
            </div>
          </div>
        )}

        {showRawData && rawData.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Sample Data from Your Table</h3>
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