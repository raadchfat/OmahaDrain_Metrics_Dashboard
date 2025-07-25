import React, { useState } from 'react';
import { TestTube, CheckCircle, XCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { SupabaseService } from '../services/supabaseService';
import { TableName } from '../types';

interface SettingsTableProps {
  table: TableName;
  displayName: string;
  description: string;
  isActive: boolean;
  isPrimary: boolean;
  onToggleActive: (tableName: TableName) => void;
  onSetPrimary: (tableName: TableName) => void;
  connectionResult?: {
    status: 'idle' | 'success' | 'error';
    message: string;
  };
  onTest: (tableName: TableName) => void;
  isTestingConnection: boolean;
}

export const SettingsTable: React.FC<SettingsTableProps> = ({
  table,
  displayName,
  description,
  isActive,
  isPrimary,
  onToggleActive,
  onSetPrimary,
  connectionResult,
  onTest,
  isTestingConnection
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleActive(table)}
            className={`p-1 rounded ${isActive ? 'text-green-600' : 'text-gray-400'}`}
            title={isActive ? 'Table is active - click to disable' : 'Table is inactive - click to enable'}
          >
            {isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
          </button>
          <div>
            <h4 className="font-medium text-gray-900">{displayName}</h4>
            <p className="text-sm text-gray-600">{description}</p>
            <p className="text-xs text-gray-500 font-mono">Table: {table}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isActive ? '● Active' : '○ Inactive'}
              </span>
              {table === 'Jobs_revenue' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  No Date Filter
                </span>
              )}
              {isPrimary && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Primary Table
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSetPrimary(table)}
            className={`px-3 py-1 text-xs font-medium rounded-lg ${
              isPrimary
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isPrimary ? 'Primary' : 'Set Primary'}
          </button>
          
          <button
            onClick={() => onTest(table)}
            disabled={isTestingConnection}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <TestTube className={`w-3 h-3 ${isTestingConnection ? 'animate-pulse' : ''}`} />
            Test
          </button>
        </div>
      </div>
      
      {connectionResult && (
        <div className={`p-3 rounded-lg border flex items-start gap-3 text-sm ${
          connectionResult.status === 'success' ? 'bg-green-50 border-green-200' : 
          connectionResult.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          {connectionResult.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />}
          {connectionResult.status === 'error' && <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />}
          {connectionResult.status === 'idle' && <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />}
          <div>
            <h5 className={`font-medium ${
              connectionResult.status === 'success' ? 'text-green-800' : 
              connectionResult.status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }`}>
              {connectionResult.status === 'success' ? 'Connection Successful' : 
               connectionResult.status === 'error' ? 'Connection Failed' :
               'Testing Connection'}
            </h5>
            <p className={`mt-1 ${
              connectionResult.status === 'success' ? 'text-green-700' : 
              connectionResult.status === 'error' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {connectionResult.message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};