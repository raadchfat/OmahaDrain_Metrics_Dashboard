import { ScoreRange } from '../types';

export const getScoreFromValue = (
  value: number, 
  scoreRanges?: ScoreRange[]
): number => {
  if (!scoreRanges || scoreRanges.length === 0) return 0;
  
  for (const range of scoreRanges) {
    if (value >= range.min && (range.max === Infinity || value < range.max)) {
      return range.score;
    }
  }
  
  return 0;
};

export const getScoringRanges = (metricId: string): ScoreRange[] => {
  const savedConfig = localStorage.getItem('multiSheetConfig');
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    if (config.scoringRanges && config.scoringRanges[metricId]) {
      return config.scoringRanges[metricId];
    }
  }
  
  // Return empty array if no custom ranges found
  // The component will use default ranges from KPI_METRICS
  return [];
};