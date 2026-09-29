import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey =
  process.env.CIRCLE_DEVELOPER_CONTROLLED_API_KEY ??
  process.env.CIRCLE_API_KEY ??
  '';

const entitySecret =
  process.env.CIRCLE_ENTITY_SECRET ??
  process.env.ENTITY_SECRET ??
  '';

if (!apiKey) console.warn('[circle] WARNING: No Circle API key found in env');
if (!entitySecret) console.warn('[circle] WARNING: No entity secret found in env');

export const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});
