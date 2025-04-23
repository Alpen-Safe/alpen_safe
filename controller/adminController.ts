import { body } from "express-validator";
import BaseController from "./baseController";
import { NextFunction,Request, Response } from "express";
import WalletManager from "../model/wallet/walletManager";

class AdminController extends BaseController {
  private walletManager: WalletManager;
  constructor({ walletManager }: { walletManager: WalletManager }) {
    super();
    this.walletManager = walletManager;
  }

  signTransactionWithServerValidator = [
    body("walletId").exists().isString(),
    body("psbtBase64").exists().isString(),
  ];

  getAdmin = (req: Request, res: Response, next: NextFunction) => {
    console.log("admin router used");
    next();
  };

  signTransactionWithServer = (req: Request, res: Response) => {
    const func = () => {
      const { walletId, psbtBase64 } = req.body;

      return this.walletManager.signTransactionWithServer(walletId, psbtBase64);
    };

    return this.execController(req, res, func);
  };

  buildWalletSpendPsbtValidator = [
    body("walletId").exists().isString(),
    body("receivers").exists().isArray().isLength({ min: 1 }),
    body("receivers.*.address").exists().isString(),
    body("receivers.*.amount").exists().isInt({ min: 546 }).toInt(),
    body("feePerByte").exists().isInt({ min: 1 }).toInt(),
  ];

  buildWalletSpendPsbt = (req: Request, res: Response) => {
    const func = () => {
      const { walletId, receivers, feePerByte } = req.body;

      return this.walletManager.buildWalletSpendPsbt(walletId, receivers, feePerByte);
    };

    return this.execController(req, res, func);
  };
}

export default AdminController;
