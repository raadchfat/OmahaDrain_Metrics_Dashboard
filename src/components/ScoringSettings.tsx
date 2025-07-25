import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, RotateCcw, Save, Edit3, Check, X } from 'lucide-react';
import { ScoreRange, MultiSheetConfig } from '../types';
import { KPI_METRICS, getKPIMetricById } from '../utils/kpiMetrics';

export const ScoringSettings: React.FC = () => {
  const [scoringRanges, setScoringRanges] = useState<Record<string, ScoreRange[]>>({});
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadScoringRanges();
  }, []);

  const loadScoringRanges = () => {
    const savedConfig = localStorage.getItem('multiSheetConfig');
    if (savedConfig) {
      const config: MultiSheetConfig = JSON.parse(savedConfig);
      if (config.scoringRanges) {
        setScoringRanges(config.scoringRanges);
      } else {
        // Initialize with default ranges
        const defaultRanges: Record<string, ScoreRange[]> = {};
        KPI_METRICS.forEach(metric => {
          defaultRanges[metric.id] = [...metric.defaultRanges];
        });
        setScoringRanges(defaultRanges);
      }
    } else {
      // Initialize with default ranges
      const defaultRanges: Record<string, ScoreRange[]> = {};
      KPI_METRICS.forEach(metric => {
        defaultRanges[metric.id] = [...metric.defaultRanges];
      });
      setScoringRanges(defaultRanges);
    }
  };

  const saveScoringRanges = () => {
    const savedConfig = localStorage.getItem('multiSheetConfig');
    let config: MultiSheetConfig;
    
    if (savedConfig) {
      config = JSON.parse(savedConfig);
    } else {
      config = {
        globalApiKey: '',
        sheets: []
      };
    }
    
    config.scoringRanges = scoringRanges;
    localStorage.setItem('multiSheetConfig', JSON.stringify(config));
    setHasChanges(false);
    
    // Show success feedback
    const button = document.querySelector('[data-scoring-save]') as HTMLButtonElement;
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

  const updateRange = (metricId: string, rangeIndex: number, field: 'min' | 'max' | 'score', value: number) => {
    const newRanges = { ...scoringRanges };
    if (!newRanges[metricId]) {
      const metric = getKPIMetricById(metricId);
      newRanges[metricId] = metric ? [...metric.defaultRanges] : [];
    }
    
    newRanges[metricId][rangeIndex] = {
      ...newRanges[metricId][rangeIndex],
      [field]: value
    };
    
    setScoringRanges(newRanges);
    setHasChanges(true);
  };

  const addRange = (metricId: string) => {
    const newRanges = { ...scoringRanges };
    if (!newRanges[metricId]) {
      const metric = getKPIMetricById(metricId);
      newRanges[metricId] = metric ? [...metric.defaultRanges] : [];
    }
    
    const lastRange = newRanges[metricId][newRanges[metricId].length - 1];
    const newRange: ScoreRange = {
      min: lastRange ? lastRange.max : 0,
      max: lastRange ? lastRange.max + 10 : 10,
      score: newRanges[metricId].length + 1
    };
    
    newRanges[metricId].push(newRange);
    setScoringRanges(newRanges);
    setHasChanges(true);
  };

  const removeRange = (metricId: string, rangeIndex: number) => {
    const newRanges = { ...scoringRanges };
    if (newRanges[metricId] && newRanges[metricId].length > 1) {
      newRanges[metricId].splice(rangeIndex, 1);
      setScoringRanges(newRanges);
      setHasChanges(true);
    }
  };

  const resetToDefaults = (metricId: string) => {
    const metric = getKPIMetricById(metricId);
    if (metric) {
      const newRanges = { ...scoringRanges };
      newRanges[metricId] = [...metric.defaultRanges];
      setScoringRanges(newRanges);
      setHasChanges(true);
    }
  };

  const formatRangeValue = (value: number, unit: string) => {
    if (value === Infinity) return '∞';
    if (unit === '$') return `$${value.toLocaleString()}`;
    if (unit === '%') return `${value}%`;
    return value.toString();
  };

  const parseRangeValue = (value: string, unit: string): number => {
    if (value === '∞' || value.toLowerCase() === 'infinity') return Infinity;
    const numValue = parseFloat(value.replace(/[$,%]/g, ''));
    return isNaN(numValue) ? 0 : numValue;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            KPI Scoring Ranges
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Customize the scoring ranges for each KPI metric (1-10 scale)
          </p>
        </div>
        
        <button
          onClick={saveScoringRanges}
          disabled={!hasChanges}
          data-scoring-save
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {hasChanges && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            You have unsaved changes. Don't forget to save your scoring ranges.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {KPI_METRICS.map((metric) => {
          const ranges = scoringRanges[metric.id] || metric.defaultRanges;
          const isEditing = editingMetric === metric.id;
          
          return (
            <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{metric.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                  <p className="text-xs text-gray-500 font-mono mt-1">{metric.formula}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingMetric(isEditing ? null : metric.id)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title={isEditing ? 'Stop editing' : 'Edit ranges'}
                  >
                    {isEditing ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => resetToDefaults(metric.id)}
                    className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                    title="Reset to defaults"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div>Min Value</div>
                    <div>Max Value</div>
                    <div>Score (1-10)</div>
                    <div>Actions</div>
                  </div>
                  
                  {ranges.map((range, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-center">
                      <input
                        type="text"
                        value={formatRangeValue(range.min, metric.unit)}
                        onChange={(e) => updateRange(metric.id, index, 'min', parseRangeValue(e.target.value, metric.unit))}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      
                      <input
                        type="text"
                        value={formatRangeValue(range.max, metric.unit)}
                        onChange={(e) => updateRange(metric.id, index, 'max', parseRangeValue(e.target.value, metric.unit))}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={range.score}
                        onChange={(e) => updateRange(metric.id, index, 'score', parseInt(e.target.value) || 1)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      
                      <div className="flex items-center gap-1">
                        {ranges.length > 1 && (
                          <button
                            onClick={() => removeRange(metric.id, index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Remove range"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => addRange(metric.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    Add Range
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {ranges.map((range, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg text-center text-sm border-2 ${
                        range.score <= 3 ? 'bg-red-50 border-red-200 text-red-800' :
                        range.score <= 6 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                        'bg-green-50 border-green-200 text-green-800'
                      }`}
                    >
                      <div className="font-medium">Score {range.score}</div>
                      <div className="text-xs mt-1">
                        {formatRangeValue(range.min, metric.unit)} - {formatRangeValue(range.max, metric.unit)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Scoring System Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Each KPI is scored on a scale of 1-10 based on its value</li>
          <li>Lower scores (1-3) indicate areas needing improvement (red)</li>
          <li>Medium scores (4-6) indicate acceptable performance (yellow)</li>
          <li>Higher scores (7-10) indicate excellent performance (green)</li>
          <li>Use "∞" or "Infinity" for unlimited maximum values</li>
          <li>Ranges should not overlap and should cover all possible values</li>
          <li>Changes are applied immediately to the dashboard after saving</li>
        </ul>
      </div>
    </div>
  );
};