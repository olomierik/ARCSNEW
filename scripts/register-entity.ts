import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { registerEntitySecretCiphertext, initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_DEVELOPER_CONTROLLED_API_KEY ?? "";
const existingSecret = process.env.ENTITY_SECRET ?? process.env.CIRCLE_ENTITY_SECRET ?? "";

if (!apiKey) {
  console.error("ERROR: CIRCLE_DEVELOPER_CONTROLLED_API_KEY not found in env");
  process.exit(1);
}

// If an entity secret already exists, try to verify it first before re-registering
if (existingSecret.length === 64) {
  console.log("Found existing entity secret (64 chars). Verifying with Circle...");
  try {
    const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret: existingSecret });
    await client.listWalletSets({ pageSize: 1 });
    console.log("SUCCESS: Existing entity secret is valid and registered.");
    process.exit(0);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log("Existing secret not valid (" + msg + "). Proceeding with fresh registration...");
  }
} else {
  console.log("No entity secret found. Generating and registering a fresh one...");
}

// Generate fresh secret
const entitySecret = crypto.randomBytes(32).toString("hex");

// Ensure recovery dir exists under /home/user/app
const recoveryDir = "/home/user/app/.circle";
fs.mkdirSync(recoveryDir, { recursive: true });

console.log("Registering entity secret ciphertext with Circle...");
let response;
try {
  response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryDir,
  });
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("ERROR during registerEntitySecretCiphertext:", msg);
  process.exit(1);
}

// Write recovery file
const recoveryPath = path.join(recoveryDir, "recovery_file.dat");
if (response.data?.recoveryFile) {
  fs.writeFileSync(recoveryPath, response.data.recoveryFile);
  console.log("Recovery file written to:", recoveryPath);
} else {
  // SDK may have written it automatically — check
  if (!fs.existsSync(recoveryPath)) {
    console.warn("WARNING: No recovery file returned and none found on disk. Check Circle console.");
  } else {
    console.log("Recovery file exists at:", recoveryPath);
  }
}

// Persist to .env
const envPath = "/home/user/app/.env";
const envContents = fs.readFileSync(envPath, "utf-8");
if (!envContents.includes("CIRCLE_ENTITY_SECRET=")) {
  fs.appendFileSync(envPath, `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`, "utf-8");
  console.log("CIRCLE_ENTITY_SECRET appended to .env");
} else {
  // Replace existing value
  const updated = envContents.replace(/CIRCLE_ENTITY_SECRET=.*/, `CIRCLE_ENTITY_SECRET=${entitySecret}`);
  fs.writeFileSync(envPath, updated, "utf-8");
  console.log("CIRCLE_ENTITY_SECRET updated in .env");
}

// Also replace ENTITY_SECRET if present
const envContents2 = fs.readFileSync(envPath, "utf-8");
if (envContents2.includes("ENTITY_SECRET=") && !envContents2.includes("CIRCLE_ENTITY_SECRET=" + entitySecret)) {
  const updated2 = envContents2.replace(/^ENTITY_SECRET=.*/m, `ENTITY_SECRET=${entitySecret}`);
  fs.writeFileSync(envPath, updated2, "utf-8");
}

// Verify
console.log("Verifying registration...");
try {
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  await client.listWalletSets({ pageSize: 1 });
  console.log("VERIFIED: Entity secret registered and functional.");
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("ERROR: Verification failed after registration:", msg);
  process.exit(1);
}

console.log("DONE");
