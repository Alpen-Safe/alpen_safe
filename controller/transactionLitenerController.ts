import BaseController from "./baseController.ts";
import BitcoinMonitor from "../model/monitoring/bitcoinMonitor.ts";

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
