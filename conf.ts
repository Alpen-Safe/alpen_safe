import "dotenv/config";
import process from "node:process";
import { Network, networks } from "bitcoinjs-lib";
import { Buffer } from "node:buffer";

if (!process.env.SUPABASE_URL) {
  throw new Error(
    "Please define the SUPABASE_URL environment variable inside .env.local",
  );
}

if (!process.env.SUPABSE_SERVICE_KEY) {
  throw new Error(
    "Please define the SUPABSE_SERVICE_KEY environment variable inside .env.local",
  );
}

export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABSE_SERVICE_KEY = process.env.SUPABSE_SERVICE_KEY;
export const NETWORK = process.env.NETWORK;

if (!NETWORK) {
  throw new Error(
    "Please define the NETWORK environment variable inside .env.local",
  );
}

let bitcoinNetwork: Network;
switch (NETWORK) {
  case "mainnet":
    bitcoinNetwork = networks.bitcoin;
    break;
  case "testnet":
    bitcoinNetwork = networks.testnet;
    break;
  case "signet":
    bitcoinNetwork = networks.testnet;
    break;
  default:
    throw new Error("Invalid NETWORK environment variable");
}

export const BITCOIN_NETWORK = bitcoinNetwork;

if (!process.env.SERVER_SEED) {
  throw new Error(
    "Please define the SEED environment variable inside .env.local",
  );
}

// TODO: Load server seed from secrets manager
export const SERVER_SEED = Buffer.from(process.env.SERVER_SEED, "hex");

export const PORT = process.env.PORT || 3000;

export const ZMQ_URL = process.env.ZMQ_URL as string;

if (!ZMQ_URL) {
  throw new Error(
    "Please define the ZMQ_URL environment variable inside .env.local",
  );
}

export const ESPLORA_URL = process.env.ESPLORA_URL as string;

if (!ESPLORA_URL) {
  throw new Error(
    "Please define the ESPLORA_URL environment variable inside .env.local",
  );
}

export const ADMIN_SECRET = process.env.ADMIN_SECRET as string;
if (!ADMIN_SECRET) {
  throw new Error(
    "Please define the ADMIN_SECRET environment variable inside .env.local",
  );
}