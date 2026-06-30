'use server';

import { isMonthlyReportCSV, processMonthlyCSV, MonthlyReport, CustomPromoGroup } from '../../lib/monthlyReportProcessor';

export interface MonthlyActionState {
  report?: MonthlyReport;
  error?: string;
}

export async function processMonthlyReport(formData: FormData): Promise<MonthlyActionState> {
  try {
    const file = formData.get('file') as File | null;
    if (!file || !file.name) {
      return { error: 'No file selected. Please upload a monthly freebet CSV.' };
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return { error: 'Invalid file type. Please upload a CSV file.' };
    }
    const text = await file.text();
    if (!isMonthlyReportCSV(text)) {
      return { error: 'This does not appear to be a monthly freebet report CSV. Please check the file.' };
    }
    let customGroups: CustomPromoGroup[] = [];
    const raw = formData.get('customGroups');
    if (typeof raw === 'string' && raw) {
      try { customGroups = JSON.parse(raw); } catch { /* ignore malformed */ }
    }
    const report = processMonthlyCSV(text, file.name, customGroups);
    return { report };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'An unexpected error occurred while processing the file.',
    };
  }
}
