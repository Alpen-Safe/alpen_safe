import BaseController from "./baseController";
import WalletManager from "../model/wallet/walletManager";
import { body } from "express-validator";
import { Request, Response } from "express";

class WalletController extends BaseController {
  private walletManager: WalletManager;

  constructor({ walletManager }: { walletManager: WalletManager }) {
    super();
    this.walletManager = walletManager;
  }

  createWalletValidator = [
    body("walletName").exists().isString(),
    body("userXPubs").exists().isArray({ min: 2, max: 2 }).withMessage(
      "userXPubs must be an array of 2 elements",
    ),
    body("userXPubs.*.xpub").exists().isString().withMessage(
      "xpub must be a string",
    ),
    body("userXPubs.*.path").exists().isString().withMessage(
      "path must be a string",
    ),
    body("userXPubs.*.device").exists().isString().withMessage(
      "device must be a string",
    ),
    body("userXPubs.*.label").optional({ nullable: true }).isString()
      .withMessage(
        "label must be a string or null",
      ),
  ];

  create2Of3Wallet = (req: Request, res: Response) => {
    const func = () => {
      const userId = req.user?.id as string;
      const { walletName, userXPubs } = req.body;

      return this.walletManager.createTwoOfThreeWallet(
        userId,
        walletName,
        userXPubs,
      );
    };

    return this.execController(req, res, func);
  };

  deriveWalletAddressesValidator = [
    body("count").exists().isInt({ min: 1, max: 100 }),
  ];

  deriveWalletAddresses = (req: Request, res: Response) => {
    const func = () => {
      const walletId = req.walletId as string;
      const { count } = req.body;

      return this.walletManager.deriveAddresses(walletId, count);
    };

    return this.execController(req, res, func);
  };

  signTransactionWithServerValidator = [
    body("walletId").exists().isString(),
    body("transaction").exists().isString(),
  ];

  handoutAddressesValidator = [
    body("isChange").exists().isBoolean(),
    body("amount").exists().isInt({ min: 1, max: 100 }),
  ];

  handoutAddresses = (req: Request, res: Response) => {
    const func = () => {
      const walletId = req.walletId as string;
      const { isChange, amount } = req.body;

      return this.walletManager.handoutAddresses(walletId, isChange, amount);
    };

    return this.execController(req, res, func);
  };
  
}

export default WalletController;
