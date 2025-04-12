import BaseController from "./baseController";
import BitcoinMonitor from "../model/monitoring/bitcoinMonitor";

class TransactionListenerController extends BaseController {
  zmqUrl: string;

  constructor({ zmqUrl }: { zmqUrl: string }) {
    super();
    this.zmqUrl = zmqUrl;
  }

  startBitcoinTxListener = async () => {
  };
}

export default TransactionListenerController;
