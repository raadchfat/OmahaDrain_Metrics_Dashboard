import React, { useState } from 'react';
import { Save, TestTube, Key, Database, Clock, AlertCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState({
    sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    apiKey: '',
    range: 'A1:Z1000',
    refreshInterval: 300 // seconds
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSave = () => {
    localStorage.setItem('googleSheetsConfig', JSON.stringify(config));
    alert('Settings saved successfully!');
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (config.apiKey && config.sheetId) {
      setTestResult('success');
    } else {
      setTestResult('error');
    }
    
    setIsTestingConnection(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your Google Sheets integration and dashboard preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Google Sheets Configuration
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              Google Sheets API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your Google Sheets API key"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sheetId" className="block text-sm font-medium text-gray-700 mb-2">
              Sheet ID
            </label>
            <input
              id="sheetId"
              type="text"
              value={config.sheetId}
              onChange={(e) => setConfig({ ...config, sheetId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            />
            <p className="mt-1 text-xs text-gray-500">
              Found in your Google Sheet URL: docs.google.com/spreadsheets/d/[SHEET_ID]/edit
            </p>
          </div>

          <div>
            <label htmlFor="range" className="block text-sm font-medium text-gray-700 mb-2">
              Data Range
            </label>
            <input
              id="range"
              type="text"
              value={config.range}
              onChange={(e) => setConfig({ ...config, range: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="A1:Z1000"
            />
          </div>

          <div>
            <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 mb-2">
              Refresh Interval (seconds)
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                id="refreshInterval"
                type="number"
                value={config.refreshInterval}
                onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="60"
                max="3600"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={testConnection}
            disabled={isTestingConnection}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TestTube className={`w-4 h-4 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>

        {testResult && (
          <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
            testResult === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <AlertCircle className="w-5 h-5" />
            {testResult === 'success' ? 
              'Connection successful! Your Google Sheet is accessible.' : 
              'Connection failed. Please check your API key and Sheet ID.'
            }
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Go to the <a href="https://console.developers.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Developer Console</a></li>
          <li>Enable the Google Sheets API for your project</li>
          <li>Create an API key with appropriate restrictions</li>
          <li>Share your Google Sheet with 'Anyone with the link' (View access)</li>
          <li>Copy the Sheet ID from your Google Sheet URL</li>
          <li>Enter your credentials above and test the connection</li>
        </ol>
      </div>
    </div>
  );
};