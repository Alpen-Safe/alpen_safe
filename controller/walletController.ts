import BaseController from "./baseController.ts";
import WalletManager from "../model/wallet/walletManager.ts";

class WalletController extends BaseController {
  private walletManager: WalletManager;

  constructor({ walletManager }: { walletManager: WalletManager }) {
    super();
    this.walletManager = walletManager;
  }
}

export default WalletController;
