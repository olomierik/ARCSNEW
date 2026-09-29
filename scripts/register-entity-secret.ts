import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { registerEntitySecretCiphertext, initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

// Try every common Circle API key name
const apiKey = process.env.CIRCLE_DEVELOPER_CONTROLLED_API_KEY
  ?? process.env.CIRCLE_API_KEY
  ?? process.env.CIRCLE_SCP_API_KEY
  ?? process.env.LIVE_API_KEY
  ?? process.env.API_KEY;

if (!apiKey) {
  // Last resort: scan .env for any key whose value looks like a Circle API key (TEST_API_KEY:xxx or KEY:xxx format)
  const envRaw = fs.readFileSync('/home/user/app/.env', 'utf8');
  const match = envRaw.match(/^[^#\n][^=\n]*=\s*(TEST_API_KEY:[^\s\n]+|KEY:[^\s\n]+)/m);
  if (!match) {
    console.error('ERROR: Could not find Circle API key. Please set CIRCLE_DEVELOPER_CONTROLLED_API_KEY in .env');
    process.exit(1);
  }
}

const resolvedKey = apiKey ?? (() => {
  const envRaw = fs.readFileSync('/home/user/app/.env', 'utf8');
  const match = envRaw.match(/^[^#\n][^=\n]*=\s*(TEST_API_KEY:[^\s\n]+|KEY:[^\s\n]+)/m);
  return match![1];
})();

// Check existing entity secret
const existingSecret = process.env.ENTITY_SECRET
  ?? process.env.CIRCLE_ENTITY_SECRET
  ?? process.env.CIRCLE_SCP_ENTITY_SECRET;

if (existingSecret && existingSecret.length === 64) {
  console.log('Found existing ENTITY_SECRET (64 chars) — verifying with Circle...');
  try {
    const client = initiateDeveloperControlledWalletsClient({ apiKey: resolvedKey, entitySecret: existingSecret });
    await client.listWalletSets({ pageSize: 1 });
    console.log('SUCCESS: Existing entity secret is registered and working.');
    // Ensure CIRCLE_ENTITY_SECRET alias exists
    const envContent = fs.readFileSync('/home/user/app/.env', 'utf8');
    if (!envContent.includes('CIRCLE_ENTITY_SECRET=')) {
      fs.appendFileSync('/home/user/app/.env', `\nCIRCLE_ENTITY_SECRET=${existingSecret}\n`);
      console.log('Added CIRCLE_ENTITY_SECRET alias to .env');
    }
    // Write recovery marker
    const recoveryDir = '/home/user/app/.circle';
    fs.mkdirSync(recoveryDir, { recursive: true });
    const markerPath = path.join(recoveryDir, 'entity_secret_registered.txt');
    fs.writeFileSync(markerPath, `Registered at ${new Date().toISOString()}\n`);
    console.log('RECOVERY_FILE_PATH=' + path.join(recoveryDir, 'recovery_file.dat'));
    process.exit(0);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('Existing secret not recognised by Circle:', msg);
    console.log('Registering a new one...');
  }
}

// Generate fresh secret
const entitySecret = crypto.randomBytes(32).toString('hex');

const recoveryDir = '/home/user/app/.circle';
fs.mkdirSync(recoveryDir, { recursive: true });

console.log('Registering entity secret ciphertext with Circle...');
const response = await registerEntitySecretCiphertext({
  apiKey: resolvedKey,
  entitySecret,
  recoveryFileDownloadPath: recoveryDir,
});

const recoveryPath = path.join(recoveryDir, 'recovery_file.dat');
if (response.data?.recoveryFile) {
  fs.writeFileSync(recoveryPath, response.data.recoveryFile);
  console.log('Recovery file written to ' + recoveryPath);
}

// Persist to .env
const envPath = '/home/user/app/.env';
fs.appendFileSync(envPath, `\nCIRCLE_ENTITY_SECRET=${entitySecret}\nENTITY_SECRET=${entitySecret}\n`, 'utf-8');
console.log('CIRCLE_ENTITY_SECRET written to .env');

// Verify
console.log('Verifying registration...');
const client = initiateDeveloperControlledWalletsClient({ apiKey: resolvedKey, entitySecret });
await client.listWalletSets({ pageSize: 1 });
console.log('SUCCESS: Entity secret registered and verified.');
console.log('RECOVERY_FILE_PATH=' + recoveryPath);
