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