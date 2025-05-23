import ExternalMarketData from "../model/data/externalMarketData";
import BaseController from "./baseController";

class ExternalDataController extends BaseController {
    private externalMarketData: ExternalMarketData;

    constructor({ externalMarketData }: { externalMarketData: ExternalMarketData }) {
        super();
        this.externalMarketData = externalMarketData;
    }

    updatePrices = async () => this.execFunctionWithTryCatch(this.externalMarketData.updatePrices);
}

export default ExternalDataController;