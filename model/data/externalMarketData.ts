import CoinGeckoApi from "../../api/coinGeckoApi";
import Supabase from "../supabase";

class ExternalMarketData {
    private coinGeckoApi: CoinGeckoApi;
    private supabase: Supabase;

    constructor({ coinGeckoApi, supabase }: { coinGeckoApi: CoinGeckoApi, supabase: Supabase }) {
        this.coinGeckoApi = coinGeckoApi;
        this.supabase = supabase;
    }

    updatePrices = async () => {
        console.log("Updating prices");

        const currencySymbol = "bitcoin";
        const fiatCurrencies = ["usd", "chf"];
        const prices = await this.coinGeckoApi.getPrice(currencySymbol, fiatCurrencies);

        console.log('got prices', prices);

        for (const fiatCurrency of fiatCurrencies) {
            await this.supabase.updatePrice("BTC", fiatCurrency.toUpperCase(), prices[currencySymbol][fiatCurrency]);
        }

        console.log("Prices updated");
    }
}

export default ExternalMarketData;