import { serve } from 'bun';
import walletRoutes from './routes/wallets';
import signalRoutes from './routes/signals';
import tradeRoutes from './routes/trades';
import { startTradingBot } from './bot';
import { ensureTables } from './supabase';

const PORT = 3001;

const router = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let res: Response;

  if (path.startsWith('/wallets')) {
    res = await walletRoutes(req, path);
  } else if (path.startsWith('/signals')) {
    res = await signalRoutes(req, path);
  } else if (path.startsWith('/trades')) {
    res = await tradeRoutes(req, path);
  } else if (path === '/health') {
    res = Response.json({ ok: true });
  } else {
    res = Response.json({ error: 'Not found' }, { status: 404 });
  }

  const newHeaders = new Headers(res.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(res.body, { status: res.status, headers: newHeaders });
};

// Bootstrap: verify Supabase tables, then start server + bot
await ensureTables();
console.log(`[server] ArcStable trading backend listening on :${PORT}`);
startTradingBot();
serve({ fetch: router, port: PORT });
