'use server';

import { processCSVFile, BrandReport, validateDailyReportCSV } from '../../lib/reportProcessor';

export interface ActionState {
  reports: BrandReport[];
  error?: string;
}

export async function processReports(formData: FormData): Promise<ActionState> {
  try {
    const files = formData.getAll('files') as File[];
    const csvFiles = files.filter(
      f => f.name && (f.name.toLowerCase().endsWith('.csv') || f.size > 0)
    );

    if (csvFiles.length === 0) {
      return { reports: [], error: 'No valid CSV files found. Please upload CSV files exported from your platform.' };
    }

    // Validate all files first
    for (const file of csvFiles) {
      const text = await file.text();
      const validation = validateDailyReportCSV(text, file.name);
      if (!validation.valid) {
        return {
          reports: [],
          error: `File "${file.name}" is missing required columns: ${validation.missing.join(', ')}. Please check that you\'re uploading the correct CSV format with all required columns.`,
        };
      }
    }

    // All files valid, process them
    const reports: BrandReport[] = await Promise.all(
      csvFiles.map(async f => processCSVFile(await f.text(), f.name))
    );

    return { reports };
  } catch (e) {
    return {
      reports: [],
      error: e instanceof Error ? e.message : 'An unexpected error occurred while processing your files.',
    };
  }
}
