import Papa from 'papaparse';

export const REQUIRED_COLUMNS = ['Email', 'Bet ID', 'Status', 'Bet Type', 'Tournament', 'Event name', 'Bet, EUR', 'Profit, EUR', 'Creation Time'];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  fileName?: string;
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  fileName?: string;
}

export function validateDailyReportCSV(text: string, fileName?: string): ValidationResult {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: false });
  if (!result.data || result.data.length === 0) {
    return { valid: false, missing: REQUIRED_COLUMNS, fileName };
  }
  const headers = Object.keys(result.data[0] || {});
  const missing = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
  return { valid: missing.length === 0, missing, fileName };
}

export interface CustomerData {
  email: string;
  bets: number;
  turnoverEur: number;
  profitEur: number;
}

export interface TournamentData {
  name: string;
  bets: number;
  turnoverEur: number;
  profitEur: number;
}

export interface EventData {
  name: string;
  bets: number;
  turnoverEur: number;
  profitEur: number;
}

export interface BrandReport {
  brandName: string;
  date: string;
  players: number;
  newPlayers: number;
  totalBets: number;
  turnoverEur: number;
  ggrEur: number;
  margin: number;
  avgBetEur: number;
  topCustomers: CustomerData[];
  bottomCustomers: CustomerData[];
  topTournaments: TournamentData[];
  bottomTournaments: TournamentData[];
  topEvents: EventData[];
  bottomEvents: EventData[];
}

function parseAmount(value: string | undefined): number {
  if (!value || typeof value !== 'string') return 0;
  const cleaned = value.replace(/[A-Z]+/g, '').replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function extractBrandName(filename: string): string {
  const match = filename.match(/bets_(.+?)_placement/i);
  if (match) return match[1];
  return filename.replace(/\.[^.]+$/, '');
}

function extractDate(rows: Record<string, string>[]): string {
  for (const row of rows) {
    const time = row['Creation Time'];
    if (time && time.trim()) {
      const datePart = time.split(' ')[0];
      if (datePart) {
        const sep = datePart.includes('-') ? '-' : '/';
        const parts = datePart.split(sep);
        if (parts.length === 3) {
          // Normalise to a real Date regardless of YYYY-MM-DD or DD/MM/YYYY
          const [a, b, c] = parts.map(Number);
          const date = a > 31
            ? new Date(a, b - 1, c)   // YYYY-MM-DD
            : new Date(c, b - 1, a);  // DD/MM/YYYY
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          }
        }
      }
    }
  }
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function processCSVFile(csvText: string, filename: string): BrandReport {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: false,
  });

  const rows = result.data;

  const parentRows = rows.filter(r => r['Email'] && r['Email'].trim() !== '');
  const childRows = rows.filter(
    r => (!r['Email'] || r['Email'].trim() === '') && r['Bet ID'] && r['Bet ID'].trim() !== ''
  );

  // Only settled bets for financials
  const settledParentRows = parentRows.filter(r => {
    const status = (r['Status'] || '').trim();
    return status === 'done' || status === 'cashed_out';
  });

  // Build child-row lookup by Bet ID
  const childrenByBetId = new Map<string, Record<string, string>[]>();
  for (const child of childRows) {
    const betId = child['Bet ID']?.trim();
    if (!betId) continue;
    if (!childrenByBetId.has(betId)) childrenByBetId.set(betId, []);
    childrenByBetId.get(betId)!.push(child);
  }

  // ── Customer aggregation ──────────────────────────────────────────────────
  const customerMap = new Map<string, { bets: number; turnoverEur: number; profitEur: number }>();
  for (const row of settledParentRows) {
    const email = row['Email'].trim().toLowerCase();
    const betEur = parseAmount(row['Bet, EUR']);
    const profitEur = parseAmount(row['Profit, EUR']);
    const existing = customerMap.get(email) ?? { bets: 0, turnoverEur: 0, profitEur: 0 };
    customerMap.set(email, {
      bets: existing.bets + 1,
      turnoverEur: existing.turnoverEur + betEur,
      profitEur: existing.profitEur + profitEur,
    });
  }

  const allCustomers: CustomerData[] = Array.from(customerMap.entries()).map(([email, d]) => ({
    email,
    ...d,
  }));
  const topCustomers = [...allCustomers].sort((a, b) => b.profitEur - a.profitEur).slice(0, 5);
  const bottomCustomers = [...allCustomers].sort((a, b) => a.profitEur - b.profitEur).slice(0, 5);

  // ── Tournament aggregation ────────────────────────────────────────────────
  const tournamentMap = new Map<string, { bets: number; turnoverEur: number; profitEur: number }>();

  for (const row of settledParentRows) {
    const betType = (row['Bet Type'] || '').trim();
    const betEur = parseAmount(row['Bet, EUR']);
    const profitEur = parseAmount(row['Profit, EUR']);
    const betId = row['Bet ID']?.trim();

    const tournaments: string[] = [];
    if (betType === 'single') {
      const t = row['Tournament']?.trim();
      if (t) tournaments.push(t);
    } else if (betId) {
      const children = childrenByBetId.get(betId) ?? [];
      const seen = new Set<string>();
      for (const c of children) {
        const t = c['Tournament']?.trim();
        if (t && !seen.has(t)) { tournaments.push(t); seen.add(t); }
      }
    }

    const n = tournaments.length || 1;
    for (const t of tournaments) {
      const ex = tournamentMap.get(t) ?? { bets: 0, turnoverEur: 0, profitEur: 0 };
      tournamentMap.set(t, {
        bets: ex.bets + 1,
        turnoverEur: ex.turnoverEur + betEur / n,
        profitEur: ex.profitEur + profitEur / n,
      });
    }
  }

  const allTournaments: TournamentData[] = Array.from(tournamentMap.entries()).map(([name, d]) => ({
    name,
    ...d,
  }));
  const topTournaments = [...allTournaments].sort((a, b) => b.profitEur - a.profitEur).slice(0, 5);
  const bottomTournaments = [...allTournaments].sort((a, b) => a.profitEur - b.profitEur).slice(0, 5);

  // ── Event aggregation ─────────────────────────────────────────────────────
  const eventMap = new Map<string, { bets: number; turnoverEur: number; profitEur: number }>();

  for (const row of settledParentRows) {
    const betType = (row['Bet Type'] || '').trim();
    const betEur = parseAmount(row['Bet, EUR']);
    const profitEur = parseAmount(row['Profit, EUR']);
    const betId = row['Bet ID']?.trim();

    const events: string[] = [];
    if (betType === 'single') {
      const e = row['Event name']?.trim();
      if (e) events.push(e);
    } else if (betId) {
      const children = childrenByBetId.get(betId) ?? [];
      const seen = new Set<string>();
      for (const c of children) {
        const e = c['Event name']?.trim();
        if (e && !seen.has(e)) { events.push(e); seen.add(e); }
      }
    }

    const n = events.length || 1;
    for (const e of events) {
      const ex = eventMap.get(e) ?? { bets: 0, turnoverEur: 0, profitEur: 0 };
      eventMap.set(e, {
        bets: ex.bets + 1,
        turnoverEur: ex.turnoverEur + betEur / n,
        profitEur: ex.profitEur + profitEur / n,
      });
    }
  }

  const allEvents: EventData[] = Array.from(eventMap.entries()).map(([name, d]) => ({
    name,
    ...d,
  }));
  const topEvents = [...allEvents].sort((a, b) => b.profitEur - a.profitEur).slice(0, 5);
  const bottomEvents = [...allEvents].sort((a, b) => a.profitEur - b.profitEur).slice(0, 5);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalTurnover = settledParentRows.reduce((s, r) => s + parseAmount(r['Bet, EUR']), 0);
  const totalGgr = settledParentRows.reduce((s, r) => s + parseAmount(r['Profit, EUR']), 0);
  const uniquePlayers = new Set(parentRows.map(r => r['Email'].trim().toLowerCase())).size;

  return {
    brandName: extractBrandName(filename),
    date: extractDate(rows),
    players: uniquePlayers,
    newPlayers: 0,
    totalBets: settledParentRows.length,
    turnoverEur: totalTurnover,
    ggrEur: totalGgr,
    margin: totalTurnover > 0 ? (totalGgr / totalTurnover) * 100 : 0,
    avgBetEur: settledParentRows.length > 0 ? totalTurnover / settledParentRows.length : 0,
    topCustomers,
    bottomCustomers,
    topTournaments,
    bottomTournaments,
    topEvents,
    bottomEvents,
  };
}
