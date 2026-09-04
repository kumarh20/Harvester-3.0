import { Injectable } from '@angular/core';
import { RecordsService, Record } from './records.service';

export interface ImportResult {
  totalFound: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DataImportExportService {

  constructor(private recordsService: RecordsService) {}

  /**
   * Export records to CSV file with UTF-8 BOM for full character compatibility
   */
  exportToCSV(records?: Record[], filename = 'harvester_records.csv'): void {
    const list = records && records.length > 0 ? records : this.recordsService.getAllRecords();
    
    if (!list || list.length === 0) {
      throw new Error('NO_DATA');
    }

    const headers = [
      'Farmer Name',
      'Contact Number',
      'Date',
      'Harvester',
      'Land (Acres)',
      'Rate Per Acre (Rs)',
      'Total Amount (Rs)',
      'Cash Paid (Rs)',
      'Pending Balance (Rs)',
      'Full Payment Date',
      'Marked as Paid'
    ];

    const rows = list.map(r => [
      this.escapeCsv(r.farmerName),
      this.escapeCsv(r.contactNumber),
      this.escapeCsv(r.date),
      this.escapeCsv(r.harvester || ''),
      r.landInAcres,
      r.ratePerAcre,
      r.totalPayment,
      r.paidOnSight,
      r.pendingAmount,
      this.escapeCsv(r.fullPaymentDate || ''),
      r.markedAsPaid ? 'Yes' : 'No'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    this.downloadFile(csvContent, 'text/csv;charset=utf-8;', filename);
  }

  /**
   * Export records to JSON file
   */
  exportToJSON(records?: Record[], filename = 'harvester_records.json'): void {
    const list = records && records.length > 0 ? records : this.recordsService.getAllRecords();
    
    if (!list || list.length === 0) {
      throw new Error('NO_DATA');
    }

    const jsonContent = JSON.stringify(list, null, 2);
    this.downloadFile(jsonContent, 'application/json;charset=utf-8;', filename);
  }

  /**
   * Parse uploaded file (CSV or JSON)
   */
  async parseFile(file: File): Promise<Partial<Record>[]> {
    const text = await file.text();
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      return this.parseJSON(text);
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      return this.parseCSV(text);
    } else {
      throw new Error('UNSUPPORTED_FORMAT');
    }
  }

  /**
   * Import parsed records into Firestore and local store
   */
  async importRecords(records: Partial<Record>[]): Promise<ImportResult> {
    if (!records || records.length === 0) {
      return { totalFound: 0, importedCount: 0, skippedCount: 0, errors: ['No records provided'] };
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const item = records[i];

      // Validate farmer name
      const farmerName = (item.farmerName || '').trim();
      if (!farmerName) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Farmer name is missing`);
        continue;
      }

      const contactNumber = (item.contactNumber || '').toString().replace(/\D/g, '');
      const landInAcres = Math.max(0, Number(item.landInAcres) || 0);
      const ratePerAcre = Math.max(0, Number(item.ratePerAcre) || 2500);
      const paidOnSight = Math.max(0, Number(item.paidOnSight) || 0);
      const totalPayment = item.totalPayment ? Number(item.totalPayment) : Math.round(landInAcres * ratePerAcre);
      const pendingAmount = Math.max(0, totalPayment - paidOnSight);
      const date = item.date ? this.normalizeDate(item.date) : new Date().toISOString().split('T')[0];
      const harvester = (item.harvester || 'Harvester 1').trim();
      const fullPaymentDate = item.fullPaymentDate ? this.normalizeDate(item.fullPaymentDate) : '';
      const markedAsPaid = !!item.markedAsPaid || pendingAmount === 0;

      const newRecord = {
        farmerName,
        contactNumber: contactNumber || '0000000000',
        date,
        landInAcres,
        ratePerAcre,
        paidOnSight,
        totalPayment,
        pendingAmount,
        harvester,
        fullPaymentDate,
        markedAsPaid
      };

      try {
        await this.recordsService.addRecord(newRecord);
        importedCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push(`Row ${i + 1} (${farmerName}): ${err?.message || 'Database error'}`);
      }
    }

    // Refresh memory cache
    try {
      await this.recordsService.loadRecords();
    } catch {
      // Ignored
    }

    return {
      totalFound: records.length,
      importedCount,
      skippedCount,
      errors
    };
  }

  // --- Internal Parsers ---

  private parseJSON(text: string): Partial<Record>[] {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must contain an array of records');
      }
      return parsed.map(item => this.normalizeRecordKeys(item));
    } catch (e: any) {
      throw new Error(`Invalid JSON format: ${e.message}`);
    }
  }

  private parseCSV(text: string): Partial<Record>[] {
    const lines = this.splitCsvLines(text);
    if (lines.length < 2) {
      throw new Error('CSV file contains no data rows');
    }

    const headerLine = lines[0];
    const headers = this.parseCsvRow(headerLine).map(h => h.trim().toLowerCase());

    const records: Partial<Record>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCsvRow(line);
      const rawObj: { [key: string]: any } = {};

      headers.forEach((hdr, idx) => {
        rawObj[hdr] = values[idx] ?? '';
      });

      const normalized = this.normalizeRecordKeys(rawObj);
      if (normalized.farmerName) {
        records.push(normalized);
      }
    }

    return records;
  }

  private splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    return lines;
  }

  private parseCsvRow(row: string): string[] {
    const result: string[] = [];
    let curVal = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          curVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(curVal.trim());
        curVal = '';
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim());
    return result;
  }

  private normalizeRecordKeys(obj: any): Partial<Record> {
    const res: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const k = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const strVal = typeof value === 'string' ? value.trim() : String(value ?? '');

      if (k.includes('farmer') || k === 'name' || k === 'kisan') {
        res.farmerName = strVal;
      } else if (k.includes('phone') || k.includes('mobile') || k.includes('contact')) {
        res.contactNumber = strVal;
      } else if (k === 'date' || k.includes('cuttingdate')) {
        res.date = strVal;
      } else if (k.includes('harvester') || k.includes('machine')) {
        res.harvester = strVal;
      } else if (k.includes('acre') || k.includes('land')) {
        res.landInAcres = parseFloat(strVal) || 0;
      } else if (k.includes('rate')) {
        res.ratePerAcre = parseFloat(strVal) || 0;
      } else if (k.includes('cash') || k.includes('paidonsight') || k.includes('advance')) {
        res.paidOnSight = parseFloat(strVal) || 0;
      } else if (k.includes('total') || k.includes('amount')) {
        res.totalPayment = parseFloat(strVal) || 0;
      } else if (k.includes('pending') || k.includes('due') || k.includes('balance')) {
        res.pendingAmount = parseFloat(strVal) || 0;
      } else if (k.includes('promise') || k.includes('fullpayment') || k.includes('duedate')) {
        res.fullPaymentDate = strVal;
      } else if (k.includes('markedaspaid') || k === 'paid') {
        res.markedAsPaid = strVal.toLowerCase() === 'yes' || strVal.toLowerCase() === 'true';
      }
    }

    return res;
  }

  private normalizeDate(val: string): string {
    try {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      // Ignored
    }
    return val;
  }

  private escapeCsv(val: any): string {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private downloadFile(content: string, mimeType: string, filename: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
