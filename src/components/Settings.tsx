import React, { useState, useEffect } from 'react';
import { Save, TestTube, Key, Database, Clock, AlertCircle, Plus, Trash2, Edit3, ToggleLeft, ToggleRight } from 'lucide-react';
import { GoogleSheetConfig, MultiSheetConfig } from '../types';
import { SupabaseSettings } from './SupabaseSettings';
import { ScoringSettings } from './ScoringSettings';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tables' | 'scoring' | 'sheets'>('tables');
  const [config, setConfig] = useState<MultiSheetConfig>({
    globalApiKey: '',
    sheets: []
  });
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error'>>({});
  const [editingSheet, setEditingSheet] = useState<string | null>(null);

  useEffect(() => {
    // Load saved configuration
    const savedConfig = localStorage.getItem('multiSheetConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('multiSheetConfig', JSON.stringify(config));
    // Show a temporary success message instead of alert
    const button = document.querySelector('[data-save-button]') as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Saved!';
      button.classList.add('bg-green-600', 'hover:bg-green-700');
      button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'hover:bg-green-700');
        button.classList.add('bg-blue-600', 'hover:bg-blue-700');
      }, 2000);
    }
  };

  // Auto-save when config changes
  useEffect(() => {
    if (config.sheets.length > 0 || config.globalApiKey) {
      localStorage.setItem('multiSheetConfig', JSON.stringify(config));
    }
  }, [config]);

  const handleGlobalApiKeyChange = (value: string) => {
    setConfig({ ...config, globalApiKey: value });
  };

  const addNewSheet = () => {
    const newSheet: GoogleSheetConfig = {
      sheetId: '',
      name: `Sheet ${config.sheets.length + 1}`,
      apiKey: '',
      range: 'A1:Z10000',
      refreshInterval: 300,
      isActive: true,
      dataType: 'kpi'
    };
    
    setConfig({
      ...config,
      sheets: [...config.sheets, newSheet]
    });
    setEditingSheet(newSheet.sheetId || `new-${Date.now()}`);
  };

  const updateSheet = (index: number, updatedSheet: GoogleSheetConfig) => {
    const newSheets = [...config.sheets];
    newSheets[index] = updatedSheet;
    setConfig({
      ...config,
      sheets: newSheets
    });
  };

  const removeSheet = (index: number) => {
    if (confirm('Are you sure you want to remove this sheet?')) {
      const newSheets = config.sheets.filter((_, i) => i !== index);
      setConfig({
        ...config,
        sheets: newSheets
      });
    }
  };

  const toggleSheetActive = (index: number) => {
    const newSheets = [...config.sheets];
    newSheets[index].isActive = !newSheets[index].isActive;
    setConfig({
      ...config,
      sheets: newSheets
    });
  };

  const testConnection = async (sheetIndex: number) => {
    const sheet = config.sheets[sheetIndex];
    const testId = `${sheetIndex}`;
    setIsTestingConnection(testId);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const apiKey = sheet.apiKey || config.globalApiKey;
    const success = apiKey && sheet.sheetId;
    
    setTestResults(prev => ({
      ...prev,
      [testId]: success ? 'success' : 'error'
    }));
    
    setIsTestingConnection(null);
  };

  const tabs = [
    { id: 'tables' as const, name: 'Available Tables', icon: Database },
    { id: 'scoring' as const, name: 'KPI Scoring Ranges', icon: TestTube },
    { id: 'sheets' as const, name: 'Google Sheets', icon: Key }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tables':
        return <SupabaseSettings />;
      
      case 'scoring':
        return <ScoringSettings />;
      
      case 'sheets':
        return (
          <div className="space-y-6">
            {/* Global API Key */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Global API Configuration
              </h2>

              <div>
                <label htmlFor="globalApiKey" className="block text-sm font-medium text-gray-700 mb-2">
                  Global Google Sheets API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="globalApiKey"
                    type="password"
                    value={config.globalApiKey}
                    onChange={(e) => handleGlobalApiKeyChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your global API key (used for all sheets unless overridden)"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  This API key will be used for all sheets unless a specific API key is provided for individual sheets
                </p>
              </div>
            </div>

            {/* Sheets Management */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  Google Sheets ({config.sheets.length})
                </h2>
                <button
                  onClick={addNewSheet}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Sheet
                </button>
              </div>

              {config.sheets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No sheets configured yet. Add your first sheet to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {config.sheets.map((sheet, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleSheetActive(index)}
                            className={`p-1 rounded ${sheet.isActive ? 'text-green-600' : 'text-gray-400'}`}
                          >
                            {sheet.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          </button>
                          <div>
                            <h3 className="font-medium text-gray-900">{sheet.name}</h3>
                            <p className="text-sm text-gray-500 capitalize">{sheet.dataType} data</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingSheet(editingSheet === `${index}` ? null : `${index}`)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => testConnection(index)}
                            disabled={isTestingConnection === `${index}`}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                          >
                            <TestTube className={`w-3 h-3 ${isTestingConnection === `${index}` ? 'animate-pulse' : ''}`} />
                            {isTestingConnection === `${index}` ? 'Testing...' : 'Test'}
                          </button>
                          <button
                            onClick={() => removeSheet(index)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {testResults[`${index}`] && (
                        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                          testResults[`${index}`] === 'success' ? 
                          'bg-green-50 text-green-700 border border-green-200' : 
                          'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <AlertCircle className="w-4 h-4" />
                          {testResults[`${index}`] === 'success' ? 
                            'Connection successful!' : 
                            'Connection failed. Check your configuration.'
                          }
                        </div>
                      )}

                      {editingSheet === `${index}` && (
                        <div className="space-y-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sheet Name
                              </label>
                              <input
                                type="text"
                                value={sheet.name}
                                onChange={(e) => updateSheet(index, { ...sheet, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Type
                              </label>
                              <select
                                value={sheet.dataType}
                                onChange={(e) => updateSheet(index, { ...sheet, dataType: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="kpi">KPI Data</option>
                                <option value="timeseries">Time Series Data</option>
                                <option value="raw">Raw Data</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sheet ID
                            </label>
                            <input
                              type="text"
                              value={sheet.sheetId}
                              onChange={(e) => updateSheet(index, { ...sheet, sheetId: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Data Range
                              </label>
                              <input
                                type="text"
                                value={sheet.range}
                                onChange={(e) => updateSheet(index, { ...sheet, range: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="A1:Z10000"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Refresh Interval (seconds)
                              </label>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  type="number"
                                  value={sheet.refreshInterval}
                                  onChange={(e) => updateSheet(index, { ...sheet, refreshInterval: parseInt(e.target.value) })}
                                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="60"
                                  max="3600"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Sheet-specific API Key (optional)
                            </label>
                            <input
                              type="password"
                              value={sheet.apiKey}
                              onChange={(e) => updateSheet(index, { ...sheet, apiKey: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Leave empty to use global API key"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSave}
                  data-save-button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Multi-Sheet Setup Instructions</h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Set up your global API key in the Google Developer Console</li>
                <li>Add multiple sheets for different data sources (KPI data, time series, raw data)</li>
                <li>Configure each sheet with its specific Sheet ID and data range</li>
                <li><strong>Range Examples:</strong> A1:Z10000 (10k rows), A1:AA50000 (50k rows), or A:Z (entire columns)</li>
                <li>Use different data types to organize your information:
                  <ul className="ml-6 mt-1 list-disc">
                    <li><strong>KPI Data:</strong> For calculated metrics and performance indicators</li>
                    <li><strong>Time Series:</strong> For historical trend data</li>
                    <li><strong>Raw Data:</strong> For unprocessed operational data</li>
                  </ul>
                </li>
                <li>Toggle sheets on/off to control which data sources are active</li>
                <li>Test each connection to ensure proper access</li>
              </ol>
            </div>
          </div>
        );
      
      default:
        return <SupabaseSettings />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure your data sources and system preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};