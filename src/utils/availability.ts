export type TimeRangePreset = '24h' | '7d' | '30d' | 'custom';

export const getTimeRangeDates = (
  timeRange: TimeRangePreset,
  customStartDate?: string,
  customEndDate?: string
): { startDate: Date; endDate: Date } => {
  const now = new Date();
  let endDate = new Date(now);
  let startDate = new Date(now);

  switch (timeRange) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case 'custom':
      if (customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      }
      break;
  }

  return { startDate, endDate };
};

export const getExpectedCount = (startDate: Date, endDate: Date): number => {
  const hoursDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  return Math.max(1, hoursDiff);
};

export const calculateAvailabilityPercent = (count: number, expectedCount: number): number => {
  if (expectedCount <= 0) return 0;
  return (count / expectedCount) * 100;
};