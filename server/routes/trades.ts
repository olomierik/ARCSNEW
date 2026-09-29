import { db } from '../db';

export default async function tradeRoutes(req: Request, path: string): Promise<Response> {
  // GET /trades?owner=0x...
  if (req.method === 'GET' && path === '/trades') {
    const owner = new URL(req.url).searchParams.get('owner') ?? '';
    const trades = await db.getTradesByOwner(owner);
    return Response.json({ trades });
  }
  return Response.json({ error: 'Not found' }, { status: 404 });
}
