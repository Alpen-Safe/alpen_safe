import "dotenv/config";
import process from "node:process";

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
