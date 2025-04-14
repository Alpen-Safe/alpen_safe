import { Subscriber } from 'zeromq';
import BaseController from "./baseController";
import BitcoinMonitor from "../model/monitoring/bitcoinMonitor";

class TransactionListenerController extends BaseController {
  txSock: Subscriber;
  blockSock: Subscriber;
  zmqUrl: string;
  bitcoinMonitor: BitcoinMonitor;

  constructor({ zmqUrl, bitcoinMonitor }: { zmqUrl: string, bitcoinMonitor: BitcoinMonitor }) {
    super();
    this.txSock = new Subscriber();
    this.blockSock = new Subscriber();
    this.zmqUrl = zmqUrl;
    this.bitcoinMonitor = bitcoinMonitor;
  }

  startBitcoinTxListener = async () => {
    this.txSock.connect(this.zmqUrl);
    this.txSock.subscribe('rawtx');

    for await (const [, rawTx] of this.txSock) {
      this.execFunctionWithTryCatch(() => this.bitcoinMonitor.checkMempoolTransaction(rawTx));
    }
  };

  startBitcoinBlockListener = async () => {
    this.blockSock.connect(this.zmqUrl);
    this.blockSock.subscribe('rawblock');

    for await (const [, rawBlock] of this.blockSock) {
      this.execFunctionWithTryCatch(() => this.bitcoinMonitor.checkBlock(rawBlock));
    }
  }
}
export default TransactionListenerController;
