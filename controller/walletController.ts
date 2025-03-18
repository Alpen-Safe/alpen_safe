import BaseController from "./baseController.ts";
import WalletManager from "../model/wallet/walletManager.ts";
import { body } from "express-validator";
import { Request, Response } from "express";

class WalletController extends BaseController {
  private walletManager: WalletManager;

  constructor({ walletManager }: { walletManager: WalletManager }) {
    super();
    this.walletManager = walletManager;
  }

  createWalletValidator = () => [
    body("userId").isString(),
    body("walletName").isString(),
    body("userXPubs").isArray(),
    body("userXPubs.*.publicKey").exists().isString(),
    body("userXPubs.*.derivationPath").isString(),
  ];

  create2Of3Wallet = (req: Request, res: Response) => {
    const func = () => {
      const { userId, walletName, userXPubs } = req.body;

      return this.walletManager.createTwoOfThreeWallet(
        userId,
        walletName,
        userXPubs,
      );
    };

    return this.execController(req, res, func);
  };
}

export default WalletController;
