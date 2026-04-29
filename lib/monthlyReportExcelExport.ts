import type { MonthlyReport, AggregatedRow } from './monthlyReportProcessor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XLSXModule = any;

const CLR = {
  titleBg:   '1E3A8A', titleText:  'FFFFFF',
  headerBg:  '2563EB', headerText: 'FFFFFF',
  groupBg:   'DBEAFE', groupText:  '1E40AF',
  memberBg:  'EFF6FF', memberText: '1E3A8A',
  indivOdd:  'FFFFFF', indivEven:  'F8FAFC',
  indivText: '374151',
  totalBg:   'FEF08A', totalText:  '78350F',
  border:    'CBD5E1',
} as const;

type BS = { style: string; color: { rgb: string } };
type Borders = { top: BS; bottom: BS; left: BS; right: BS };

function brd(rgb: string, style = 'thin'): Borders {
  const s = { style, color: { rgb } };
  return { top: s, bottom: s, left: s, right: s };
}

function makeStyle(fgRgb: string, bold: boolean, textRgb: string, sz = 9, hAlign = 'left') {
  return {
    fill: { patternType: 'solid', fgColor: { rgb: fgRgb } },
    font: { bold, color: { rgb: textRgb }, sz },
    alignment: { horizontal: hAlign, vertical: 'center', wrapText: false },
    border: brd(CLR.border),
  };
}

const NUM_COLS = 11;

const COL_KEYS: Array<keyof AggregatedRow> = [
  'bonusKey', 'issuedCount', 'issuedAmount', 'issuedPlayers',
  'activationRate', 'activatedAmount', 'activatedPlayers',
  'usageRate', 'payoutAmount', 'payoutRate', 'avgBet',
];

const COL_FMTS: (string | undefined)[] = [
  undefined,    // bonusKey
  '#,##0',      // issuedCount
  '#,##0.00',   // issuedAmount
  '#,##0',      // issuedPlayers
  '0.00%',      // activationRate (stored as decimal)
  '#,##0.00',   // activatedAmount
  '#,##0',      // activatedPlayers
  '0.00%',      // usageRate (stored as decimal)
  '#,##0.00',   // payoutAmount
  '0.00%',      // payoutRate (stored as decimal)
  '#,##0.00',   // avgBet
];

const COL_HEADERS = [
  'Bonus Key', 'Issued', 'Issued Amt (€)', 'Issued Players',
  'Act. Rate', 'Act. Amt (€)', 'Act. Players',
  'Usage Rate', 'Payout Amt (€)', 'Payout Rate', 'Avg Bet (€)',
];

function cellVal(row: AggregatedRow, key: keyof AggregatedRow): unknown {
  if (key === 'bonusKey') return row[key];
  const n = row[key] as number;
  if (key === 'activationRate' || key === 'usageRate' || key === 'payoutRate') return n / 100;
  return n;
}

function buildSheet(XLSX: XLSXModule, report: MonthlyReport) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ws: Record<string, any> = {};
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  let r = 0;

  const addr = (row: number, col: number) => XLSX.utils.encode_cell({ r: row, c: col });

  function setCell(row: number, col: number, value: unknown, style: object, numFmt?: string) {
    const t = typeof value === 'number' ? 'n' : 's';
    ws[addr(row, col)] = { v: value ?? '', t, ...(numFmt ? { z: numFmt } : {}), s: style };
  }

  // Title row
  const titleStyle = makeStyle(CLR.titleBg, true, CLR.titleText, 12, 'center');
  setCell(r, 0, 'Monthly Freebet Report', titleStyle);
  for (let c = 1; c < NUM_COLS; c++) setCell(r, c, '', titleStyle);
  merges.push({ s: { r, c: 0 }, e: { r, c: NUM_COLS - 1 } });
  r++;

  // Column headers
  const hdrStyle = makeStyle(CLR.headerBg, true, CLR.headerText, 9, 'center');
  COL_HEADERS.forEach((h, c) => setCell(r, c, h, hdrStyle));
  r++;

  function addRow(
    row: AggregatedRow,
    label: string,
    bg: string,
    textRgb: string,
    bold: boolean,
    isIndented = false,
  ) {
    const leftStyle = makeStyle(bg, bold, textRgb, 9, 'left');
    const rightStyle = makeStyle(bg, bold, textRgb, 9, 'right');
    setCell(r, 0, isIndented ? `    ${label}` : label, leftStyle);
    COL_KEYS.slice(1).forEach((key, i) => {
      const col = i + 1;
      setCell(r, col, cellVal(row, key), rightStyle, COL_FMTS[col]);
    });
    r++;
  }

  // Groups
  for (const g of report.groups) {
    addRow(g.total, g.name, CLR.groupBg, CLR.groupText, true, false);
    for (const m of g.members) {
      addRow(m, m.bonusKey, CLR.memberBg, CLR.memberText, false, true);
    }
  }

  // Individuals
  report.individuals.forEach((ind, i) => {
    const bg = i % 2 === 0 ? CLR.indivOdd : CLR.indivEven;
    addRow(ind, ind.bonusKey, bg, CLR.indivText, false, false);
  });

  // Monthly total
  addRow(report.monthlyTotal, 'Monthly Total', CLR.totalBg, CLR.totalText, true, false);

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: NUM_COLS - 1 } });
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 35 }, { wch: 9 },  { wch: 14 }, { wch: 13 },
    { wch: 11 }, { wch: 14 }, { wch: 13 },
    { wch: 11 }, { wch: 14 }, { wch: 11 }, { wch: 11 },
  ];
  ws['!rows'] = [{ hpt: 24 }, { hpt: 20 }, ...Array(r - 2).fill({ hpt: 18 })];

  return ws;
}

export async function downloadMonthlyExcel(report: MonthlyReport): Promise<void> {
  const XLSX = await import('xlsx-js-style');
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(XLSX, report);
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');
  XLSX.writeFile(wb, `monthly_freebet_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
