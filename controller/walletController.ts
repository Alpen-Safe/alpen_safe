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

  createWalletValidator = [
    body("userId").exists().isString(),
    body("walletName").exists().isString(),
    body("userXPubs").exists().isArray({ min: 2, max: 2 }).withMessage(
      "userXPubs must be an array of 2 elements",
    ),
    body("userXPubs.*.xpub").exists().isString(),
    body("userXPubs.*.derivationPath").optional().isString(),
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

  deriveWalletAddressesValidator = [
    body("walletId").exists().isString(),
    body("count").exists().isInt({ min: 1, max: 100 }),
  ];

  deriveWalletAddresses = (req: Request, res: Response) => {
    const func = () => {
      const { walletId, count } = req.body;

      return this.walletManager.deriveAddresses(walletId, count);
    };

    return this.execController(req, res, func);
  };

  signTransactionWithServerValidator = [
    body("walletId").exists().isString(),
    body("transaction").exists().isString(),
  ];
}

export default WalletController;
