/**
 * Signal + Safety Engine
 *
 * For every candidate token we run a multi-layer safety scan BEFORE
 * assigning a trade signal.  A token that fails ANY hard-block check
 * is marked signal="blocked" and the bot will never trade it.
 *
 * Safety checks performed:
 *  1. Mint authority active          → blocked  (new supply can dilute holders)
 *  2. Freeze authority active        → blocked  (issuer can freeze wallets)
 *  3. Contract not verified          → blocked  (unverified = unaudited)
 *  4. Honeypot / sell restriction    → blocked  (buy-only trap)
 *  5. Fake / wash volume             → blocked  (volume/mcap ratio > 10×)
 *  6. Dev wallet pump-and-dump risk  → warn     (top holder > 20% of supply)
 *  7. Low liquidity                  → warn     (24h volume < $5 000)
 *  8. Suspicious 1h spike            → warn     (+30%+ in 1 h with no news)
 *  9. Age too young                  → warn     (ATH date < 48 h ago)
 *
 * Data sources:
 *  - CoinGecko /coins/{id}           (market data + community/dev data)
 *  - CoinGecko /coins/{id}/contract  (contract details per platform)
 *  - GoPlus Security API             (free, no key needed)
 *    https://api.gopluslabs.io/api/v1/token_security/{chainId}?contract_addresses=
 *
 * Arc chain ID for GoPlus: 5042
 */

const GOPLUS_ARC_CHAIN = '5042';
const ARC_PLATFORM = 'arc';
const CACHE_TTL = 5 * 60 * 1000;      // 5 min signal cache
const SAFETY_CACHE_TTL = 30 * 60 * 1000; // 30 min safety cache per token

// ── Types ───────────────────────────────────────────────────────────────────

export type SafetyFlag =
  | 'mint_authority'
  | 'freeze_authority'
  | 'unverified_contract'
  | 'honeypot'
  | 'fake_volume'
  | 'dev_dump_risk'
  | 'low_liquidity'
  | 'suspicious_spike'
  | 'too_young';

export interface SafetyReport {
  safe: boolean;           // false = bot will NOT trade this token
  score: number;           // 0–100, higher = safer
  flags: SafetyFlag[];     // all issues found
  blocked: boolean;        // true = hard block (cannot be overridden)
  checkedAt: number;
}

export interface TokenSignal {
  id: string;
  address: string;
  symbol: string;
  name: string;
  priceUsdc: number;
  volume24h: number;
  marketCap: number;       // USD market cap
  priceChange1h: number;
  priceChange24h: number;
  score: number;           // momentum score 0–100
  signal: 'strong_buy' | 'buy' | 'watch' | 'neutral' | 'blocked';
  safety: SafetyReport;
}

// ── Safety cache ─────────────────────────────────────────────────────────────

const safetyCache = new Map<string, { report: SafetyReport; fetchedAt: number }>();

function getCachedSafety(address: string): SafetyReport | null {
  const entry = safetyCache.get(address.toLowerCase());
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > SAFETY_CACHE_TTL) return null;
  return entry.report;
}

function cacheSafety(address: string, report: SafetyReport) {
  safetyCache.set(address.toLowerCase(), { report, fetchedAt: Date.now() });
}

// ── GoPlus security scan ─────────────────────────────────────────────────────

interface GoPlusResult {
  is_open_source?: string;          // "1" = verified
  is_honeypot?: string;             // "1" = honeypot
  buy_tax?: string;
  sell_tax?: string;
  cannot_sell_all?: string;         // "1" = sell restriction
  is_mintable?: string;             // "1" = mint authority active
  owner_address?: string;
  creator_address?: string;
  holder_count?: string;
  total_supply?: string;
  lp_holder_count?: string;
  lp_total_supply?: string;
  is_blacklisted?: string;
  is_whitelisted?: string;
  can_take_back_ownership?: string;
  hidden_owner?: string;
  selfdestruct?: string;
  external_call?: string;
  // Solana-specific
  freeze_authority?: string | null;
  mint_authority?: string | null;
  top_holders?: Array<{ address: string; percent: string; is_locked?: string }>;
}

async function runGoPlusScan(address: string): Promise<GoPlusResult | null> {
  if (!address || address === `0x${'0'.repeat(40)}`) return null;
  try {
    const url = `https://api.gopluslabs.io/api/v1/token_security/${GOPLUS_ARC_CHAIN}?contract_addresses=${address}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json() as { result?: Record<string, GoPlusResult> };
    const key = Object.keys(json.result ?? {})[0];
    return key ? (json.result?.[key] ?? null) : null;
  } catch {
    return null;
  }
}

// ── Safety scanner ────────────────────────────────────────────────────────────

async function scanTokenSafety(
  address: string,
  volume24h: number,
  priceChange1h: number,
  marketCap: number,
  geckoData: GeckoTokenDetail | null,
): Promise<SafetyReport> {
  const cached = getCachedSafety(address);
  if (cached) return cached;

  const flags: SafetyFlag[] = [];
  let blocked = false;

  // ── 1–4: GoPlus on-chain scan ────────────────────────────────────────────
  const gp = await runGoPlusScan(address);

  if (gp) {
    // 1. Mint authority
    if (gp.is_mintable === '1' || (gp.mint_authority && gp.mint_authority !== 'null' && gp.mint_authority !== '')) {
      flags.push('mint_authority');
      blocked = true;
    }

    // 2. Freeze authority (Solana / EVM ownership take-back)
    if (
      (gp.freeze_authority && gp.freeze_authority !== 'null' && gp.freeze_authority !== '') ||
      gp.can_take_back_ownership === '1' ||
      gp.hidden_owner === '1'
    ) {
      flags.push('freeze_authority');
      blocked = true;
    }

    // 3. Unverified contract
    if (gp.is_open_source === '0') {
      flags.push('unverified_contract');
      blocked = true;
    }

    // 4. Honeypot / sell restriction
    if (
      gp.is_honeypot === '1' ||
      gp.cannot_sell_all === '1' ||
      parseFloat(gp.sell_tax ?? '0') > 20  // > 20% sell tax = effective honeypot
    ) {
      flags.push('honeypot');
      blocked = true;
    }

    // 6. Dev/top-holder dump risk: top holder > 20% of supply
    if (gp.top_holders && gp.top_holders.length > 0) {
      const topPct = parseFloat(gp.top_holders[0].percent ?? '0');
      if (topPct > 20 && gp.top_holders[0].is_locked !== '1') {
        flags.push('dev_dump_risk');
        // warn only, not blocked — but lowers safety score significantly
      }
    }
  } else {
    // GoPlus returned nothing — treat contract as unverified (hard block)
    if (address && address !== `0x${'0'.repeat(40)}`) {
      flags.push('unverified_contract');
      blocked = true;
    }
  }

  // ── 5. Fake / wash volume ────────────────────────────────────────────────
  // Volume/MarketCap > 10× is a strong wash-trading signal
  if (marketCap > 0 && volume24h > 0 && volume24h / marketCap > 10) {
    flags.push('fake_volume');
    blocked = true;
  }

  // ── 7. Low liquidity ─────────────────────────────────────────────────────
  if (volume24h < 5000) {
    flags.push('low_liquidity');
    // warn only
  }

  // ── 8. Suspicious 1h spike ────────────────────────────────────────────────
  if (priceChange1h > 30) {
    flags.push('suspicious_spike');
    // warn only
  }

  // ── 9. Token too young (< 48h since ATH date as proxy for listing date) ──
  if (geckoData?.atl_date) {
    const ageMs = Date.now() - new Date(geckoData.atl_date).getTime();
    if (ageMs < 48 * 60 * 60 * 1000) {
      flags.push('too_young');
      // warn only
    }
  }

  // ── Safety score ──────────────────────────────────────────────────────────
  // Start at 100, deduct per flag
  const DEDUCTIONS: Record<SafetyFlag, number> = {
    mint_authority:      40,
    freeze_authority:    40,
    unverified_contract: 35,
    honeypot:            50,
    fake_volume:         40,
    dev_dump_risk:       25,
    low_liquidity:       10,
    suspicious_spike:    10,
    too_young:           10,
  };
  const totalDeduction = flags.reduce((sum, f) => sum + DEDUCTIONS[f], 0);
  const safetyScore = Math.max(0, 100 - totalDeduction);

  const report: SafetyReport = {
    safe: !blocked,
    score: safetyScore,
    flags,
    blocked,
    checkedAt: Date.now(),
  };

  cacheSafety(address, report);
  return report;
}

// ── CoinGecko helpers ─────────────────────────────────────────────────────────

interface GeckoToken {
  id: string;
  symbol: string;
  name: string;
  contract_address?: string;
  platforms?: Record<string, string>;
  current_price: number;
  total_volume: number;
  market_cap: number;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_24h?: number;
}

interface GeckoTokenDetail {
  atl_date?: string;
}

function geckoHeaders(): Record<string, string> {
  const apiKey = process.env.VITE_COINGECKO_API_KEY ?? '';
  return apiKey ? { 'x-cg-pro-api-key': apiKey } : {};
}

async function fetchMarkets(): Promise<GeckoToken[]> {
  const headers = geckoHeaders();
  // Try Arc-ecosystem category first
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=arc-ecosystem&order=volume_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1h,24h`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json() as GeckoToken[];
      if (data.length > 0) return data;
    }
  } catch { /* fall through */ }

  // Fallback: top 50 by volume
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=volume_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1h,24h`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (res.ok) return (await res.json()) as GeckoToken[];
  } catch { /* ignore */ }

  return [];
}

async function fetchTokenDetail(id: string): Promise<GeckoTokenDetail | null> {
  try {
    const headers = geckoHeaders();
    const url = `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return (await res.json()) as GeckoTokenDetail;
  } catch {
    return null;
  }
}

// ── Momentum scorer ────────────────────────────────────────────────────────────

function momentumScore(p1h: number, p24h: number, vol: number): number {
  const m1h  = Math.max(0, Math.min(40, (p1h  / 10) * 40));
  const m24h = Math.max(0, Math.min(30, (p24h / 20) * 30));
  const vScore = Math.min(30, Math.log10(Math.max(vol, 1)) * 3);
  return Math.round(m1h + m24h + vScore);
}

// ── Main fetch + scan pipeline ─────────────────────────────────────────────────

async function buildSignals(): Promise<TokenSignal[]> {
  const coins = await fetchMarkets();
  if (coins.length === 0) return [];

  // Run safety scans in parallel (max 10 concurrent to avoid rate limits)
  const results: TokenSignal[] = [];
  const BATCH = 10;

  for (let i = 0; i < coins.length; i += BATCH) {
    const batch = coins.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (c) => {
        const address =
          c.platforms?.[ARC_PLATFORM] ??
          c.contract_address ??
          `0x${'0'.repeat(40)}`;

        const p1h   = c.price_change_percentage_1h_in_currency ?? 0;
        const p24h  = c.price_change_percentage_24h ?? 0;
        const vol   = c.total_volume ?? 0;
        const mcap  = c.market_cap ?? 0;

        // Fetch token detail for age check (non-blocking — null is fine)
        const detail = await fetchTokenDetail(c.id).catch(() => null);

        // Run safety scan
        const safety = await scanTokenSafety(address, vol, p1h, mcap, detail);

        const mScore = momentumScore(p1h, p24h, vol);

        // Blocked tokens never get a buy signal
        let signal: TokenSignal['signal'];
        if (safety.blocked) {
          signal = 'blocked';
        } else {
          signal =
            mScore >= 65 ? 'strong_buy'
            : mScore >= 45 ? 'buy'
            : mScore >= 25 ? 'watch'
            : 'neutral';
        }

        return {
          id: c.id,
          address,
          symbol: c.symbol.toUpperCase(),
          name: c.name,
          priceUsdc: c.current_price ?? 0,
          volume24h: vol,
          marketCap: mcap,
          priceChange1h: p1h,
          priceChange24h: p24h,
          score: mScore,
          signal,
          safety,
        } satisfies TokenSignal;
      })
    );
    results.push(...batchResults);
  }

  // Sort: safe + strongest momentum first, blocked last
  return results.sort((a, b) => {
    if (a.signal === 'blocked' && b.signal !== 'blocked') return 1;
    if (a.signal !== 'blocked' && b.signal === 'blocked') return -1;
    return b.score - a.score;
  });
}

// ── Cache ──────────────────────────────────────────────────────────────────────

let _cache: { signals: TokenSignal[]; fetchedAt: number } | null = null;

export async function getSignals(): Promise<TokenSignal[]> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL) return _cache.signals;
  const signals = await buildSignals();
  _cache = { signals, fetchedAt: now };
  return signals;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export default async function signalRoutes(req: Request, path: string): Promise<Response> {
  if (req.method === 'GET' && path === '/signals') {
    const signals = await getSignals();
    // Also expose a /signals/safe endpoint for the bot
    return Response.json({
      signals,
      safeCount: signals.filter((s) => s.safety.safe).length,
      blockedCount: signals.filter((s) => s.signal === 'blocked').length,
      fetchedAt: _cache?.fetchedAt ?? Date.now(),
    });
  }

  // GET /signals/safe — only tradeable signals (for bot consumption)
  if (req.method === 'GET' && path === '/signals/safe') {
    const signals = await getSignals();
    return Response.json({
      signals: signals.filter((s) => s.safety.safe && s.signal !== 'blocked'),
      fetchedAt: _cache?.fetchedAt ?? Date.now(),
    });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
