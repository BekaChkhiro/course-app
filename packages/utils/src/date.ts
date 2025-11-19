import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns'

export function formatDate(date: Date | string, pattern = 'PPP'): string {
  return format(new Date(date), pattern)
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isDateInRange(
  date: Date,
  start: Date,
  end: Date
): boolean {
  return isAfter(date, start) && isBefore(date, end)
}
