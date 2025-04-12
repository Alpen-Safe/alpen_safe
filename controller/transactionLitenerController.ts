import { Subscriber } from 'zeromq';
import BaseController from "./baseController";
import BitcoinMonitor from "../model/monitoring/bitcoinMonitor";

class TransactionListenerController extends BaseController {
  txSock: Subscriber;
  blockSock: Subscriber;
  zmqUrl: string;

  constructor({ zmqUrl }: { zmqUrl: string }) {
    super();
    this.txSock = new Subscriber();
    this.blockSock = new Subscriber();
    this.zmqUrl = zmqUrl;
  }

  startBitcoinTxListener = async () => {
    this.txSock.connect(this.zmqUrl);
    this.txSock.subscribe('rawtx');

    for await (const [_, rawTx] of this.txSock) {
        console.log('rawTx', rawTx);
    }

  };
}

export default TransactionListenerController;
