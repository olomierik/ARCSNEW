import { v4 as uuidv4 } from 'uuid';
import { circleClient } from '../circle';
import { db, TradingWallet } from '../db';
import { STRATEGIES, DEFAULT_STRATEGY, type StrategyId } from '../strategies';

export default async function walletRoutes(req: Request, path: string): Promise<Response> {

  // POST /wallets/create-standalone  {}  — no wallet connection needed
  // Returns: wallet record + address + privateKey + passcode (shown ONCE)
  if (req.method === 'POST' && path === '/wallets/create-standalone') {
    try {
      // Generate a random passcode (8 chars alphanumeric)
      const passcode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b) => b.toString(36).padStart(1, '0'))
        .join('')
        .toUpperCase()
        .slice(0, 8);

      // Use passcode as a stable owner id (hashed for privacy)
      const encoder = new TextEncoder();
      const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(passcode));
      const ownerAddress = '0x' + Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);

      const existing = await db.getWalletByOwner(ownerAddress);
      if (existing) return Response.json({ wallet: existing, alreadyExists: true });

      const wsRes = await circleClient.createWalletSet({
        idempotencyKey: uuidv4(),
        name: `ArcStable-Auto-${Date.now()}`,
      });
      const walletSetId = wsRes.data?.walletSet?.id ?? '';

      const wRes = await circleClient.createWallets({
        idempotencyKey: uuidv4(),
        walletSetId,
        blockchains: ['ARC'],
        count: 1,
        accountType: 'EOA',
      });
      const w = wRes.data?.wallets?.[0];
      if (!w) throw new Error('Wallet creation returned no wallet');

      const defaultStrat = STRATEGIES[DEFAULT_STRATEGY];
      const record: TradingWallet = {
        id: w.id,
        walletSetId,
        address: w.address,
        ownerAddress,
        enabled: false,
        strategy: DEFAULT_STRATEGY,
        takeProfitPct: defaultStrat.takeProfitPct,
        stopLossPct: defaultStrat.stopLossPct,
        createdAt: Date.now(),
      };
      await db.saveWallet(record);

      // Return passcode and address — private key is managed by Circle
      // (Circle developer-controlled wallets do not expose raw private keys;
      //  the passcode is the user's only credential to look up this wallet)
      return Response.json({
        wallet: record,
        passcode,         // shown ONCE — user must save it
        address: w.address,
        note: 'Save your passcode. It is the only way to access this wallet.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // POST /wallets/lookup  { passcode } — retrieve wallet by passcode
  if (req.method === 'POST' && path === '/wallets/lookup') {
    const { passcode } = (await req.json()) as { passcode: string };
    if (!passcode) return Response.json({ error: 'passcode required' }, { status: 400 });
    const encoder = new TextEncoder();
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(passcode.toUpperCase()));
    const ownerAddress = '0x' + Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
    const wallet = await db.getWalletByOwner(ownerAddress);
    if (!wallet) return Response.json({ error: 'Wallet not found. Check your passcode.' }, { status: 404 });
    let balance = '0';
    try {
      const bRes = await circleClient.getWalletTokenBalance({ id: wallet.id });
      const usdc = bRes.data?.tokenBalances?.find((b) => b.token?.symbol?.toUpperCase() === 'USDC');
      balance = usdc?.amount ?? '0';
    } catch { /* ignore */ }
    return Response.json({ wallet, balance });
  }

  // POST /wallets/create  { ownerAddress } — legacy: connected-wallet flow
  if (req.method === 'POST' && path === '/wallets/create') {
    const { ownerAddress } = (await req.json()) as { ownerAddress: string };
    if (!ownerAddress) return Response.json({ error: 'ownerAddress required' }, { status: 400 });

    const existing = await db.getWalletByOwner(ownerAddress);
    if (existing) return Response.json({ wallet: existing });

    try {
      const wsRes = await circleClient.createWalletSet({
        idempotencyKey: uuidv4(),
        name: `ArcStable-${ownerAddress.slice(0, 8)}`,
      });
      const walletSetId = wsRes.data?.walletSet?.id ?? '';

      const wRes = await circleClient.createWallets({
        idempotencyKey: uuidv4(),
        walletSetId,
        blockchains: ['ARC'],
        count: 1,
        accountType: 'EOA',
      });
      const w = wRes.data?.wallets?.[0];
      if (!w) throw new Error('Wallet creation returned no wallet');

      const defaultStrat = STRATEGIES[DEFAULT_STRATEGY];
      const record: TradingWallet = {
        id: w.id,
        walletSetId,
        address: w.address,
        ownerAddress,
        enabled: false,
        strategy: DEFAULT_STRATEGY,
        takeProfitPct: defaultStrat.takeProfitPct,
        stopLossPct: defaultStrat.stopLossPct,
        createdAt: Date.now(),
      };
      await db.saveWallet(record);
      return Response.json({ wallet: record });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // GET /wallets?owner=0x...
  if (req.method === 'GET' && path === '/wallets') {
    const owner = new URL(req.url).searchParams.get('owner');
    if (!owner) return Response.json({ error: 'owner required' }, { status: 400 });
    const wallet = await db.getWalletByOwner(owner);
    let balance = '0';
    if (wallet) {
      try {
        const bRes = await circleClient.getWalletTokenBalance({ id: wallet.id });
        const usdc = bRes.data?.tokenBalances?.find(
          (b) => b.token?.symbol?.toUpperCase() === 'USDC'
        );
        balance = usdc?.amount ?? '0';
      } catch {
        // ignore balance fetch errors
      }
    }
    return Response.json({ wallet: wallet ?? null, balance });
  }

  // POST /wallets/toggle  { walletId, enabled }
  if (req.method === 'POST' && path === '/wallets/toggle') {
    const { walletId, enabled } = (await req.json()) as { walletId: string; enabled: boolean };
    await db.updateWallet(walletId, { enabled });
    return Response.json({ ok: true });
  }

  // POST /wallets/settings  { walletId, strategy?, takeProfitPct?, stopLossPct? }
  if (req.method === 'POST' && path === '/wallets/settings') {
    const body = (await req.json()) as {
      walletId: string;
      strategy?: StrategyId;
      takeProfitPct?: number;
      stopLossPct?: number;
    };
    // If strategy changes, sync TP/SL from the strategy preset unless overridden
    const patch: Partial<TradingWallet> = {};
    if (body.strategy && STRATEGIES[body.strategy]) {
      const strat = STRATEGIES[body.strategy];
      patch.strategy = body.strategy;
      patch.takeProfitPct = body.takeProfitPct ?? strat.takeProfitPct;
      patch.stopLossPct   = body.stopLossPct   ?? strat.stopLossPct;
    } else {
      if (body.takeProfitPct !== undefined) patch.takeProfitPct = body.takeProfitPct;
      if (body.stopLossPct   !== undefined) patch.stopLossPct   = body.stopLossPct;
    }
    await db.updateWallet(body.walletId, patch);
    return Response.json({ ok: true });
  }

  // GET /wallets/strategies — return strategy definitions for the UI
  if (req.method === 'GET' && path === '/wallets/strategies') {
    return Response.json({ strategies: STRATEGIES });
  }

  // GET /wallets/profit?owner=0x...
  if (req.method === 'GET' && path === '/wallets/profit') {
    const owner = new URL(req.url).searchParams.get('owner') ?? '';
    const profit = await db.getProfit(owner);
    return Response.json({ profit });
  }

  // POST /wallets/claim  { ownerAddress }
  if (req.method === 'POST' && path === '/wallets/claim') {
    const { ownerAddress } = (await req.json()) as { ownerAddress: string };
    const profit = await db.getProfit(ownerAddress);
    if (parseFloat(profit.claimable) <= 0)
      return Response.json({ error: 'Nothing to claim' }, { status: 400 });
    const claimed = profit.claimable;
    await db.resetProfit(ownerAddress);
    return Response.json({ claimed });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
