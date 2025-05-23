import CoinGeckoApi from "../api/coinGeckoApi";
import ExternalMarketData from "../model/data/externalMarketData";
import Supabase from "../model/supabase";
import { SUPABASE_URL, SUPABSE_SERVICE_KEY } from "../conf";
import { createClient } from "@supabase/supabase-js";
import ExternalDataController from "../controller/externalDataController";
import cron from "node-cron";

const supabaseClient = createClient(SUPABASE_URL, SUPABSE_SERVICE_KEY);
const supabase = new Supabase({ supabase: supabaseClient });

const coinGeckoApi = new CoinGeckoApi();

const externalMarketData = new ExternalMarketData({
    coinGeckoApi: coinGeckoApi,
    supabase: supabase,
});

const externalDataController = new ExternalDataController({ externalMarketData: externalMarketData });

externalDataController.updatePrices();

cron.schedule("*/5 * * * *", () => {
    externalDataController.updatePrices();
});


