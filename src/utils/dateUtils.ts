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
      // Find the most recent Monday (start of work week)
      const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // If Sunday, go back 6 days to Monday
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - daysFromMonday);
      
      // End of work week is Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sunday is 6 days after Monday
      
      return {
        start: weekStart,
        end: new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1) // End of Sunday
      };
      
    case 'lastweek':
      // Find last Monday-Sunday work week
      const lastWeekCurrentDay = today.getDay();
      const daysFromLastMonday = lastWeekCurrentDay === 0 ? 13 : lastWeekCurrentDay + 6; // If Sunday, go back 13 days; otherwise go back to previous Monday
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - daysFromLastMonday);
      
      // End of last work week is Sunday
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6); // Sunday is 6 days after Monday
      
      return {
        start: lastWeekStart,
        end: new Date(lastWeekEnd.getTime() + 24 * 60 * 60 * 1000 - 1) // End of Sunday
      };
      
    case 'month':
      // Current month from 1st to today
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
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