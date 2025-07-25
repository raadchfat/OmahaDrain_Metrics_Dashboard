import React, { useState, useEffect } from 'react';
import { Database, Calendar, DollarSign, User, MapPin, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { TableConfig, TableName } from '../types';

export const DataViewer: React.FC = () => {
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [selectedTable, setSelectedTable] = useState<TableName>('SoldLineitems');
  const [availableTables] = useState<TableConfig[]>([
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
      primaryDateColumn: 'created_at',
      isActive: true
    }
  ]);

  const loadSampleData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabaseService = new SupabaseService(selectedTable);
      
      // Get sample data
      const data = await supabaseService.getRawData(20);
      setSampleData(data);
      
      // Try to get total count (this might fail if table is very large)
      try {
        const { count } = await supabaseService.getTotalCount();
        setTotalRows(count || 0);
      } catch (countError) {
        console.warn('Could not get total count:', countError);
        setTotalRows(data.length);
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadSampleData();
  }, [selectedTable]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Viewer</h1>
          <p className="text-gray-600">View your Supabase table structures and sample data</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value as TableName)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableTables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.displayName}
              </option>
            ))}
          </select>
          <button
            onClick={loadSampleData}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800">Error Loading Data</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Table Schema - Dynamic based on selected table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          {availableTables.find(t => t.name === selectedTable)?.displayName} Table Schema
        </h2>
        
        {selectedTable === 'SoldLineitems' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Customer Info</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Customer ID (number)</li>
                <li>• Customer (text)</li>
                <li>• Email (text)</li>
                <li>• Phone (text)</li>
                <li>• Member Status (text)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Location Info</span>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Location Name (text)</li>
                <li>• Street (text)</li>
                <li>• Apt/Suite (text)</li>
                <li>• City (text)</li>
                <li>• State (text)</li>
                <li>• Zip Code (number)</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-900">Job Info</span>
              </div>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Invoice (number)</li>
                <li>• Job (text)</li>
                <li>• Department (text)</li>
                <li>• Category (text)</li>
                <li>• Line Item (text)</li>
                <li>• Opp. Owner (text)</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-900">Financial Info</span>
              </div>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Price (number) - Main field</li>
                <li>• Quantity (number)</li>
                <li>• Original Price (text)</li>
                <li>• Adjusted Price (text)</li>
                <li>• Price Adjustment (text)</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">Date & Tracking</span>
              </div>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>• Invoice Date (date) - Filter field</li>
                <li>• Price Adjusted At (text)</li>
                <li>• Price Adjusted By (text)</li>
                <li>• Primary Key (text)</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Customer Info</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Customer (text)</li>
                <li>• Email (text)</li>
                <li>• Phone (text)</li>
                <li>• Location Name (text)</li>
                <li>• Street, City, State (text)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Opportunity Info</span>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Revenue (number)</li>
                <li>• Status (text)</li>
                <li>• Department (text)</li>
                <li>• Lead Type (text)</li>
                <li>• Lead Source (text)</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-purple-900">Management & Tracking</span>
              </div>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Date (text)</li>
                <li>• Job (number) - Primary Key</li>
                <li>• Opportunity Owner (text)</li>
                <li>• Call Assigned To (text)</li>
                <li>• Booking Call Source (text)</li>
                <li>• Tags (text)</li>
                <li>• Membership Opportunity (text)</li>
                <li>• Membership Sold (text)</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Sample Data */}
      {sampleData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Sample Data (First 20 Rows)</h2>
            <div className="text-sm text-gray-500">
              Total Rows: {totalRows.toLocaleString()}
            </div>
          </div>
          
          {/* Key Fields Summary */}
          {selectedTable === 'SoldLineitems' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900">Department Values</div>
                <div className="text-xs text-blue-700 mt-1">
                  {[...new Set(sampleData.map(row => row.Department).filter(Boolean))].slice(0, 3).join(', ')}
                  {[...new Set(sampleData.map(row => row.Department).filter(Boolean))].length > 3 && '...'}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm font-medium text-green-900">Price Range</div>
                <div className="text-xs text-green-700 mt-1">
                  ${Math.min(...sampleData.map(row => Number(row.Price) || 0)).toLocaleString()} - 
                  ${Math.max(...sampleData.map(row => Number(row.Price) || 0)).toLocaleString()}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-900">Date Range</div>
                <div className="text-xs text-purple-700 mt-1">
                  {sampleData[0]?.['Invoice Date']} to {sampleData[sampleData.length - 1]?.['Invoice Date']}
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-900">≥$10k Entries</div>
                <div className="text-xs text-orange-700 mt-1">
                  {sampleData.filter(row => (Number(row.Price) || 0) >= 10000).length} found
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900">Opportunity Stages</div>
                <div className="text-xs text-blue-700 mt-1">
                  {[...new Set(sampleData.map(row => row.Status).filter(Boolean))].slice(0, 3).join(', ')}
                  {[...new Set(sampleData.map(row => row.Status).filter(Boolean))].length > 3 && '...'}
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-sm font-medium text-green-900">Value Range</div>
                <div className="text-xs text-green-700 mt-1">
                  ${Math.min(...sampleData.map(row => Number(row.Revenue) || 0)).toLocaleString()} - 
                  ${Math.max(...sampleData.map(row => Number(row.Revenue) || 0)).toLocaleString()}
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-900">Date Range</div>
                <div className="text-xs text-purple-700 mt-1">
                  {sampleData[0]?.Date} to {sampleData[sampleData.length - 1]?.Date}
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-900">≥$10k Opportunities</div>
                <div className="text-xs text-orange-700 mt-1">
                  {sampleData.filter(row => (Number(row.Revenue) || 0) >= 10000).length} found
                </div>
              </div>
            </div>
          )}
          
          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {selectedTable === 'SoldLineitems' ? (
                    <>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Invoice Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Department</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Price</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Line Item</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Customer</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Job</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Customer</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Revenue</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Department</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Owner</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sampleData.slice(0, 20).map((row, index) => (
                  <tr key={index} className={`hover:bg-gray-50 ${
                    selectedTable === 'SoldLineitems' 
                      ? (Number(row.Price) || 0) >= 10000 ? 'bg-green-50' : ''
                      : (Number(row.Revenue) || 0) >= 10000 ? 'bg-green-50' : ''
                  }`}>
                    {selectedTable === 'SoldLineitems' ? (
                      <>
                        <td className="px-3 py-2 text-gray-900">{row['Invoice Date']}</td>
                        <td className="px-3 py-2 text-gray-900">{row.Department}</td>
                        <td className={`px-3 py-2 font-medium ${(Number(row.Price) || 0) >= 10000 ? 'text-green-600' : 'text-gray-900'}`}>
                          ${(Number(row.Price) || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{row['Line Item']}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{row.Customer}</td>
                        <td className="px-3 py-2 text-gray-600">{row.Job}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-900">{row.Date}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-xs truncate">{row.Customer}</td>
                        <td className={`px-3 py-2 font-medium ${(Number(row.Revenue) || 0) >= 10000 ? 'text-green-600' : 'text-gray-900'}`}>
                          ${(Number(row.Revenue) || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{row.Status}</td>
                        <td className="px-3 py-2 text-gray-600">{row.Department}</td>
                        <td className="px-3 py-2 text-gray-600">{row['Opportunity Owner']}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            {selectedTable === 'SoldLineitems' ? (
              <>
                <p>• Green highlighted rows have Price ≥ $10,000 (Install Calls)</p>
                <p>• Look for "Drain Cleaning" in Department column for denominator</p>
              </>
            ) : (
              <>
                <p>• Green highlighted rows have Revenue ≥ $10,000 (High-Value Opportunities)</p>
                <p>• Status shows the opportunity progression (Open, Closed, etc.)</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};