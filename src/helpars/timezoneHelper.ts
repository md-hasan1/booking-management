import { DateTime } from "luxon";

const BUSINESS_TIMEZONE = "Africa/Johannesburg"; // Change to your actual timezone if different

/**
 * Converts a frontend timestamp to UTC for storage in database
 * Frontend sends times in Africa/Johannesburg timezone
 * MongoDB stores in UTC
 */
export const convertToUTC = (localDateTime: Date | string): Date => {
  const dt = DateTime.isDateTime(localDateTime)
    ? localDateTime
    : DateTime.fromISO(localDateTime instanceof Date ? localDateTime.toISOString() : localDateTime);
  
  // Treat the incoming time as local timezone and get UTC
  return dt.toUTC().toJSDate();
};

/**
 * Converts UTC timestamp from database back to local timezone for display
 * Used when retrieving times to show to users
 */
export const convertToLocalTimezone = (utcDate: Date): Date => {
  const dt = DateTime.fromJSDate(utcDate).toUTC();
  return dt.setZone(BUSINESS_TIMEZONE).toJSDate();
};

/**
 * Converts UTC timestamp to local timezone and returns formatted time string
 */
export const formatTimeInTimezone = (
  utcDate: Date,
  format: string = "hh:mm a"
): string => {
  return DateTime.fromJSDate(utcDate)
    .setZone(BUSINESS_TIMEZONE)
    .toFormat(format);
};

/**
 * Get current time in business timezone
 */
export const getNowInBusinessTimezone = (): DateTime => {
  return DateTime.now().setZone(BUSINESS_TIMEZONE);
};

/**
 * Convert a time string in local timezone to UTC Date
 * Example: "2024-04-11T08:00:00" in Africa/Johannesburg -> UTC Date
 */
export const localTimeStringToUTC = (timeString: string): Date => {
  const dt = DateTime.fromISO(timeString, { zone: BUSINESS_TIMEZONE });
  return dt.toUTC().toJSDate();
};

export const timezoneHelper = {
  convertToUTC,
  convertToLocalTimezone,
  formatTimeInTimezone,
  getNowInBusinessTimezone,
  localTimeStringToUTC,
  BUSINESS_TIMEZONE,
};
