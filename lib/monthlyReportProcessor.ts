import Papa from 'papaparse';

// ── Group matching rules (applied in order — first match wins) ────────────────
const GROUP_DEFS: { name: string; test: (lk: string) => boolean }[] = [
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
      lk.startsWith('1st d 2026') ||
      lk.includes('new') ||
      lk.startsWith('first'),
  },
  {
    name: 'Welcome Offer 2',
    test: lk =>
      lk.includes('welcome offer 2') ||
      lk.startsWith('welcome2') ||
      (lk.includes('welcome') && lk.includes('fbt 50')),
  },
  { name: 'Welcome 1 FBT Drop',      test: lk => /welcome.{0,2}1.{0,4}fbt/i.test(lk) },
  { name: 'Welcome 2 FBT Drop',      test: lk => /welcome.{0,2}2.{0,4}fbt/i.test(lk) || lk.includes('second') || lk.includes('secon') || lk.includes('welcome 2') },
  { name: 'Welcome Hunting',         test: lk => lk.includes('welcome hunting') || (lk.includes('welcome') && lk.includes('hunting')) },
  { name: 'Weekly Reload',           test: lk => lk.includes('weekly reload') || lk.includes('wekdy reload') || lk.includes('sports wekd') },
  { name: 'All Sports Reload',       test: lk => lk.includes('all sports reload') || lk.includes('all sports') },
  { name: 'Football Weekend Reload', test: lk => lk.includes('football weekend reload') },
  { name: 'Fortune Bet Club',        test: lk => lk.includes('fortune bet club') || lk.includes('fortune bet') },
  { name: 'Games of the Week',       test: lk => lk.includes('games') },
  { name: 'ACCA Edge',               test: lk => lk.includes('acca edge') },
  { name: 'Aussie Weekends - NRL & AFL', test: lk => lk.includes('aussie weekend') || lk.includes('aussie weekends') || (lk.includes('nrl') && lk.includes('afl')) },
  { name: 'Reactivation Bonus',      test: lk => lk.includes('reactivation bonus') || lk.includes('reactivation') },
  { name: 'Clay Court Challenge - Tennis Hunting Bonus', test: lk => lk.includes('clay court challenge') || lk.includes('tennis hunting') },
  { name: 'UEFA: European Nights',   test: lk => lk.includes('uefa') || lk.includes('european nights') },
  { name: 'Playoff Nights - NBA & NHL', test: lk => lk.includes('playoff nights') || (lk.includes('nba') && lk.includes('nhl')) },
  { name: 'AFC Champions League Knock Out', test: lk => lk.includes('afc champions') || lk.includes('afc') },
  { name: 'DFB Pokal Semi Finals',   test: lk => lk.includes('dfb pokal') || lk.includes('dfb') },
  // Lucky Vibe specific groups
  { name: 'Welcome FBT 50% up 250 SPORTS1',  test: lk => lk.includes('sports1') },
  { name: 'Welcome FBT 100% up 150 SPORTS2', test: lk => lk.includes('sports2') },
  { name: 'Welcome 1 FBT Drop DROP20',        test: lk => lk.includes('drop20') },
  { name: 'Sports Weekly Reload',             test: lk => lk.includes('sports weekly') },
  { name: 'Ad-hoc / VIP FBTs / Cashbacks', test: lk => lk.includes('mikey') || lk.includes('freebet gift') || lk.includes('free bet gift') || lk.includes('free bet') || lk.includes('weekly cashback') || lk.includes('goodw') || lk.includes('perso') },
];

// Exported constants for the UI
export const ADHOC_GROUP_NAME = 'Ad-hoc / VIP FBTs / Cashbacks';
export const ADHOC_NAMES = ['Mikey', 'Free Bet Gift', 'Goodwill'] as const; // sub-items displayed in UI
export const STANDARD_GROUP_NAMES: string[] = GROUP_DEFS.slice(0, -1).map(g => g.name);

// ── Brand configurations ──────────────────────────────────────────────────────
export interface BrandConfig {
  displayName: string;
  groupNames: string[];
}

export const BRAND_CONFIGS: Record<string, BrandConfig> = {
  roosterbet: {
    displayName: 'Roosterbet',
    groupNames: [
      'Welcome Offer 1',
      'Welcome Offer 2',
      'Welcome 1 FBT Drop',
      'Welcome 2 FBT Drop',
      'Weekly Reload',
      'Football Weekend Reload',
      'Games of the Week',
      'Ad-hoc / VIP FBTs / Cashbacks',
    ],
  },
  fortuneplay: {
    displayName: 'Fortune Play',
    groupNames: [
      'Welcome Offer 1',
      'Welcome Offer 2',
      'Welcome 1 FBT Drop',
      'Welcome 2 FBT Drop',
      'Welcome Hunting',
      'All Sports Reload',
      'Football Weekend Reload',
      'Fortune Bet Club',
      'Ad-hoc / VIP FBTs / Cashbacks',
    ],
  },
  luckyvibe: {
    displayName: 'Lucky Vibe',
    groupNames: [
      'Welcome FBT 50% up 250 SPORTS1',
      'Welcome FBT 100% up 150 SPORTS2',
      'Welcome 1 FBT Drop DROP20',
      'Sports Weekly Reload',
      'ACCA Edge',
      'Ad-hoc / VIP FBTs / Cashbacks',
    ],
  },
};

export function detectBrand(filename: string): string | null {
  const lf = filename.toLowerCase().replace(/[\s_-]/g, '');
  if (lf.includes('roosterbet') || lf.includes('rooster')) return 'roosterbet';
  if (lf.includes('fortuneplay') || lf.includes('fortune')) return 'fortuneplay';
  if (lf.includes('luckyvibe') || lf.includes('lucky')) return 'luckyvibe';
  return null;
}

// ── Custom promo group definition (passed in at runtime) ─────────────────────
export interface CustomPromoGroup {
  name: string;
  keywords: string[]; // case-insensitive substring matches
}

// ── Key alias: maps a specific bonus key to a named group ─────────────────────
export interface KeyAlias {
  bonusKey: string;  // exact key from CSV (case-insensitive match)
  groupName: string; // target group name
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawRow {
  bonusKey: string;
  month: string;
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
  month: string;
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
  brand: string | null;
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

function extractMonthFromDates(issuedFrom: string, issuedTo: string): string {
  let dateStr = (issuedFrom ?? '').trim();
  if (!dateStr) {
    dateStr = (issuedTo ?? '').trim();
  }
  if (!dateStr) return '';

  const datePart = dateStr.split(' ')[0];
  if (!datePart) return '';

  const sep = datePart.includes('-') ? '-' : '/';
  const parts = datePart.split(sep);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    const date = a > 31
      ? new Date(a, b - 1, c)   // YYYY-MM-DD
      : new Date(c, b - 1, a);  // DD/MM/YYYY
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'long' });
    }
  }
  return '';
}

function sumField(rows: RawRow[], k: keyof Omit<RawRow, 'bonusKey' | 'month'>): number {
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

  const month = rows.length > 0 ? rows[0].month : '';

  return {
    bonusKey,
    month,
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
export function processMonthlyCSV(csvText: string, filename = '', customGroups: CustomPromoGroup[] = [], keyAliases: KeyAlias[] = [], hiddenKeys: string[] = [], demotedKeys: string[] = []): MonthlyReport {
  const parsed = Papa.parse<string[]>(csvText, { header: false, skipEmptyLines: false });
  const allRows = parsed.data as string[][];

  // Slice at index 1 to keep all data rows, filter out footer average/total
  const dataRows = allRows
    .slice(1)
    .filter(row => {
      if (!row || row.length <= 1) return false;
      const key = (row[1] ?? '').trim();
      const firstCol = (row[0] ?? '').trim().toLowerCase();
      if (!key) return false;
      if (firstCol === 'average' || firstCol === 'total') return false;
      return true;
    });

  // Parse each row into a RawRow
  // Column indices (0-based):
  //   B=1   Bonus key
  //   E=4   Issued from
  //   F=5   Issued to
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
    month:            extractMonthFromDates(c[4], c[5]),
    issuedCount:      parseNum(c[6]),
    issuedAmount:     parseNum(c[7]),
    issuedPlayers:    parseNum(c[8]),
    activatedCount:   parseNum(c[9]),
    activatedAmount:  parseNum(c[11]),
    activatedPlayers: parseNum(c[13]),
    usedCount:        parseNum(c[15]),
    usedAmount:       parseNum(c[17]),
    payoutAmount:     parseNum(c[23]),
  })).filter(r => r.bonusKey !== '' && !hiddenKeys.some(h => h.toLowerCase() === r.bonusKey.toLowerCase()));

  // Build effective group defs: brand-filtered standard groups + custom + ad-hoc catch-all
  const baseAdhocDef = GROUP_DEFS[GROUP_DEFS.length - 1];
  const allStandardDefs = GROUP_DEFS.slice(0, -1);
  const brand = detectBrand(filename);
  const brandCfg = brand ? BRAND_CONFIGS[brand] : null;
  const standardDefs = brandCfg
    ? allStandardDefs.filter(d => brandCfg.groupNames.includes(d.name))
    : allStandardDefs;
  const customDefs = customGroups
    .filter(cg => cg.name.trim() && cg.keywords.length > 0)
    .map(cg => ({
      name: cg.name.trim(),
      test: (lk: string) => cg.keywords.some(k => lk.includes(k.toLowerCase().trim())),
    }));
  // Seasonal tournament keywords — kept unmatched for Roosterbet and Fortune Play so
  // the user can drag them to a custom seasonal group added at upload time.
  const SEASONAL_KEYWORDS = ['european', 'iihf', 'world champ', 'world cup', 'champions league', 'playoff', 'semi final', 'semifinal', 'knockout', 'knock out'];
  const SEASONAL_BRANDS = ['roosterbet', 'fortuneplay', 'luckyvibe'];

  const adhocDef = {
    name: baseAdhocDef.name,
    test: (lk: string) => {
      if (lk.includes('mikey') && brand !== 'roosterbet') return false;
      if (brand && SEASONAL_BRANDS.includes(brand) && SEASONAL_KEYWORDS.some(t => lk.includes(t))) return false;
      return baseAdhocDef.test(lk);
    },
  };
  const effectiveDefs = [...standardDefs, ...customDefs, adhocDef];

  function matchEffectiveGroup(key: string): string | null {
    const lk = key.toLowerCase().trim();
    // Demoted keys are force-returned to individuals regardless of any matching
    if (demotedKeys.some(d => d.toLowerCase() === lk)) return null;
    // Explicit user alias takes priority over pattern matching
    const alias = keyAliases.find(a => a.bonusKey.toLowerCase().trim() === lk);
    if (alias) return alias.groupName;
    for (const g of effectiveDefs) {
      if (g.test(lk)) return g.name;
    }
    return null;
  }

  // Bucket each row into a group or individual
  const groupBuckets = new Map<string, RawRow[]>();
  const individualBuckets = new Map<string, RawRow[]>();

  for (const row of rawRows) {
    const groupName = matchEffectiveGroup(row.bonusKey);
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
  for (const def of effectiveDefs) {
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

    const displayName = members.length === 1 ? members[0].bonusKey : def.name;

    groups.push({
      name: displayName,
      total: computeRates(displayName, bucket),
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

  const brandName = brandCfg ? brandCfg.displayName : filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim();
  return { brandName, brand, groups, individuals, monthlyTotal };
}
