import React, { useState, useEffect } from 'react';
import { Database, FileText, Calendar, Hash, Type, Eye, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { MultiSheetService } from '../services/googleSheets';
import { MultiSheetConfig, GoogleSheetConfig } from '../types';

interface SheetAnalysis {
  sheetConfig: GoogleSheetConfig;
  totalRows: number;
  totalColumns: number;
  headers: string[];
  columnAnalysis: {
    index: number;
    name: string;
    dataType: 'date' | 'number' | 'text' | 'mixed' | 'empty';
    sampleValues: any[];
    validCount: number;
    emptyCount: number;
  }[];
  sampleData: any[][];
  error?: string;
  isLoading: boolean;
}

export const DataInspector: React.FC = () => {
  const [analyses, setAnalyses] = useState<SheetAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [config, setConfig] = useState<MultiSheetConfig | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    const savedConfig = localStorage.getItem('multiSheetConfig');
    if (savedConfig) {
      const parsedConfig: MultiSheetConfig = JSON.parse(savedConfig);
      setConfig(parsedConfig);
      
      // Initialize analyses for each sheet
      const initialAnalyses: SheetAnalysis[] = parsedConfig.sheets.map(sheet => ({
        sheetConfig: sheet,
        totalRows: 0,
        totalColumns: 0,
        headers: [],
        columnAnalysis: [],
        sampleData: [],
        isLoading: false
      }));
      setAnalyses(initialAnalyses);
    }
  };

  const analyzeDataType = (values: any[]): 'date' | 'number' | 'text' | 'mixed' | 'empty' => {
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    if (nonEmptyValues.length === 0) return 'empty';
    
    let dateCount = 0;
    let numberCount = 0;
    let textCount = 0;
    
    nonEmptyValues.forEach(value => {
      // Check if it's a date
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime()) && value.toString().match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}/)) {
        dateCount++;
      }
      // Check if it's a number
      else if (!isNaN(Number(value)) && value !== '') {
        numberCount++;
      }
      // Otherwise it's text
      else {
        textCount++;
      }
    });
    
    const total = nonEmptyValues.length;
    const datePercent = dateCount / total;
    const numberPercent = numberCount / total;
    const textPercent = textCount / total;
    
    // If 80% or more are of one type, classify as that type
    if (datePercent >= 0.8) return 'date';
    if (numberPercent >= 0.8) return 'number';
    if (textPercent >= 0.8) return 'text';
    
    return 'mixed';
  };

  const analyzeSheet = async (sheetIndex: number) => {
    const updatedAnalyses = [...analyses];
    updatedAnalyses[sheetIndex].isLoading = true;
    updatedAnalyses[sheetIndex].error = undefined;
    setAnalyses(updatedAnalyses);

    console.log(`=== ANALYZING SHEET ${sheetIndex + 1} ===`);
    console.log('Sheet config:', config?.sheets[sheetIndex]);
    
    // Add timeout and retry logic
    const MAX_RETRIES = 2;
    let retryCount = 0;
    
    const attemptAnalysis = async (): Promise<void> => {
    try {
      if (!config) throw new Error('No configuration found');
      
      const multiSheetService = new MultiSheetService(config);
      const sheet = config.sheets[sheetIndex];
      
      console.log(`Sheet name: ${sheet.name}`);
      console.log(`Sheet ID: ${sheet.sheetId}`);
      console.log(`API Key present: ${sheet.apiKey ? 'Yes (sheet-specific)' : config.globalApiKey ? 'Yes (global)' : 'No'}`);
      console.log(`Range: ${sheet.range}`);
      
      // Build the API URL to test
      const apiKey = sheet.apiKey || config.globalApiKey;
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheet.sheetId}/values/${sheet.range}?key=${apiKey}`;
      console.log('Testing API URL:', testUrl.replace(apiKey, 'API_KEY_HIDDEN'));
      
      // Test with a simple fetch first
      console.log('Making test API request...');
      const testResponse = await fetch(testUrl);
      console.log('API Response status:', testResponse.status);
      console.log('API Response headers:', Object.fromEntries(testResponse.headers.entries()));
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('API Error response:', errorText);
        throw new Error(`API Error ${testResponse.status}: ${errorText}`);
      }
      
      const testData = await testResponse.json();
      console.log('API Response structure:', {
        hasValues: !!testData.values,
        rowCount: testData.values?.length || 0,
        firstRowColumns: testData.values?.[0]?.length || 0
      });
      
      const rawData = testData.values || [];
      
      if (rawData.length === 0) {
        throw new Error('No data found in sheet - the sheet may be empty or the range is incorrect');
      }
      
      console.log(`✅ Data successfully fetched for ${sheet.name}:`, {
        totalRows: rawData.length,
        firstRowColumns: rawData[0]?.length || 0,
        sampleFirstRow: rawData[0]?.slice(0, 5)
      });
      
      const headers = rawData[0] || [];
      const dataRows = rawData.slice(1);
      
      console.log('Headers found:', headers.slice(0, 10));
      console.log('Sample data row:', dataRows[0]?.slice(0, 10));
      
      // Analyze each column
      const columnAnalysis = headers.map((header, index) => {
        const columnValues = dataRows.map(row => row[index]);
        const nonEmptyValues = columnValues.filter(v => v !== null && v !== undefined && v !== '');
        
        return {
          index,
          name: header || `Column ${String.fromCharCode(65 + index)}`,
          dataType: analyzeDataType(columnValues),
          sampleValues: nonEmptyValues.slice(0, 5), // First 5 non-empty values
          validCount: nonEmptyValues.length,
          emptyCount: columnValues.length - nonEmptyValues.length
        };
      });
      
      console.log('Column analysis complete:', columnAnalysis.length, 'columns analyzed');
      
      updatedAnalyses[sheetIndex] = {
        ...updatedAnalyses[sheetIndex],
        totalRows: rawData.length - 1, // Exclude header
        totalColumns: headers.length,
        headers,
        columnAnalysis,
        sampleData: dataRows.slice(0, 5), // First 5 data rows
        isLoading: false
      };
      
      console.log(`✅ Analysis complete for ${sheet.name}`);
      
    } catch (error) {
      console.error(`❌ Error analyzing sheet ${sheetIndex}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updatedAnalyses[sheetIndex].error = errorMessage;
      updatedAnalyses[sheetIndex].isLoading = false;
      
      // Show more helpful error messages
      if (errorMessage.includes('500')) {
        updatedAnalyses[sheetIndex].error = 'Server Error (500): This usually means the API key is invalid, expired, or doesn\'t have permission to access Google Sheets API. Check your API key in Google Cloud Console.';
      } else if (errorMessage.includes('403')) {
        updatedAnalyses[sheetIndex].error = 'Permission Denied (403): The API key doesn\'t have permission to access this sheet. Make sure the sheet is shared publicly or the API key has proper permissions.';
      } else if (errorMessage.includes('404')) {
        updatedAnalyses[sheetIndex].error = 'Sheet Not Found (404): The sheet ID is incorrect or the sheet doesn\'t exist. Double-check the Google Sheet ID.';
      } else if (errorMessage.includes('400')) {
        updatedAnalyses[sheetIndex].error = 'Bad Request (400): The range or sheet name is invalid. Check your range format (e.g., A1:Z1000).';
      }
    }
    
    setAnalyses(updatedAnalyses);
  };

  const analyzeAllSheets = async () => {
    setIsAnalyzing(true);
    
    try {
      const activeSheetIndices = analyses
        .map((_, index) => index)
        .filter(index => config?.sheets[index]?.isActive);
      
      console.log(`Starting analysis of ${activeSheetIndices.length} active sheets`);
      
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const testResponse = await fetch(testUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.error(`❌ Error analyzing sheet ${sheetIndex} (attempt ${retryCount + 1}):`, error);
        
        // Check if it's a network/communication error that might benefit from retry
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRetryableError = errorMessage.includes('AbortError') || 
                                errorMessage.includes('NetworkError') ||
                                errorMessage.includes('listener indicated') ||
                                errorMessage.includes('message channel closed');
        
        if (isRetryableError && retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`🔄 Retrying analysis for sheet ${sheetIndex} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
          return attemptAnalysis();
        }
        
        
      for (const sheetIndex of activeSheetIndices) {
        console.log(`Analyzing sheet ${sheetIndex + 1} of ${activeSheetIndices.length}`);
        await analyzeSheet(sheetIndex);
        
        // Small delay between requests to be nice to the API
        if (sheetIndex < activeSheetIndices.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('All sheet analysis completed');
    } catch (error) {
        } else if (errorMessage.includes('AbortError') || errorMessage.includes('listener indicated')) {
          updatedAnalyses[sheetIndex].error = 'Connection Timeout: The request was interrupted. This might be due to browser extensions or network issues. Try again.';
      console.error('Error in analyzeAllSheets:', error);
      }
    };
    
    try {
      await attemptAnalysis();
    } catch (error) {
      console.error(`❌ Final error for sheet ${sheetIndex}:`, error);
    }
    
    setIsAnalyzing(false);
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'date': return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'number': return <Hash className="w-4 h-4 text-green-600" />;
      case 'text': return <Type className="w-4 h-4 text-purple-600" />;
      case 'mixed': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'empty': return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default: return <Type className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDataTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'date': return 'bg-blue-100 text-blue-800';
      case 'number': return 'bg-green-100 text-green-800';
      case 'text': return 'bg-purple-100 text-purple-800';
      case 'mixed': return 'bg-orange-100 text-orange-800';
      case 'empty': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!config || config.sheets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Inspector</h1>
          <p className="text-gray-600">Analyze your Google Sheets data structure and content</p>
        </div>
        
        <div className="text-center py-16">
          <Database className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Sheets Configured</h2>
          <p className="text-gray-600 mb-4">Configure your Google Sheets in Settings to analyze their data structure.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Inspector</h1>
          <p className="text-gray-600">Analyze your Google Sheets data structure and content</p>
        </div>
        
        <button
          onClick={analyzeAllSheets}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Analyze All Sheets'}
        </button>
      </div>

      <div className="space-y-6">
        {analyses.map((analysis, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${analysis.sheetConfig.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{analysis.sheetConfig.name}</h2>
                    <p className="text-sm text-gray-500">
                      <span className="capitalize">{analysis.sheetConfig.dataType} data</span>
                      {!analysis.sheetConfig.isActive && <span className="text-orange-600 ml-2">(Inactive)</span>}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">ID: {analysis.sheetConfig.sheetId}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {analysis.error && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {!analysis.error && analysis.totalRows > 0 && <CheckCircle className="w-5 h-5 text-green-500" />}
                  
                  <button
                    onClick={() => analyzeSheet(index)}
                    disabled={analysis.isLoading}
                    className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye className={`w-4 h-4 ${analysis.isLoading ? 'animate-pulse' : ''}`} />
                    {analysis.isLoading ? 'Analyzing...' : 'Analyze'}
                  </button>
                </div>
              </div>
              
              {analysis.error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Analysis Failed</h4>
                  <p className="text-sm text-red-700 mb-3">{analysis.error}</p>
                  <div className="text-xs text-red-600 bg-red-100 p-2 rounded font-mono">
                    <p><strong>Sheet ID:</strong> {analysis.sheetConfig.sheetId}</p>
                    <p><strong>Range:</strong> {analysis.sheetConfig.range}</p>
                    <p><strong>API Key:</strong> {analysis.sheetConfig.apiKey ? 'Sheet-specific' : config?.globalApiKey ? 'Global' : 'Missing'}</p>
                  </div>
                </div>
              )}
            </div>

            {analysis.totalRows > 0 && (
              <div className="p-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Total Rows</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{analysis.totalRows.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Total Columns</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 mt-1">{analysis.totalColumns}</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Date Columns</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {analysis.columnAnalysis.filter(col => col.dataType === 'date').length}
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">Number Columns</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900 mt-1">
                      {analysis.columnAnalysis.filter(col => col.dataType === 'number').length}
                    </p>
                  </div>
                </div>

                {/* Column Analysis */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Column Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Values</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empty Values</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analysis.columnAnalysis.map((column, colIndex) => (
                          <tr key={colIndex} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {String.fromCharCode(65 + column.index)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                              {column.name}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                {getDataTypeIcon(column.dataType)}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDataTypeColor(column.dataType)}`}>
                                  {column.dataType}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {column.validCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {column.emptyCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                              <div className="space-y-1">
                                {column.sampleValues.slice(0, 3).map((value, valueIndex) => (
                                  <div key={valueIndex} className="truncate text-xs bg-gray-100 px-2 py-1 rounded">
                                    {String(value)}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sample Data */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Data (First 5 Rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {analysis.headers.map((header, headerIndex) => (
                            <th key={headerIndex} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-32 truncate">
                              {String.fromCharCode(65 + headerIndex)}: {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analysis.sampleData.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-50">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-xs text-gray-900 max-w-32 truncate">
                                {String(cell || '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};