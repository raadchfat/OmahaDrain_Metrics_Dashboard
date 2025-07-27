import { TimeFrame, DateRange } from '../types';

export function getDateRangeFromTimeFrame(timeFrame: TimeFrame): DateRange {
  const now = new Date();
  // Set to start of day in local timezone
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  
  switch (timeFrame) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      };
      
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
      };
      
    case 'week':
      // Current week (Monday to Sunday)
      const currentDayOfWeek = today.getDay();
      const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(today);
      weekEnd.setHours(23, 59, 59, 999);
      
      return {
        start: weekStart,
        end: weekEnd
      };
      
    case 'lastweek':
      // Last complete week (Monday to Sunday)
      const lastWeekCurrentDay = today.getDay();
      const daysFromLastMonday = lastWeekCurrentDay === 0 ? 13 : lastWeekCurrentDay + 6;
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - daysFromLastMonday);
      lastWeekStart.setHours(0, 0, 0, 0);
      
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      
      return {
        start: lastWeekStart,
        end: lastWeekEnd
      };
      
    case 'month':
      // Current month from 1st to now
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: monthStart,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
      
    case 'lastmonth':
      // Last complete month
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      return {
        start: lastMonthStart,
        end: lastMonthEnd
      };
      
    case 'quarter':
      // Last 90 days
      const quarterStart = new Date(today);
      quarterStart.setDate(quarterStart.getDate() - 90);
      quarterStart.setHours(0, 0, 0, 0);
      return {
        start: quarterStart,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
      
    case 'year':
      // Last 365 days
      const yearStart = new Date(today);
      yearStart.setDate(yearStart.getDate() - 365);
      yearStart.setHours(0, 0, 0, 0);
      return {
        start: yearStart,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
      
    case 'custom':
      // Last 30 days as default
      const customStart = new Date(today);
      customStart.setDate(customStart.getDate() - 30);
      customStart.setHours(0, 0, 0, 0);
      return {
        start: customStart,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
      
    case 'currentyear':
      // Current year from January 1st to now
      const currentYearStart = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
      return {
        start: currentYearStart,
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      };
      
    default:
      return {
        start: today,
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
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

// Standardized date parsing function for database values
export function parseStandardDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // Handle different input types
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  if (typeof dateValue === 'string') {
    // Remove any time components and normalize
    const cleanDate = dateValue.split('T')[0].split(' ')[0];
    
    // Handle various string formats
    if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD (ISO format)
      return new Date(cleanDate + 'T00:00:00.000Z');
    } else if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // MM/DD/YYYY or M/D/YYYY
      return new Date(cleanDate);
    } else if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      // MM-DD-YYYY or M-D-YYYY
      const parts = cleanDate.split('-');
      return new Date(`${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
    } else if (cleanDate.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
      // MM/DD/YY - assume 20XX for years 00-30, 19XX for 31-99
      const parts = cleanDate.split('/');
      const year = parseInt(parts[2]);
      const fullYear = year <= 30 ? 2000 + year : 1900 + year;
      return new Date(`${fullYear}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
    }
    
    // Try generic parsing as fallback
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  if (typeof dateValue === 'number') {
    // Excel serial date number
    const parsed = new Date((dateValue - 25569) * 86400 * 1000);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  // Try direct conversion
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Format date to standard YYYY-MM-DD string
export function formatStandardDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Check if a date string/value is within a date range
export function isDateValueInRange(dateValue: any, range: DateRange): boolean {
  const parsedDate = parseStandardDate(dateValue);
  if (!parsedDate) return false;
  
  return isDateInRange(parsedDate, range);
}