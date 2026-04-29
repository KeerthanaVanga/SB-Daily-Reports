import Papa from 'papaparse';

// ── Group matching rules (applied in order — first match wins) ────────────────
const GROUP_DEFS: { name: string; test: (lk: string) => boolean }[] = [
  { name: 'Games of the Week',       test: lk => lk.includes('games of the week') },
  { name: 'Football Weekend Reload', test: lk => lk.includes('football weekend reload') },
  { name: 'Welcome 1 FBT Drop',      test: lk => /welcome.{0,2}1.{0,4}fbt/i.test(lk) },
  { name: 'Welcome 2 FBT Drop',      test: lk => /welcome.{0,2}2.{0,4}fbt/i.test(lk) },
  { name: 'Weekly Reload',           test: lk => lk.includes('weekly reload') || lk.includes('wekdy reload') || lk.includes('sports wekd') },
  {
    name: 'Welcome Offer 1',
    test: lk =>
      lk.includes('welcome offer 1') ||
      lk.includes('sports welcome offer') ||
      lk.startsWith('welcome fbt') ||
      lk.startsWith('welcome1') ||
      (lk.startsWith('welcome 1') && !lk.includes('fbt')) ||
      lk.startsWith('welco 2026') ||
      lk.includes('1st deposit welcome') ||
      lk.includes('manual 1st deposit') ||
      (lk.startsWith('1st deposit bonus') && !lk.includes('fbt')) ||
      lk.startsWith('1st d 2026'),
  },
  {
    name: 'Welcome Offer 2',
    test: lk =>
      lk.includes('welcome offer 2') ||
      lk.startsWith('welcome2') ||
      (lk.includes('welcome') && lk.includes('fbt 50')),
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawRow {
  bonusKey: string;
  issuedCount: number;
  issuedAmount: number;
  issuedPlayers: number;
  activatedCount: number;   // col J (index 9)  — for weighted activation rate
  activatedAmount: number;
  activatedPlayers: number;
  usedCount: number;        // col P (index 15) — for weighted usage rate & avg bet
  usedAmount: number;       // col R (index 17) — for payout rate & avg bet
  payoutAmount: number;
}

export interface AggregatedRow {
  bonusKey: string;
  issuedCount: number;
  issuedAmount: number;
  issuedPlayers: number;
  activatedCount: number;
  activatedAmount: number;
  activatedPlayers: number;
  usedCount: number;
  usedAmount: number;
  payoutAmount: number;
  // Computed weighted rates
  activationRate: number;  // activatedCount / issuedCount × 100
  usageRate: number;       // usedCount / activatedCount × 100
  payoutRate: number;      // payoutAmount / usedAmount × 100
  avgBet: number;          // usedAmount / usedCount
}

export interface MonthlyGroup {
  name: string;
  total: AggregatedRow;
  members: AggregatedRow[];
}

export interface MonthlyReport {
  brandName: string;
  groups: MonthlyGroup[];
  individuals: AggregatedRow[];
  monthlyTotal: AggregatedRow;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseNum(v: string): number {
  if (!v) return 0;
  const s = v.replace(/[^0-9.\-]/g, '');
  return s ? parseFloat(s) : 0;
}

function sumField(rows: RawRow[], k: keyof RawRow): number {
  return rows.reduce((acc, r) => acc + (r[k] as number), 0);
}

function computeRates(bonusKey: string, rows: RawRow[]): AggregatedRow {
  const issuedCount    = sumField(rows, 'issuedCount');
  const issuedAmount   = sumField(rows, 'issuedAmount');
  const issuedPlayers  = sumField(rows, 'issuedPlayers');
  const activatedCount = sumField(rows, 'activatedCount');
  const activatedAmount= sumField(rows, 'activatedAmount');
  const activatedPlayers = sumField(rows, 'activatedPlayers');
  const usedCount      = sumField(rows, 'usedCount');
  const usedAmount     = sumField(rows, 'usedAmount');
  const payoutAmount   = sumField(rows, 'payoutAmount');

  return {
    bonusKey,
    issuedCount,
    issuedAmount,
    issuedPlayers,
    activatedCount,
    activatedAmount,
    activatedPlayers,
    usedCount,
    usedAmount,
    payoutAmount,
    activationRate: issuedCount > 0 ? (activatedCount / issuedCount) * 100 : 0,
    usageRate:      activatedCount > 0 ? (usedCount / activatedCount) * 100 : 0,
    payoutRate:     usedAmount > 0 ? (payoutAmount / usedAmount) * 100 : 0,
    avgBet:         usedCount > 0 ? usedAmount / usedCount : 0,
  };
}

function matchGroup(key: string): string | null {
  const lk = key.toLowerCase().trim();
  for (const g of GROUP_DEFS) {
    if (g.test(lk)) return g.name;
  }
  return null;
}

// ── CSV detection ─────────────────────────────────────────────────────────────
export function isMonthlyReportCSV(text: string): boolean {
  const head = text.slice(0, 300);
  return head.includes('Bonuses issued') || head.includes('Bonuses activated') || head.includes('Bonus key');
}

// ── Main processor ────────────────────────────────────────────────────────────
export function processMonthlyCSV(csvText: string, filename = ''): MonthlyReport {
  const parsed = Papa.parse<string[]>(csvText, { header: false, skipEmptyLines: false });
  const allRows = parsed.data as string[][];

  // Row 0 = category headers, Row 1 = column names
  // Last 2 rows = Average + Total footer — skip both
  const dataRows = allRows
    .slice(2, allRows.length - 2)
    .filter(row => row.some(c => (c ?? '').trim() !== '') && (row[1] ?? '').trim() !== '');

  // Parse each row into a RawRow
  // Column indices (0-based):
  //   B=1   Bonus key
  //   G=6   Bonuses issued – Number
  //   H=7   Bonuses issued – Amount
  //   I=8   Bonuses issued – Players
  //   J=9   Bonuses activated – Number  (for weighted activation rate)
  //   L=11  Bonuses activated – Amount
  //   N=13  Bonuses activated – Players
  //   P=15  Bonuses used – Number       (for weighted usage rate & avg bet)
  //   R=17  Bonuses used – Amount       (for payout rate & avg bet)
  //   X=23  Bonuses payouts – Amount
  const rawRows: RawRow[] = dataRows.map(c => ({
    bonusKey:         (c[1]  ?? '').trim(),
    issuedCount:      parseNum(c[6]),
    issuedAmount:     parseNum(c[7]),
    issuedPlayers:    parseNum(c[8]),
    activatedCount:   parseNum(c[9]),
    activatedAmount:  parseNum(c[11]),
    activatedPlayers: parseNum(c[13]),
    usedCount:        parseNum(c[15]),
    usedAmount:       parseNum(c[17]),
    payoutAmount:     parseNum(c[23]),
  })).filter(r => r.bonusKey !== '');

  // Bucket each row into a group or individual
  const groupBuckets = new Map<string, RawRow[]>();
  const individualBuckets = new Map<string, RawRow[]>();

  for (const row of rawRows) {
    const groupName = matchGroup(row.bonusKey);
    if (groupName) {
      if (!groupBuckets.has(groupName)) groupBuckets.set(groupName, []);
      groupBuckets.get(groupName)!.push(row);
    } else {
      if (!individualBuckets.has(row.bonusKey)) individualBuckets.set(row.bonusKey, []);
      individualBuckets.get(row.bonusKey)!.push(row);
    }
  }

  // Build groups (preserve defined order, skip empty ones)
  const groups: MonthlyGroup[] = [];
  for (const def of GROUP_DEFS) {
    const bucket = groupBuckets.get(def.name);
    if (!bucket || bucket.length === 0) continue;

    // Aggregate each distinct bonus key within the group
    const keyBuckets = new Map<string, RawRow[]>();
    for (const r of bucket) {
      if (!keyBuckets.has(r.bonusKey)) keyBuckets.set(r.bonusKey, []);
      keyBuckets.get(r.bonusKey)!.push(r);
    }
    const members: AggregatedRow[] = [];
    for (const [key, rows] of keyBuckets) {
      members.push(computeRates(key, rows));
    }

    groups.push({
      name: def.name,
      total: computeRates(def.name, bucket),
      members,
    });
  }

  // Build individual rows
  const individuals: AggregatedRow[] = [];
  for (const [key, rows] of individualBuckets) {
    individuals.push(computeRates(key, rows));
  }

  // Monthly total across everything
  const monthlyTotal = computeRates('Monthly Total', rawRows);

  const brandName = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  return { brandName, groups, individuals, monthlyTotal };
}
