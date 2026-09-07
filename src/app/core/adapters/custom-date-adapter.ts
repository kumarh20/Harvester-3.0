import { Injectable } from '@angular/core';
import { NativeDateAdapter, MatDateFormats } from '@angular/material/core';

/**
 * Custom DateAdapter for Angular Material to parse and display
 * dates in DD/MM/YYYY format, with support for combined DateTime
 * display (DD/MM/YYYY, hh:mm A) when time is present.
 */
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();

      // Match DD/MM/YYYY or YYYY/MM/DD with optional time
      const dateMatch = trimmed.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
      if (dateMatch) {
        let day: number, month: number, year: number;
        if (dateMatch[1].length === 4) {
          year = parseInt(dateMatch[1], 10);
          month = parseInt(dateMatch[2], 10) - 1;
          day = parseInt(dateMatch[3], 10);
        } else {
          day = parseInt(dateMatch[1], 10);
          month = parseInt(dateMatch[2], 10) - 1;
          year = parseInt(dateMatch[3], 10);
        }

        // Check for time part, e.g. "03:15 PM" or "15:15"
        const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
        let hours = 0;
        let minutes = 0;
        let hasTime = false;

        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
          const meridian = timeMatch[3]?.toUpperCase();
          if (meridian === 'PM' && hours < 12) hours += 12;
          if (meridian === 'AM' && hours === 12) hours = 0;
          hasTime = true;
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const d = new Date(year, month, day, hours, minutes, 0, 0);
          if (hasTime) {
            (d as any).hasTime = true;
            (d as any).timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          return d;
        }
      }

      const timestamp = Date.parse(value);
      if (!isNaN(timestamp)) {
        const d = new Date(timestamp);
        if (d.getHours() !== 0 || d.getMinutes() !== 0) {
          (d as any).hasTime = true;
        }
        return d;
      }
      return null;
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: Object): string {
    if (!date || isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const hasTime = (date as any).hasTime === true || 
                    (date as any).timeString !== undefined || 
                    (date.getHours() !== 0 || date.getMinutes() !== 0);

    if (hasTime) {
      let hours = date.getHours();
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');
      return `${dateStr}, ${formattedHours}:${minutes} ${ampm}`;
    }

    return dateStr;
  }
}

export const CUSTOM_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: { month: 'short', year: 'numeric', day: 'numeric' },
  },
  display: {
    dateInput: 'input',
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
