import { describe, it, expect } from 'vitest';
import {
  cn,
  formatBytes,
  formatDuration,
  formatTime,
  formatDate,
  getSignalStrength,
  getBatteryLevel,
} from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toContain('foo');
    expect(cn('foo', 'bar')).toContain('bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).not.toContain('bar');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toContain('foo');
    expect(cn('foo', undefined, null, 'bar')).toContain('bar');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('handles decimal precision', () => {
    expect(formatBytes(1536, 2)).toBe('1.5 KB');
  });

  it('handles custom decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(30)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3660)).toBe('1h 1m');
  });

  it('formats hours only', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
  });

  it('handles 0 seconds', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats large durations', () => {
    expect(formatDuration(7265)).toBe('2h 1m');
  });
});

describe('formatTime', () => {
  it('formats time from Date object', () => {
    const date = new Date('2024-01-15T14:30:00');
    const formatted = formatTime(date);
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });

  it('formats time from string', () => {
    const formatted = formatTime('2024-01-15T14:30:00');
    expect(formatted).toMatch(/\d{1,2}:\d{2}\s[AP]M/);
  });
});

describe('formatDate', () => {
  it('formats date from Date object', () => {
    const date = new Date('2024-01-15');
    const formatted = formatDate(date);
    expect(formatted).toBe('Jan 15, 2024');
  });

  it('formats date from string', () => {
    const formatted = formatDate('2024-01-15');
    expect(formatted).toBe('Jan 15, 2024');
  });
});

describe('getSignalStrength', () => {
  it('returns excellent for 80+', () => {
    expect(getSignalStrength(80)).toBe('excellent');
    expect(getSignalStrength(100)).toBe('excellent');
  });

  it('returns good for 60-79', () => {
    expect(getSignalStrength(60)).toBe('good');
    expect(getSignalStrength(79)).toBe('good');
  });

  it('returns fair for 40-59', () => {
    expect(getSignalStrength(40)).toBe('fair');
    expect(getSignalStrength(59)).toBe('fair');
  });

  it('returns poor for below 40', () => {
    expect(getSignalStrength(39)).toBe('poor');
    expect(getSignalStrength(0)).toBe('poor');
  });
});

describe('getBatteryLevel', () => {
  it('returns full for 90+', () => {
    expect(getBatteryLevel(90)).toBe('full');
    expect(getBatteryLevel(100)).toBe('full');
  });

  it('returns high for 60-89', () => {
    expect(getBatteryLevel(60)).toBe('high');
    expect(getBatteryLevel(89)).toBe('high');
  });

  it('returns medium for 30-59', () => {
    expect(getBatteryLevel(30)).toBe('medium');
    expect(getBatteryLevel(59)).toBe('medium');
  });

  it('returns low for 15-29', () => {
    expect(getBatteryLevel(15)).toBe('low');
    expect(getBatteryLevel(29)).toBe('low');
  });

  it('returns critical for below 15', () => {
    expect(getBatteryLevel(14)).toBe('critical');
    expect(getBatteryLevel(0)).toBe('critical');
  });
});
