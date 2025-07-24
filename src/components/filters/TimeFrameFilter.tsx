import React from 'react';
import { Calendar } from 'lucide-react';
import { TimeFrame } from '../../types';

interface TimeFrameFilterProps {
  selected: TimeFrame;
  onSelect: (timeframe: TimeFrame) => void;
}

const timeFrameOptions = [
  { value: 'today' as TimeFrame, label: 'Today' },
  { value: 'yesterday' as TimeFrame, label: 'Yesterday' },
  { value: 'week' as TimeFrame, label: 'This Week (Mon-Sun)' },
  { value: 'lastweek' as TimeFrame, label: 'Last Week (Mon-Sun)' },
  { value: 'month' as TimeFrame, label: 'Current Month' },
  { value: 'lastmonth' as TimeFrame, label: 'Last Month' },
  { value: 'quarter' as TimeFrame, label: 'Last Quarter' },
  { value: 'year' as TimeFrame, label: 'Last Year' },
  { value: 'custom' as TimeFrame, label: 'Custom Range' },
];

export const TimeFrameFilter: React.FC<TimeFrameFilterProps> = ({ selected, onSelect }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-5 h-5 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-700">Time Period</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {timeFrameOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selected === option.value
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};