import React, { useState, useEffect } from 'react';
import { Database, TestTube, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';

export const SupabaseSettings: React.FC = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const testSupabaseConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const supabaseService = new SupabaseService();
      const isConnected = await supabaseService.testConnection();

      if (isConnected) {
        setConnectionStatus('success');
        setConnectionMessage('Successfully connected to Supabase! Your database is ready to use.');
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Failed to connect to Supabase. Please check your configuration.');
      }
    } catch (error) {
      setConnectionStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setConnectionMessage(`Connection failed: ${errorMsg}`);
    }

    setIsTestingConnection(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-600" />
        Supabase Database Connection
      </h2>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Click the "Connect to Supabase" button in the top right corner</li>
            <li>This will automatically configure your environment variables</li>
            <li>The required database tables will be created automatically</li>
            <li>Test the connection below to verify everything is working</li>
          </ol>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={testSupabaseConnection}
            disabled={isTestingConnection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className={`w-4 h-4 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            {isTestingConnection ? 'Testing Connection...' : 'Test Supabase Connection'}
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

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Database Schema</h3>
          <p className="text-sm text-gray-600 mb-3">
            The following tables will be created automatically in your Supabase database:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">kpi_data</code>
              <span className="text-gray-600">- Stores daily KPI metrics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">time_series_data</code>
              <span className="text-gray-600">- Stores historical trend data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};