import { Subscriber } from 'zeromq';
import BaseController from "./baseController";
import BitcoinMonitor from "../model/monitoring/bitcoinMonitor";
import { Request, Response } from "express";
import { body } from "express-validator";

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

  run = async () => {
    await this.bitcoinMonitor.loadAddresses();

    this.startBitcoinTxListener();
    this.startBitcoinBlockListener();
  }

  checkEntireWallet = async (walletId: string) => {
    return this.execFunctionWithTryCatch(() => this.bitcoinMonitor.checkEntireWallet(walletId));
  }

  checkEntireWalletValidator = [
    body("walletId").exists().isString().withMessage("Wallet ID is required"),
  ];

  checkEntireWalletHandler = async (req: Request, res: Response) => {
    const f = async () => {
      const { walletId } = req.body;

      // long running task, do not await
      this.checkEntireWallet(walletId);

      return {
        message: "Wallet check started",
      }
    }

    return this.execController(req, res, f);
  }
}
export default TransactionListenerController;
