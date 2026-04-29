import type { BrandReport } from './reportProcessor';

// ── Colour palette ────────────────────────────────────────────────────────────
const CLR = {
  summaryLabelBg: 'FFF176',
  summaryLabelText: '1A237E',
  summaryValueBg: 'FFFDE7',
  summaryValueText: '263238',
  greenBg: 'E8F5E9',
  greenText: '1B5E20',
  greenBorder: 'A5D6A7',
  redBg: 'FFEBEE',
  redText: 'B71C1C',
  redBorder: 'EF9A9A',
  topHeaderBg: '2E7D32',
  bottomHeaderBg: 'C62828',
  white: 'FFFFFF',
  colHeaderBg: 'E8EAF6',
  colHeaderText: '283593',
  dataOddBg: 'FFFFFF',
  dataEvenBg: 'F8F9FA',
  dataText: '37474F',
  dataNumText: '546E7A',
  heavyBorder: 'B0BEC5',
  lightBorder: 'ECEFF1',
  colHeaderBorder: '9FA8DA',
} as const;

type BorderStyle = { style: string; color: { rgb: string } };
type Borders = { top: BorderStyle; bottom: BorderStyle; left: BorderStyle; right: BorderStyle };

function border(rgb: string, style = 'thin'): Borders {
  const side = { style, color: { rgb } };
  return { top: side, bottom: side, left: side, right: side };
}

function makeStyles() {
  return {
    summaryLabel: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.summaryLabelBg } },
      font: { bold: true, color: { rgb: CLR.summaryLabelText }, sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: border(CLR.heavyBorder),
    },
    summaryValue: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.summaryValueBg } },
      font: { bold: true, color: { rgb: CLR.summaryValueText }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(CLR.heavyBorder),
    },
    summaryGreen: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.greenBg } },
      font: { bold: true, color: { rgb: CLR.greenText }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(CLR.greenBorder),
    },
    summaryRed: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.redBg } },
      font: { bold: true, color: { rgb: CLR.redText }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(CLR.redBorder),
    },
    topHeader: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.topHeaderBg } },
      font: { bold: true, color: { rgb: CLR.white }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(CLR.topHeaderBg, 'medium'),
    },
    bottomHeader: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.bottomHeaderBg } },
      font: { bold: true, color: { rgb: CLR.white }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(CLR.bottomHeaderBg, 'medium'),
    },
    colHeader: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.colHeaderBg } },
      font: { bold: true, color: { rgb: CLR.colHeaderText }, sz: 9 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: border(CLR.colHeaderBorder),
    },
    dataText: (even: boolean) => ({
      fill: { patternType: 'solid', fgColor: { rgb: even ? CLR.dataEvenBg : CLR.dataOddBg } },
      font: { color: { rgb: CLR.dataText }, sz: 9 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: border(CLR.lightBorder),
    }),
    dataNum: (even: boolean) => ({
      fill: { patternType: 'solid', fgColor: { rgb: even ? CLR.dataEvenBg : CLR.dataOddBg } },
      font: { color: { rgb: CLR.dataNumText }, sz: 9 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: border(CLR.lightBorder),
    }),
    profitPos: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.greenBg } },
      font: { bold: true, color: { rgb: CLR.greenText }, sz: 9 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: border(CLR.greenBorder),
    },
    profitNeg: {
      fill: { patternType: 'solid', fgColor: { rgb: CLR.redBg } },
      font: { bold: true, color: { rgb: CLR.redText }, sz: 9 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: border(CLR.redBorder),
    },
    blank: {
      fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } },
      font: { sz: 9 },
      border: border(CLR.lightBorder),
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XLSXModule = any;
type SheetRow = { email?: string; name?: string; bets: number; turnoverEur: number; profitEur: number };

// Writes one brand block into ws starting at row r0, returns the next free row.
function writeBrandBlock(
  XLSX: XLSXModule,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ws: Record<string, any>,
  merges: { s: { r: number; c: number }; e: { r: number; c: number } }[],
  S: ReturnType<typeof makeStyles>,
  report: BrandReport,
  r0: number
): number {
  let r = r0;

  const addr = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });

  function setCell(row: number, col: number, value: unknown, style: object, numFmt?: string) {
    const t = typeof value === 'number' ? 'n' : 's';
    ws[addr(row, col)] = { v: value ?? '', t, ...(numFmt ? { z: numFmt } : {}), s: style };
  }

  function mergeRow(row: number, c1: number, c2: number) {
    merges.push({ s: { r: row, c: c1 }, e: { r: row, c: c2 } });
  }

  function fillMerged(row: number, c1: number, c2: number, style: object) {
    for (let col = c1 + 1; col <= c2; col++) setCell(row, col, '', style);
  }

  // ── Brand name row ──────────────────────────────────────────────────────────
  const brandStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
    font: { bold: true, color: { rgb: CLR.white }, sz: 11 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: border('1E293B', 'medium'),
  };
  const dateStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
    font: { color: { rgb: 'CBD5E1' }, sz: 10 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: border('1E293B', 'medium'),
  };
  mergeRow(r, 0, 5);
  setCell(r, 0, report.brandName, brandStyle);
  fillMerged(r, 0, 5, brandStyle);
  mergeRow(r, 6, 7);
  setCell(r, 6, report.date, dateStyle);
  fillMerged(r, 6, 7, dateStyle);
  r++;

  // ── Paired section renderer ─────────────────────────────────────────────────
  function addSection(topLabel: string, bottomLabel: string, nameHeader: string, topRows: SheetRow[], bottomRows: SheetRow[]) {
    mergeRow(r, 0, 3);
    mergeRow(r, 4, 7);
    setCell(r, 0, topLabel, S.topHeader);
    fillMerged(r, 0, 3, S.topHeader);
    setCell(r, 4, bottomLabel, S.bottomHeader);
    fillMerged(r, 4, 7, S.bottomHeader);
    r++;

    const colLabels = [nameHeader, '#Bets', 'Turnover (€)', 'Profit (€)'];
    [...colLabels, ...colLabels].forEach((h, c) => setCell(r, c, h, S.colHeader));
    r++;

    for (let i = 0; i < 5; i++) {
      const even = i % 2 !== 0;
      const textStyle = S.dataText(even);
      const numStyle = S.dataNum(even);
      const t = topRows[i] as SheetRow | undefined;
      const b = bottomRows[i] as SheetRow | undefined;

      setCell(r, 0, t ? (t.email ?? t.name ?? '') : '', textStyle);
      setCell(r, 1, t ? t.bets : '', t ? numStyle : S.blank);
      setCell(r, 2, t ? t.turnoverEur : '', t ? numStyle : S.blank, t ? '#,##0.00' : undefined);
      setCell(r, 3, t ? t.profitEur : '', t ? (t.profitEur >= 0 ? S.profitPos : S.profitNeg) : S.blank, t ? '#,##0.00' : undefined);

      setCell(r, 4, b ? (b.email ?? b.name ?? '') : '', textStyle);
      setCell(r, 5, b ? b.bets : '', b ? numStyle : S.blank);
      setCell(r, 6, b ? b.turnoverEur : '', b ? numStyle : S.blank, b ? '#,##0.00' : undefined);
      setCell(r, 7, b ? b.profitEur : '', b ? (b.profitEur >= 0 ? S.profitPos : S.profitNeg) : S.blank, b ? '#,##0.00' : undefined);

      r++;
    }
    r++; // blank row between sections
  }

  addSection('Top Customers', 'Bottom Customers', 'User', report.topCustomers, report.bottomCustomers);
  addSection('Top Tournaments', 'Bottom Tournaments', 'Tournament', report.topTournaments, report.bottomTournaments);
  addSection('Top Events', 'Bottom Events', 'Event', report.topEvents, report.bottomEvents);

  r++; // extra blank row between brands

  return r;
}

// ── Public export function ────────────────────────────────────────────────────
export async function downloadStyledExcel(reports: BrandReport[]): Promise<void> {
  const XLSX = await import('xlsx-js-style');
  const S = makeStyles();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {};
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

  let row = 0;
  for (const report of reports) {
    row = writeBrandBlock(XLSX, ws, merges, S, report, row);
  }

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: 7 } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 30 }, { wch: 13 }, { wch: 10 }, { wch: 12 },
    { wch: 30 }, { wch: 7  }, { wch: 14 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');

  XLSX.writeFile(wb, `daily_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
