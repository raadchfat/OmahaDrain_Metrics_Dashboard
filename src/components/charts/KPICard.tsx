import React from 'react';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { ScoreRange } from '../../types';
import { getScoreFromValue } from '../../utils/scoringUtils';

interface KPICardProps {
  title: string;
  value: number;
  unit?: string;
  description: string;
  formula?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  scoreRanges?: ScoreRange[];
}

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  purple: 'bg-purple-500'
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit = '',
  description,
  formula,
  trend = 'neutral',
  trendValue,
  color = 'blue',
  scoreRanges
}) => {
  const score = getScoreFromValue(value, scoreRanges);
  
  // Debug logging
  console.log('KPICard Debug:', { title, value, scoreRanges, score });
  
  const formatValue = (val: number) => {
    if (unit === '$') {
      return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    if (unit === '%') {
      return `${val.toFixed(1)}%`;
    }
    return val.toLocaleString();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              {title}
            </h3>
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {description}
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {formatValue(value)}
            </span>
            {trendValue && (
              <div className={`flex items-center text-sm font-medium ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {trend === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
                {trend === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
                {Math.abs(trendValue).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
        <div className={`w-4 h-16 rounded-full ${colorClasses[color]}`}></div>
      </div>
      
      {formula && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-mono leading-relaxed">
            <span className="font-semibold text-gray-600">Formula:</span> {formula}
          </p>
          
          {scoreRanges && score > 0 && (
            <div className="mt-3">
              <div className="mt-2">
                <span className="text-sm font-bold text-blue-600">Score: {score}/10</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};