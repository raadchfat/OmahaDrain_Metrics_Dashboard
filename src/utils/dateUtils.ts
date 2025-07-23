import { TimeFrame, DateRange } from '../types';

export function getDateRangeFromTimeFrame(timeFrame: TimeFrame): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeFrame) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) // End of today
      };
      
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1) // End of yesterday
      };
      
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 7);
      return {
        start: weekStart,
        end: today
      };
      
    case 'month':
      const monthStart = new Date(today);
      monthStart.setDate(monthStart.getDate() - 30);
      return {
        start: monthStart,
        end: today
      };
      
    case 'quarter':
      const quarterStart = new Date(today);
      quarterStart.setDate(quarterStart.getDate() - 90);
      return {
        start: quarterStart,
        end: today
      };
      
    case 'year':
      const yearStart = new Date(today);
      yearStart.setFullYear(yearStart.getFullYear() - 1);
      return {
        start: yearStart,
        end: today
      };
      
    case 'custom':
      // For custom, return last 30 days as default
      const customStart = new Date(today);
      customStart.setDate(customStart.getDate() - 30);
      return {
        start: customStart,
        end: today
      };
      
    default:
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
  }
}

export function isDateInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function parseDateFromRow(row: any[], dateColumnIndex: number = 0): Date | null {
  const dateValue = row[dateColumnIndex];
  
  if (!dateValue) return null;
  
  // Try to parse various date formats
  let parsedDate: Date;
  
  if (typeof dateValue === 'string') {
    // Handle common date formats
    if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // MM/DD/YYYY or M/D/YYYY
      parsedDate = new Date(dateValue);
    } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD
      parsedDate = new Date(dateValue);
    } else if (dateValue.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      // MM-DD-YYYY or M-D-YYYY
      const parts = dateValue.split('-');
      parsedDate = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
    } else {
      // Try generic date parsing
      parsedDate = new Date(dateValue);
    }
  } else if (typeof dateValue === 'number') {
    // Excel serial date number
    parsedDate = new Date((dateValue - 25569) * 86400 * 1000);
  } else {
    parsedDate = new Date(dateValue);
  }
  
  // Validate the parsed date
  if (isNaN(parsedDate.getTime())) {
    return null;
  }
  
  return parsedDate;
}