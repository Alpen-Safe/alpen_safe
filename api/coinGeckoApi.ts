import BaseApi from "./baseApi";

interface CoinGeckoPriceResponse {
  [currencySymbol: string]: {
    [fiatCurrency: string]: number;
  };
}

class CoinGeckoApi extends BaseApi {
  constructor(baseUrl: string = "https://api.coingecko.com") {
    super(baseUrl);
  }

  getPrice = async (currencySymbol: string, fiatCurrency: string[]) => this.get<CoinGeckoPriceResponse>(`/api/v3/simple/price?ids=${currencySymbol}&vs_currencies=${fiatCurrency.join(",")}`);
}

export default CoinGeckoApi;